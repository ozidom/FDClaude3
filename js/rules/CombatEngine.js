/**
 * Combat on the 3-zone Clash Board (rules 4d, 54-65, SPEC §8).
 * RULE CONFLICT 1: rule 4d (3 zones) vs the Glossary (5 zones): 3 zones are used.
 *
 * Each round follows rule 56: the player declares (spells before initiative,
 * rules 53e, 61a), then Initiative (55), Morale (57), Movement (58),
 * Missiles (60), Spells & Turning (61), Melee (62) and Surrender/Withdraw/
 * Retreat/Pursuit (63-65). RULE CONFLICT 8: the rule numbering in the source is
 * off by one, so rules are cited by number and name.
 */
class CombatEngine {
    /**
     * Sets up the Clash Board for the current encounter.
     * RULE 4d / 48: the PC starts in Party, monsters in Enemy; Close puts
     * monsters in Centre; Distant means no one may enter Centre in round 1.
     * TABLE 11 (Bugbear, ambushers): often begin closer.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {FD.Model.CombatState}
     */
    static start(state) {
        const enc = state.encounter;
        const room = state.room;
        const Z = FD.Enums.Zone;
        const monsters = enc.monsters.filter(m => m.state === FD.Enums.MonsterState.STANDING);
        for (const m of monsters) {
            m.zone = Z.ENEMY;
            if (enc.distance === FD.Enums.Distance.CLOSE) {
                m.zone = Z.CENTRE;
            } else if (enc.distance === FD.Enums.Distance.NORMAL && m.behaviour.indexOf('ambusher') >= 0) {
                m.zone = Z.CENTRE;
            }
            m.fleeing = false;
            m.attached = false;
            m.webbedRounds = 0;
            m.reloading = false;
            m.aware = !enc.surprise.monsters;
        }
        const c = new FD.Model.CombatState({
            monsters: monsters,
            distance: enc.distance,
            surprise: { pc: enc.surprise.pc, monsters: enc.surprise.monsters },
            roomSize: room.size,
            roomId: room.id,
            dark: state.clock.isDark,
            encounterId: enc.def.id,
            wandering: enc.wandering
        });
        state.combat = c;
        state.screen = FD.Enums.Screen.COMBAT;
        let setup = 'To the Clash Board! Distance: ' + enc.distance + ' (rule 48).';
        if (enc.distance === FD.Enums.Distance.DISTANT) {
            setup += ' No one may enter the Centre in round 1.';
        }
        if (c.roomSize === 1) {
            setup += ' Small room: no missile fire (rule 60).';
        }
        if (c.dark) {
            setup += ' Total darkness: you attack at -4 (rule 41b).';
        }
        FD.Core.log.add(setup, 'combat');
        if (c.surprise.pc) {
            FD.Core.log.add('You are surprised and lose round 1 (rule 47).', 'danger');
        } else if (c.surprise.monsters) {
            FD.Core.log.add('They are surprised and lose round 1 (rule 47).', 'good');
        }
        return c;
    }

    /**
     * Converts a TABLE 6 Range value to a maximum zone distance.
     * RULE CONFLICT 2 (SPEC §11): max zone distance = Range - 1, capped at 2.
     * Melee 1 = same zone; thrown/sling/crossbow 2 = adjacent; bows = anywhere.
     * @param {number} range  TABLE 6 Range.
     * @returns {number}      Zones.
     */
    static maxZoneDistance(range) {
        return Math.max(0, Math.min(range - 1, 2));
    }

    /**
     * RULE 4d: distance = |zoneA - zoneB|.
     * @param {number} a  Zone.
     * @param {number} b  Zone.
     * @returns {number}
     */
    static distance(a, b) {
        return Math.abs(a - b);
    }

    /**
     * Standing monsters in a zone.
     * @param {FD.Model.CombatState} combat  The fight.
     * @param {number} zone                  Zone.
     * @returns {FD.Model.Monster[]}
     */
    static monstersInZone(combat, zone) {
        if (!combat) {
            return [];
        }
        return combat.monsters.filter(m => m.isStanding && m.zone === zone);
    }

    /**
     * True if a standing enemy blocks a zone (rule 58b).
     * @param {FD.Model.CombatState} c  The fight.
     * @param {number} zone             Zone.
     * @returns {boolean}
     */
    static zoneBlocked(c, zone) {
        return c.monsters.some(m => m.blocks && !m.fleeing && m.zone === zone);
    }

    /**
     * RULE 58: 2 zones per round, 1 if Encumbered (+1 for a Potion of Speed, GM RULING).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {number}
     */
    static pcMoveAllowance(state) {
        return FD.Rules.EncumbranceRules.combatMove(state.character) + state.combat.pcSpeedBonus;
    }

    /**
     * Which zones the PC may end the movement step in.
     * RULE 58 (movement points), RULE 58b (Blocking), RULE 58c (Engaged), RULE 48 (Distant round 1).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{zone:number, ok:boolean, reason:string}[]}
     */
    static legalMoves(state) {
        const c = state.combat;
        const from = c.pcZone;
        const mp = CombatEngine.pcMoveAllowance(state);
        const result = [];
        for (let z = 0; z <= 2; z++) {
            let ok = true;
            let reason = '';
            if (z === from) {
                result.push({ zone: z, ok: true, reason: 'Stay here' });
                continue;
            }
            if (state.character.conditions.paralysedRounds > 0) {
                ok = false;
                reason = 'Paralysed';
            } else if (c.pcEngaged) {
                ok = false;
                reason = 'Engaged: rule 58c (use Withdraw or Retreat)';
            } else if (Math.abs(z - from) > mp) {
                ok = false;
                reason = 'Too far: rule 58 (2 zones a round, 1 if Encumbered)';
            } else {
                const step = z > from ? 1 : -1;
                for (let s = from + step; s !== z; s += step) {
                    if (CombatEngine.zoneBlocked(c, s)) {
                        ok = false;
                        reason = 'Blocked: rule 58b (an enemy stands in the ' + FD.Enums.ZoneName[s] + ')';
                    }
                }
                if (ok && c.round === 1 && c.distance === FD.Enums.Distance.DISTANT) {
                    const crosses = (from < 1 && z >= 1) || (from > 1 && z <= 1) || z === 1;
                    if (crosses) {
                        ok = false;
                        reason = 'Distant: no one enters the Centre in round 1 (rule 48)';
                    }
                }
            }
            result.push({ zone: z, ok: ok, reason: reason });
        }
        return result;
    }

    /**
     * The corridor the PC flees through when leaving the board: the way they came
     * in, else any familiar exit they can pass.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {FD.Model.Corridor|null}
     */
    static escapeCorridor(state) {
        const roomId = state.currentRoomId;
        if (state.delve.cameFromCorridorId) {
            const c = state.dungeon.getCorridor(state.delve.cameFromCorridorId);
            if (c && (c.from === roomId || c.to === roomId) && FD.Rules.DoorRules.passable(state, c, roomId).ok) {
                return c;
            }
        }
        for (const c of state.dungeon.knownExits(roomId)) {
            if (c.traversed && !c.obstacle && FD.Rules.DoorRules.passable(state, c, roomId).ok) {
                return c;
            }
        }
        return null;
    }

    /**
     * Describes how an item can be used as a missile.
     * TABLE 6 ranges via maxZoneDistance; TABLE 5: oil flask and holy water thrown for 1d8.
     * @param {Object} item  Inventory item.
     * @returns {Object|null} { name, damage, maxDist, thrown, consumable, undeadOnly, reload, magicBonus }
     */
    static missileProfile(item) {
        if (item.kind === FD.Enums.ItemKind.WEAPON) {
            const def = FD.Data.Weapons[item.defId];
            if (def.missile) {
                return { name: item.name, damage: def.damage, maxDist: CombatEngine.maxZoneDistance(def.range), reload: !!def.reload, magicBonus: item.magicBonus || 0 };
            }
            if (def.thrownRange) {
                return { name: item.name + ' (thrown)', damage: def.damage, maxDist: CombatEngine.maxZoneDistance(def.thrownRange), thrown: true, magicBonus: item.magicBonus || 0 };
            }
            return null;
        }
        if (item.defId === 'oil') {
            // TABLE 5: oil may be thrown/ignited as a situational attack. GM RULING: 1d8, range 2.
            return { name: 'Burning oil', damage: '1d8', maxDist: 1, consumable: true, magicBonus: 0 };
        }
        if (item.defId === 'holyWater') {
            // TABLE 5: holy water typically deals 1d8 to undead.
            return { name: 'Holy water', damage: '1d8', maxDist: 1, consumable: true, undeadOnly: true, magicBonus: 0 };
        }
        return null;
    }

    /**
     * The actions the PC may declare this round, with disabled reasons citing rules.
     * @param {FD.Model.GameState} state  Game state.
     * @param {number} plannedZone        Zone the PC plans to move to.
     * @returns {Object[]}  Descriptors { type, label, enabled, reason, itemUid, spellId, source, targeting }.
     */
    static legalActions(state, plannedZone) {
        const c = state.combat;
        const pc = state.character;
        const A = FD.Enums.CombatAction;
        const list = [];
        const standing = c.standing;
        const engaged = c.pcEngaged;
        const add = (a) => list.push(Object.assign({ enabled: true, reason: '' }, a));

        let weapon = pc.weapon;
        if (weapon.item && c.thrown.indexOf(weapon.item.uid) >= 0) {
            weapon = { item: null, def: FD.Data.UNARMED, magicBonus: 0, magical: false };
        }
        let reachText = '';
        if (weapon.def.reach) {
            reachText = ', reach';
        }
        add({ type: A.ATTACK, label: 'Attack: ' + weapon.def.name + ' (' + weapon.def.damage + reachText + ')', enabled: standing.length > 0, reason: standing.length > 0 ? '' : 'No enemies standing' });

        // RULE 60: missiles
        for (const item of pc.inventory.items) {
            const prof = CombatEngine.missileProfile(item);
            if (!prof) {
                continue;
            }
            if (prof.thrown && c.thrown.indexOf(item.uid) >= 0) {
                continue;
            }
            let reason = '';
            if (c.roomSize === 1) {
                reason = 'Small room: no missiles (rule 60)';
            } else if (prof.reload && c.crossbowRound === c.round - 1) {
                reason = 'Reloading: a crossbow fires every other round (RULE CONFLICT 2)';
            } else {
                const inRange = standing.some(m => {
                    const d = CombatEngine.distance(m.zone, plannedZone);
                    return d >= 1 && d <= prof.maxDist;
                });
                if (!inRange) {
                    reason = 'No target 1-' + prof.maxDist + ' zone(s) away (rule 60: not your own zone)';
                }
            }
            let qty = '';
            if (prof.consumable) {
                qty = ' x' + item.qty;
            }
            add({ type: A.MISSILE, label: 'Shoot/throw: ' + prof.name + ' (' + prof.damage + ')' + qty, itemUid: item.uid, enabled: reason === '', reason: reason });
        }

        // RULE 61: spells
        for (const s of FD.Rules.SpellRules.castableSpells(state, 'combat')) {
            let reason = s.reason || '';
            if (!reason && (s.targeting === 'monster' || s.targeting === 'zone') && standing.length === 0) {
                reason = 'No target';
            }
            let label = 'Cast: ' + s.name;
            if (s.source === 'scroll') {
                label += ' (scroll)';
            } else if (s.count > 1) {
                label += ' x' + s.count;
            }
            add({ type: A.CAST, label: label, spellId: s.spellId, source: s.source, itemUid: s.itemUid, targeting: s.targeting, enabled: reason === '', reason: reason });
        }

        // RULE 61d: Turn Undead
        if (pc.cls.turnUndead) {
            const t = FD.Rules.TurnUndeadRules.canTurn(state);
            add({ type: A.TURN, label: 'Turn Undead', enabled: t.ok, reason: t.reason });
        }

        // Potions
        for (const item of pc.inventory.items) {
            if (item.kind === FD.Enums.ItemKind.MAGIC && FD.Data.MagicItems[item.defId] && FD.Data.MagicItems[item.defId].use) {
                add({ type: A.ITEM, label: 'Drink: ' + item.name, itemUid: item.uid });
            }
        }

        // RULE 64: withdraw / retreat
        const escape = CombatEngine.escapeCorridor(state);
        let wReason = '';
        if (!engaged) {
            wReason = 'Only when Engaged (rule 64)';
        } else if (c.pcZone === FD.Enums.Zone.PARTY && !escape) {
            wReason = 'No known way out to flee through';
        }
        add({ type: A.WITHDRAW, label: 'Withdraw (1 zone back, no free attacks)', enabled: wReason === '', reason: wReason });
        let rReason = '';
        if (!engaged) {
            rReason = 'Only when Engaged (rule 64)';
        } else if (!escape && c.pcZone - CombatEngine.pcMoveAllowance(state) < 0) {
            rReason = 'No known way out to flee through';
        }
        add({ type: A.RETREAT, label: 'Retreat (full move back; free attacks on you)', enabled: rReason === '', reason: rReason });

        // RULE 58e: leave the board
        let lReason = '';
        if (c.pcZone !== FD.Enums.Zone.PARTY) {
            lReason = 'Leave from your home zone (Party) (rule 58e)';
        } else if (engaged) {
            lReason = 'Engaged: rule 58c (Withdraw or Retreat)';
        } else if (!escape) {
            lReason = 'No known way out to flee through';
        }
        add({ type: A.LEAVE, label: 'Leave the board (flee)', enabled: lReason === '', reason: lReason });

        add({ type: A.HOLD, label: 'Just move / hold', enabled: true });
        add({ type: A.SURRENDER, label: 'Surrender (rule 63)', enabled: true });
        return list;
    }

    /**
     * Runs one full combat round (rule 56).
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} decl               { zone, action: { type, itemUid, spellId, source, targetUid, targetZone }, dropTreasure }.
     * @returns {void}
     */
    static runRound(state, decl) {
        const c = state.combat;
        if (!c || c.over) {
            return;
        }
        const pc = state.character;
        const A = FD.Enums.CombatAction;
        const action = decl.action || { type: A.HOLD };
        c.pcHurtThisRound = false;
        c.pendingDamage = [];
        c.pcLeftBoard = false;
        c.shot = {};
        FD.Core.log.add('— Round ' + c.round + ' —', 'combat');

        // RULE 61a / 53e: spells are declared before initiative
        if (action.type === A.CAST) {
            FD.Core.log.add('[R61a Declare] You begin casting ' + FD.Data.Spells[action.spellId].name + '.', 'rule');
        }

        // RULE 47: a surprised side loses round 1
        let pcActs = true;
        let monstersAct = true;
        if (c.round === 1) {
            if (c.surprise.pc && !c.surprise.monsters) {
                pcActs = false;
            }
            if (c.surprise.monsters && !c.surprise.pc) {
                monstersAct = false;
            }
        }
        // GM RULING: a paralysed adventurer can do nothing
        c.pcParalysed = pc.conditions.paralysedRounds > 0;
        if (c.pcParalysed) {
            pcActs = false;
            FD.Core.log.add('You are paralysed and cannot act!', 'danger');
        }

        // RULE 55 (Initiative): each side rolls 1d6; higher acts first; ties act at once
        let order = 'none';
        if (pcActs && monstersAct) {
            const pcRoll = FD.Core.dice.d6();
            const monRoll = FD.Core.dice.d6();
            if (pcRoll > monRoll) {
                order = 'pc';
            } else if (monRoll > pcRoll) {
                order = 'monsters';
            } else {
                order = 'tie';
            }
            let outcome = 'you act first';
            if (order === 'monsters') {
                outcome = 'they act first';
            } else if (order === 'tie') {
                outcome = 'TIE: all damage at end of round';
            }
            FD.Core.log.roll('R55', 'Initiative', 'you d6=' + pcRoll + ', them d6=' + monRoll, outcome);
        } else if (pcActs) {
            order = 'pc';
        } else if (monstersAct) {
            order = 'monsters';
        }
        c.order = order;
        c.pcActs = pcActs;
        c.monstersAct = monstersAct;
        c.simultaneous = order === 'tie';

        // STEP 1: Morale (rule 57)
        if (CombatEngine.afterStep(state)) {
            return;
        }

        // STEP 2: Movement (rule 58)
        CombatEngine.runStep(state, () => CombatEngine.pcMovement(state, decl), (f) => CombatEngine.monsterMovement(state, f));
        if (c.over) {
            return;
        }
        if (c.pcLeftBoard) {
            CombatEngine.resolvePursuit(state, decl);
            if (c.over) {
                return;
            }
        }
        if (CombatEngine.afterStep(state)) {
            return;
        }

        // STEP 3: Missiles (rule 60)
        CombatEngine.runStep(state, () => CombatEngine.pcMissile(state, action), (f) => CombatEngine.monsterMissiles(state, f));
        if (CombatEngine.afterStep(state)) {
            return;
        }

        // STEP 4: Spells and Turning Undead (rule 61)
        CombatEngine.runStep(state, () => CombatEngine.pcSpellStep(state, action), null);
        if (CombatEngine.afterStep(state)) {
            return;
        }

        // STEP 5: Melee (rule 62)
        CombatEngine.runStep(state, () => CombatEngine.pcMelee(state, action), (f) => CombatEngine.monsterMelee(state, f));
        if (c.simultaneous && !c.over) {
            CombatEngine.applyPending(state);
        }
        if (CombatEngine.afterStep(state)) {
            return;
        }

        // STEP 6: Surrender (rule 63)
        if (action.type === A.SURRENDER) {
            CombatEngine.pcSurrender(state);
            if (c.over) {
                return;
            }
        }
        CombatEngine.endOfRound(state);
    }

    /**
     * Runs one step of the round in initiative order. Zombies (actsLast) always
     * go after the adventurer (TABLE 11).
     * @param {FD.Model.GameState} state  Game state.
     * @param {Function|null} pcFn        The PC's part of the step.
     * @param {Function|null} monFn       The monsters' part; receives a filter.
     * @returns {void}
     */
    static runStep(state, pcFn, monFn) {
        const c = state.combat;
        const notLast = m => !m.hasTag('actsLast');
        const last = m => m.hasTag('actsLast');
        if (c.order === 'monsters') {
            if (c.monstersAct && monFn) {
                monFn(notLast);
            }
            if (c.over) {
                return;
            }
            if (c.pcActs && pcFn) {
                pcFn();
            }
        } else {
            if (c.pcActs && pcFn) {
                pcFn();
            }
            if (c.over) {
                return;
            }
            if (c.monstersAct && monFn) {
                monFn(notLast);
            }
        }
        if (c.over) {
            return;
        }
        // TABLE 11 (Zombie): always acts last
        if (c.monstersAct && monFn) {
            monFn(last);
        }
    }

    /**
     * Checks for the end of the fight and morale after each step.
     * RULE 52a / RULE 57 (Morale step): morale after the first casualty and at half defeated.
     * RULE 58e: combat ends when every creature on one side is out.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {boolean}  True if combat is over.
     */
    static afterStep(state) {
        const c = state.combat;
        if (!c || c.over) {
            return true;
        }
        if (c.simultaneous) {
            return false;
        }
        const morale = FD.Rules.MoraleRules.resolveCombatMorale(state);
        if (morale === 'bargain') {
            CombatEngine.finish(state, 'bargain');
            return true;
        }
        if (c.standing.length === 0) {
            CombatEngine.finish(state, 'victory');
            return true;
        }
        return false;
    }

    /**
     * The PC's movement step.
     * RULE 58 (movement), 58b (Blocking), 58e (Leaving the Board),
     * RULE 64a (Withdraw), 64b (Retreat), RULE 53e (no move when casting).
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} decl               Declaration.
     * @returns {void}
     */
    static pcMovement(state, decl) {
        const c = state.combat;
        const A = FD.Enums.CombatAction;
        const Z = FD.Enums.Zone;
        const action = decl.action || { type: A.HOLD };
        const mp = CombatEngine.pcMoveAllowance(state);

        if (action.type === A.WITHDRAW) {
            // RULE 64a: one zone back toward your side; no free attacks; from home, leave the board
            if (c.pcZone === Z.PARTY) {
                CombatEngine.leaveBoard(state, 'You withdraw off the board (rule 64a).');
            } else {
                c.pcZone -= 1;
                FD.Core.log.add('You withdraw to the ' + FD.Enums.ZoneName[c.pcZone] + ' (rule 64a).', 'combat');
            }
            return;
        }
        if (action.type === A.RETREAT) {
            // RULE 64b: full movement; each engaged enemy gets one free melee attack
            CombatEngine.freeAttacks(state);
            if (c.over) {
                return;
            }
            const target = c.pcZone - mp;
            if (target < 0) {
                CombatEngine.leaveBoard(state, 'You retreat off the board (rule 64b).');
            } else {
                c.pcZone = target;
                FD.Core.log.add('You retreat to the ' + FD.Enums.ZoneName[c.pcZone] + ' (rule 64b).', 'combat');
            }
            return;
        }
        if (action.type === A.LEAVE) {
            // RULE 58e: moving out of your own zone leaves the board
            CombatEngine.leaveBoard(state, 'You flee off the back of the board (rule 58e).');
            return;
        }
        if (action.type === A.CAST) {
            // RULE 53e: a caster may not move in a round they cast
            return;
        }
        const dest = decl.zone;
        if (dest === undefined || dest === null || dest === c.pcZone) {
            return;
        }
        if (c.pcEngaged) {
            FD.Core.log.add('You are Engaged and cannot simply walk away (rule 58c).', 'combat');
            return;
        }
        const step = dest > c.pcZone ? 1 : -1;
        let moved = 0;
        while (c.pcZone !== dest && moved < mp) {
            const next = c.pcZone + step;
            if (c.round === 1 && c.distance === FD.Enums.Distance.DISTANT && next === Z.CENTRE) {
                FD.Core.log.add('Distant: no one may enter the Centre in round 1 (rule 48).', 'combat');
                break;
            }
            c.pcZone = next;
            moved++;
            if (CombatEngine.zoneBlocked(c, next) && next !== dest) {
                FD.Core.log.add('An enemy blocks your way in the ' + FD.Enums.ZoneName[next] + ' (rule 58b).', 'combat');
                break;
            }
        }
        if (moved > 0) {
            FD.Core.log.add('You move to the ' + FD.Enums.ZoneName[c.pcZone] + '.', 'combat');
        }
    }

    /**
     * Marks the PC as having left the board.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} text               Log text.
     * @returns {void}
     */
    static leaveBoard(state, text) {
        state.combat.pcLeftBoard = true;
        FD.Core.log.add(text, 'combat');
    }

    /**
     * RULE 64b: each enemy Engaged with a retreating creature gets one free melee attack.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static freeAttacks(state) {
        const c = state.combat;
        for (const m of c.monsters) {
            if (c.over) {
                return;
            }
            if (m.canAct && !m.fleeing && m.zone === c.pcZone) {
                FD.Core.log.add(m.name + ' strikes as you turn to run (rule 64b)!', 'danger');
                CombatEngine.monsterAttack(state, m, m.attacks[0]);
            }
        }
    }

    /**
     * Monsters' movement step.
     * RULE 58: monsters move up to their Move in zones. 58c: Engaged monsters stay.
     * TABLE 13 (Flee): fleeing monsters head for the Enemy edge and off the board.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Function} filter           Which monsters move in this pass.
     * @returns {void}
     */
    static monsterMovement(state, filter) {
        const c = state.combat;
        for (const m of c.monsters.filter(filter)) {
            if (m.state !== FD.Enums.MonsterState.STANDING || m.webbedRounds > 0) {
                continue;
            }
            if (m.fleeing) {
                CombatEngine.fleeMove(state, m);
                continue;
            }
            if (c.pcLeftBoard || m.attached) {
                continue;
            }
            if (m.zone === c.pcZone) {
                continue;
            }
            const dest = FD.Rules.MonsterAI.decideMove(m, state);
            CombatEngine.moveMonster(state, m, dest);
        }
    }

    /**
     * Moves a monster toward a zone, one zone per movement point.
     * RULE 58b: it must stop when it enters the adventurer's zone.
     * @param {FD.Model.GameState} state  Game state.
     * @param {FD.Model.Monster} m        Monster.
     * @param {number} dest               Destination zone.
     * @returns {void}
     */
    static moveMonster(state, m, dest) {
        const c = state.combat;
        if (dest === m.zone) {
            return;
        }
        const step = dest > m.zone ? 1 : -1;
        let moved = 0;
        while (m.zone !== dest && moved < m.move) {
            const next = m.zone + step;
            if (c.round === 1 && c.distance === FD.Enums.Distance.DISTANT && next === FD.Enums.Zone.CENTRE) {
                break;
            }
            m.zone = next;
            moved++;
            if (next === c.pcZone) {
                break;
            }
        }
        if (moved > 0) {
            FD.Core.log.add(m.name + ' moves to the ' + FD.Enums.ZoneName[m.zone] + '.', 'combat');
        }
    }

    /**
     * Moves a fleeing (or turned) monster away and off the board.
     * RULE 64a: an engaged monster withdraws one zone; otherwise full movement.
     * TABLE 10: turned undead move away; off the board they are Turned.
     * @param {FD.Model.GameState} state  Game state.
     * @param {FD.Model.Monster} m        Monster.
     * @returns {void}
     */
    static fleeMove(state, m) {
        const c = state.combat;
        let steps = m.move;
        if (m.zone === c.pcZone) {
            steps = 1;
        }
        const target = m.zone + steps;
        if (target > FD.Enums.Zone.ENEMY) {
            CombatEngine.markGone(m);
            FD.Core.log.add(m.name + ' flees off the board.', 'good');
        } else {
            m.zone = target;
            FD.Core.log.add(m.name + ' flees to the ' + FD.Enums.ZoneName[m.zone] + '.', 'combat');
        }
    }

    /**
     * Converts a fleeing monster that has left into its final state.
     * @param {FD.Model.Monster} m  Monster.
     * @returns {void}
     */
    static markGone(m) {
        m.fleeing = false;
        if (m.turnedFlag) {
            m.state = FD.Enums.MonsterState.TURNED;
        } else {
            m.state = FD.Enums.MonsterState.FLED;
        }
    }

    /**
     * The PC's missile attack.
     * RULE 60: d20 + Attack Bonus (TABLE 3) + DEX modifier; Halfling +1 (TABLE 2).
     * Not possible in Small rooms or at a target in your own zone.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} action             Declared action.
     * @returns {void}
     */
    static pcMissile(state, action) {
        if (action.type !== FD.Enums.CombatAction.MISSILE) {
            return;
        }
        const c = state.combat;
        const pc = state.character;
        const item = pc.inventory.get(action.itemUid);
        if (!item) {
            return;
        }
        const prof = CombatEngine.missileProfile(item);
        if (c.roomSize === 1) {
            FD.Core.log.add('No room to shoot in a Small room (rule 60).', 'combat');
            return;
        }
        const targets = c.standing.filter(m => {
            const d = CombatEngine.distance(m.zone, c.pcZone);
            return d >= 1 && d <= prof.maxDist;
        });
        if (targets.length === 0) {
            FD.Core.log.add('No target in range for your ' + prof.name + ' (rule 60).', 'combat');
            return;
        }
        let target = targets[0];
        for (const t of targets) {
            if (t.uid === action.targetUid) {
                target = t;
            }
        }
        pc.conditions.invisible = false;
        // RULE 60 / TABLE 2 / TABLE 3
        const mods = pc.attackBonus + pc.modifier('DEX') + pc.race.missileBonus + prof.magicBonus - CombatEngine.situationalPenalty(state);
        const roll = FD.Core.dice.d20();
        const total = roll + mods;
        // RULE CONFLICT 3: a total that equals or exceeds AC hits
        const hit = total >= target.ac;
        FD.Core.log.roll('R60', 'Missile: ' + prof.name, 'd20=' + roll + FD.Data.Attributes.formatMod(mods) + '=' + total + ' vs AC ' + target.ac + ' (' + target.name + ')', hit ? 'HIT' : 'miss');
        if (prof.consumable) {
            pc.inventory.consume(item.defId, 1);
        }
        if (prof.thrown) {
            c.thrown.push(item.uid);
        }
        if (prof.reload) {
            c.crossbowRound = c.round;
        }
        if (!hit) {
            return;
        }
        if (prof.undeadOnly && !target.hasTag('undead')) {
            FD.Core.log.add('The holy water splashes harmlessly on ' + target.name + '.', 'combat');
            return;
        }
        if (target.hasTag('needsMagicWeapon') && !(prof.magicBonus > 0 || prof.undeadOnly || item.defId === 'oil' || item.silver)) {
            FD.Core.log.add('Your missile passes through ' + target.name + ' without harm (needs magic or silver).', 'combat');
            return;
        }
        const r = FD.Core.dice.rollExpr(prof.damage, state.config.maxDamage);
        const dmg = Math.max(1, r.total + prof.magicBonus);
        FD.Core.log.roll('R59a', 'Damage', r.text + (prof.magicBonus ? '+' + prof.magicBonus : ''), dmg + ' to ' + target.name);
        CombatEngine.damageMonster(state, target, dmg, prof.name);
    }

    /**
     * GM RULINGS shared by every PC attack: darkness -4 (rule 41b) and fatigue (rule 44).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {number}  Total penalty.
     */
    static situationalPenalty(state) {
        let penalty = 0;
        // RULE 41b: attacks in total darkness are at -4
        if (state.clock.isDark) {
            penalty += 4;
        }
        penalty += FD.Rules.AttributeRules.fatiguePenalty(state);
        return penalty;
    }

    /**
     * Monsters' missile step.
     * RULE 60: no missiles in Small rooms or into your own zone.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Function} filter           Which monsters act in this pass.
     * @returns {void}
     */
    static monsterMissiles(state, filter) {
        const c = state.combat;
        if (c.pcLeftBoard || c.roomSize === 1 || state.character.conditions.invisible) {
            return;
        }
        for (const m of c.monsters.filter(filter)) {
            if (c.over) {
                return;
            }
            if (!m.missile || !m.canAct || m.fleeing) {
                continue;
            }
            const weapon = FD.Data.Weapons[m.missile];
            const d = CombatEngine.distance(m.zone, c.pcZone);
            if (d < 1 || d > CombatEngine.maxZoneDistance(weapon.range)) {
                continue;
            }
            if (m.reloading) {
                m.reloading = false;
                FD.Core.log.add(m.name + ' reloads.', 'combat');
                c.shot[m.uid] = true;
                continue;
            }
            CombatEngine.monsterAttack(state, m, { name: m.weaponName || weapon.name, damage: m.attacks[0].damage }, true);
            c.shot[m.uid] = true;
            if (weapon.reload) {
                m.reloading = true;
            }
        }
    }

    /**
     * The PC's spell / turning / item step.
     * RULE 61c: a caster hit before the spell resolves loses the spell.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} action             Declared action.
     * @returns {void}
     */
    static pcSpellStep(state, action) {
        const c = state.combat;
        const A = FD.Enums.CombatAction;
        if (action.type === A.CAST) {
            if (c.pcHurtThisRound) {
                FD.Core.log.add('You are struck before the spell is finished. It is lost (rule 61c)!', 'danger');
                FD.Rules.SpellRules.loseSpell(state, action);
                return;
            }
            const spell = FD.Data.Spells[action.spellId];
            let target = c.getMonster(action.targetUid);
            if (!target || !target.isStanding) {
                target = c.standing.length > 0 ? c.standing[0] : null;
            }
            let targetZone = action.targetZone;
            if (targetZone === undefined || targetZone === null) {
                targetZone = target ? target.zone : FD.Enums.Zone.ENEMY;
            }
            if (spell.targeting === 'monster' || spell.targeting === 'zone') {
                if (spell.targeting === 'monster' && !target) {
                    FD.Core.log.add('No target remains for ' + spell.name + '.', 'combat');
                    return;
                }
                const zone = spell.targeting === 'monster' ? target.zone : targetZone;
                // RULE 53f: range is measured in zones
                if (CombatEngine.distance(c.pcZone, zone) > spell.range) {
                    FD.Core.log.add(spell.name + ': target out of range (rule 53f).', 'combat');
                    return;
                }
            }
            FD.Rules.SpellRules.cast(state, action.spellId, { source: action.source, itemUid: action.itemUid, target: target, targetZone: targetZone });
            return;
        }
        if (action.type === A.TURN) {
            FD.Rules.TurnUndeadRules.attempt(state);
            return;
        }
        if (action.type === A.ITEM) {
            FD.Rules.SpellRules.useItem(state, action.itemUid);
        }
    }

    /**
     * The PC's melee attack.
     * RULE 62 / RULE 58a (Melee Range): same zone, or adjacent with a Reach weapon.
     * RULE 58d (Breaking Through) needs nothing special: with no blocker the PC may enter the Enemy zone.
     * RULE 59: d20 + Attack Bonus (TABLE 3) + STR modifier; total >= AC hits (RULE CONFLICT 3).
     * TABLE 9 (Backstab): +4 to hit and x2 damage against an unaware target.
     * TABLE 11 (Wight): needs a magic or silver weapon.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} action             Declared action.
     * @returns {void}
     */
    static pcMelee(state, action) {
        if (action.type !== FD.Enums.CombatAction.ATTACK) {
            return;
        }
        const c = state.combat;
        const pc = state.character;
        let weapon = pc.weapon;
        if (weapon.item && c.thrown.indexOf(weapon.item.uid) >= 0) {
            weapon = { item: null, def: FD.Data.UNARMED, magicBonus: 0, magical: false };
        }
        let reach = 0;
        if (weapon.def.reach) {
            reach = 1;
        }
        const candidates = c.standing.filter(m => CombatEngine.distance(m.zone, c.pcZone) <= reach);
        if (candidates.length === 0) {
            FD.Core.log.add('No enemy within reach (rule 58a).', 'combat');
            return;
        }
        let target = candidates[0];
        for (const m of candidates) {
            if (m.zone === c.pcZone && target.zone !== c.pcZone) {
                target = m;
            }
        }
        for (const m of candidates) {
            if (m.uid === action.targetUid) {
                target = m;
            }
        }
        pc.conditions.invisible = false;
        const backstab = pc.cls.thief && !target.aware;
        let mods = pc.attackBonus + pc.modifier('STR') + weapon.magicBonus - CombatEngine.situationalPenalty(state);
        if (backstab) {
            mods += FD.Data.BACKSTAB_TO_HIT;
        }
        const roll = FD.Core.dice.d20();
        const total = roll + mods;
        const hit = total >= target.ac;
        let label = 'Melee: ' + weapon.def.name;
        if (backstab) {
            label += ' (BACKSTAB +4, T9)';
        }
        FD.Core.log.roll('R59', label, 'd20=' + roll + FD.Data.Attributes.formatMod(mods) + '=' + total + ' vs AC ' + target.ac + ' (' + target.name + ')', hit ? 'HIT' : 'miss');
        if (!hit) {
            return;
        }
        if (target.hasTag('needsMagicWeapon') && !weapon.magical) {
            FD.Core.log.add('Your ' + weapon.def.name.toLowerCase() + ' passes through ' + target.name + ' like smoke. You need a magic or silver weapon!', 'danger');
            return;
        }
        const r = FD.Core.dice.rollExpr(weapon.def.damage, state.config.maxDamage);
        let dmg = r.total + pc.modifier('STR') + weapon.magicBonus;
        if (backstab) {
            dmg = dmg * FD.Data.BACKSTAB_MULTIPLIER;
        }
        dmg = Math.max(1, dmg);
        let detail = r.text + ' ' + FD.Data.Attributes.formatMod(pc.modifier('STR')) + ' STR';
        if (weapon.magicBonus) {
            detail += ' +' + weapon.magicBonus + ' magic';
        }
        if (backstab) {
            detail += ' x2';
        }
        FD.Core.log.roll('R59a', 'Damage', detail, dmg + ' to ' + target.name);
        CombatEngine.damageMonster(state, target, dmg, weapon.def.name);
    }

    /**
     * Monsters' melee step.
     * RULE 62 / 58a: same zone, or adjacent with reach. TABLE 11 (Stirge): an
     * attached stirge drains 1d3 each round automatically.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Function} filter           Which monsters act in this pass.
     * @returns {void}
     */
    static monsterMelee(state, filter) {
        const c = state.combat;
        if (c.pcLeftBoard) {
            return;
        }
        const pc = state.character;
        for (const m of c.monsters.filter(filter)) {
            if (c.over) {
                return;
            }
            if (!m.canAct || m.fleeing || c.shot[m.uid]) {
                continue;
            }
            let reach = 0;
            if (m.reach) {
                reach = 1;
            }
            if (CombatEngine.distance(m.zone, c.pcZone) > reach) {
                continue;
            }
            if (pc.conditions.invisible) {
                FD.Core.log.add(m.name + ' gropes about but cannot find you.', 'combat');
                continue;
            }
            if (m.attached) {
                // TABLE 11 (Stirge): drains blood after attaching
                const r = FD.Core.dice.rollExpr('1d3', state.config.maxDamage);
                FD.Core.log.roll('T11', m.name + ' drains blood', r.text, r.total + ' damage');
                CombatEngine.damagePc(state, r.total, m.name);
                continue;
            }
            for (const atk of m.attacks) {
                if (c.over) {
                    return;
                }
                CombatEngine.monsterAttack(state, m, atk, false);
            }
        }
    }

    /**
     * Resolves one monster attack on the PC, including special abilities.
     * RULE 59: d20 + monster AB (rule 59 table) vs AC; total >= AC hits.
     * Protection from Evil: -1 to evil monsters' attacks. TABLE 2 (Halfling): +2 AC vs large.
     * TABLE 11 specials: paralysis (Elves immune to ghouls), poison (save or die),
     * energy drain (lose a level), attach (stirge).
     * @param {FD.Model.GameState} state  Game state.
     * @param {FD.Model.Monster} m        Attacker.
     * @param {Object} atk                { name, damage }.
     * @param {boolean} [missile]         True for a missile attack.
     * @returns {void}
     */
    static monsterAttack(state, m, atk, missile) {
        const c = state.combat;
        const pc = state.character;
        // Mirror Image (TABLE 8): each attack aimed at you destroys an image instead
        const images = pc.getEffect('mirrorImage');
        if (images && images.data.images > 0) {
            images.data.images--;
            FD.Core.log.add(m.name + "'s " + atk.name.toLowerCase() + ' shatters one of your images (' + images.data.images + ' left).', 'good');
            if (images.data.images === 0) {
                pc.effects = pc.effects.filter(e => e.id !== 'mirrorImage');
            }
            return;
        }
        let mod = 0;
        if (pc.hasEffect('protEvil') && m.hasTag('evil')) {
            mod -= 1;
        }
        if (pc.conditions.paralysedRounds > 0) {
            // GM RULING: a paralysed target is easy to hit
            mod += 4;
        }
        const ab = m.attackBonus;
        const roll = FD.Core.dice.d20();
        const total = roll + ab + mod;
        const ac = pc.acAgainst(m);
        const hit = total >= ac;
        let detail = 'd20=' + roll + '+' + ab;
        if (mod !== 0) {
            detail += FD.Data.Attributes.formatMod(mod);
        }
        detail += '=' + total + ' vs your AC ' + ac;
        FD.Core.log.roll(missile ? 'R60' : 'R59', m.name + ': ' + atk.name, detail, hit ? 'HIT' : 'miss');
        if (!hit) {
            return;
        }
        const r = FD.Core.dice.rollExpr(atk.damage, state.config.maxDamage);
        FD.Core.log.roll('R59a', 'Damage', r.text, r.total + ' to you');
        CombatEngine.damagePc(state, r.total, m.name);
        if (c.over || missile) {
            return;
        }
        if (m.hasTag('paralysis')) {
            if (m.templateId === 'ghoul' && pc.race.ghoulImmune) {
                FD.Core.log.add('The ghoul\'s touch tingles, but Elves are immune (TABLE 2).', 'good');
            } else {
                const save = FD.Rules.SavingThrowRules.save(state, FD.Enums.Save.PARALYSIS, { reason: m.name, evilSource: m.hasTag('evil') });
                if (!save.success) {
                    // GM RULING: paralysis lasts 1d4 rounds
                    const rounds = FD.Core.dice.roll(4);
                    pc.conditions.paralysedRounds = Math.max(pc.conditions.paralysedRounds, rounds);
                    FD.Core.log.add('You are PARALYSED for ' + rounds + ' round(s)!', 'danger');
                }
            }
        }
        if (m.hasTag('poison')) {
            const save = FD.Rules.SavingThrowRules.save(state, FD.Enums.Save.DEATH, { reason: m.name + ' poison', evilSource: m.hasTag('evil') });
            if (!save.success) {
                pc.hpCurrent = 0;
                CombatEngine.finish(state, 'pcDead', 'poisoned by a ' + m.template.name.toLowerCase());
                return;
            }
        }
        if (m.hasTag('energyDrain')) {
            const drained = FD.Rules.ExperienceRules.drainLevel(state);
            if (drained.died) {
                CombatEngine.finish(state, 'pcDead', 'drained of life by ' + m.name);
                return;
            }
        }
        if (m.hasTag('attach')) {
            m.attached = true;
            FD.Core.log.add(m.name + ' attaches itself to you!', 'danger');
        }
    }

    /**
     * Applies damage to the PC, or queues it on tied initiative (rule 55).
     * RULE 59a / 67: at 0 HP the adventurer is dead.
     * @param {FD.Model.GameState} state  Game state.
     * @param {number} amount             Damage.
     * @param {string} source             Who dealt it.
     * @returns {void}
     */
    static damagePc(state, amount, source) {
        const c = state.combat;
        const pc = state.character;
        c.pcHurtThisRound = true;
        if (c.simultaneous) {
            c.pendingDamage.push({ target: 'pc', amount: amount, source: source });
            FD.Core.log.add('(' + amount + ' damage to you held until the end of the round: tied initiative, rule 55)', 'combat');
            return;
        }
        pc.takeDamage(amount);
        FD.Core.log.add('You take ' + amount + ' damage (' + pc.hpCurrent + '/' + pc.hpMax + ' HP).', 'danger');
        if (pc.hpCurrent <= 0) {
            CombatEngine.finish(state, 'pcDead', 'slain by ' + source);
        }
    }

    /**
     * Applies damage to a monster, or queues it on tied initiative (rule 55).
     * @param {FD.Model.GameState} state  Game state.
     * @param {FD.Model.Monster} m        Target.
     * @param {number} amount             Damage.
     * @param {string} source             Weapon or spell.
     * @returns {void}
     */
    static damageMonster(state, m, amount, source) {
        const c = state.combat;
        if (c && c.simultaneous) {
            c.pendingDamage.push({ target: m.uid, amount: amount, source: source });
            return;
        }
        CombatEngine.applyMonsterDamage(state, m, amount);
    }

    /**
     * Subtracts HP from a monster. RULE 59a: at 0 it dies.
     * @param {FD.Model.GameState} state  Game state.
     * @param {FD.Model.Monster} m        Target.
     * @param {number} amount             Damage.
     * @returns {void}
     */
    static applyMonsterDamage(state, m, amount) {
        const c = state.combat;
        if (m.state === FD.Enums.MonsterState.DEAD) {
            return;
        }
        m.hp = Math.max(0, m.hp - amount);
        if (m.hp <= 0) {
            m.state = FD.Enums.MonsterState.DEAD;
            m.fleeing = false;
            if (c) {
                c.casualties++;
            }
            FD.Core.log.add(m.name + ' falls!', 'good');
        }
    }

    /**
     * RULE 55: on a tie both sides act at once and all damage applies at the end of the round.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static applyPending(state) {
        const c = state.combat;
        const pc = state.character;
        c.simultaneous = false;
        const pending = c.pendingDamage;
        c.pendingDamage = [];
        let pcDamage = 0;
        let killer = '';
        for (const p of pending) {
            if (p.target === 'pc') {
                pcDamage += p.amount;
                killer = p.source;
            } else {
                const m = c.getMonster(p.target);
                if (m) {
                    CombatEngine.applyMonsterDamage(state, m, p.amount);
                }
            }
        }
        if (pcDamage > 0) {
            pc.takeDamage(pcDamage);
            FD.Core.log.add('End of round: you take ' + pcDamage + ' damage (' + pc.hpCurrent + '/' + pc.hpMax + ' HP).', 'danger');
            if (pc.hpCurrent <= 0) {
                CombatEngine.finish(state, 'pcDead', 'slain by ' + killer);
            }
        }
    }

    /**
     * Pursuit after the PC leaves the board.
     * RULE 65: relative speed, encumbrance, dropped treasure, doors and monster
     * motivation decide whether escape succeeds. RULE 42: an Encumbered adventurer
     * cannot outrun. GM RULING: faster pursuers catch you on 1-3 on d6.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} decl               Declaration (dropTreasure flag).
     * @returns {void}
     */
    static resolvePursuit(state, decl) {
        const c = state.combat;
        const pc = state.character;
        const motivation = state.encounter.def.motivation || {};
        const pursuers = c.monsters.filter(m => m.canAct && !m.fleeing);
        if (pursuers.length === 0) {
            CombatEngine.finish(state, 'escaped');
            return;
        }
        if (pc.conditions.invisible) {
            FD.Core.log.add('Unseen, you slip away (rule 65).', 'good');
            CombatEngine.finish(state, 'escaped');
            return;
        }
        if (motivation.pursues === false) {
            FD.Core.log.add('They do not follow: ' + (motivation.text || 'they stay put') + ' (rule 65, motivation).', 'good');
            CombatEngine.finish(state, 'escaped');
            return;
        }
        if (decl.dropTreasure && pc.inventory.treasureItems().length > 0) {
            FD.Rules.ExplorationRules.dropAllTreasure(state);
            FD.Core.log.add('You fling your treasure behind you. They stop to scrabble for it (rule 65).', 'good');
            CombatEngine.finish(state, 'escaped');
            return;
        }
        let caught = false;
        if (pc.isEncumbered) {
            FD.Core.log.add('Weighed down, you cannot outrun them (rule 42).', 'danger');
            caught = true;
        } else {
            let fastest = 0;
            for (const m of pursuers) {
                fastest = Math.max(fastest, m.move);
            }
            const pcMove = CombatEngine.pcMoveAllowance(state);
            if (fastest > pcMove) {
                const roll = FD.Core.dice.d6();
                caught = roll <= 3;
                FD.Core.log.roll('R65', 'Pursuit (GM ruling)', 'd6=' + roll + ' (their Move ' + fastest + ' vs your ' + pcMove + ')', caught ? 'CAUGHT' : 'escaped');
            } else {
                FD.Core.log.add('[R65 Pursuit] They are no faster than you (Move ' + fastest + ' vs ' + pcMove + '): you escape.', 'rule');
            }
        }
        if (!caught) {
            CombatEngine.finish(state, 'escaped');
            return;
        }
        c.pcLeftBoard = false;
        c.pcZone = FD.Enums.Zone.PARTY;
        for (const m of pursuers) {
            m.zone = FD.Enums.Zone.PARTY;
        }
        FD.Core.log.add('They run you down! The fight continues in your zone.', 'danger');
    }

    /**
     * The PC surrenders.
     * RULE 63: players may surrender whenever they choose; the referee decides
     * whether it is accepted. GM RULING: intelligent foes take your treasure and
     * gold and let you go; beasts and mindless undead do not understand.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static pcSurrender(state) {
        const c = state.combat;
        const pc = state.character;
        const intelligent = c.standing.some(m => m.hasTag('intelligent'));
        if (!intelligent) {
            FD.Core.log.add('You throw down your weapon. They do not understand surrender (rule 63).', 'danger');
            return;
        }
        FD.Rules.ExplorationRules.dropAllTreasure(state);
        if (pc.gold > 0) {
            state.room.treasure.push({ id: 'surr-' + Date.now(), kind: 'coins', name: 'Your surrendered purse', value: pc.gold });
            pc.gold = 0;
        }
        FD.Core.log.add('They accept your surrender, strip you of treasure and gold, and drive you off (rule 63).', 'danger');
        CombatEngine.finish(state, 'surrendered');
    }

    /**
     * End-of-round bookkeeping: round counter, awareness, webs, paralysis.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static endOfRound(state) {
        const c = state.combat;
        const pc = state.character;
        for (const m of c.monsters) {
            m.aware = true;
            if (m.webbedRounds > 0) {
                m.webbedRounds--;
            }
        }
        if (c.pcParalysed && pc.conditions.paralysedRounds > 0) {
            pc.conditions.paralysedRounds--;
            if (pc.conditions.paralysedRounds === 0) {
                FD.Core.log.add('Feeling floods back into your limbs.', 'good');
            }
        }
        c.round++;
        if (c.standing.length === 0) {
            CombatEngine.finish(state, 'victory');
        }
    }

    /**
     * Adds XP for defeated monsters to the delve's pending pool.
     * RULE 67: 10 XP per Hit Die (minimum 5), awarded only on escaping the dungeon.
     * GM RULING: killed, surrendered, turned, fled, charmed or slain asleep all count as defeated.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {number}  XP added.
     */
    static collectXp(state) {
        const c = state.combat;
        let total = 0;
        for (const m of c.monsters) {
            if (m.xpAwarded || m.state === FD.Enums.MonsterState.STANDING) {
                continue;
            }
            m.xpAwarded = true;
            total += m.xpValue;
            state.delve.defeatedNames.push(m.name);
        }
        state.delve.monsterXp += total;
        if (total > 0) {
            FD.Core.log.add('+' + total + ' monster XP pending until you escape the dungeon (rule 67).', 'good');
        }
        return total;
    }

    /**
     * Ends the fight and returns to the right screen.
     * RULE 58e: combat ends when one side has left, died, surrendered or stopped fighting.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} outcome            'victory' | 'pcDead' | 'escaped' | 'bargain' | 'surrendered'.
     * @param {string} [cause]            Cause of death, for the epitaph.
     * @returns {void}
     */
    static finish(state, outcome, cause) {
        const c = state.combat;
        if (!c || c.over) {
            return;
        }
        c.over = true;
        c.outcome = outcome;
        const pc = state.character;
        const enc = state.encounter;
        const S = FD.Enums.MonsterState;
        pc.conditions.paralysedRounds = 0;
        for (const m of c.monsters) {
            m.attached = false;
            m.webbedRounds = 0;
        }
        if (outcome === 'pcDead') {
            state.combat = null;
            state.encounter = null;
            FD.Rules.ExplorationRules.handleDeath(state, cause || 'slain in battle');
            return;
        }
        // Leftover fleeing monsters leave; sleeping foes are slain or bound (GM RULING)
        for (const m of c.monsters) {
            if (m.fleeing) {
                CombatEngine.markGone(m);
            }
            if (m.state === S.ASLEEP && (outcome === 'victory' || outcome === 'bargain')) {
                m.state = S.DEAD;
                FD.Core.log.add(m.name + ' is slain in its sleep (GM ruling).', 'info');
            }
        }
        // Thrown weapons: picked up after a win, left behind if you flee
        if (outcome === 'escaped' || outcome === 'surrendered') {
            for (const uid of c.thrown) {
                const item = pc.inventory.remove(uid);
                if (item) {
                    FD.Rules.EquipmentRules.unequip(pc, uid);
                    state.room.treasure.push({ id: 'drop-' + uid, name: item.name, item: item });
                    FD.Core.log.add('Your thrown ' + item.name.toLowerCase() + ' lies where it fell.', 'info');
                }
            }
        } else if (c.thrown.length > 0) {
            FD.Core.log.add('You gather up your thrown weapons.', 'info');
        }
        CombatEngine.collectXp(state);
        state.combat = null;

        if (outcome === 'victory') {
            const surrendered = c.monsters.some(m => m.state === S.SURRENDERED);
            if (surrendered && enc.def.friendlyText) {
                FD.Core.log.narrate('The survivors talk freely now. ' + enc.def.friendlyText);
            }
            FD.Core.log.add('The fight is over.', 'good');
            FD.Rules.EncounterRules.finish(state, FD.Enums.EncounterState.DEFEATED);
            FD.Rules.ExplorationRules.afterCombat(state);
            return;
        }
        if (outcome === 'bargain') {
            // TABLE 13 (Bargain): combat pauses and Reaction/Parley resumes
            enc.monsters = c.monsters.filter(m => m.state === S.STANDING);
            enc.reaction = FD.Enums.Reaction.UNCERTAIN;
            enc.bargain = true;
            enc.talked = false;
            enc.offered = false;
            enc.phase = 'opening';
            enc.surprise = { pc: false, monsters: false };
            state.screen = FD.Enums.Screen.ENCOUNTER;
            FD.Core.log.add('Combat pauses. Back to talking (TABLE 13: Bargain). Talk and offers get +2.', 'good');
            return;
        }
        // escaped or surrendered
        const corridor = CombatEngine.escapeCorridor(state);
        FD.Rules.EncounterRules.finish(state, FD.Enums.EncounterState.PENDING);
        if (corridor) {
            FD.Rules.ExplorationRules.retreatThrough(state, corridor, 'You flee down ' + corridor.description.toLowerCase());
        }
    }
}

FD.Rules.CombatEngine = CombatEngine;
