/**
 * Registry of hand-authored dungeons. Each dungeon file calls
 * FD.Dungeons.register(definition). The game builds a live FD.Model.Dungeon
 * from the definition when a new game starts.
 */
class DungeonRegistry {
    constructor() {
        /** @type {Object<string, Object>} */
        this.definitions = {};
        /** Id of the first dungeon registered; used as the default. */
        this.defaultId = null;
    }

    /**
     * Adds a dungeon definition.
     * @param {Object} definition  Dungeon data (see js/dungeons/sunkenCrypt.js for the format).
     * @returns {void}
     */
    register(definition) {
        this.definitions[definition.id] = definition;
        if (this.defaultId === null) {
            this.defaultId = definition.id;
        }
    }

    /**
     * Returns a deep copy of a definition, so play never changes the source data.
     * @param {string} id  Dungeon id.
     * @returns {Object}
     */
    get(id) {
        const def = this.definitions[id];
        if (!def) {
            throw new Error('Unknown dungeon: ' + id);
        }
        return JSON.parse(JSON.stringify(def));
    }

    /**
     * Lists registered dungeon ids.
     * @returns {string[]}
     */
    list() {
        return Object.keys(this.definitions);
    }
}

FD.Dungeons.Registry = new DungeonRegistry();

/**
 * Shortcut used by dungeon files: FD.Dungeons.register({...}).
 * @param {Object} definition  Dungeon data.
 * @returns {void}
 */
FD.Dungeons.register = function (definition) {
    FD.Dungeons.Registry.register(definition);
};
