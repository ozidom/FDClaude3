/**
 * Searching (rule 38), traps (rule 39, falls 39a, poison 39b) and secret
 * doors (rule 40), plus the Thief's Find/Remove Traps (TABLE 9).
 */
class SearchAndTrapRules {
    /**
     * Collects everything hidden that a search of the current room could find:
     * hidden features, undiscovered secret corridors, hidden room traps and
     * hidden traps in the mouths of its corridors.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{features:Object[], secrets:FD.Model.Corridor[], roomTraps:Object[], corridorTraps:FD.Model.Corridor[]}}
     */
    static hiddenThings(state) {
        const room = state.room;
        const features = room.features.filter(f => f.hidden);
        const secrets = state.dungeon.corridorsFrom(room.id).filter(c => c.secret && !c.discovered);
        const roomTraps = room.traps.filter(t => t.hidden && !t.disarmed);
        const corridorTraps = state.dungeon.knownExits(room.id).filter(c => c.trap && c.trap.hidden && !c.trap.disarmed);
        return { features: features, secrets: secrets, roomTraps: roomTraps, corridorTraps: corridorTraps };
    }

    /**
     * Searches the room thoroughly (one Dungeon Turn).
     * RULE 38: a general search uses the chance listed for each feature.
     * RULE 40: secret doors are found on 1 on d6 (Elves 1-2, TABLE 2).
     * TABLE 2: Dwarves find unusual stonework on 1-2.
     * GM RULING: one d6 is rolled for the whole search and compared against each
     * hidden thing's chance, so the log never reveals what is (or isn't) there.
     * GM RULING: a general search finds traps in the room and the mouths of its corridors on a 1.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string[]}  Names of what was found.
     */
    static searchRoom(state) {
        const character = state.character;
        const room = state.room;
        const hidden = SearchAndTrapRules.hiddenThings(state);
        const roll = FD.Core.dice.d6();
        const race = character.race;
        let note = 'secret doors 1';
        if (race.secretDoorChance > 1) {
            note = 'secret doors 1-' + race.secretDoorChance;
        }
        if (race.stoneworkChance > 1) {
            note += ', stonework 1-' + race.stoneworkChance;
        }
        FD.Core.log.roll('R38', 'Search', 'd6=' + roll, 'searching (' + note + ')');
        const found = [];
        // RULE 40: secret doors
        for (const c of hidden.secrets) {
            if (roll <= race.secretDoorChance) {
                c.discovered = true;
                found.push('a secret door');
                FD.Core.log.add('You find a secret door! ' + c.description, 'good');
            }
        }
        // RULE 38 / TABLE 2: hidden features
        for (const f of hidden.features) {
            let chance = f.findChance || 1;
            if (f.type === 'stonework') {
                chance = Math.max(chance, race.stoneworkChance);
            }
            if (roll <= chance) {
                SearchAndTrapRules.revealFeature(state, room, f);
                found.push(f.name);
            }
        }
        // GM RULING: traps on a 1
        for (const t of hidden.roomTraps) {
            if (roll <= (t.findChance || 1)) {
                t.hidden = false;
                found.push(t.name);
                FD.Core.log.add('You spot a trap: ' + t.name + '.', 'good');
            }
        }
        for (const c of hidden.corridorTraps) {
            if (roll <= (c.trap.findChance || 1)) {
                c.trap.hidden = false;
                found.push(c.trap.name);
                FD.Core.log.add('You spot a trap in the passage: ' + c.trap.name + ' (' + c.description + ')', 'good');
            }
        }
        room.searched = true;
        if (found.length === 0) {
            FD.Core.log.add('You search thoroughly and find nothing new.', 'info');
        }
        return found;
    }

    /**
     * Items that can be used as a search method (rule 38).
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {string[]}  Item ids.
     */
    static methodsCarried(character) {
        const methods = [];
        if (character.inventory.has('pole')) {
            methods.push('pole');
        }
        if (character.inventory.has('mirror')) {
            methods.push('mirror');
        }
        return methods;
    }

    /**
     * Probes the room and the mouths of its corridors with a 10' pole.
     * RULE 38: if the method would reasonably reveal something, it is found with no roll.
     * TABLE 5 (10' Pole): tests floors and pits from safety.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string[]}  Names found.
     */
    static probeWithPole(state) {
        const room = state.room;
        const hidden = SearchAndTrapRules.hiddenThings(state);
        const found = [];
        for (const f of hidden.features) {
            if (f.foundBy && f.foundBy.indexOf('pole') >= 0) {
                SearchAndTrapRules.revealFeature(state, room, f);
                found.push(f.name);
            }
        }
        for (const t of hidden.roomTraps) {
            if (t.foundBy && t.foundBy.indexOf('pole') >= 0) {
                t.hidden = false;
                found.push(t.name);
                FD.Core.log.add('Your pole finds a trap: ' + t.name + '.', 'good');
            }
        }
        for (const c of hidden.corridorTraps) {
            if (c.trap.foundBy && c.trap.foundBy.indexOf('pole') >= 0) {
                c.trap.hidden = false;
                found.push(c.trap.name);
                FD.Core.log.add('Tapping ahead with your pole, a flagstone tips into darkness: ' + c.trap.name + ' in ' + c.description.toLowerCase(), 'good');
            }
        }
        FD.Core.log.add('[R38 Search method] 10\' pole: no roll needed.', 'rule');
        if (found.length === 0) {
            FD.Core.log.add('You tap every flagstone and crevice. Nothing gives.', 'info');
        }
        return found;
    }

    /**
     * Peeks into the next room with a mirror before entering.
     * RULE 38: a suitable method finds things with no roll. GM RULING: you see
     * what waits beyond, and cannot be surprised entering through that corridor.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor to peek along.
     * @returns {string}  What you see.
     */
    static peekWithMirror(state, corridor) {
        const beyond = state.dungeon.getRoom(corridor.otherEnd(state.currentRoomId));
        corridor.peeked = true;
        let text = 'You angle the mirror along ' + corridor.description.toLowerCase() + ' You see ' + beyond.name.toLowerCase() + ': nothing moves.';
        if (FD.Rules.DoorRules.roomIsOccupied(beyond)) {
            text = 'In the mirror: ' + beyond.encounter.description + ' They have not seen you.';
        }
        FD.Core.log.add('[R38 Search method] Mirror: no roll needed; no surprise for you entering this way.', 'rule');
        FD.Core.log.narrate(text);
        return text;
    }

    /**
     * Goes straight to a feature the party has learned about from an NPC.
     * RULE 38: a method that would reasonably reveal something finds it with no roll.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} featureId          Feature id.
     * @returns {void}
     */
    static useKnowledge(state, featureId) {
        const room = state.room;
        const f = room.getFeature(featureId);
        FD.Core.log.add('[R38 Search method] You know exactly where to look: no roll needed.', 'rule');
        SearchAndTrapRules.revealFeature(state, room, f);
    }

    /**
     * Reveals a hidden feature and anything it was hiding.
     * @param {FD.Model.GameState} state  Game state.
     * @param {FD.Model.Room} room        The room.
     * @param {Object} feature            The feature.
     * @returns {void}
     */
    static revealFeature(state, room, feature) {
        feature.hidden = false;
        FD.Core.log.add('You find: ' + feature.name + '. ' + (feature.text || ''), 'good');
        const contents = room.treasure.filter(t => t.featureId === feature.id);
        if (contents.length > 0) {
            FD.Core.log.add('Inside: ' + contents.map(t => t.name).join(', ') + '.', 'good');
        }
    }

    /**
     * Detect Magic (TABLE 8): reveals magical things in the current room,
     * including magic items hidden inside unfound features.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string[]}  Names of glowing things.
     */
    static revealMagic(state) {
        const room = state.room;
        const names = [];
        for (const t of room.treasure) {
            const magical = t.kind === 'magic' || (t.kind === 'weapon' && t.magicBonus) || (t.item && (t.item.kind === 'magic' || t.item.magicBonus));
            if (!magical) {
                continue;
            }
            if (t.featureId) {
                const f = room.getFeature(t.featureId);
                if (f && f.hidden) {
                    SearchAndTrapRules.revealFeature(state, room, f);
                }
            }
            names.push(t.item ? t.item.name : t.name);
        }
        for (const item of state.character.inventory.items) {
            if (item.kind === 'magic' || item.magicBonus) {
                names.push('your ' + item.name);
            }
        }
        return names;
    }

    /**
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{ok:boolean, reason:string}}
     */
    static canFindTraps(state) {
        if (!state.character.cls.thief) {
            return { ok: false, reason: 'Only a Thief can find and remove traps (TABLE 9)' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * Thief Find/Remove Traps (one Dungeon Turn).
     * TABLE 9: Find/Remove Traps percentage. One roll finds traps in the room and
     * its corridor mouths; a second roll removes found room traps.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static findAndRemoveTraps(state) {
        const chance = state.character.thiefSkills.findTraps;
        const hidden = SearchAndTrapRules.hiddenThings(state);
        const roll = FD.Core.dice.d100();
        const success = roll <= chance;
        FD.Core.log.roll('T9', 'Find Traps', 'd100=' + roll + ' vs ' + chance + '%', success ? 'success' : 'fail');
        if (success) {
            for (const t of hidden.roomTraps) {
                t.hidden = false;
                FD.Core.log.add('You find a trap: ' + t.name + '.', 'good');
            }
            for (const c of hidden.corridorTraps) {
                c.trap.hidden = false;
                FD.Core.log.add('You find a trap in the passage: ' + c.trap.name + '.', 'good');
            }
        }
        const armed = state.room.traps.filter(t => !t.hidden && !t.disarmed);
        if (armed.length > 0) {
            const r2 = FD.Core.dice.d100();
            const removed = r2 <= chance;
            FD.Core.log.roll('T9', 'Remove Traps', 'd100=' + r2 + ' vs ' + chance + '%', removed ? 'disarmed' : 'fail');
            if (removed) {
                for (const t of armed) {
                    t.disarmed = true;
                    FD.Core.log.add('You disarm: ' + t.name + '.', 'good');
                }
            }
        } else if (!success || (hidden.roomTraps.length === 0 && hidden.corridorTraps.length === 0)) {
            FD.Core.log.add('You find no traps.', 'info');
        }
    }

    /**
     * Rolls to see if an unfound trap goes off.
     * RULE 39: when a character does something that could set off a trap, it
     * triggers on 1-2 on 1d6 unless the adventure states otherwise.
     * @param {Object} trap  Trap data.
     * @returns {boolean}    True if it triggers.
     */
    static triggers(trap) {
        const chance = trap.triggerChance || 2;
        const roll = FD.Core.dice.d6();
        const fired = roll <= chance;
        FD.Core.log.roll('R39', 'Trap', 'd6=' + roll, fired ? 'triggered (1-' + chance + ')' : 'not triggered');
        return fired;
    }

    /**
     * Applies a trap's effect.
     * RULE 39a (Falls): 1d6 damage per 10 feet.
     * RULE 39b (Poison): a failed Save vs Poison means death.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} trap               Trap data.
     * @returns {{died:boolean}}
     */
    static spring(state, trap) {
        const character = state.character;
        FD.Core.log.add(trap.text || 'A trap springs!', 'danger');
        trap.hidden = false;
        if (trap.type === 'pit') {
            // RULE 39a: 1d6 per 10 feet
            const dice = Math.max(1, Math.floor((trap.feet || 10) / 10));
            const r = FD.Core.dice.rollExpr(dice + 'd6', state.config.maxDamage);
            character.takeDamage(r.total);
            FD.Core.log.roll('R39a', 'Fall', r.text, r.total + ' damage');
            if (character.hpCurrent <= 0) {
                FD.Rules.ExplorationRules.handleDeath(state, 'fell into a pit');
                return { died: true };
            }
            return { died: false };
        }
        if (trap.type === 'poison') {
            trap.disarmed = true;
            // RULE 39b: failed Save vs Poison means death
            const save = FD.Rules.SavingThrowRules.save(state, FD.Enums.Save.DEATH, { reason: 'poison needle' });
            if (!save.success) {
                FD.Rules.ExplorationRules.handleDeath(state, 'pricked by a poison needle');
                return { died: true };
            }
            FD.Core.log.add('The poison burns, then fades. You live.', 'good');
            return { died: false };
        }
        if (trap.damage) {
            const r = FD.Core.dice.rollExpr(trap.damage, state.config.maxDamage);
            character.takeDamage(r.total);
            FD.Core.log.roll('R39', 'Trap damage', r.text, r.total + ' damage');
            if (character.hpCurrent <= 0) {
                FD.Rules.ExplorationRules.handleDeath(state, 'killed by a trap');
                return { died: true };
            }
        }
        return { died: false };
    }

    /**
     * Checks a room trap linked to treasure before looting it.
     * GM RULING (rule 39): a found trap is avoided by prying the lid open from a
     * safe angle with a crowbar or 10' pole; otherwise it triggers on 1-2.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} trap               Trap data.
     * @returns {{died:boolean}}
     */
    static lootTrap(state, trap) {
        if (!trap || trap.disarmed) {
            return { died: false };
        }
        const inv = state.character.inventory;
        if (!trap.hidden && (inv.has('crowbar') || inv.has('pole'))) {
            FD.Core.log.add('Knowing the trap is there, you pry the lid open from a safe angle. The needle stabs empty air.', 'good');
            trap.disarmed = true;
            return { died: false };
        }
        if (SearchAndTrapRules.triggers(trap)) {
            return SearchAndTrapRules.spring(state, trap);
        }
        return { died: false };
    }
}

FD.Rules.SearchAndTrapRules = SearchAndTrapRules;
