/**
 * RULE 12 (Generating Attributes) and RULE 13 (Attribute Modifiers).
 * Pure data plus one lookup function.
 */
FD.Data.Attributes = {
    /** RULE 12: roll 3d6 in this order. */
    ORDER: ['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHA'],

    /** Full names for display. */
    NAMES: {
        STR: 'Strength',
        INT: 'Intelligence',
        WIS: 'Wisdom',
        DEX: 'Dexterity',
        CON: 'Constitution',
        CHA: 'Charisma'
    },

    /** RULE 6 - RULE 11: what each attribute affects, shown as tooltips. */
    HELP: {
        STR: 'Melee attacks and damage, forcing doors, carrying Slots (rules 6, 42).',
        INT: 'Languages, writing, magic (rule 7).',
        WIS: 'Perception, intuition, judgement (rule 8).',
        DEX: 'Missile attacks and Armour Class (rule 9).',
        CON: 'Hit Points (rule 10).',
        CHA: 'Reactions and negotiation (rule 11).'
    },

    /** RULE 13: modifier bands. */
    MODIFIER_TABLE: [
        { min: 3, max: 3, mod: -3 },
        { min: 4, max: 5, mod: -2 },
        { min: 6, max: 8, mod: -1 },
        { min: 9, max: 12, mod: 0 },
        { min: 13, max: 15, mod: 1 },
        { min: 16, max: 17, mod: 2 },
        { min: 18, max: 18, mod: 3 }
    ],

    /**
     * Looks up the modifier for a score.
     * RULE 13: 3 = -3; 4-5 = -2; 6-8 = -1; 9-12 = 0; 13-15 = +1; 16-17 = +2; 18 = +3.
     * Scores outside 3-18 (from magic) are clamped to the nearest band.
     * @param {number} score  Attribute score.
     * @returns {number}      Modifier.
     */
    modifierFor(score) {
        if (score <= 3) {
            return -3;
        }
        if (score >= 18) {
            return 3;
        }
        for (const band of FD.Data.Attributes.MODIFIER_TABLE) {
            if (score >= band.min && score <= band.max) {
                return band.mod;
            }
        }
        return 0;
    },

    /**
     * Formats a modifier with its sign, e.g. +1, 0, -2.
     * @param {number} mod  Modifier.
     * @returns {string}
     */
    formatMod(mod) {
        if (mod > 0) {
            return '+' + mod;
        }
        return String(mod);
    }
};
