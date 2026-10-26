/**
 * Encumbrance (rule 42) and its effect on movement (rules 31d, 43, 58).
 */
class EncumbranceRules {
    /**
     * RULE 31d / RULE 42 / RULE 43 (Exploration Movement): a corridor costs its
     * turns, doubled if Encumbered.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {FD.Model.Corridor} corridor    The corridor.
     * @returns {number}                      Dungeon Turns.
     */
    static corridorTurns(character, corridor) {
        let turns = corridor.turns;
        // RULE 42: Encumbered - corridors cost double Dungeon Turns
        if (character.isEncumbered) {
            turns = turns * 2;
        }
        return turns;
    }

    /**
     * RULE 58: adventurers move up to 2 zones per round, or 1 if Encumbered.
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {number}                      Zones per round.
     */
    static combatMove(character) {
        if (character.isEncumbered) {
            return 1;
        }
        return 2;
    }

    /**
     * RULE 42: an Encumbered adventurer cannot outrun pursuers.
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {boolean}
     */
    static canOutrun(character) {
        return !character.isEncumbered;
    }

    /**
     * RULE 42: every 100 coins counts as 1 Slot.
     * @param {number} coins  Number of coins.
     * @returns {number}      Slots.
     */
    static coinSlots(coins) {
        return Math.floor(coins / 100);
    }

    /**
     * Summary for the Sheet and the Shoppe.
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {{used:number, max:number, encumbered:boolean}}
     */
    static summary(character) {
        return { used: character.usedSlots, max: character.maxSlots, encumbered: character.isEncumbered };
    }
}

FD.Rules.EncumbranceRules = EncumbranceRules;
