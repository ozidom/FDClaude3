/**
 * Doors (rule 35), listening (rule 36), forcing (rule 37), picking locks
 * (TABLE 9) and spiking doors shut (TABLE 5).
 */
class DoorRules {
    /**
     * Can the party pass this corridor's door from a room right now?
     * RULE 35: open/closed doors pass; stuck must be forced; locked needs a key,
     * a pick or Knock; a barred door opens only from the barred side.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @param {string} fromRoomId            The room the party is in.
     * @returns {{ok:boolean, reason:string, needs:string|null}}
     */
    static passable(state, corridor, fromRoomId) {
        const door = corridor.door;
        const S = FD.Enums.DoorState;
        if (!door) {
            return { ok: true, reason: '', needs: null };
        }
        if (door.spiked) {
            return { ok: false, reason: 'Spiked shut: pull the spike first', needs: 'unspike' };
        }
        if (door.heldTurns > 0) {
            return { ok: false, reason: 'Magically held for ' + door.heldTurns + ' more turns', needs: 'held' };
        }
        if (door.state === S.OPEN || door.state === S.CLOSED) {
            return { ok: true, reason: '', needs: null };
        }
        if (door.state === S.STUCK) {
            return { ok: false, reason: 'Stuck: force it first (rule 37)', needs: 'force' };
        }
        if (door.state === S.LOCKED) {
            if (door.keyId && DoorRules.hasKey(state.character, door.keyId)) {
                return { ok: true, reason: '', needs: null };
            }
            return { ok: false, reason: 'Locked (rule 35): pick it, find the key, or cast Knock', needs: 'unlock' };
        }
        if (door.state === S.BARRED) {
            if (door.barredFrom === fromRoomId) {
                return { ok: true, reason: '', needs: null };
            }
            return { ok: false, reason: 'Barred from the other side (rule 35)', needs: 'barred' };
        }
        return { ok: true, reason: '', needs: null };
    }

    /**
     * True if the adventurer carries the key for a lock.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {string} keyId                  Key id.
     * @returns {boolean}
     */
    static hasKey(character, keyId) {
        for (const item of character.inventory.items) {
            if (item.kind === FD.Enums.ItemKind.KEY && item.keyId === keyId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Opens the door as the party passes, unlocking with a key or lifting a bar.
     * RULE 35: opened doors tend to swing shut afterwards.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @param {string} fromRoomId            The room the party leaves.
     * @returns {void}
     */
    static openForPassage(state, corridor, fromRoomId) {
        const door = corridor.door;
        const S = FD.Enums.DoorState;
        if (!door) {
            return;
        }
        if (door.state === S.LOCKED) {
            FD.Core.log.add('You unlock the door with the key.', 'good');
            door.state = S.CLOSED;
        } else if (door.state === S.BARRED && door.barredFrom === fromRoomId) {
            FD.Core.log.add('You lift the heavy bar from its brackets.', 'info');
            door.state = S.CLOSED;
            door.barredFrom = null;
        }
    }

    /**
     * True if listening is possible at this corridor's door now.
     * GM RULING: listening is a free action, once per door per Dungeon Turn.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @returns {boolean}
     */
    static canListen(state, corridor) {
        const door = corridor.door;
        if (!door || door.state === FD.Enums.DoorState.OPEN) {
            return false;
        }
        return door.listenedTurn !== state.clock.totalTurns;
    }

    /**
     * Listens at a door.
     * RULE 36 (Listening): succeeds on 1 on 1d6; 1-2 for Dwarves, Elves and Halflings.
     * A Thief uses Hear Noise from TABLE 9 instead (1-2). ESP always hears thoughts.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The door's corridor.
     * @returns {FD.Rules.CheckResult}
     */
    static listen(state, corridor) {
        const character = state.character;
        corridor.door.listenedTurn = state.clock.totalTurns;
        const beyond = state.dungeon.getRoom(corridor.otherEnd(state.currentRoomId));
        // RULE 36: base chance is 1 in 6
        let chance = 1;
        let label = 'Listen';
        // RULE 36 / TABLE 2: demi-humans hear on 1-2
        if (character.race.keenHearing) {
            chance = 2;
        }
        // RULE 36 / TABLE 9: a Thief uses Hear Noise
        if (character.cls.thief) {
            chance = Math.max(chance, FD.Data.THIEF_HEAR_NOISE);
            label = 'Hear Noise';
        }
        const roll = FD.Core.dice.d6();
        let success = roll <= chance;
        let detail = 'd6=' + roll;
        if (character.hasEffect('esp')) {
            success = true;
            detail += ' (ESP)';
        }
        const outcome = success ? 'success' : 'fail (needed ' + (chance === 1 ? '1' : '1-' + chance) + ')';
        FD.Core.log.roll('R36', label, detail, outcome);

        let text = 'You hear nothing.';
        if (success && DoorRules.roomIsOccupied(beyond)) {
            text = beyond.encounter.listenText || 'You hear movement on the other side.';
        }
        FD.Core.log.narrate(text);
        return new FD.Rules.CheckResult(success, roll, chance, text);
    }

    /**
     * True if a room holds monsters still standing.
     * @param {FD.Model.Room} room  The room.
     * @returns {boolean}
     */
    static roomIsOccupied(room) {
        const enc = room.encounter;
        if (!enc) {
            return false;
        }
        if (enc.state === FD.Enums.EncounterState.DEFEATED || enc.state === FD.Enums.EncounterState.GONE) {
            return false;
        }
        if (Array.isArray(enc.live)) {
            return enc.live.some(m => m.state === FD.Enums.MonsterState.STANDING);
        }
        return true;
    }

    /**
     * Forces a stuck door.
     * RULE 37: STR Attribute Check. A failure costs one Dungeon Turn and may
     * trigger a Wandering Monster check. GM RULING: a crowbar gives +2.
     * GM RULING: a forced door counts as closed (no longer stuck) afterwards.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @returns {{success:boolean, turns:number, extraChecks:number}}
     */
    static force(state, corridor) {
        let bonus = 0;
        if (state.character.inventory.has('crowbar')) {
            bonus = 2;
        }
        const result = FD.Rules.AttributeRules.check(state, 'STR', bonus, 'Force door' + (bonus ? ' +2 crowbar' : ''), 'R37');
        if (result.success) {
            corridor.door.state = FD.Enums.DoorState.CLOSED;
            FD.Core.log.add('The door shudders open with a screech.', 'good');
            return { success: true, turns: 0, extraChecks: 0 };
        }
        FD.Core.log.add('The door will not budge. The noise echoes down the passages.', 'danger');
        // RULE 37: a failed attempt costs a turn and a wandering monster check
        return { success: false, turns: 1, extraChecks: 1 };
    }

    /**
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @returns {{ok:boolean, reason:string}}
     */
    static canPickLock(state, corridor) {
        const character = state.character;
        if (!corridor.door || corridor.door.state !== FD.Enums.DoorState.LOCKED) {
            return { ok: false, reason: 'Not locked' };
        }
        if (!character.cls.thief) {
            return { ok: false, reason: 'Only a Thief can pick locks (TABLE 9)' };
        }
        if (!character.inventory.has('thievesTools')) {
            return { ok: false, reason: "Needs Thieves' Tools (TABLE 5)" };
        }
        return { ok: true, reason: '' };
    }

    /**
     * Picks a lock.
     * TABLE 9 (Open Locks): percentile roll; needs Thieves' Tools (TABLE 5).
     * Costs one Dungeon Turn whatever happens.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @returns {{success:boolean, turns:number, extraChecks:number}}
     */
    static pickLock(state, corridor) {
        const chance = state.character.thiefSkills.openLocks;
        const roll = FD.Core.dice.d100();
        const success = roll <= chance;
        FD.Core.log.roll('T9', 'Open Locks', 'd100=' + roll + ' vs ' + chance + '%', success ? 'success' : 'fail');
        if (success) {
            corridor.door.state = FD.Enums.DoorState.CLOSED;
            FD.Core.log.add('The lock gives with a soft click.', 'good');
        } else {
            FD.Core.log.add('The lock defeats you, for now.', 'info');
        }
        return { success: success, turns: 1, extraChecks: 0 };
    }

    /**
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @returns {{ok:boolean, reason:string}}
     */
    static canSpike(state, corridor) {
        const inv = state.character.inventory;
        if (!corridor.door || corridor.door.spiked) {
            return { ok: false, reason: 'Already spiked' };
        }
        if (!inv.has('spikes')) {
            return { ok: false, reason: 'You have no iron spikes (TABLE 5)' };
        }
        if (!inv.has('hammer')) {
            return { ok: false, reason: 'You need a hammer to drive spikes (TABLE 5)' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * Spikes a door shut.
     * RULE 35 / TABLE 5: spikes jam doors; monsters native to the dungeon cannot
     * open a spiked door. TABLE 5 (Hammer): loud use may trigger a Wandering Monster check.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @returns {{turns:number, extraChecks:number}}
     */
    static spike(state, corridor) {
        state.character.inventory.consume('spikes', 1);
        corridor.door.spiked = true;
        FD.Core.log.add('You hammer an iron spike under the door. The ringing echoes away into the dark.', 'info');
        return { turns: 0, extraChecks: 1 };
    }

    /**
     * Pulls a spike out. GM RULING: the bent spike is lost.
     * @param {FD.Model.GameState} state     Game state.
     * @param {FD.Model.Corridor} corridor   The corridor.
     * @returns {void}
     */
    static unspike(state, corridor) {
        corridor.door.spiked = false;
        FD.Core.log.add('You wrench the spike free.', 'info');
    }
}

FD.Rules.DoorRules = DoorRules;
