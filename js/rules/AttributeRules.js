/**
 * Attribute modifiers and Attribute Checks (rule 13), plus the fatigue
 * penalty for running without rest (rule 44).
 */
class AttributeRules {
    /**
     * RULE 13 (Attribute Modifiers): 3 = -3; 4-5 = -2; 6-8 = -1; 9-12 = 0;
     * 13-15 = +1; 16-17 = +2; 18 = +3.
     * @param {number} score  Attribute score.
     * @returns {number}      Modifier.
     */
    static modifier(score) {
        return FD.Data.Attributes.modifierFor(score);
    }

    /**
     * GM RULING (rule 44): after five turns without rest, -1 to hit and to checks
     * until the party rests. Only applies inside the dungeon.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {number}                  Penalty (0 or config.noRestPenalty).
     */
    static fatiguePenalty(state) {
        if (!state.delve.active) {
            return 0;
        }
        if (state.clock.isFatigued) {
            return state.config.noRestPenalty;
        }
        return 0;
    }

    /**
     * Makes an Attribute Check.
     * RULE 13: roll d20 equal to or below the score, modified if circumstances demand.
     * @param {FD.Model.GameState} state  Game state (for the character and fatigue).
     * @param {string} attr               'STR', 'DEX', ...
     * @param {number} bonus              Circumstance bonus added to the score (e.g. crowbar +2).
     * @param {string} label              What the check is for, for the log.
     * @param {string} [rule]             Rule tag for the log (default R13).
     * @returns {FD.Rules.CheckResult}
     */
    static check(state, attr, bonus, label, rule) {
        const character = state.character;
        // RULE 13: target is the attribute score, plus circumstances
        let target = character.attributes[attr] + (bonus || 0);
        // GM RULING (rule 44): fatigue penalty
        target -= AttributeRules.fatiguePenalty(state);
        const roll = FD.Core.dice.d20();
        const success = roll <= target;
        let outcome = 'fail';
        if (success) {
            outcome = 'success';
        }
        const text = FD.Core.log.roll(rule || 'R13', label + ' (' + attr + ' check)', 'd20=' + roll + ' vs ≤' + target, outcome);
        return new FD.Rules.CheckResult(success, roll, target, text);
    }
}

FD.Rules.AttributeRules = AttributeRules;
