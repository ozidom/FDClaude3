/**
 * A significant location on the point-crawl map (rule 31a). Sizes are
 * 1 Small, 2 Medium, 3 Large (rule 31b). All state persists between delves
 * (rule 68: anything left inside remains part of the dungeon).
 */
class Room {
    /**
     * @param {Object} data  Room fields from dungeon data or a save.
     */
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.size = data.size || 2;
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.isEntrance = !!data.isEntrance;
        this.description = data.description || '';
        /** Hidden or visible features: { id, name, type, hidden, findChance, foundBy, knowledge, text } */
        this.features = (data.features || []).map(f => Object.assign({}, f));
        /** Treasure lying here: dungeon entries, or { item } for dropped items */
        this.treasure = (data.treasure || []).map(t => Object.assign({}, t));
        /** Room traps, e.g. a poison needle set off by looting */
        this.traps = (data.traps || []).map(t => Object.assign({}, t));
        /** Placed encounter data (persists, including live monsters) */
        this.encounter = data.encounter ? JSON.parse(JSON.stringify(data.encounter)) : null;
        if (this.encounter && Array.isArray(this.encounter.live)) {
            // Live monsters keep their HP between visits; rebuild them as Monster objects
            this.encounter.live = this.encounter.live.map(m => FD.Model.Monster.fromJSON(m));
        }
        this.spellHooks = data.spellHooks || {};
        this.discovered = !!data.discovered;
        this.searched = !!data.searched;
        this.visits = data.visits || 0;
    }

    /** @returns {string} RULE 31b size name. */
    get sizeName() {
        if (this.size === 1) {
            return 'Small';
        }
        if (this.size === 3) {
            return 'Large';
        }
        return 'Medium';
    }

    /**
     * Finds a feature by id.
     * @param {string} id  Feature id.
     * @returns {Object|null}
     */
    getFeature(id) {
        for (const f of this.features) {
            if (f.id === id) {
                return f;
            }
        }
        return null;
    }

    /**
     * Finds a room trap by id.
     * @param {string} id  Trap id.
     * @returns {Object|null}
     */
    getTrap(id) {
        for (const t of this.traps) {
            if (t.id === id) {
                return t;
            }
        }
        return null;
    }

    /**
     * Treasure the party can see: not hidden behind an unfound feature.
     * @returns {Object[]}
     */
    visibleTreasure() {
        return this.treasure.filter(t => {
            if (!t.featureId) {
                return true;
            }
            const f = this.getFeature(t.featureId);
            return !f || !f.hidden;
        });
    }

    /**
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id, name: this.name, size: this.size, x: this.x, y: this.y, isEntrance: this.isEntrance,
            description: this.description, features: this.features, treasure: this.treasure, traps: this.traps,
            encounter: this.encounter, spellHooks: this.spellHooks, discovered: this.discovered,
            searched: this.searched, visits: this.visits
        };
    }
}

FD.Model.Room = Room;
