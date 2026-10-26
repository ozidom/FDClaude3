/**
 * A door on a corridor (rule 35): open, closed, stuck, locked or barred.
 * Secret doors are handled by the corridor's `secret` flag.
 */
class Door {
    /**
     * @param {Object} data  Door fields from dungeon data or a save.
     */
    constructor(data) {
        this.state = data.state || FD.Enums.DoorState.CLOSED;
        /** Room id the bar is on; from that side it can be lifted freely. */
        this.barredFrom = data.barredFrom || null;
        /** Key item id that opens this lock. */
        this.keyId = data.keyId || null;
        /** RULE 35 / TABLE 5: spiked shut by the party. */
        this.spiked = !!data.spiked;
        /** Hold Portal / Web: turns remaining. */
        this.heldTurns = data.heldTurns || 0;
        /** Wizard Lock: only the caster may pass. */
        this.wizardLocked = !!data.wizardLocked;
        /** Clock turn of the last listen, so listening is once per door per turn. */
        this.listenedTurn = data.listenedTurn !== undefined ? data.listenedTurn : -1;
    }

    /**
     * True if something magical or mechanical holds the door shut against monsters.
     * @returns {boolean}
     */
    get isSecured() {
        return this.spiked || this.heldTurns > 0 || this.wizardLocked;
    }

    /**
     * Human-readable state.
     * @returns {string}
     */
    get label() {
        let text = this.state;
        if (this.spiked) {
            text += ', spiked';
        }
        if (this.heldTurns > 0) {
            text += ', held';
        }
        if (this.wizardLocked) {
            text += ', wizard-locked';
        }
        return text;
    }

    /**
     * @returns {Object}
     */
    toJSON() {
        return {
            state: this.state, barredFrom: this.barredFrom, keyId: this.keyId, spiked: this.spiked,
            heldTurns: this.heldTurns, wizardLocked: this.wizardLocked, listenedTurn: this.listenedTurn
        };
    }
}

FD.Model.Door = Door;
