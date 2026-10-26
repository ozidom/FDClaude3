/**
 * The outcome of any roll-against-a-target check: success flag, the roll,
 * the number needed and the log text. Returned by many rules services.
 */
class CheckResult {
    /**
     * @param {boolean} success  Did the check succeed?
     * @param {number} roll      The (possibly modified) roll.
     * @param {number} target    The number needed.
     * @param {string} text      Log line describing the check.
     */
    constructor(success, roll, target, text) {
        this.success = success;
        this.roll = roll;
        this.target = target;
        this.text = text;
    }
}

FD.Rules.CheckResult = CheckResult;
