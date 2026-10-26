/**
 * The state of one fight on the Clash Board (RULE 4d). RULE 54: combat is divided
 * into Combat Rounds of about ten seconds (rules 54-65). Created by
 * CombatEngine.start() and discarded when the fight ends; it is never saved,
 * because the game only saves in town.
 */
class CombatState {
    /**
     * @param {Object} data  Setup values from CombatEngine.start().
     */
    constructor(data) {
        this.round = 1;
        /** @type {FD.Model.Monster[]} the monsters in this fight */
        this.monsters = data.monsters;
        this.pcZone = FD.Enums.Zone.PARTY;
        this.distance = data.distance || FD.Enums.Distance.NORMAL;
        /** RULE 47: which sides are surprised in round 1 */
        this.surprise = data.surprise || { pc: false, monsters: false };
        /** RULE 60: missiles are impossible in Small rooms */
        this.roomSize = data.roomSize || 2;
        this.roomId = data.roomId;
        /** RULE 41b: fighting in darkness */
        this.dark = !!data.dark;
        this.encounterId = data.encounterId || null;
        this.wandering = !!data.wandering;
        /** RULE 55: initiative results for the current round */
        this.initiative = null;
        /** RULE 55: on a tie all damage is applied at the end of the round */
        this.simultaneous = false;
        /** @type {{target:string, amount:number, source:string}[]} */
        this.pendingDamage = [];
        /** RULE 52a: morale trigger bookkeeping */
        this.casualties = 0;
        this.firstCasualtyChecked = false;
        this.halfChecked = false;
        this.startingCount = data.monsters.length;
        /** RULE 61c: the PC was hurt before their spell resolved */
        this.pcHurtThisRound = false;
        /** Crossbow reload (RULE CONFLICT 2): true while reloading */
        this.pcReloading = false;
        /** uids of thrown weapons lying on the floor, recovered after the fight */
        this.thrown = [];
        /** Lines describing the last round, for the board summary */
        this.roundLog = [];
        /** Outcome once over: 'victory' | 'pcDead' | 'escaped' | 'bargain' | 'surrendered' */
        this.outcome = null;
        this.over = false;
        /** GM RULING: Potion of Speed adds a zone of movement for this fight */
        this.pcSpeedBonus = 0;
    }

    /**
     * Monsters still standing and fighting (rule 58e).
     * @returns {FD.Model.Monster[]}
     */
    get standing() {
        return this.monsters.filter(m => m.isStanding);
    }

    /**
     * Monsters no longer fighting: dead, fled, surrendered, asleep, turned, charmed or fleeing.
     * @returns {FD.Model.Monster[]}
     */
    get defeated() {
        return this.monsters.filter(m => !m.isStanding);
    }

    /**
     * Finds a monster by uid.
     * @param {string} uid  Monster id.
     * @returns {FD.Model.Monster|null}
     */
    getMonster(uid) {
        for (const m of this.monsters) {
            if (m.uid === uid) {
                return m;
            }
        }
        return null;
    }

    /**
     * RULE 58c: the PC is Engaged if a standing enemy shares their zone.
     * @returns {boolean}
     */
    get pcEngaged() {
        for (const m of this.monsters) {
            if (m.blocks && !m.fleeing && m.zone === this.pcZone) {
                return true;
            }
        }
        return false;
    }
}

FD.Model.CombatState = CombatState;
