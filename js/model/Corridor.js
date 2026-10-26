/**
 * A route between two rooms (rule 31d). Costs `turns` Dungeon Turns to move
 * through. May have a door, a trap, an obstacle, or be secret (rule 40).
 */
class Corridor {
    /**
     * @param {Object} data  Corridor fields from dungeon data or a save.
     */
    constructor(data) {
        this.id = data.id;
        this.from = data.from;
        this.to = data.to;
        this.turns = data.turns || 1;
        /** Short name for buttons, e.g. "north door" */
        this.label = data.label || '';
        this.description = data.description || '';
        this.door = data.door ? new FD.Model.Door(data.door) : null;
        /** RULE 40: hidden until found by searching */
        this.secret = !!data.secret;
        /** RULE 33: shown on the player map */
        this.discovered = !!data.discovered;
        /** Walked at least once: usable in total darkness (rule 41b) */
        this.traversed = !!data.traversed;
        this.trap = data.trap ? Object.assign({}, data.trap) : null;
        this.obstacle = data.obstacle ? Object.assign({}, data.obstacle) : null;
        /** A rope left fixed across an obstacle */
        this.ropeFixed = !!data.ropeFixed;
        /** Mirror peek done: no surprise for the party entering the far room */
        this.peeked = !!data.peeked;
    }

    /**
     * Returns the room at the other end.
     * @param {string} roomId  One end.
     * @returns {string}       The other end.
     */
    otherEnd(roomId) {
        if (this.from === roomId) {
            return this.to;
        }
        return this.from;
    }

    /**
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id, label: this.label, from: this.from, to: this.to, turns: this.turns, description: this.description,
            door: this.door ? this.door.toJSON() : null, secret: this.secret, discovered: this.discovered,
            traversed: this.traversed, trap: this.trap, obstacle: this.obstacle, ropeFixed: this.ropeFixed,
            peeked: this.peeked
        };
    }
}

FD.Model.Corridor = Corridor;
