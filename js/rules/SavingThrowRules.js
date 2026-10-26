/**
 * Saving throws (rule 16, TABLE 4). Roll 1d20; equal to or greater than the
 * value succeeds. Monsters save as Fighters.
 */
class SavingThrowRules {
    /**
     * Makes a saving throw for the adventurer.
     * RULE 16: d20 >= the TABLE 4 value succeeds.
     * TABLE 15: Ring of Protection +1. Protection from Evil: +1 against evil sources (GM RULING).
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} type               FD.Enums.Save value.
     * @param {Object} [opts]             { bonus, reason, evilSource }.
     * @returns {FD.Rules.CheckResult}
     */
    static save(state, type, opts) {
        const o = opts || {};
        const character = state.character;
        const target = character.saves[type];
        let bonus = (o.bonus || 0) + character.saveBonus;
        if (o.evilSource && character.hasEffect('protEvil')) {
            bonus += 1;
        }
        const roll = FD.Core.dice.d20();
        const total = roll + bonus;
        const success = total >= target;
        let detail = 'd20=' + roll;
        if (bonus !== 0) {
            detail += FD.Data.Attributes.formatMod(bonus) + '=' + total;
        }
        detail += ' vs ' + target;
        let label = 'Save vs ' + FD.Enums.SaveName[type];
        if (o.reason) {
            label += ' (' + o.reason + ')';
        }
        const text = FD.Core.log.roll('R16', label, detail, success ? 'saved' : 'failed');
        return new FD.Rules.CheckResult(success, total, target, text);
    }

    /**
     * Makes a saving throw for a monster.
     * RULE 16: monsters make saving throws as Fighters (TABLE 4).
     * @param {FD.Model.Monster} monster  The monster.
     * @param {string} type               FD.Enums.Save value.
     * @param {string} [reason]           For the log.
     * @returns {FD.Rules.CheckResult}
     */
    static monsterSave(monster, type, reason) {
        const target = FD.Data.Classes.fighter.saves[type];
        const roll = FD.Core.dice.d20();
        const success = roll >= target;
        let label = monster.name + ' saves vs ' + FD.Enums.SaveName[type];
        if (reason) {
            label += ' (' + reason + ')';
        }
        const text = FD.Core.log.roll('R16', label, 'd20=' + roll + ' vs ' + target, success ? 'saved' : 'failed');
        return new FD.Rules.CheckResult(success, roll, target, text);
    }
}

FD.Rules.SavingThrowRules = SavingThrowRules;
