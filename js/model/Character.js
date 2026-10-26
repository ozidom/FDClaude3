/**
 * An adventurer (rules 5-28). Holds the record on the Character Sheet; the
 * derived getters compute values from the data tables so they always match
 * the rules (AC, attack bonus, saves, slots, thief skills).
 */
class Character {
    /**
     * @param {Object} [data]  Field values (from CharacterFactory or a save).
     */
    constructor(data) {
        const d = data || {};
        this.name = d.name || 'Nameless';
        /** RULE 5b: 16-40 */
        this.age = d.age || 20;
        this.background = d.background || '';
        this.raceId = d.raceId || 'human';
        this.classId = d.classId || 'fighter';
        this.level = d.level || 1;
        this.xp = d.xp || 0;
        /** RULE 12: STR, INT, WIS, DEX, CON, CHA */
        this.attributes = d.attributes || { STR: 10, INT: 10, WIS: 10, DEX: 10, CON: 10, CHA: 10 };
        this.hpMax = d.hpMax || 1;
        this.hpCurrent = d.hpCurrent !== undefined ? d.hpCurrent : this.hpMax;
        this.gold = d.gold || 0;
        this.inventory = new FD.Model.Inventory(d.inventory ? d.inventory.slice() : []);
        /** uids of equipped items */
        this.equipped = Object.assign({ weapon: null, armour: null, shield: null, ring: null, boots: null }, d.equipped || {});
        /** RULE 53b: a Wizard's known spells */
        this.spellbook = d.spellbook ? d.spellbook.slice() : [];
        /** RULE 53d: prepared spells, one entry per slot: { spellId, level, used } */
        this.prepared = d.prepared ? d.prepared.map(p => Object.assign({}, p)) : [];
        /** Timed effects: { id, name, turns, data } */
        this.effects = d.effects ? d.effects.map(e => Object.assign({}, e)) : [];
        /** Conditions: invisible (until broken), paralysedRounds */
        this.conditions = Object.assign({ invisible: false, paralysedRounds: 0 }, d.conditions || {});
        this.dead = !!d.dead;
        this.causeOfDeath = d.causeOfDeath || null;
    }

    /** @returns {Object} TABLE 2 row. */
    get race() {
        return FD.Data.Races[this.raceId];
    }

    /** @returns {Object} TABLE 3 class record. */
    get cls() {
        return FD.Data.Classes[this.classId];
    }

    /**
     * RULE 13: modifier for an attribute.
     * @param {string} attr  'STR', 'DEX', ...
     * @returns {number}
     */
    modifier(attr) {
        return FD.Data.Attributes.modifierFor(this.attributes[attr]);
    }

    /** @returns {Object} TABLE 3 row for the current level. */
    get levelRow() {
        return this.cls.levels[this.level - 1];
    }

    /**
     * TABLE 3: class attack bonus. RULE CONFLICT 4: rule 59 says levels 1-3
     * have no bonus, but Table 3 (and the sample of play, Dorn) gives one. Table 3 wins.
     * @returns {number}
     */
    get attackBonus() {
        return this.levelRow.ab;
    }

    /**
     * Returns the equipped item in a slot, or null.
     * @param {string} slot  'weapon' | 'armour' | 'shield' | 'ring' | 'boots'
     * @returns {Object|null}
     */
    equippedItem(slot) {
        const uid = this.equipped[slot];
        if (!uid) {
            return null;
        }
        return this.inventory.get(uid);
    }

    /**
     * The weapon used for melee: the equipped item merged with its TABLE 6 data,
     * or fists if nothing is equipped.
     * @returns {{item:Object|null, def:Object, magicBonus:number, magical:boolean}}
     */
    get weapon() {
        const item = this.equippedItem('weapon');
        if (!item) {
            return { item: null, def: FD.Data.UNARMED, magicBonus: 0, magical: false };
        }
        const def = FD.Data.Weapons[item.defId];
        return { item: item, def: def, magicBonus: item.magicBonus || 0, magical: (item.magicBonus || 0) > 0 || !!item.silver };
    }

    /**
     * RULE 15 (Armour Class) / TABLE 1 step 6 / TABLE 7: AC = armour base (10 if none) + shield + DEX
     * modifier + magic. A two-handed weapon means no shield bonus (TABLE 7).
     * The Shield spell adds +4 (GM RULING).
     * @returns {number}
     */
    get armourClass() {
        let ac = FD.Data.BASE_AC;
        const armour = this.equippedItem('armour');
        if (armour) {
            ac = FD.Data.Armour[armour.defId].ac + (armour.magicBonus || 0);
        }
        const shield = this.equippedItem('shield');
        if (shield && !this.weapon.def.twoHanded) {
            ac += FD.Data.Shield.acBonus + (shield.magicBonus || 0);
        }
        ac += this.modifier('DEX');
        // TABLE 15: Ring of Protection +1
        if (this.equippedItem('ring')) {
            ac += 1;
        }
        const shieldSpell = this.getEffect('shieldSpell');
        if (shieldSpell) {
            ac += shieldSpell.data.ac;
        }
        return ac;
    }

    /**
     * AC against a particular monster.
     * TABLE 2 (Halfling): +2 AC against larger-than-human attackers.
     * @param {FD.Model.Monster} monster  The attacker.
     * @returns {number}
     */
    acAgainst(monster) {
        let ac = this.armourClass;
        if (monster && monster.hasTag('large')) {
            ac += this.race.acVsLarge;
        }
        return ac;
    }

    /**
     * TABLE 4: saving throw targets for this class (levels 1-3 share one row).
     * @returns {Object<string, number>}
     */
    get saves() {
        return Object.assign({}, this.cls.saves);
    }

    /**
     * Bonus added to every saving throw roll.
     * TABLE 15: Ring of Protection gives +1 to saves.
     * @returns {number}
     */
    get saveBonus() {
        let bonus = 0;
        if (this.equippedItem('ring')) {
            bonus += 1;
        }
        return bonus;
    }

    /**
     * RULE 42: 10 + STR modifier Slots. Floating Disc adds Slots while it lasts.
     * @returns {number}
     */
    get maxSlots() {
        let slots = 10 + this.modifier('STR');
        const disc = this.getEffect('floatingDisc');
        if (disc) {
            slots += disc.data.slots;
        }
        return slots;
    }

    /**
     * RULE 42: Slots used by items plus 1 per 100 coins (gold and found coins).
     * @returns {number}
     */
    get usedSlots() {
        const coins = this.gold + this.inventory.coinValue();
        return this.inventory.slotsUsed(this.equipped) + Math.floor(coins / 100);
    }

    /**
     * RULE 42: over the Slot limit means Encumbered.
     * @returns {boolean}
     */
    get isEncumbered() {
        return this.usedSlots > this.maxSlots;
    }

    /**
     * TABLE 9: Thief Skills for the current level, or null for non-thieves.
     * @returns {Object<string, number>|null}
     */
    get thiefSkills() {
        if (!this.cls.thief) {
            return null;
        }
        const skills = {};
        for (const key of Object.keys(FD.Data.ThiefSkills)) {
            skills[key] = FD.Data.ThiefSkills[key].values[this.level - 1];
        }
        return skills;
    }

    /**
     * TABLE 8: spell slots per spell level for this class and level.
     * @returns {Object<number, number>}
     */
    get maxSpellSlots() {
        const table = FD.Data.SpellSlots[this.classId];
        if (!table) {
            return {};
        }
        return Object.assign({}, table[this.level]);
    }

    /** @returns {boolean} True if the class has any spell slots at this level. */
    get canCastSpells() {
        const slots = this.maxSpellSlots;
        for (const level of Object.keys(slots)) {
            if (slots[level] > 0) {
                return true;
            }
        }
        return false;
    }

    /** @returns {boolean} RULE 53b: a Wizard needs their spellbook to prepare. */
    get hasSpellbook() {
        for (const item of this.inventory.items) {
            if (item.kind === FD.Enums.ItemKind.SPELLBOOK) {
                return true;
            }
        }
        return false;
    }

    /**
     * Finds an active effect.
     * @param {string} id  Effect id.
     * @returns {Object|null}
     */
    getEffect(id) {
        for (const e of this.effects) {
            if (e.id === id) {
                return e;
            }
        }
        return null;
    }

    /**
     * True if an effect is active.
     * @param {string} id  Effect id.
     * @returns {boolean}
     */
    hasEffect(id) {
        return this.getEffect(id) !== null;
    }

    /**
     * RULE 14: healing cannot raise HP above the maximum.
     * @param {number} amount  HP to restore.
     * @returns {number}       HP actually restored.
     */
    heal(amount) {
        const before = this.hpCurrent;
        this.hpCurrent = Math.min(this.hpMax, this.hpCurrent + amount);
        return this.hpCurrent - before;
    }

    /**
     * RULE 59a: subtract damage; at 0 the adventurer is dead (rule 67).
     * @param {number} amount  Damage.
     * @returns {number}       HP left.
     */
    takeDamage(amount) {
        this.hpCurrent = Math.max(0, this.hpCurrent - amount);
        return this.hpCurrent;
    }

    /** @returns {boolean} */
    get isAlive() {
        return !this.dead && this.hpCurrent > 0;
    }

    /**
     * Serialises the character.
     * @returns {Object}
     */
    toJSON() {
        return {
            name: this.name, age: this.age, background: this.background,
            raceId: this.raceId, classId: this.classId, level: this.level, xp: this.xp,
            attributes: Object.assign({}, this.attributes),
            hpMax: this.hpMax, hpCurrent: this.hpCurrent, gold: this.gold,
            inventory: this.inventory.toJSON(), equipped: Object.assign({}, this.equipped),
            spellbook: this.spellbook.slice(), prepared: this.prepared.map(p => Object.assign({}, p)),
            effects: this.effects.map(e => Object.assign({}, e)), conditions: Object.assign({}, this.conditions),
            dead: this.dead, causeOfDeath: this.causeOfDeath
        };
    }

    /**
     * Rebuilds a character from saved data.
     * @param {Object} data  Output of toJSON().
     * @returns {Character}
     */
    static fromJSON(data) {
        return new Character(data);
    }
}

FD.Model.Character = Character;
