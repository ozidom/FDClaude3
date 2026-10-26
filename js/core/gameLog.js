/**
 * The Adventure Log. Every dice roll is written here tagged with its rule, so
 * the player learns the rules by playing, e.g.
 *   [R36 Listen] d6=2 → fail (needed 1)
 * Raises 'log' for every entry and 'dice' for every roll (used by the toast).
 */
class GameLog {
    constructor() {
        /** @type {{text:string, kind:string, turn:number}[]} */
        this.entries = [];
        /** Maximum entries kept (and saved). */
        this.limit = 400;
    }

    /**
     * Adds a plain entry.
     * @param {string} text           What happened.
     * @param {string} [kind]         'info' | 'narrate' | 'roll' | 'combat' | 'danger' | 'good' | 'rule'.
     * @returns {string}              The text, for chaining into results.
     */
    add(text, kind) {
        const entry = { text: text, kind: kind || 'info' };
        this.entries.push(entry);
        if (this.entries.length > this.limit) {
            this.entries.shift();
        }
        FD.Core.events.emit('log', entry);
        return text;
    }

    /**
     * Adds GM narration (room descriptions, NPC speech).
     * @param {string} text  Narration.
     * @returns {string}
     */
    narrate(text) {
        return this.add(text, 'narrate');
    }

    /**
     * Logs a dice roll tagged with the rule that called for it.
     * @param {string} rule      Rule tag, e.g. 'R36' or 'T10'.
     * @param {string} label     Short name of the roll, e.g. 'Listen'.
     * @param {string} detail    The dice and numbers, e.g. 'd6=2'.
     * @param {string} outcome   Result text, e.g. 'fail (needed 1)'.
     * @returns {string}         The formatted line.
     */
    roll(rule, label, detail, outcome) {
        let text = '[' + rule + ' ' + label + '] ' + detail;
        if (outcome) {
            text += ' → ' + outcome;
        }
        this.add(text, 'roll');
        FD.Core.events.emit('dice', { rule: rule, label: label, detail: detail, outcome: outcome });
        return text;
    }

    /**
     * Removes all entries.
     * @returns {void}
     */
    clear() {
        this.entries = [];
        FD.Core.events.emit('logCleared');
    }

    /**
     * Returns the most recent entries for saving.
     * @returns {Object[]}
     */
    toJSON() {
        return this.entries.slice(-150);
    }

    /**
     * Restores entries from a save.
     * @param {Object[]} data  Saved entries.
     * @returns {void}
     */
    load(data) {
        this.entries = Array.isArray(data) ? data.slice() : [];
        FD.Core.events.emit('logCleared');
    }
}

FD.Core.GameLog = GameLog;
/** The shared Adventure Log. */
FD.Core.log = new GameLog();
