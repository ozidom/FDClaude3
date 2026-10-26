/**
 * Light sources (rule 41, TABLE 5): torches burn 6 turns, a lantern burns an
 * oil flask for 24 turns. RULE 41a: infravision never works.
 */
class LightRules {
    /**
     * @param {FD.Model.GameState} state  Game state.
     * @returns {boolean} True if a light is burning.
     */
    static hasLight(state) {
        return !state.clock.isDark;
    }

    /**
     * TABLE 5 (Tinderbox): lights torches and lanterns.
     * GM RULING: a new light can also be kindled from one already burning.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {boolean}
     */
    static canIgnite(state) {
        return state.character.inventory.has('tinderbox') || !state.clock.isDark;
    }

    /**
     * GM RULING: lighting a fresh source is allowed only when the current
     * light is out or about to go out, to avoid wasting fuel by mistake.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {boolean}
     */
    static lightIsLow(state) {
        const light = state.clock.activeLight;
        return light === null || (!light.permanent && light.turnsRemaining <= 2);
    }

    /**
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{ok:boolean, reason:string}}
     */
    static canLightTorch(state) {
        if (!state.character.inventory.has('torch')) {
            return { ok: false, reason: 'You have no torches (TABLE 5)' };
        }
        if (!LightRules.canIgnite(state)) {
            return { ok: false, reason: 'You need a tinderbox to strike a light (TABLE 5)' };
        }
        if (!LightRules.lightIsLow(state)) {
            return { ok: false, reason: 'Your light is still burning' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * Lights a torch.
     * RULE 41 / TABLE 5: one torch provides light for 6 Dungeon Turns.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string}  Log text.
     */
    static lightTorch(state) {
        state.character.inventory.consume('torch', 1);
        state.clock.addLight({ name: 'Torch', type: 'torch', turnsRemaining: 6, permanent: false });
        return FD.Core.log.add('You light a torch (6 turns, rule 41).', 'good');
    }

    /**
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{ok:boolean, reason:string}}
     */
    static canLightLantern(state) {
        const inv = state.character.inventory;
        if (!inv.has('lantern')) {
            return { ok: false, reason: 'You have no lantern (TABLE 5)' };
        }
        if (!inv.has('oil')) {
            return { ok: false, reason: 'You have no oil flask (TABLE 5)' };
        }
        if (!LightRules.canIgnite(state)) {
            return { ok: false, reason: 'You need a tinderbox to strike a light (TABLE 5)' };
        }
        if (!LightRules.lightIsLow(state)) {
            return { ok: false, reason: 'Your light is still burning' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * Fills and lights the lantern.
     * TABLE 5: an oil flask fuels a lantern for 24 Dungeon Turns.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string}  Log text.
     */
    static lightLantern(state) {
        state.character.inventory.consume('oil', 1);
        state.clock.addLight({ name: 'Lantern', type: 'lantern', turnsRemaining: 24, permanent: false });
        return FD.Core.log.add('You fill and light the lantern (24 turns, TABLE 5).', 'good');
    }

    /**
     * Adds a magical light from a spell (Light, Continual Light).
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} name               Source name.
     * @param {number} turns              Duration in Dungeon Turns.
     * @param {boolean} permanent         Never runs out.
     * @returns {void}
     */
    static addMagicLight(state, name, turns, permanent) {
        state.clock.addLight({ name: name, type: 'magic', turnsRemaining: turns, permanent: permanent });
        FD.Core.log.add(name + ' fills the room with light.', 'good');
    }
}

FD.Rules.LightRules = LightRules;
