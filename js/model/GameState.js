/**
 * The root aggregate: everything that makes up a game in progress. Rules
 * services read and change it; the UI renders it. toJSON/fromJSON give the
 * save format (localStorage key fd.save.v1).
 */
class GameState {
    constructor() {
        this.version = 1;
        this.config = FD.Core.config;
        /** @type {FD.Model.Character|null} */
        this.character = null;
        this.dungeonId = FD.Dungeons.Registry.defaultId;
        /** @type {FD.Model.Dungeon|null} */
        this.dungeon = null;
        this.clock = new FD.Model.Clock();
        this.log = FD.Core.log;
        this.screen = FD.Enums.Screen.TITLE;
        this.currentRoomId = null;
        /** @type {FD.Model.CombatState|null} */
        this.combat = null;
        /** Current encounter (rules 46-52), or null */
        this.encounter = null;
        this.delve = GameState.newDelve(0);
        /** Town data (rules 66-72) */
        this.town = { day: 1, rumoursKnown: [], lastSummary: null, pendingSpellChoice: false };
        /** Secrets and clues learned from NPCs (e.g. 'flagstone') */
        this.knowledge = [];
        /** Fallen adventurers (rule 67) */
        this.graveyard = [];
        this.lastEpitaph = null;
        /** True once the first character has entered the dungeon */
        this.hasDelved = false;
    }

    /**
     * Blank per-delve record.
     * @param {number} number  Delve number.
     * @returns {Object}
     */
    static newDelve(number) {
        return {
            number: number,
            active: false,
            /** RULE 67: monster XP waits until the party escapes */
            monsterXp: 0,
            defeatedNames: [],
            cameFromCorridorId: null,
            previousRoomId: null
        };
    }

    /**
     * Starts a new game with a fresh copy of the default dungeon.
     * @returns {GameState}
     */
    static newGame() {
        const state = new GameState();
        state.dungeon = FD.Model.Dungeon.fromDefinition(state.dungeonId);
        return state;
    }

    /**
     * True if the party has learned a secret flag.
     * @param {string} flag  Knowledge flag.
     * @returns {boolean}
     */
    knows(flag) {
        return this.knowledge.indexOf(flag) >= 0;
    }

    /**
     * Records a secret flag.
     * @param {string} flag  Knowledge flag.
     * @returns {void}
     */
    learn(flag) {
        if (!this.knows(flag)) {
            this.knowledge.push(flag);
        }
    }

    /** @returns {FD.Model.Room|null} the room the party is in. */
    get room() {
        if (!this.dungeon || !this.currentRoomId) {
            return null;
        }
        return this.dungeon.getRoom(this.currentRoomId);
    }

    /**
     * Serialises the game. Combat and encounters are not saved (saves happen in town).
     * @returns {Object}
     */
    toJSON() {
        return {
            version: this.version,
            config: Object.assign({}, this.config),
            character: this.character ? this.character.toJSON() : null,
            dungeonId: this.dungeonId,
            dungeon: this.dungeon ? this.dungeon.toJSON() : null,
            clock: this.clock.toJSON(),
            screen: this.screen,
            currentRoomId: this.currentRoomId,
            delve: Object.assign({}, this.delve),
            town: JSON.parse(JSON.stringify(this.town)),
            knowledge: this.knowledge.slice(),
            graveyard: this.graveyard.slice(),
            lastEpitaph: this.lastEpitaph,
            hasDelved: this.hasDelved,
            log: this.log.toJSON(),
            dice: FD.Core.dice.getState()
        };
    }

    /**
     * Rebuilds a game from saved data.
     * @param {Object} data  Output of toJSON().
     * @returns {GameState}
     */
    static fromJSON(data) {
        FD.Core.Config.apply(data.config || {});
        const state = new GameState();
        state.character = data.character ? FD.Model.Character.fromJSON(data.character) : null;
        state.dungeonId = data.dungeonId || state.dungeonId;
        state.dungeon = data.dungeon ? FD.Model.Dungeon.fromJSON(data.dungeon) : FD.Model.Dungeon.fromDefinition(state.dungeonId);
        state.clock = FD.Model.Clock.fromJSON(data.clock || {});
        state.screen = data.screen || FD.Enums.Screen.TOWN;
        state.currentRoomId = data.currentRoomId || null;
        state.delve = Object.assign(GameState.newDelve(0), data.delve || {});
        state.town = Object.assign(state.town, data.town || {});
        state.knowledge = data.knowledge || [];
        state.graveyard = data.graveyard || [];
        state.lastEpitaph = data.lastEpitaph || null;
        state.hasDelved = !!data.hasDelved;
        state.log.load(data.log || []);
        if (typeof data.dice === 'number') {
            FD.Core.dice.setState(data.dice);
        }
        return state;
    }
}

FD.Model.GameState = GameState;
