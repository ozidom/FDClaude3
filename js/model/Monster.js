/**
 * One monster instance, created from a TABLE 11 template. Holds its own HP,
 * zone on the Clash Board and state, and persists inside its room between
 * visits (rule 68).
 */
class Monster {
    /**
     * @param {Object} data  Field values (see fromTemplate).
     */
    constructor(data) {
        this.uid = data.uid;
        this.templateId = data.templateId;
        this.name = data.name;
        this.hd = data.hd;
        this.ac = data.ac;
        this.move = data.move;
        this.attacks = data.attacks.map(a => Object.assign({}, a));
        this.morale = data.morale;
        this.tags = data.tags.slice();
        this.behaviour = data.behaviour.slice();
        this.undeadType = data.undeadType || null;
        this.hpMax = data.hpMax;
        this.hp = data.hp !== undefined ? data.hp : data.hpMax;
        this.zone = data.zone !== undefined ? data.zone : FD.Enums.Zone.ENEMY;
        this.state = data.state || FD.Enums.MonsterState.STANDING;
        this.aware = data.aware !== undefined ? data.aware : true;
        /** Monster missile weapon id from TABLE 6 (e.g. a goblin's crossbow) */
        this.missile = data.missile || null;
        /** Reach weapon (spear): may strike the adjacent zone (rule 58a) */
        this.reach = !!data.reach;
        this.weaponName = data.weaponName || null;
        this.surpriseChance = data.surpriseChance || 2;
        this.attached = !!data.attached;
        this.webbedRounds = data.webbedRounds || 0;
        this.fleeing = !!data.fleeing;
        this.reloading = !!data.reloading;
    }

    /**
     * Converts TABLE 11 Hit Dice text to a number used for comparisons.
     * '1/2' = 0.5, '1-1' = 0.75, '1+1' = 1.25, '2*' = 2.
     * @param {string} hd  Hit Dice text.
     * @returns {number}
     */
    static hdValueOf(hd) {
        const text = String(hd).replace('*', '').replace('½', '1/2');
        if (text === '1/2') {
            return 0.5;
        }
        const plus = text.match(/^(\d+)\+(\d+)$/);
        if (plus) {
            return parseInt(plus[1], 10) + 0.25;
        }
        const minus = text.match(/^(\d+)-(\d+)$/);
        if (minus) {
            return parseInt(minus[1], 10) - 0.25;
        }
        return parseInt(text, 10);
    }

    /**
     * Dice expression for rolling HP from Hit Dice: d8 per HD (B/X), d4 for 1/2 HD.
     * @param {string} hd  Hit Dice text.
     * @returns {string}   e.g. '2d8+2'.
     */
    static hitDiceExpr(hd) {
        const text = String(hd).replace('*', '').replace('½', '1/2');
        if (text === '1/2') {
            return '1d4';
        }
        const plus = text.match(/^(\d+)\+(\d+)$/);
        if (plus) {
            return plus[1] + 'd8+' + plus[2];
        }
        const minus = text.match(/^(\d+)-(\d+)$/);
        if (minus) {
            return minus[1] + 'd8-' + minus[2];
        }
        return text + 'd8';
    }

    /**
     * Builds an instance from a TABLE 11 template.
     * @param {string} templateId  Key in FD.Data.Monsters.
     * @param {number} hp          Rolled hit points (rolled by the rules layer).
     * @param {Object} [opts]      Overrides: name, missile, reach, weaponName, ac.
     * @returns {Monster}
     */
    static fromTemplate(templateId, hp, opts) {
        const t = FD.Data.Monsters[templateId];
        const o = opts || {};
        Monster.counter = (Monster.counter || 0) + 1;
        return new Monster({
            uid: 'm' + Date.now().toString(36) + '-' + Monster.counter,
            templateId: templateId,
            name: o.name || t.name,
            hd: t.hd,
            ac: o.ac || t.ac,
            move: t.move,
            attacks: t.attacks,
            morale: t.morale,
            tags: t.tags,
            behaviour: o.behaviour || t.behaviour,
            undeadType: t.undeadType,
            hpMax: Math.max(1, hp),
            missile: o.missile || null,
            reach: !!o.reach,
            weaponName: o.weaponName || null,
            surpriseChance: t.surpriseChance || 2
        });
    }

    /** @returns {Object} The TABLE 11 template. */
    get template() {
        return FD.Data.Monsters[this.templateId];
    }

    /** @returns {number} Numeric Hit Dice value. */
    get hdValue() {
        return Monster.hdValueOf(this.hd);
    }

    /**
     * RULE 59 (Monster Attack Bonus): up to 1 HD +0; over 1 to 2 +1;
     * over 2 to 3 +2; 4 HD and over +3.
     * @returns {number}
     */
    get attackBonus() {
        const hd = this.hdValue;
        for (const row of FD.Data.MONSTER_AB_TABLE) {
            if (hd <= row.maxHd) {
                return row.ab;
            }
        }
        return 3;
    }

    /**
     * RULE 67 (Experience): 10 XP per Hit Die, minimum 5.
     * @returns {number}
     */
    get xpValue() {
        return Math.max(5, Math.floor(this.hdValue) * 10);
    }

    /**
     * True if the monster is on the board and still fighting.
     * RULE 58e: fled, dead, surrendered or stopped-fighting creatures are out.
     * @returns {boolean}
     */
    get isStanding() {
        return this.state === FD.Enums.MonsterState.STANDING && !this.fleeing;
    }

    /**
     * True if the monster is physically present and blocks movement (rule 58b).
     * @returns {boolean}
     */
    get blocks() {
        return this.state === FD.Enums.MonsterState.STANDING;
    }

    /**
     * True if the monster can act this round.
     * @returns {boolean}
     */
    get canAct() {
        return this.state === FD.Enums.MonsterState.STANDING && this.webbedRounds <= 0;
    }

    /**
     * @param {string} tag  Tag name.
     * @returns {boolean}
     */
    hasTag(tag) {
        return this.tags.indexOf(tag) >= 0;
    }

    /**
     * Serialises the monster.
     * @returns {Object}
     */
    toJSON() {
        return {
            uid: this.uid, templateId: this.templateId, name: this.name, hd: this.hd, ac: this.ac, move: this.move,
            attacks: this.attacks, morale: this.morale, tags: this.tags, behaviour: this.behaviour,
            undeadType: this.undeadType, hpMax: this.hpMax, hp: this.hp, zone: this.zone, state: this.state,
            aware: this.aware, missile: this.missile, reach: this.reach, weaponName: this.weaponName,
            surpriseChance: this.surpriseChance, attached: false, webbedRounds: 0, fleeing: false, reloading: false
        };
    }

    /**
     * @param {Object} data  Output of toJSON().
     * @returns {Monster}
     */
    static fromJSON(data) {
        return new Monster(data);
    }
}

FD.Model.Monster = Monster;
