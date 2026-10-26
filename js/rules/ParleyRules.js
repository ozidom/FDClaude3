/**
 * Reaction rolls (rule 49, TABLE 12), parley and bribes (rule 50, 51) and the
 * single-player Hidden Emotion Test (rule 50a, TABLE 17).
 */
class ParleyRules {
    /**
     * Makes a Reaction roll.
     * RULE 49: 2d6 modified by Charisma and circumstances; TABLE 12 gives the result.
     * @param {FD.Model.GameState} state  Game state.
     * @param {number} bonus              Circumstance bonus (bribes, bargaining).
     * @param {string} label              Log label.
     * @returns {{total:number, row:Object}}
     */
    static reactionRoll(state, bonus, label) {
        const cha = state.character.modifier('CHA');
        const r = FD.Core.dice.rollExpr('2d6', false);
        const total = r.total + cha + (bonus || 0);
        const row = FD.Data.reactionFor(total);
        let detail = r.text + ' ' + FD.Data.Attributes.formatMod(cha) + ' CHA';
        if (bonus) {
            detail += ' ' + FD.Data.Attributes.formatMod(bonus) + ' circumstance';
        }
        detail += ' = ' + total;
        FD.Core.log.roll('R49', label || 'Reaction', detail, row.name);
        return { total: total, row: row };
    }

    /**
     * GM RULING (rule 50): an offer adds +1 to a reaction reroll if it meets the
     * creature's price, +2 if it is generous (three times the price).
     * RULE 51: only creatures that want gold are moved by gold.
     * @param {Object} motivation  Encounter motivation { wants, bribeMin }.
     * @param {number} gold        Gold offered.
     * @returns {number}           Bonus (0, 1 or 2).
     */
    static goldOfferBonus(motivation, gold) {
        if (!motivation || motivation.wants !== 'gold') {
            return 0;
        }
        const price = Math.max(1, motivation.bribeMin || 5);
        if (gold >= price * 3) {
            return 2;
        }
        if (gold >= price) {
            return 1;
        }
        return 0;
    }

    /**
     * Secretly rolls the NPC's emotion.
     * RULE 50a step 2 / TABLE 17: 1d6 rolled in secret.
     * @returns {number}  Emotion id 1-6.
     */
    static rollEmotion() {
        const roll = FD.Core.dice.d6();
        FD.Core.log.add('[R50a Hidden Emotion] The GM rolls 1d6 in secret (TABLE 17).', 'roll');
        return roll;
    }

    /**
     * Resolves the player's guess.
     * RULE 50a / RULE CONFLICT 9 (single player): with no other players to guess, a
     * correct guess counts as "everyone correct" and a wrong one as "nobody correct".
     * @param {number} actual  The rolled emotion.
     * @param {number} guess   The player's guess.
     * @returns {boolean}      True if correct.
     */
    static judgeGuess(actual, guess) {
        const correct = actual === guess;
        const outcome = correct ? 'everyone correct' : 'nobody correct';
        FD.Core.log.roll('R50a', 'Hidden Emotion', 'you guessed ' + FD.Data.Emotions[guess].name + '; it was ' + FD.Data.Emotions[actual].name, outcome);
        return correct;
    }
}

FD.Rules.ParleyRules = ParleyRules;
