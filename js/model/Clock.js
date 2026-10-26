/**
 * The CLOCK (RULE 4c). RULE 29: a Dungeon Turn is about ten minutes. Tracks turns elapsed, the rest counter (rule 44), the
 * wandering monster countdown (rule 45) and light sources (rule 41).
 * Raises 'turnAdvanced', 'lightOut' and 'restNeeded' on the event bus.
 */
class Clock {
    /**
     * @param {Object} [data]  Saved clock.
     */
    constructor(data) {
        const d = data || {};
        this.totalTurns = d.totalTurns || 0;
        this.turnsSinceRest = d.turnsSinceRest || 0;
        this.turnsUntilWanderingCheck = d.turnsUntilWanderingCheck || FD.Core.config.wanderingInterval;
        /** Light sources: { id, name, type, turnsRemaining, permanent } */
        this.lights = d.lights ? d.lights.map(l => Object.assign({}, l)) : [];
    }

    /**
     * The brightest burning light, or null in darkness.
     * @returns {Object|null}
     */
    get activeLight() {
        let best = null;
        for (const light of this.lights) {
            if (light.permanent) {
                return light;
            }
            if (light.turnsRemaining > 0 && (best === null || light.turnsRemaining > best.turnsRemaining)) {
                best = light;
            }
        }
        return best;
    }

    /** @returns {boolean} RULE 41b: no light source is burning. */
    get isDark() {
        return this.activeLight === null;
    }

    /**
     * Adds a burning light source.
     * @param {Object} light  { name, type, turnsRemaining, permanent }.
     * @returns {void}
     */
    addLight(light) {
        Clock.counter = (Clock.counter || 0) + 1;
        light.id = 'l' + Clock.counter;
        this.lights.push(light);
    }

    /**
     * RULE 44: needs rest once five active turns have passed.
     * @returns {boolean}
     */
    get needsRest() {
        return this.turnsSinceRest >= FD.Core.config.turnsBeforeRest;
    }

    /**
     * GM RULING (rule 44): running on past the rest turn applies a penalty.
     * @returns {boolean}
     */
    get isFatigued() {
        return this.turnsSinceRest > FD.Core.config.turnsBeforeRest;
    }

    /**
     * Advances one Dungeon Turn (rule 30 step 5): burns light, counts towards
     * rest and towards the next wandering monster check.
     * @returns {{wanderingCheckDue:boolean, expired:Object[]}}
     */
    tick() {
        this.totalTurns++;
        this.turnsSinceRest++;
        const expired = [];
        // RULE 41: each light source lasts a limited number of Dungeon Turns
        for (const light of this.lights) {
            if (!light.permanent && light.turnsRemaining > 0) {
                light.turnsRemaining--;
                if (light.turnsRemaining === 0) {
                    expired.push(light);
                }
            }
        }
        this.lights = this.lights.filter(l => l.permanent || l.turnsRemaining > 0);
        // RULE 45: check every second Dungeon Turn
        let due = false;
        this.turnsUntilWanderingCheck--;
        if (this.turnsUntilWanderingCheck <= 0) {
            due = true;
            this.turnsUntilWanderingCheck = FD.Core.config.wanderingInterval;
        }
        FD.Core.events.emit('turnAdvanced', { turn: this.totalTurns });
        for (const light of expired) {
            FD.Core.events.emit('lightOut', light);
        }
        if (this.turnsSinceRest === FD.Core.config.turnsBeforeRest) {
            FD.Core.events.emit('restNeeded', { turn: this.totalTurns });
        }
        return { wanderingCheckDue: due, expired: expired };
    }

    /**
     * RULE 44: a turn of rest resets the counter.
     * @returns {void}
     */
    rest() {
        this.turnsSinceRest = 0;
    }

    /**
     * Resets the clock at the start of a delve. Light sources go out on leaving.
     * @returns {void}
     */
    resetForDelve() {
        this.totalTurns = 0;
        this.turnsSinceRest = 0;
        this.turnsUntilWanderingCheck = FD.Core.config.wanderingInterval;
        this.lights = this.lights.filter(l => l.permanent);
    }

    /**
     * @returns {Object}
     */
    toJSON() {
        return {
            totalTurns: this.totalTurns, turnsSinceRest: this.turnsSinceRest,
            turnsUntilWanderingCheck: this.turnsUntilWanderingCheck,
            lights: this.lights.map(l => Object.assign({}, l))
        };
    }

    /**
     * @param {Object} data  Output of toJSON().
     * @returns {Clock}
     */
    static fromJSON(data) {
        return new Clock(data);
    }
}

FD.Model.Clock = Clock;
