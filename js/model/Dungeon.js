/**
 * The whole dungeon: rooms and corridors, plus its rumour list and wandering
 * monster table. This is the GM's map (rule 4a); the player map is the subset
 * flagged `discovered` (rule 33).
 */
class Dungeon {
    /**
     * @param {Object} data  Definition or saved dungeon.
     */
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.intro = data.intro || '';
        this.entranceId = data.entranceId;
        this.rumours = data.rumours || [];
        this.wandering = data.wandering || null;
        this.rooms = data.rooms.map(r => new FD.Model.Room(r));
        this.corridors = data.corridors.map(c => new FD.Model.Corridor(c));
    }

    /**
     * Builds a fresh live dungeon from a registered definition.
     * @param {string} id  Dungeon id.
     * @returns {Dungeon}
     */
    static fromDefinition(id) {
        return new Dungeon(FD.Dungeons.Registry.get(id));
    }

    /**
     * @param {string} id  Room id.
     * @returns {FD.Model.Room|null}
     */
    getRoom(id) {
        for (const r of this.rooms) {
            if (r.id === id) {
                return r;
            }
        }
        return null;
    }

    /**
     * @param {string} id  Corridor id.
     * @returns {FD.Model.Corridor|null}
     */
    getCorridor(id) {
        for (const c of this.corridors) {
            if (c.id === id) {
                return c;
            }
        }
        return null;
    }

    /**
     * All corridors touching a room (including undiscovered secret ones).
     * @param {string} roomId  Room id.
     * @returns {FD.Model.Corridor[]}
     */
    corridorsFrom(roomId) {
        return this.corridors.filter(c => c.from === roomId || c.to === roomId);
    }

    /**
     * Corridors the party knows about from a room (rule 33 / rule 40).
     * @param {string} roomId  Room id.
     * @returns {FD.Model.Corridor[]}
     */
    knownExits(roomId) {
        return this.corridorsFrom(roomId).filter(c => !c.secret || c.discovered);
    }

    /** @returns {FD.Model.Room} */
    get entrance() {
        return this.getRoom(this.entranceId);
    }

    /**
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id, name: this.name, intro: this.intro, entranceId: this.entranceId,
            rumours: this.rumours, wandering: this.wandering,
            rooms: this.rooms.map(r => r.toJSON()), corridors: this.corridors.map(c => c.toJSON())
        };
    }

    /**
     * @param {Object} data  Output of toJSON().
     * @returns {Dungeon}
     */
    static fromJSON(data) {
        return new Dungeon(data);
    }
}

FD.Model.Dungeon = Dungeon;
