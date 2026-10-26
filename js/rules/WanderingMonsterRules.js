/**
 * Wandering monster checks (rule 45) using the dungeon's own table, or
 * TABLE 16 by default.
 */
class WanderingMonsterRules {
    /**
     * The table in use: the dungeon's own list, else TABLE 16.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {Object[]}
     */
    static table(state) {
        if (state.dungeon.wandering && state.dungeon.wandering.table) {
            return state.dungeon.wandering.table;
        }
        return FD.Data.WanderingMonsters;
    }

    /**
     * True if the party has shut themselves in: every exit of the room has a
     * door, and every door is spiked, held or wizard-locked.
     * GM RULING (rule 35): monsters native to the dungeon open ordinary doors,
     * but not secured ones, so a sealed room turns away wanderers while resting.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {boolean}
     */
    static roomSealed(state) {
        const exits = state.dungeon.corridorsFrom(state.currentRoomId).filter(c => !c.secret || c.discovered);
        if (exits.length === 0) {
            return false;
        }
        for (const c of exits) {
            if (!c.door || !c.door.isSecured) {
                return false;
            }
        }
        return true;
    }

    /**
     * Makes one wandering monster check and starts an encounter if one appears.
     * RULE 45: roll a d6; 1 indicates an encounter unless the adventure says otherwise.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} [opts]             { resting: true while resting/camping, reason }.
     * @returns {boolean}                 True if an encounter began.
     */
    static check(state, opts) {
        const o = opts || {};
        let chance = state.config.wanderingChance;
        if (state.dungeon.wandering && state.dungeon.wandering.chance) {
            chance = state.dungeon.wandering.chance;
        }
        const roll = FD.Core.dice.d6();
        const hit = roll <= chance;
        let label = 'Wandering Monsters';
        if (o.reason) {
            label += ' (' + o.reason + ')';
        }
        FD.Core.log.roll('R45', label, 'd6=' + roll, hit ? 'ENCOUNTER' : 'quiet');
        if (!hit) {
            return false;
        }
        if (o.resting && WanderingMonsterRules.roomSealed(state)) {
            FD.Core.log.add('Something scratches and snuffles at the sealed door, then moves on.', 'good');
            return false;
        }
        const def = WanderingMonsterRules.rollEncounter(state);
        return FD.Rules.EncounterRules.begin(state, def, { wandering: true });
    }

    /**
     * Rolls on the wandering table and builds an encounter definition.
     * TABLE 16: roll a d6 for the monster, then its Number dice.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {Object}  Encounter definition.
     */
    static rollEncounter(state) {
        const table = WanderingMonsterRules.table(state);
        const roll = FD.Core.dice.roll(table.length);
        let entry = table[0];
        for (const row of table) {
            if (row.roll === roll) {
                entry = row;
            }
        }
        const count = Math.max(1, FD.Core.dice.rollExpr(entry.number, false).total);
        const template = FD.Data.Monsters[entry.monster];
        FD.Core.log.roll('T16', 'Wandering table', 'd' + table.length + '=' + roll + ', ' + entry.number + '=' + count, count + ' ' + (count === 1 ? template.name : template.plural));
        let reaction = entry.reaction || null;
        if (!reaction && template.tags.indexOf('undead') >= 0) {
            // SPEC §7: undead always attack
            reaction = 'attack';
        }
        let motivation = entry.motivation;
        if (!motivation) {
            if (template.tags.indexOf('animal') >= 0) {
                motivation = { text: 'Hungry and territorial.', wants: 'food', bribeMin: 0, pursues: true };
            } else {
                motivation = { text: 'Prowling the halls.', wants: 'gold', bribeMin: 10, pursues: true };
            }
        }
        WanderingMonsterRules.counter = (WanderingMonsterRules.counter || 0) + 1;
        return {
            id: 'w' + WanderingMonsterRules.counter,
            monsters: [{ monster: entry.monster, count: count }],
            description: entry.text || ('Wandering ' + template.plural.toLowerCase() + ' appear!'),
            distance: 'normal',
            reaction: reaction,
            motivation: motivation
        };
    }
}

FD.Rules.WanderingMonsterRules = WanderingMonsterRules;
