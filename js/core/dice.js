/**
 * Every random number in the game comes from here. It wraps a small seedable
 * RNG (mulberry32) so tests can be deterministic, and supports a queue of
 * forced results so a test can say "the next d6 is a 2".
 * No other file may call Math.random().
 */
class Dice {
    /**
     * @param {number} seed  Initial seed (any integer).
     */
    constructor(seed) {
        /** @type {number[]} forced results, consumed before the RNG */
        this.queue = [];
        this.seed(seed);
    }

    /**
     * Resets the generator to a known seed.
     * @param {number} seed  Any integer; 0 is replaced with 1.
     * @returns {void}
     */
    seed(seed) {
        let value = Math.floor(Number(seed)) >>> 0;
        if (value === 0) {
            value = 1;
        }
        this.state = value;
        this.queue = [];
    }

    /**
     * Returns the next float in [0, 1) using mulberry32.
     * @returns {number}
     */
    next() {
        this.state = (this.state + 0x6D2B79F5) >>> 0;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t = t ^ (t + Math.imul(t ^ (t >>> 7), t | 61));
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Forces the next die results, for tests. Values are used in order and
     * clamped to the die size when consumed.
     * @param {number[]} values  Results to return next.
     * @returns {void}
     */
    force(values) {
        for (const v of values) {
            this.queue.push(v);
        }
    }

    /**
     * Rolls one die.
     * @param {number} sides  Number of faces (e.g. 6 for a d6).
     * @returns {number}      1..sides
     */
    roll(sides) {
        if (this.queue.length > 0) {
            const forced = this.queue.shift();
            return Math.max(1, Math.min(sides, forced));
        }
        return 1 + Math.floor(this.next() * sides);
    }

    /** @returns {number} 1..6 */
    d6() { return this.roll(6); }

    /** @returns {number} 1..20 */
    d20() { return this.roll(20); }

    /** @returns {number} 1..100, used for percentile Thief Skills (TABLE 9). */
    d100() { return this.roll(100); }

    /**
     * Parses dice notation such as "2d6+1", "d8", "1d8-1" or "3".
     * @param {string|number} expr  Dice expression.
     * @returns {{count:number, sides:number, mod:number}}
     */
    static parse(expr) {
        const text = String(expr).replace(/\s+/g, '').toLowerCase();
        const match = text.match(/^(\d*)d(\d+)([+-]\d+)?$/);
        if (match) {
            let count = 1;
            if (match[1] !== '') {
                count = parseInt(match[1], 10);
            }
            const sides = parseInt(match[2], 10);
            let mod = 0;
            if (match[3]) {
                mod = parseInt(match[3], 10);
            }
            return { count: count, sides: sides, mod: mod };
        }
        const flat = parseInt(text, 10);
        if (isNaN(flat)) {
            throw new Error('Bad dice expression: ' + expr);
        }
        return { count: 0, sides: 0, mod: flat };
    }

    /**
     * Rolls a dice expression.
     * RULE 59b (Optional Maximum Damage): when maximise is true each die shows its top face.
     * @param {string|number} expr      Dice expression, e.g. "2d6+1".
     * @param {boolean} [maximise]      Use the maximum value of every die.
     * @returns {{total:number, rolls:number[], mod:number, expr:string, text:string}}
     */
    rollExpr(expr, maximise) {
        const parsed = Dice.parse(expr);
        const rolls = [];
        let total = parsed.mod;
        for (let i = 0; i < parsed.count; i++) {
            let value;
            if (maximise) {
                value = parsed.sides;
            } else {
                value = this.roll(parsed.sides);
            }
            rolls.push(value);
            total += value;
        }
        let text = String(expr) + '=';
        if (rolls.length > 0) {
            text += '[' + rolls.join(',') + ']';
            if (parsed.mod > 0) {
                text += '+' + parsed.mod;
            } else if (parsed.mod < 0) {
                text += String(parsed.mod);
            }
            text += '=' + total;
        } else {
            text += total;
        }
        return { total: total, rolls: rolls, mod: parsed.mod, expr: String(expr), text: text };
    }

    /**
     * Returns the generator state so a save file can resume the same sequence.
     * @returns {number}
     */
    getState() {
        return this.state;
    }

    /**
     * Restores generator state from a save file.
     * @param {number} state  Value from getState().
     * @returns {void}
     */
    setState(state) {
        if (typeof state === 'number') {
            this.state = state >>> 0;
        }
    }
}

FD.Core.Dice = Dice;
/** The shared dice instance. Seeded from the clock; tests reseed it. */
FD.Core.dice = new Dice(Date.now());
