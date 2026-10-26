/**
 * Dungeon exploration (rules 29-45). Every exploration action runs through
 * performAction(), which follows RULE 30 (The Dungeon Turn Procedure):
 *   1 Describe, 2 Choose, 3 Resolve, 4 Update, 5 Time, 6 The Dungeon Answers.
 */
class ExplorationRules {
    /**
     * Starts a delve at the entrance.
     * RULE 2 / TABLE 1 step 14: place the Party Marker on the Entrance Room.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static enterDungeon(state) {
        const pc = state.character;
        state.delve = FD.Model.GameState.newDelve(state.delve.number + 1);
        state.delve.active = true;
        state.clock.resetForDelve();
        state.hasDelved = true;
        state.combat = null;
        state.encounter = null;
        pc.conditions.invisible = false;
        pc.conditions.paralysedRounds = 0;
        pc.effects = [];
        const room = state.dungeon.entrance;
        state.currentRoomId = room.id;
        room.discovered = true;
        room.visits++;
        ExplorationRules.discoverExits(state, room);
        FD.Core.log.add('— Delve ' + state.delve.number + ': ' + state.dungeon.name + ' —', 'rule');
        FD.Core.log.narrate(room.name + '. ' + room.description);
        if (state.clock.isDark) {
            FD.Core.log.add('Daylight reaches only the top steps. Light a torch before going on (rule 41).', 'info');
        }
        state.screen = FD.Enums.Screen.EXPLORATION;
    }

    /**
     * RULE 33: visible exits are drawn on the player map, ending in "?".
     * Secret corridors stay hidden until found (rule 40).
     * @param {FD.Model.GameState} state  Game state.
     * @param {FD.Model.Room} room        The room entered.
     * @returns {void}
     */
    static discoverExits(state, room) {
        for (const c of state.dungeon.corridorsFrom(room.id)) {
            if (!c.secret || c.discovered) {
                c.discovered = true;
            }
        }
    }

    /**
     * RULE 31a: what the party can see in the current room.
     * RULE 41b: in total darkness, visual information is lost.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{title:string, text:string, dark:boolean}}
     */
    static describeRoom(state) {
        const room = state.room;
        if (state.clock.isDark) {
            let title = 'Darkness';
            if (room.visits > 1 || room.isEntrance) {
                title = room.name + ' (in darkness)';
            }
            return { title: title, text: 'It is pitch black. You hear dripping water and your own breathing. You can only feel your way back along routes you know (rule 41b).', dark: true };
        }
        return { title: room.name, text: room.description, dark: false };
    }

    /**
     * Labels a corridor for buttons and lists.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @returns {string}
     */
    static exitLabel(state, corridor) {
        const dest = state.dungeon.getRoom(corridor.otherEnd(state.currentRoomId));
        if (dest.discovered) {
            return dest.name;
        }
        // RULE 33: an exit not yet explored is marked "?"
        if (corridor.label) {
            return 'unexplored ? (' + corridor.label + ')';
        }
        return 'unexplored ?';
    }

    /**
     * Lists every action the player can take now, with disabled reasons.
     * RULE 30 step 2 (Choose). RULE 3c: anything reasonable can be attempted; the
     * GM (this list) offers the reasonable options for the situation.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {Object[]}  { id, type, group, label, enabled, reason, cost, params }.
     */
    static availableActions(state) {
        const actions = [];
        const pc = state.character;
        const room = state.room;
        const dark = state.clock.isDark;
        const inv = pc.inventory;
        const add = (a) => actions.push(Object.assign({ enabled: true, reason: '', cost: '', params: {} }, a));

        // Light (rule 41)
        if (inv.has('torch')) {
            const t = FD.Rules.LightRules.canLightTorch(state);
            add({ id: 'lightTorch', type: 'lightTorch', group: 'Light', label: 'Light a torch (' + inv.count('torch') + ' left)', enabled: t.ok, reason: t.reason, cost: 'free' });
        }
        if (inv.has('lantern')) {
            const l = FD.Rules.LightRules.canLightLantern(state);
            add({ id: 'lightLantern', type: 'lightLantern', group: 'Light', label: 'Light the lantern (' + inv.count('oil') + ' oil)', enabled: l.ok, reason: l.reason, cost: 'free' });
        }

        // Movement and doors (rules 31d, 35-37, 41b)
        for (const c of state.dungeon.knownExits(room.id)) {
            const destLabel = ExplorationRules.exitLabel(state, c);
            const pass = FD.Rules.DoorRules.passable(state, c, room.id);
            const turns = FD.Rules.EncumbranceRules.corridorTurns(pc, c);
            let reason = pass.reason;
            if (dark && !c.traversed) {
                reason = 'Total darkness: only familiar routes (rule 41b)';
            }
            const costText = turns + (turns === 1 ? ' turn' : ' turns') + (pc.isEncumbered ? ' (encumbered x2)' : '');
            if (c.obstacle && !c.ropeFixed && !pc.hasEffect('levitate')) {
                const hasRope = inv.has('rope') && inv.has('grapplingHook');
                add({ id: 'cross-rope-' + c.id, type: 'cross', group: 'Move', label: 'Cross the ' + c.obstacle.name.toLowerCase() + ' with rope & hook to ' + destLabel, enabled: !reason && hasRope, reason: reason || (hasRope ? '' : 'Needs rope and a grappling hook (TABLE 5)'), cost: costText, params: { corridorId: c.id, method: 'rope' } });
                if (pc.cls.thief) {
                    add({ id: 'cross-climb-' + c.id, type: 'cross', group: 'Move', label: 'Climb across to ' + destLabel + ' (' + pc.thiefSkills.climb + '%)', enabled: !reason, reason: reason, cost: costText, params: { corridorId: c.id, method: 'climb' } });
                }
                add({ id: 'cross-dex-' + c.id, type: 'cross', group: 'Move', label: 'Edge across to ' + destLabel + ' (DEX check)', enabled: !reason, reason: reason, cost: costText, params: { corridorId: c.id, method: 'dex' } });
            } else {
                let verb = 'Go to ';
                if (c.door && c.door.state !== FD.Enums.DoorState.OPEN && pass.ok) {
                    verb = 'Open door to ';
                }
                add({ id: 'move-' + c.id, type: 'move', group: 'Move', label: verb + destLabel, enabled: !reason, reason: reason, cost: costText, params: { corridorId: c.id } });
            }
            if (c.door) {
                const door = c.door;
                if (FD.Rules.DoorRules.canListen(state, c)) {
                    add({ id: 'listen-' + c.id, type: 'listen', group: 'Doors', label: 'Listen at door to ' + destLabel, cost: 'free', params: { corridorId: c.id } });
                }
                if (door.state === FD.Enums.DoorState.STUCK && !door.spiked && door.heldTurns <= 0) {
                    add({ id: 'force-' + c.id, type: 'force', group: 'Doors', label: 'Force the stuck door to ' + destLabel + ' (STR)', cost: '1 turn if it fails', params: { corridorId: c.id } });
                }
                if (door.state === FD.Enums.DoorState.LOCKED && !pass.ok && pc.cls.thief) {
                    const p = FD.Rules.DoorRules.canPickLock(state, c);
                    add({ id: 'pick-' + c.id, type: 'pick', group: 'Doors', label: 'Pick the lock to ' + destLabel + ' (' + pc.thiefSkills.openLocks + '%)', enabled: p.ok, reason: p.reason, cost: '1 turn', params: { corridorId: c.id } });
                }
                if (door.spiked) {
                    add({ id: 'unspike-' + c.id, type: 'unspike', group: 'Doors', label: 'Pull the spike from door to ' + destLabel, cost: 'free', params: { corridorId: c.id } });
                } else if (inv.has('spikes')) {
                    const s = FD.Rules.DoorRules.canSpike(state, c);
                    add({ id: 'spike-' + c.id, type: 'spike', group: 'Doors', label: 'Spike shut door to ' + destLabel, enabled: s.ok, reason: s.reason, cost: 'free (noisy)', params: { corridorId: c.id } });
                }
            }
            if (inv.has('mirror') && !c.peeked && !dark) {
                add({ id: 'peek-' + c.id, type: 'peek', group: 'Search', label: 'Peek toward ' + destLabel + ' with mirror', enabled: !dark && pass.ok, reason: dark ? 'Too dark (rule 41b)' : pass.reason, cost: '1 turn', params: { corridorId: c.id } });
            }
        }

        // Searching (rules 38-40)
        add({ id: 'search', type: 'search', group: 'Search', label: room.searched ? 'Search the room again' : 'Search the room thoroughly', enabled: !dark, reason: dark ? 'Cannot search in darkness (rule 41b)' : '', cost: '1 turn' });
        if (inv.has('pole')) {
            add({ id: 'probe', type: 'probe', group: 'Search', label: "Probe floors with the 10' pole", enabled: !dark, reason: dark ? 'Too dark (rule 41b)' : '', cost: '1 turn' });
        }
        for (const f of room.features) {
            if (f.hidden && f.knowledge && state.knows(f.knowledge)) {
                add({ id: 'recall-' + f.id, type: 'recall', group: 'Search', label: 'Check the ' + f.name.toLowerCase() + ' you were told about', enabled: !dark, reason: dark ? 'Too dark (rule 41b)' : '', cost: '1 turn', params: { featureId: f.id } });
            }
        }
        if (pc.cls.thief) {
            add({ id: 'findTraps', type: 'findTraps', group: 'Search', label: 'Find/remove traps (' + pc.thiefSkills.findTraps + '%)', enabled: !dark, reason: dark ? 'Too dark (rule 41b)' : '', cost: '1 turn' });
            add({ id: 'sneak', type: 'toggleSneak', group: 'Move', label: state.delve.sneak ? 'Sneaking: ON (Move Silently ' + pc.thiefSkills.moveSilently + '%)' : 'Sneaking: off', cost: 'toggle' });
        }

        // Treasure
        const canTake = ExplorationRules.canTake(state);
        const visible = room.visibleTreasure();
        for (const t of visible) {
            add({ id: 'take-' + t.id, type: 'take', group: 'Treasure', label: 'Take: ' + (t.item ? t.item.name : t.name) + ExplorationRules.treasureNote(t), enabled: canTake.ok, reason: canTake.reason, cost: 'free', params: { treasureId: t.id } });
        }
        if (visible.length > 1) {
            add({ id: 'takeAll', type: 'takeAll', group: 'Treasure', label: 'Take everything', enabled: canTake.ok, reason: canTake.reason, cost: 'free' });
        }

        // Peaceful monsters still here
        if (room.encounter && room.encounter.state === FD.Enums.EncounterState.PEACEFUL && FD.Rules.DoorRules.roomIsOccupied(room)) {
            add({ id: 'talk', type: 'talk', group: 'Encounter', label: 'Approach the ' + FD.Rules.EncounterRules.groupName(room.encounter.live.filter(m => m.state === 'standing')), cost: 'free' });
            add({ id: 'attackPeaceful', type: 'attackPeaceful', group: 'Encounter', label: 'Attack them', cost: 'combat' });
        }

        // Magic (rule 53e-f)
        for (const s of FD.Rules.SpellRules.castableSpells(state, 'explore')) {
            let label = 'Cast ' + s.name;
            if (s.source === 'scroll') {
                label += ' (scroll)';
            } else if (s.count > 1) {
                label += ' (x' + s.count + ')';
            }
            if (s.targeting === 'door' || (s.spellId === 'web')) {
                for (const c of state.dungeon.knownExits(room.id)) {
                    if (!c.door) {
                        continue;
                    }
                    const fits = ExplorationRules.doorSpellFits(s.spellId, c.door);
                    if (!fits) {
                        continue;
                    }
                    add({ id: 'cast-' + s.spellId + '-' + (s.itemUid || 'slot') + '-' + c.id, type: 'cast', group: 'Magic', label: label + ' on door to ' + ExplorationRules.exitLabel(state, c), enabled: !s.reason, reason: s.reason, cost: '1 turn', params: { spellId: s.spellId, source: s.source, itemUid: s.itemUid, corridorId: c.id } });
                }
                continue;
            }
            add({ id: 'cast-' + s.spellId + '-' + (s.itemUid || 'slot'), type: 'cast', group: 'Magic', label: label, enabled: !s.reason, reason: s.reason, cost: '1 turn', params: { spellId: s.spellId, source: s.source, itemUid: s.itemUid } });
        }

        // Rest (rule 44, 53g)
        const restLabel = 'Rest (' + state.clock.turnsSinceRest + '/' + state.config.turnsBeforeRest + ' turns since rest)';
        add({ id: 'rest', type: 'rest', group: 'Rest', label: restLabel, cost: '1 turn' });
        add({ id: 'camp', type: 'camp', group: 'Rest', label: 'Camp overnight (recover spells)', cost: state.config.nightRestTurns + ' turns, 3 checks' });

        // Leave (rule 66, 68)
        if (room.isEntrance) {
            add({ id: 'leave', type: 'leave', group: 'Leave', label: 'Leave the dungeon and return to town', cost: 'ends the delve' });
        }
        return actions;
    }

    /**
     * True if a door-targeting spell makes sense on a door.
     * @param {string} spellId              Spell id.
     * @param {FD.Model.Door} door          The door.
     * @returns {boolean}
     */
    static doorSpellFits(spellId, door) {
        const S = FD.Enums.DoorState;
        if (spellId === 'knock') {
            return door.state === S.LOCKED || door.state === S.STUCK || door.state === S.BARRED || door.heldTurns > 0 || door.wizardLocked;
        }
        if (spellId === 'holdPortal' || spellId === 'web') {
            return door.heldTurns <= 0;
        }
        if (spellId === 'wizardLock') {
            return !door.wizardLocked;
        }
        return false;
    }

    /**
     * Short note about a treasure entry's weight.
     * @param {Object} t  Treasure entry.
     * @returns {string}
     */
    static treasureNote(t) {
        if (t.item) {
            return '';
        }
        if (t.kind === 'coins') {
            return ' (' + t.value + ' gp)';
        }
        if (t.slots) {
            return ' (' + t.slots + ' slot' + (t.slots > 1 ? 's' : '') + ')';
        }
        return '';
    }

    /**
     * Can treasure be picked up here?
     * RULE 41b: visual actions fail in darkness. RULE 51: monsters guarding their
     * hoard object unless friendly.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{ok:boolean, reason:string}}
     */
    static canTake(state) {
        const room = state.room;
        if (state.clock.isDark) {
            return { ok: false, reason: 'Too dark to see (rule 41b)' };
        }
        const enc = room.encounter;
        if (enc && FD.Rules.DoorRules.roomIsOccupied(room) && enc.guardsTreasure && enc.lastReaction !== FD.Enums.Reaction.FRIENDLY) {
            return { ok: false, reason: 'Guarded by its owners (rule 51)' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * Runs one exploration action through the Dungeon Turn Procedure.
     * RULE 30: Describe, Choose, Resolve, Update, Time, The Dungeon Answers.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} action             Descriptor from availableActions().
     * @returns {void}
     */
    static performAction(state, action) {
        if (!state.delve.active || state.screen !== FD.Enums.Screen.EXPLORATION || !action.enabled) {
            return;
        }
        // RULE 30 step 3 (Resolve) and step 4 (Update: resolvers mark the map)
        const res = ExplorationRules.resolve(state, action) || { turns: 0 };
        if (res.handled || state.screen !== FD.Enums.Screen.EXPLORATION || !state.character.isAlive) {
            return;
        }
        // RULE 30 step 5 (Time)
        let checks = res.extraChecks || 0;
        if (res.turns > 0) {
            checks += ExplorationRules.advanceTime(state, res.turns).checks;
        }
        if (res.resting) {
            // RULE 44: a turn of rest resets the counter
            state.clock.rest();
            FD.Core.log.add('You rest for a turn. You feel ready to go on (rule 44).', 'good');
        }
        // RULE 30 step 6 (The Dungeon Answers)
        if (checks > 0 && state.screen === FD.Enums.Screen.EXPLORATION) {
            ExplorationRules.runWanderingChecks(state, checks, { resting: !!res.resting });
        }
    }

    /**
     * Resolves one action (RULE 30 step 3).
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} action             Descriptor.
     * @returns {{turns:number, extraChecks:number, handled:boolean, resting:boolean}}
     */
    static resolve(state, action) {
        const p = action.params || {};
        const corridor = p.corridorId ? state.dungeon.getCorridor(p.corridorId) : null;
        const R = FD.Rules;
        switch (action.type) {
            case 'move':
                return ExplorationRules.moveThrough(state, corridor, {});
            case 'cross':
                return ExplorationRules.moveThrough(state, corridor, { method: p.method });
            case 'listen':
                R.DoorRules.listen(state, corridor);
                return { turns: 0 };
            case 'force': {
                const r = R.DoorRules.force(state, corridor);
                return { turns: r.turns, extraChecks: r.extraChecks };
            }
            case 'pick':
                R.DoorRules.pickLock(state, corridor);
                return { turns: 1 };
            case 'spike': {
                const r = R.DoorRules.spike(state, corridor);
                return { turns: 0, extraChecks: r.extraChecks };
            }
            case 'unspike':
                R.DoorRules.unspike(state, corridor);
                return { turns: 0 };
            case 'peek':
                R.SearchAndTrapRules.peekWithMirror(state, corridor);
                return { turns: 1 };
            case 'search':
                R.SearchAndTrapRules.searchRoom(state);
                return { turns: 1 };
            case 'probe':
                R.SearchAndTrapRules.probeWithPole(state);
                return { turns: 1 };
            case 'recall':
                R.SearchAndTrapRules.useKnowledge(state, p.featureId);
                return { turns: 1 };
            case 'findTraps':
                R.SearchAndTrapRules.findAndRemoveTraps(state);
                return { turns: 1 };
            case 'toggleSneak':
                state.delve.sneak = !state.delve.sneak;
                return { turns: 0 };
            case 'lightTorch':
                R.LightRules.lightTorch(state);
                return { turns: 0 };
            case 'lightLantern':
                R.LightRules.lightLantern(state);
                return { turns: 0 };
            case 'rest':
                return { turns: 1, resting: true };
            case 'camp':
                ExplorationRules.campOvernight(state);
                return { handled: true };
            case 'cast':
                R.SpellRules.cast(state, p.spellId, { source: p.source, itemUid: p.itemUid, corridor: corridor });
                // RULE 53e-f / SPEC §6: casting a utility spell takes a turn
                return { turns: 1 };
            case 'take':
                ExplorationRules.takeTreasure(state, p.treasureId);
                return { turns: 0 };
            case 'takeAll':
                for (const t of state.room.visibleTreasure()) {
                    if (!state.character.isAlive) {
                        break;
                    }
                    ExplorationRules.takeTreasure(state, t.id);
                }
                return { turns: 0 };
            case 'talk':
                R.EncounterRules.begin(state, state.room.encounter, { noSurprise: true });
                return { handled: true };
            case 'attackPeaceful':
                if (R.EncounterRules.begin(state, state.room.encounter, { noSurprise: true }) && !state.combat) {
                    R.EncounterRules.attack(state);
                }
                return { handled: true };
            case 'leave':
                ExplorationRules.leaveDungeon(state);
                return { handled: true };
            default:
                return { turns: 0 };
        }
    }

    /**
     * Moves through a corridor into the next room, dealing with doors, obstacles
     * and traps, then advances time and enters the room.
     * RULE 31d: one turn per normal corridor; RULE 42: doubled if Encumbered.
     * RULE 39: an unfound trap triggers on 1-2. GM RULING: a found trap is avoided.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @param {Object} opts                  { method } for obstacles.
     * @returns {{handled:boolean}}
     */
    static moveThrough(state, corridor, opts) {
        const pc = state.character;
        const from = state.currentRoomId;
        FD.Rules.DoorRules.openForPassage(state, corridor, from);

        // Obstacles such as the chasm ledge
        if (corridor.obstacle && !corridor.ropeFixed) {
            const crossed = ExplorationRules.crossObstacle(state, corridor, opts.method);
            if (!crossed) {
                return { handled: true };
            }
        }

        // RULE 39: traps
        let extraTurns = 0;
        const trap = corridor.trap;
        if (trap && !trap.disarmed) {
            if (!trap.hidden) {
                FD.Core.log.add('You edge carefully around the ' + trap.name.toLowerCase() + ' (rule 39).', 'info');
            } else if (pc.hasEffect('levitate')) {
                FD.Core.log.add('You float along a few inches above the flagstones.', 'info');
            } else if (FD.Rules.SearchAndTrapRules.triggers(trap)) {
                const sprung = FD.Rules.SearchAndTrapRules.spring(state, trap);
                if (sprung.died) {
                    return { handled: true };
                }
                // GM RULING: climbing out of a pit costs a turn
                FD.Core.log.add('You climb out of the pit, bruised (1 extra turn).', 'info');
                extraTurns = 1;
            }
        }

        // RULE 30 step 5 (Time)
        const turns = FD.Rules.EncumbranceRules.corridorTurns(pc, corridor) + extraTurns;
        const checks = ExplorationRules.advanceTime(state, turns).checks;

        // RULE 30 step 4 (Update): move the Party Marker, mark the map
        ExplorationRules.arrive(state, corridor, from);

        // RULE 47 / TABLE 9: Move Silently
        const room = state.room;
        let sneakSuccess = false;
        const occupied = FD.Rules.DoorRules.roomIsOccupied(room) && room.encounter.state !== FD.Enums.EncounterState.PEACEFUL;
        if (occupied && state.delve.sneak && pc.cls.thief && !state.clock.isDark) {
            const chance = pc.thiefSkills.moveSilently;
            const roll = FD.Core.dice.d100();
            sneakSuccess = roll <= chance;
            FD.Core.log.roll('T9', 'Move Silently', 'd100=' + roll + ' vs ' + chance + '%', sneakSuccess ? 'unheard' : 'fail');
        }

        // Entering a room with an encounter starts SPEC §7
        if (occupied) {
            const peeked = corridor.peeked;
            corridor.peeked = false;
            FD.Rules.EncounterRules.begin(state, room.encounter, { peeked: peeked, sneakSuccess: sneakSuccess });
            return { handled: true };
        }
        if (room.encounter && room.encounter.state === FD.Enums.EncounterState.PEACEFUL && FD.Rules.DoorRules.roomIsOccupied(room)) {
            FD.Core.log.narrate('The ' + FD.Rules.EncounterRules.groupName(room.encounter.live.filter(m => m.state === 'standing')) + ' are still here, watching you.');
        }
        // RULE 30 step 6 (The Dungeon Answers)
        if (checks > 0) {
            ExplorationRules.runWanderingChecks(state, checks, {});
        }
        return { handled: true };
    }

    /**
     * Crosses an obstacle such as the chasm ledge.
     * Rope & grappling hook (TABLE 5) or Levitate cross with no roll (rule 38's
     * "good method" principle); a Thief climbs (TABLE 9); anyone else makes a DEX
     * check (rule 13). A failure is a fall (rule 39a) back to where you started.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @param {string} method                'rope' | 'climb' | 'dex'.
     * @returns {boolean}  True if across.
     */
    static crossObstacle(state, corridor, method) {
        const pc = state.character;
        const ob = corridor.obstacle;
        if (pc.hasEffect('levitate')) {
            FD.Core.log.add('You float across the ' + ob.name.toLowerCase() + '.', 'good');
            return true;
        }
        if (method === 'rope') {
            pc.inventory.consume('rope', 1);
            pc.inventory.consume('grapplingHook', 1);
            corridor.ropeFixed = true;
            FD.Core.log.add('You fix your rope and hook across the ' + ob.name.toLowerCase() + '. It stays in place for future crossings.', 'good');
            return true;
        }
        let success;
        if (method === 'climb') {
            const chance = pc.thiefSkills.climb;
            const roll = FD.Core.dice.d100();
            success = roll <= chance;
            FD.Core.log.roll('T9', 'Climb Sheer Surfaces', 'd100=' + roll + ' vs ' + chance + '%', success ? 'success' : 'fail');
        } else {
            success = FD.Rules.AttributeRules.check(state, 'DEX', 0, 'Edge across the ledge').success;
        }
        if (success) {
            FD.Core.log.add('You make it across.', 'good');
            return true;
        }
        const r = FD.Core.dice.rollExpr(ob.fall || '2d6', state.config.maxDamage);
        pc.takeDamage(r.total);
        FD.Core.log.roll('R39a', 'Fall', r.text, r.total + ' damage');
        if (pc.hpCurrent <= 0) {
            ExplorationRules.handleDeath(state, 'fell into a chasm');
            return false;
        }
        FD.Core.log.add('You slip, fall, and claw your way back up to where you started.', 'danger');
        const checks = ExplorationRules.advanceTime(state, 1).checks;
        if (checks > 0) {
            ExplorationRules.runWanderingChecks(state, checks, {});
        }
        return false;
    }

    /**
     * Puts the party in the room at the far end of a corridor.
     * RULE 33: discovered rooms and corridors are added to the player map.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor used.
     * @param {string} from                  Room left.
     * @returns {void}
     */
    static arrive(state, corridor, from) {
        const dest = corridor.otherEnd(from);
        state.delve.previousRoomId = from;
        state.delve.cameFromCorridorId = corridor.id;
        corridor.traversed = true;
        corridor.discovered = true;
        state.currentRoomId = dest;
        const room = state.room;
        room.visits++;
        room.discovered = true;
        ExplorationRules.discoverExits(state, room);
        const d = ExplorationRules.describeRoom(state);
        FD.Core.log.narrate(d.title + '. ' + d.text);
    }

    /**
     * Retreats back along a corridor (backing away, fleeing a fight).
     * GM RULING: going back the way you came is safe from traps, but takes the time.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @param {string} text                  Log text.
     * @returns {void}
     */
    static retreatThrough(state, corridor, text) {
        FD.Core.log.add(text, 'info');
        const from = state.currentRoomId;
        const turns = FD.Rules.EncumbranceRules.corridorTurns(state.character, corridor);
        const checks = ExplorationRules.advanceTime(state, turns).checks;
        ExplorationRules.arrive(state, corridor, from);
        state.screen = FD.Enums.Screen.EXPLORATION;
        if (checks > 0) {
            ExplorationRules.runWanderingChecks(state, checks, {});
        }
    }

    /**
     * Advances the Clock.
     * RULE 30 step 5: one tick per turn; light burns (rule 41).
     * RULE 45: a check every second turn. RULE 41b: every turn in darkness triggers a check.
     * @param {FD.Model.GameState} state  Game state.
     * @param {number} turns              Dungeon Turns.
     * @param {Object} [opts]             { suppressChecks } for the night's rest.
     * @returns {{checks:number}}
     */
    static advanceTime(state, turns, opts) {
        const o = opts || {};
        let checks = 0;
        for (let i = 0; i < turns; i++) {
            const tick = state.clock.tick();
            for (const light of tick.expired) {
                FD.Core.log.add('Your ' + light.name.toLowerCase() + ' gutters and goes out.', 'danger');
            }
            if (!o.suppressChecks) {
                if (state.clock.isDark) {
                    // RULE 41b: each Dungeon Turn in darkness triggers a check
                    checks++;
                } else if (tick.wanderingCheckDue) {
                    checks++;
                }
            }
            ExplorationRules.tickTurnEffects(state);
            if (state.clock.turnsSinceRest === state.config.turnsBeforeRest + 1) {
                FD.Core.log.add('You are tired: -' + state.config.noRestPenalty + ' to hit and to checks until you rest (rule 44, GM ruling).', 'danger');
            }
        }
        return { checks: checks };
    }

    /**
     * Counts down spell effects and magically held doors by one turn.
     * RULE 53f: durations are marked against the Clock.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static tickTurnEffects(state) {
        const ended = FD.Rules.SpellRules.tickEffects(state.character);
        for (const name of ended) {
            FD.Core.log.add(name + ' ends.', 'info');
        }
        for (const c of state.dungeon.corridors) {
            if (c.door && c.door.heldTurns > 0) {
                c.door.heldTurns--;
            }
        }
    }

    /**
     * Rolls the wandering monster checks that are due.
     * RULE 30 step 6 / RULE 45.
     * @param {FD.Model.GameState} state  Game state.
     * @param {number} count              Number of checks.
     * @param {Object} opts               { resting }.
     * @returns {boolean}  True if an encounter began.
     */
    static runWanderingChecks(state, count, opts) {
        for (let i = 0; i < count; i++) {
            if (FD.Rules.WanderingMonsterRules.check(state, opts)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Camps overnight in the dungeon.
     * RULE 53g: spells return after a full night's rest plus one turn of study or
     * prayer; the GM makes three Wandering Monster checks and light keeps burning.
     * GM RULING: the night is 48 turns; an encounter interrupts it with no recovery.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static campOvernight(state) {
        const pc = state.character;
        const night = state.config.nightRestTurns;
        const part = Math.floor(night / 3);
        FD.Core.log.add('You make camp for the night (' + night + ' turns, rule 53g).', 'info');
        for (let k = 0; k < 3; k++) {
            ExplorationRules.advanceTime(state, part, { suppressChecks: true });
            if (FD.Rules.WanderingMonsterRules.check(state, { resting: true, reason: 'night ' + (k + 1) + '/3' })) {
                FD.Core.log.add('Your rest is broken!', 'danger');
                return;
            }
        }
        ExplorationRules.advanceTime(state, night - part * 3 + 1, { suppressChecks: true });
        FD.Rules.SpellRules.recoverSpells(pc);
        state.clock.rest();
        let text = 'You wake stiff but rested.';
        if (pc.prepared.length > 0) {
            text += ' After a turn of ' + (pc.classId === 'cleric' ? 'prayer' : 'study') + ', your spells return (rule 53g).';
        }
        FD.Core.log.add(text, 'good');
    }

    /**
     * Picks up a treasure entry from the room.
     * RULE 39: looting a trapped chest may set off its trap.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} treasureId         Entry id.
     * @returns {void}
     */
    static takeTreasure(state, treasureId) {
        const room = state.room;
        const pc = state.character;
        let entry = null;
        for (const t of room.treasure) {
            if (t.id === treasureId) {
                entry = t;
            }
        }
        if (!entry) {
            return;
        }
        if (entry.trapId) {
            const trap = room.getTrap(entry.trapId);
            const res = FD.Rules.SearchAndTrapRules.lootTrap(state, trap);
            if (res.died) {
                return;
            }
        }
        room.treasure = room.treasure.filter(t => t.id !== treasureId);
        const item = FD.Model.Inventory.fromTreasure(entry);
        pc.inventory.add(item);
        FD.Core.log.add('You take: ' + item.name + '.', 'good');
        if (pc.isEncumbered) {
            FD.Core.log.add('You are Encumbered (' + pc.usedSlots + '/' + pc.maxSlots + ' Slots): corridors take double time and you cannot outrun pursuers (rule 42).', 'danger');
        }
    }

    /**
     * Drops an item in the current room. RULE 68: it stays part of the dungeon.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} uid                Item uid.
     * @returns {void}
     */
    static dropItem(state, uid) {
        const pc = state.character;
        const item = pc.inventory.remove(uid);
        if (!item) {
            return;
        }
        FD.Rules.EquipmentRules.unequip(pc, uid);
        state.room.treasure.push({ id: 'drop-' + uid, name: item.name, item: item });
        FD.Core.log.add('You put down the ' + item.name + '.', 'info');
    }

    /**
     * Drops 100 gold coins to lighten the load (rule 42).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static dropGold(state) {
        const pc = state.character;
        const amount = Math.min(100, pc.gold);
        if (amount <= 0) {
            return;
        }
        pc.gold -= amount;
        state.room.treasure.push({ id: 'gold-' + Date.now(), kind: 'coins', name: 'Your dropped coins', value: amount });
        FD.Core.log.add('You leave ' + amount + ' gold coins behind.', 'info');
    }

    /**
     * Drops all treasure-kind items in the room (used for pursuit and surrender).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static dropAllTreasure(state) {
        for (const item of state.character.inventory.treasureItems()) {
            ExplorationRules.dropItem(state, item.uid);
        }
    }

    /**
     * Uses a magic item outside combat (potions).
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} uid                Item uid.
     * @returns {void}
     */
    static useItem(state, uid) {
        FD.Rules.SpellRules.useItem(state, uid);
    }

    /**
     * After a fight: GM RULING: a fight and its aftermath take one Dungeon Turn.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static afterCombat(state) {
        const checks = ExplorationRules.advanceTime(state, 1).checks;
        if (checks > 0 && state.screen === FD.Enums.Screen.EXPLORATION) {
            ExplorationRules.runWanderingChecks(state, checks, {});
        }
    }

    /**
     * Leaves the dungeon from the entrance room.
     * RULE 66: to return to town the party must return to the first room.
     * RULE 68: the delve ends when the party exits.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static leaveDungeon(state) {
        if (!state.room.isEntrance) {
            return;
        }
        FD.Core.log.add('You climb the stair into daylight. The delve is over (rule 68).', 'good');
        FD.Rules.TownRules.enterTown(state);
    }

    /**
     * The adventurer dies.
     * RULE 67: at 0 HP an adventurer is dead and cannot be recovered.
     * RULE 68 / SPEC §10: gold and items stay in the room where they fell.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} cause              How they died.
     * @returns {void}
     */
    static handleDeath(state, cause) {
        const pc = state.character;
        if (pc.dead) {
            return;
        }
        pc.dead = true;
        pc.hpCurrent = 0;
        pc.causeOfDeath = cause;
        const room = state.room;
        for (const item of pc.inventory.items) {
            if (item.kind === FD.Enums.ItemKind.SPELLBOOK) {
                item.spells = pc.spellbook.slice();
                item.name = pc.name + "'s spellbook";
            }
            room.treasure.push({ id: 'body-' + item.uid, name: item.name, item: item });
        }
        if (pc.gold > 0) {
            room.treasure.push({ id: 'body-gold-' + Date.now(), kind: 'coins', name: pc.name + "'s purse", value: pc.gold });
        }
        pc.inventory.items = [];
        pc.gold = 0;
        const epitaph = {
            name: pc.name,
            race: pc.race.name,
            cls: pc.cls.name,
            level: pc.level,
            xp: pc.xp,
            cause: cause,
            room: room ? room.name : 'the dark',
            turn: state.clock.totalTurns,
            delve: state.delve.number,
            day: state.town.day
        };
        state.graveyard.push(epitaph);
        state.lastEpitaph = epitaph;
        state.combat = null;
        state.encounter = null;
        state.delve.active = false;
        state.screen = FD.Enums.Screen.GAME_OVER;
        FD.Core.log.add(pc.name + ' has died: ' + cause + ' (rule 67).', 'danger');
    }
}

FD.Rules.ExplorationRules = ExplorationRules;
