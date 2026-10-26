/**
 * Optional rules and tuning values. One live object, FD.Core.config, is shared
 * by every layer and saved with the game. Toggle the optional rules on the
 * Title screen or by editing DEFAULT_CONFIG here.
 */
FD.Core.DEFAULT_CONFIG = Object.freeze({
    /** RULE 59b (Optional Maximum Damage): all damage rolls deal maximum. */
    maxDamage: false,
    /** RULE 50a (Hidden Emotion Test): the optional rule allows switching it off. */
    hiddenEmotionTest: true,
    /** RULE CONFLICT: rule 1a offers a starting rumour, rule 66 forbids it. Default off. */
    startingRumour: false,
    /** RULE 12: rerolling attributes is not in the rules; allowed only if this is on. */
    rerollAttributes: false,
    /** GM RULING (rule 53g): length of a night's rest in Dungeon Turns. */
    nightRestTurns: 48,
    /** GM RULING (rule 44): penalty to hit and to checks when running without rest. */
    noRestPenalty: 1,
    /** RULE 44: active turns allowed before a rest is needed. */
    turnsBeforeRest: 5,
    /** RULE 45: wandering monster check interval in Dungeon Turns. */
    wanderingInterval: 2,
    /** RULE 45: a wandering monster appears on 1..wanderingChance on 1d6. */
    wanderingChance: 1,
    /** RULE 28 / TABLE 1 step 4: only levels 1-3 exist in this version. */
    maxLevel: 3
});

/**
 * Helper that builds and resets the live configuration object.
 */
class Config {
    /**
     * Creates a fresh config object from the defaults plus any overrides.
     * @param {Object} [overrides]  Values to replace (e.g. from a save file).
     * @returns {Object}            A mutable config object.
     */
    static create(overrides) {
        const config = Object.assign({}, FD.Core.DEFAULT_CONFIG);
        if (overrides) {
            for (const key of Object.keys(FD.Core.DEFAULT_CONFIG)) {
                if (overrides[key] !== undefined) {
                    config[key] = overrides[key];
                }
            }
        }
        return config;
    }

    /**
     * Copies values into the live FD.Core.config object in place, so that every
     * existing reference sees the change.
     * @param {Object} values  Values to apply.
     * @returns {void}
     */
    static apply(values) {
        const fresh = Config.create(values);
        for (const key of Object.keys(fresh)) {
            FD.Core.config[key] = fresh[key];
        }
    }
}

FD.Core.Config = Config;
FD.Core.config = Config.create();
