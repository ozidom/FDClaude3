/**
 * Encounters (rules 46-52): surprise, distance, reaction, parley, bribes,
 * the Hidden Emotion Test and monster motivation. Hands over to CombatEngine
 * when the talking stops.
 */
class EncounterRules {
    /**
     * Creates the monster instances for an encounter, rolling Number and HP.
     * TABLE 11: HP from Hit Dice (d8 per HD; 1/2 HD = 1d4).
     * @param {Object} def  Encounter definition.
     * @returns {FD.Model.Monster[]}
     */
    static spawn(def) {
        const monsters = [];
        const hpNotes = [];
        for (const group of def.monsters) {
            let count = group.count;
            if (typeof count === 'string') {
                count = Math.max(1, FD.Core.dice.rollExpr(count, false).total);
            }
            const template = FD.Data.Monsters[group.monster];
            for (let i = 0; i < count; i++) {
                const hp = FD.Core.dice.rollExpr(FD.Model.Monster.hitDiceExpr(template.hd), false).total;
                const opts = {};
                if (group.names && group.names[i]) {
                    opts.name = group.names[i];
                } else if (count > 1) {
                    opts.name = template.name + ' ' + (i + 1);
                }
                const loadout = group.loadout ? group.loadout[i] : null;
                if (loadout) {
                    opts.missile = loadout.missile || null;
                    opts.reach = !!loadout.reach;
                    opts.weaponName = loadout.weaponName || null;
                    if (loadout.missile) {
                        // TABLE 11 (Goblin): Rear missile users where possible
                        opts.behaviour = ['prefersMissiles'];
                    }
                }
                const m = FD.Model.Monster.fromTemplate(group.monster, hp, opts);
                monsters.push(m);
                hpNotes.push(m.name);
            }
        }
        // Like a GM behind the screen, monster HP is rolled in secret; the board shows wounds instead
        FD.Core.log.add('[T11 Hit Points] The GM rolls Hit Dice in secret for ' + hpNotes.length + ' creature(s).', 'roll');
        return monsters;
    }

    /**
     * Starts an encounter in the current room.
     * RULE 46: an encounter begins when the party becomes aware of monsters;
     * it does not automatically become combat.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} def                Encounter definition (room.encounter or wandering).
     * @param {Object} [opts]             { wandering, peeked, sneakSuccess, noSurprise }.
     * @returns {boolean}                 True if an encounter began.
     */
    static begin(state, def, opts) {
        const o = opts || {};
        if (!def.live) {
            def.live = EncounterRules.spawn(def);
        }
        const monsters = def.live.filter(m => m.state === FD.Enums.MonsterState.STANDING);
        if (monsters.length === 0) {
            def.state = FD.Enums.EncounterState.DEFEATED;
            return false;
        }
        for (const m of monsters) {
            m.fleeing = false;
            m.webbedRounds = 0;
            m.attached = false;
            m.zone = FD.Enums.Zone.ENEMY;
        }
        const enc = {
            def: def,
            monsters: monsters,
            roomId: state.currentRoomId,
            wandering: !!o.wandering,
            surprise: { pc: false, monsters: false },
            distance: def.distance || FD.Enums.Distance.NORMAL,
            reaction: null,
            talked: false,
            offered: false,
            emotion: null,
            emotionResolved: false,
            demand: null,
            phase: 'opening',
            bargain: false
        };
        state.encounter = enc;
        state.screen = FD.Enums.Screen.ENCOUNTER;
        if (o.noSurprise) {
            FD.Core.log.narrate('The ' + EncounterRules.groupName(monsters) + ' are still here.');
        } else {
            FD.Core.log.narrate(def.description);
            EncounterRules.rollSurprise(state, enc, o);
        }
        EncounterRules.setDistance(enc);
        EncounterRules.rollReaction(state, enc, o);

        // Immediate attack, and the monsters know you are there: straight to the Clash Board
        if (enc.reaction === FD.Enums.Reaction.ATTACK && !enc.surprise.monsters) {
            FD.Core.log.add('They attack!', 'danger');
            FD.Rules.CombatEngine.start(state);
        }
        return true;
    }

    /**
     * Describes a group of monsters, e.g. "2 Goblins".
     * @param {FD.Model.Monster[]} monsters  The monsters.
     * @returns {string}
     */
    static groupName(monsters) {
        if (monsters.length === 0) {
            return 'creatures';
        }
        const t = monsters[0].template;
        if (monsters.length === 1) {
            return monsters[0].name;
        }
        return monsters.length + ' ' + t.plural;
    }

    /**
     * Rolls surprise for both sides.
     * RULE 47: each side rolls a d6 and is surprised on 1-2. A Bugbear surprises on 1-3.
     * A Thief who passes Move Silently leaves the monsters automatically unaware.
     * Boots of Elvenkind give -1 to the monsters' surprise roll (TABLE 15).
     * GM RULING: an invisible adventurer is never noticed first.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} enc                The encounter.
     * @param {Object} o                  begin() options.
     * @returns {void}
     */
    static rollSurprise(state, enc, o) {
        const pc = state.character;
        // RULE 47: the party
        if (o.peeked) {
            FD.Core.log.add('[R47 Surprise] You saw them first in your mirror: you cannot be surprised.', 'rule');
        } else {
            let chance = 2;
            for (const m of enc.monsters) {
                // TABLE 11 (Bugbear): surprises on 1-3
                chance = Math.max(chance, m.surpriseChance);
            }
            const roll = FD.Core.dice.d6();
            enc.surprise.pc = roll <= chance;
            FD.Core.log.roll('R47', 'Surprise (you)', 'd6=' + roll, enc.surprise.pc ? 'SURPRISED (1-' + chance + ')' : 'ready');
        }
        // RULE 47: the monsters
        if (pc.conditions.invisible) {
            enc.surprise.monsters = true;
            FD.Core.log.add('[R47 Surprise] You are invisible: they have no idea you are there.', 'rule');
        } else if (o.sneakSuccess) {
            enc.surprise.monsters = true;
            FD.Core.log.add('[R47 Surprise] You moved silently: they are unaware of you.', 'rule');
        } else {
            let roll = FD.Core.dice.d6();
            let detail = 'd6=' + roll;
            // TABLE 15 (Boots of Elvenkind): -1 to the monsters' surprise roll
            if (pc.equippedItem('boots')) {
                roll -= 1;
                detail += '-1 boots=' + roll;
            }
            enc.surprise.monsters = roll <= 2;
            FD.Core.log.roll('R47', 'Surprise (them)', detail, enc.surprise.monsters ? 'SURPRISED' : 'ready');
        }
        if (enc.surprise.pc && enc.surprise.monsters) {
            enc.surprise.pc = false;
            enc.surprise.monsters = false;
            FD.Core.log.add('Both sides start in alarm; neither has the advantage.', 'info');
        }
        // Monsters unaware of the party can be backstabbed (TABLE 9)
        for (const m of enc.monsters) {
            m.aware = !enc.surprise.monsters;
        }
    }

    /**
     * Sets the encounter distance.
     * RULE 48: Close, Normal or Distant, from the room and the surprise result.
     * GM RULING: a surprised party has been ambushed, so the distance is Close.
     * @param {Object} enc  The encounter.
     * @returns {void}
     */
    static setDistance(enc) {
        if (enc.surprise.pc && !enc.surprise.monsters) {
            enc.distance = FD.Enums.Distance.CLOSE;
        }
    }

    /**
     * Determines the monsters' attitude.
     * RULE 49: 2d6 + CHA modifier on TABLE 12, unless the encounter fixes it
     * (SPEC §7: e.g. undead always attack).
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} enc                The encounter.
     * @param {Object} o                  begin() options.
     * @returns {void}
     */
    static rollReaction(state, enc, o) {
        const def = enc.def;
        if (o.noSurprise && def.lastReaction) {
            enc.reaction = def.lastReaction;
            return;
        }
        if (def.reaction) {
            enc.reaction = def.reaction;
            FD.Core.log.add('[R49 Reaction] Fixed by the adventure: ' + FD.Data.reactionById(def.reaction).name + '.', 'rule');
            return;
        }
        const mindless = enc.monsters.every(m => m.hasTag('undead') && !m.hasTag('intelligent'));
        if (mindless) {
            enc.reaction = FD.Enums.Reaction.ATTACK;
            FD.Core.log.add('[R49 Reaction] Mindless undead always attack.', 'rule');
            return;
        }
        const r = FD.Rules.ParleyRules.reactionRoll(state, def.reactionBonus || 0, 'Reaction');
        enc.reaction = r.row.id;
        if (enc.reaction === FD.Enums.Reaction.HOSTILE && def.hostileText) {
            FD.Core.log.narrate(def.hostileText);
        }
    }

    /**
     * True if any monster in the encounter can talk.
     * RULE 50: creatures must understand you.
     * @param {Object} enc  The encounter.
     * @returns {boolean}
     */
    static canTalk(enc) {
        return enc.monsters.some(m => m.hasTag('intelligent') && m.state === FD.Enums.MonsterState.STANDING);
    }

    /**
     * The choices open to the player right now.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {Object[]}  Action descriptors { id, label, enabled, reason }.
     */
    static options(state) {
        const enc = state.encounter;
        const def = enc.def;
        const pc = state.character;
        const R = FD.Enums.Reaction;
        const list = [];
        if (enc.phase === 'emotion') {
            return list;
        }
        if (enc.phase === 'demand') {
            list.push({ id: 'payDemand', label: 'Pay ' + enc.demand.gold + ' gold', enabled: pc.gold >= enc.demand.gold, reason: pc.gold >= enc.demand.gold ? '' : 'Not enough gold' });
            list.push({ id: 'refuseDemand', label: 'Refuse', enabled: true, reason: '' });
            list.push({ id: 'attack', label: 'Attack!', enabled: true, reason: '' });
            return list;
        }
        const speaks = EncounterRules.canTalk(enc);
        const important = def.important && state.config.hiddenEmotionTest && !enc.emotionResolved;
        let talkLabel = 'Talk (parley, rule 50)';
        if (important) {
            talkLabel = 'Talk to ' + def.important.name + ' (Hidden Emotion Test, rule 50a)';
        }
        let talkReason = '';
        if (!speaks) {
            talkReason = 'They do not understand speech (rule 50)';
        } else if (enc.talked) {
            talkReason = 'You have said your piece';
        } else if (enc.reaction === R.ATTACK) {
            talkReason = 'They are attacking!';
        }
        list.push({ id: 'talk', label: talkLabel, enabled: talkReason === '', reason: talkReason });

        const motivation = def.motivation || {};
        if (motivation.wants === 'gold' && speaks) {
            let reason = '';
            if (enc.offered) {
                reason = 'You have already made an offer';
            } else if (pc.gold <= 0) {
                reason = 'You have no gold';
            }
            list.push({ id: 'offerGold', label: 'Offer gold (rule 50 bribe)', enabled: reason === '', reason: reason });
        }
        if (motivation.wants === 'food') {
            let reason = '';
            if (enc.offered) {
                reason = 'You have already made an offer';
            } else if (!pc.inventory.has('rations')) {
                reason = 'You have no rations';
            }
            list.push({ id: 'offerFood', label: 'Toss them your rations', enabled: reason === '', reason: reason });
        }
        if (def.giftItem && EncounterRules.findSpecialItem(pc, def.giftItem.special)) {
            list.push({ id: 'gift', label: def.giftItem.label, enabled: true, reason: '' });
        }
        list.push({ id: 'attack', label: 'Attack!', enabled: true, reason: '' });

        let backReason = '';
        if (enc.reaction === R.ATTACK && !enc.surprise.monsters) {
            backReason = 'They are already on you';
        }
        let backLabel = 'Back away';
        if (enc.reaction === R.HOSTILE && !enc.surprise.monsters) {
            backLabel = 'Back away (they may attack)';
        }
        if (enc.surprise.monsters) {
            backLabel = 'Slip away unnoticed';
        }
        list.push({ id: 'backAway', label: backLabel, enabled: backReason === '', reason: backReason });

        const calm = enc.reaction === R.UNCERTAIN || enc.reaction === R.TALKATIVE || enc.reaction === R.FRIENDLY;
        list.push({ id: 'carryOn', label: 'Leave them be and carry on', enabled: calm, reason: calm ? '' : 'They will not let you be' });
        return list;
    }

    /**
     * Finds a carried item with a special tag (e.g. 'morrowBlade').
     * @param {FD.Model.Character} pc  The adventurer.
     * @param {string} special         Special tag.
     * @returns {Object|null}
     */
    static findSpecialItem(pc, special) {
        for (const item of pc.inventory.items) {
            if (item.special === special) {
                return item;
            }
        }
        return null;
    }

    /**
     * Talks to the monsters.
     * RULE 50a: an important NPC uses the Hidden Emotion Test when it is on.
     * RULE 50 / GM RULING: otherwise talking allows one Reaction reroll.
     * TABLE 13 (Bargain): after a morale failure, talk gets +2.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static talk(state) {
        const enc = state.encounter;
        const def = enc.def;
        const R = FD.Enums.Reaction;
        if (def.important && state.config.hiddenEmotionTest && !enc.emotionResolved) {
            // RULE 50a steps 2-3: secret roll, then the opening words in that emotion
            enc.emotion = FD.Rules.ParleyRules.rollEmotion();
            enc.phase = 'emotion';
            FD.Core.log.narrate(def.important.name + ': ' + def.important.lines[enc.emotion]);
            if (state.character.hasEffect('esp')) {
                FD.Core.log.add('ESP: beneath the words you feel ' + FD.Data.Emotions[enc.emotion].name.toUpperCase() + '.', 'good');
            }
            return;
        }
        enc.talked = true;
        if (enc.reaction === R.TALKATIVE || enc.reaction === R.FRIENDLY) {
            EncounterRules.shareInfo(state);
            return;
        }
        let bonus = 0;
        if (enc.bargain) {
            bonus = 2;
        }
        const r = FD.Rules.ParleyRules.reactionRoll(state, bonus, 'Parley reroll');
        EncounterRules.applyReaction(state, r.row.id);
    }

    /**
     * Applies a new reaction result.
     * TABLE 12: attack -> combat; hostile -> threats; uncertain -> hesitation;
     * talkative/friendly -> information (and an important NPC's secret on Friendly).
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} reactionId         TABLE 12 id.
     * @returns {void}
     */
    static applyReaction(state, reactionId) {
        const enc = state.encounter;
        const def = enc.def;
        const R = FD.Enums.Reaction;
        enc.reaction = reactionId;
        if (reactionId === R.ATTACK) {
            FD.Core.log.add('Talking is over. They attack!', 'danger');
            FD.Rules.CombatEngine.start(state);
            return;
        }
        if (reactionId === R.HOSTILE) {
            FD.Core.log.narrate(def.hostileText || 'They snarl and brandish their weapons. They will not let you near.');
            return;
        }
        if (reactionId === R.UNCERTAIN) {
            FD.Core.log.narrate('They watch you warily, weapons ready, unsure what to make of you.');
            return;
        }
        EncounterRules.shareInfo(state);
        if (reactionId === R.FRIENDLY && def.important) {
            EncounterRules.revealSecret(state);
        }
    }

    /**
     * The monsters share what they know.
     * TABLE 12 (Talkative/Friendly): may bargain, exchange information or allow passage.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static shareInfo(state) {
        const enc = state.encounter;
        const def = enc.def;
        let text = def.friendlyText;
        if (!text) {
            if (EncounterRules.canTalk(enc)) {
                text = 'They have little to tell you, but they will let you pass.';
            } else {
                text = 'They lose interest in you and settle down.';
            }
        }
        FD.Core.log.narrate(text);
    }

    /**
     * An important NPC reveals its deepest secret.
     * RULE 50a: everyone correct - it may reveal its deepest secret or offer major help.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static revealSecret(state) {
        const imp = state.encounter.def.important;
        if (!imp || state.knows(imp.secretFlag)) {
            return;
        }
        state.learn(imp.secretFlag);
        FD.Core.log.narrate(imp.secretText);
        FD.Core.log.add('You learned a secret!', 'good');
    }

    /**
     * Resolves the player's Hidden Emotion guess.
     * RULE 50a: correct = everyone correct (secret / major help); wrong = nobody
     * correct (withhold, mislead, flee, make demands or escalate).
     * @param {FD.Model.GameState} state  Game state.
     * @param {number} guess              Emotion id 1-6.
     * @returns {void}
     */
    static guessEmotion(state, guess) {
        const enc = state.encounter;
        const imp = enc.def.important;
        const correct = FD.Rules.ParleyRules.judgeGuess(enc.emotion, guess);
        enc.emotionResolved = true;
        enc.phase = 'opening';
        enc.talked = true;
        if (correct) {
            enc.reaction = FD.Enums.Reaction.FRIENDLY;
            EncounterRules.shareInfo(state);
            EncounterRules.revealSecret(state);
            return;
        }
        const outcome = imp.failOutcomes[enc.emotion] || { effect: 'withhold', text: imp.name + ' tells you nothing.' };
        FD.Core.log.narrate(outcome.text);
        if (outcome.effect === 'attack') {
            enc.reaction = FD.Enums.Reaction.ATTACK;
            FD.Rules.CombatEngine.start(state);
        } else if (outcome.effect === 'flee') {
            for (const m of enc.monsters) {
                m.state = FD.Enums.MonsterState.FLED;
            }
            EncounterRules.finish(state, FD.Enums.EncounterState.GONE);
        } else if (outcome.effect === 'demand') {
            enc.demand = { gold: outcome.gold || 10 };
            enc.phase = 'demand';
        } else {
            enc.reaction = FD.Enums.Reaction.UNCERTAIN;
        }
    }

    /**
     * Pays what the NPC demanded.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static payDemand(state) {
        const enc = state.encounter;
        state.character.gold -= enc.demand.gold;
        FD.Core.log.add('You hand over ' + enc.demand.gold + ' gold.', 'info');
        enc.demand = null;
        enc.phase = 'opening';
        enc.reaction = FD.Enums.Reaction.TALKATIVE;
        EncounterRules.shareInfo(state);
    }

    /**
     * Refuses the NPC's demand: it turns hostile.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static refuseDemand(state) {
        const enc = state.encounter;
        enc.demand = null;
        enc.phase = 'opening';
        EncounterRules.applyReaction(state, FD.Enums.Reaction.HOSTILE);
    }

    /**
     * Offers gold as a bribe.
     * GM RULING (rule 50): +1 to a reaction reroll for meeting the price, +2 if generous.
     * RULE 51: motivation decides whether gold matters at all.
     * @param {FD.Model.GameState} state  Game state.
     * @param {number} amount             Gold offered.
     * @returns {void}
     */
    static offerGold(state, amount) {
        const enc = state.encounter;
        const pc = state.character;
        const gold = Math.max(0, Math.min(pc.gold, Math.floor(amount)));
        if (gold <= 0) {
            return;
        }
        pc.gold -= gold;
        enc.offered = true;
        enc.talked = true;
        const bonus = FD.Rules.ParleyRules.goldOfferBonus(enc.def.motivation, gold);
        FD.Core.log.add('[R50 Offer] You offer ' + gold + ' gp: ' + FD.Data.Attributes.formatMod(bonus) + ' to the reaction reroll (GM ruling).', 'rule');
        let total = bonus;
        if (enc.bargain) {
            total += 2;
        }
        const r = FD.Rules.ParleyRules.reactionRoll(state, total, 'Reaction with offer');
        EncounterRules.applyReaction(state, r.row.id);
    }

    /**
     * Offers food to hungry creatures.
     * RULE 51: a monster that wants food is swayed by it (+2, GM RULING).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static offerFood(state) {
        const enc = state.encounter;
        state.character.inventory.consume('rations', 1);
        enc.offered = true;
        const bonus = (enc.def.motivation && enc.def.motivation.wants === 'food') ? 2 : 0;
        FD.Core.log.add('[R51 Motivation] You throw down your rations: +' + bonus + ' to the reaction reroll (GM ruling).', 'rule');
        const r = FD.Rules.ParleyRules.reactionRoll(state, bonus, 'Reaction with food');
        if (r.row.id === FD.Enums.Reaction.TALKATIVE || r.row.id === FD.Enums.Reaction.FRIENDLY) {
            enc.reaction = r.row.id;
            FD.Core.log.narrate('They fall on the food, squabbling over it, and lose interest in you.');
            return;
        }
        EncounterRules.applyReaction(state, r.row.id);
    }

    /**
     * Gives the encounter's special gift item (e.g. Morrow's Blade to the wight).
     * The creature is laid to rest: it counts as defeated for XP (rule 67).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static giveGift(state) {
        const enc = state.encounter;
        const pc = state.character;
        const item = EncounterRules.findSpecialItem(pc, enc.def.giftItem.special);
        FD.Rules.EquipmentRules.unequip(pc, item.uid);
        pc.inventory.remove(item.uid);
        FD.Core.log.narrate(enc.def.giftItem.text);
        for (const m of enc.monsters) {
            m.state = FD.Enums.MonsterState.DEAD;
            state.delve.monsterXp += m.xpValue;
            state.delve.defeatedNames.push(m.name);
            FD.Core.log.add(m.name + ' is laid to rest: ' + m.xpValue + ' XP pending (rule 67).', 'good');
        }
        enc.def.lastReaction = FD.Enums.Reaction.FRIENDLY;
        EncounterRules.finish(state, FD.Enums.EncounterState.DEFEATED);
    }

    /**
     * Attacks: moves to the Clash Board. Monsters that were surprised stay unaware.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static attack(state) {
        FD.Core.log.add('You attack!', 'danger');
        FD.Rules.CombatEngine.start(state);
    }

    /**
     * Backs away through the corridor the party came in by.
     * GM RULING: hostile monsters that are aware attack on 1-3 on d6 as you back off.
     * Wandering monsters move on; placed monsters stay in their room.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static backAway(state) {
        const enc = state.encounter;
        if (enc.reaction === FD.Enums.Reaction.HOSTILE && !enc.surprise.monsters) {
            const roll = FD.Core.dice.d6();
            const attacked = roll <= 3;
            FD.Core.log.roll('R49', 'Back away from hostiles (GM ruling)', 'd6=' + roll, attacked ? 'they attack!' : 'they let you go');
            if (attacked) {
                FD.Rules.CombatEngine.start(state);
                return;
            }
        }
        if (enc.wandering) {
            EncounterRules.finish(state, FD.Enums.EncounterState.GONE);
        } else {
            EncounterRules.finish(state, FD.Enums.EncounterState.PENDING);
        }
        const corridor = state.delve.cameFromCorridorId ? state.dungeon.getCorridor(state.delve.cameFromCorridorId) : null;
        if (corridor && !enc.wandering) {
            FD.Rules.ExplorationRules.retreatThrough(state, corridor, 'You back away the way you came.');
        } else {
            FD.Core.log.add('You keep your distance until they lose interest and move on.', 'info');
        }
    }

    /**
     * Ends the encounter peacefully (talk went well, or the monsters hesitate).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static carryOn(state) {
        const enc = state.encounter;
        if (enc.wandering) {
            FD.Core.log.add('They go on their way.', 'info');
            EncounterRules.finish(state, FD.Enums.EncounterState.GONE);
            return;
        }
        enc.def.lastReaction = enc.reaction;
        EncounterRules.finish(state, FD.Enums.EncounterState.PEACEFUL);
    }

    /**
     * Closes the encounter and returns to exploration.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} defState           New FD.Enums.EncounterState for the placed encounter.
     * @returns {void}
     */
    static finish(state, defState) {
        const enc = state.encounter;
        if (!enc.wandering) {
            enc.def.state = defState;
        }
        state.encounter = null;
        state.screen = FD.Enums.Screen.EXPLORATION;
    }
}

FD.Rules.EncounterRules = EncounterRules;
