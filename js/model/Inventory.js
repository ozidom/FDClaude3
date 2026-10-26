/**
 * The items an adventurer carries (or that lie in a room). Items are plain
 * objects so they save cleanly; this class owns creating, stacking and
 * counting them. Slot rules come from rule 42 and Tables 5, 6, 7 and 14.
 */
class Inventory {
    /**
     * @param {Object[]} [items]  Existing item objects (from a save).
     */
    constructor(items) {
        /** @type {Object[]} */
        this.items = Array.isArray(items) ? items : [];
    }

    /**
     * Makes a unique item id. Uses a counter plus the clock, never Math.random().
     * @returns {string}
     */
    static nextUid() {
        Inventory.counter = (Inventory.counter || 0) + 1;
        return 'i' + Date.now().toString(36) + '-' + Inventory.counter;
    }

    /**
     * Creates an item object from a data table entry.
     * @param {string} kind     FD.Enums.ItemKind value.
     * @param {string} defId    Id in the matching data table (Equipment, Weapons, Armour, MagicItems).
     * @param {Object} [extra]  Extra fields to copy on (e.g. magicBonus, spellId, value).
     * @returns {Object}        The new item.
     */
    static createItem(kind, defId, extra) {
        const K = FD.Enums.ItemKind;
        let item = { uid: Inventory.nextUid(), kind: kind, defId: defId, name: defId, slots: 0, qty: 1, bundle: 0, cost: 0, value: 0 };
        if (kind === K.GEAR) {
            const def = FD.Data.Equipment[defId];
            item.name = def.name;
            item.slots = def.slots;
            item.cost = def.cost;
            item.qty = def.qty || 1;
            item.bundle = def.bundle || 0;
            item.method = !!def.method;
            item.throwable = !!def.throwable;
        } else if (kind === K.WEAPON) {
            const def = FD.Data.Weapons[defId];
            item.name = def.name;
            item.slots = def.slots;
            item.cost = def.cost;
            item.magicBonus = 0;
            item.silver = false;
        } else if (kind === K.ARMOUR) {
            const def = FD.Data.Armour[defId];
            item.name = def.name;
            item.slots = def.carriedSlots;
            item.cost = def.cost;
            item.magicBonus = 0;
        } else if (kind === K.SHIELD) {
            item.name = FD.Data.Shield.name;
            item.slots = FD.Data.Shield.carriedSlots;
            item.cost = FD.Data.Shield.cost;
            item.magicBonus = 0;
        } else if (kind === K.MAGIC) {
            const def = FD.Data.MagicItems[defId];
            item.name = def.name;
            item.slots = def.slots || 0;
            item.value = def.value;
        } else if (kind === K.SPELLBOOK) {
            item.name = 'Spellbook';
            item.slots = 1;
        }
        if (extra) {
            for (const key of Object.keys(extra)) {
                item[key] = extra[key];
            }
        }
        return item;
    }

    /**
     * Converts a treasure entry from dungeon data into an inventory item.
     * TABLE 14: coins are 1 gp each and every 100 coins is 1 Slot.
     * @param {Object} t  Room treasure entry.
     * @returns {Object}  Inventory item.
     */
    static fromTreasure(t) {
        const K = FD.Enums.ItemKind;
        if (t.item) {
            // An item dropped earlier (e.g. from a fallen adventurer) is stored whole
            return t.item;
        }
        if (t.kind === 'coins') {
            return { uid: Inventory.nextUid(), kind: K.TREASURE, defId: 'coins', coins: true, name: t.name + ' (' + t.value + ' gp)', value: t.value, slots: 0, qty: 1, bundle: 0 };
        }
        if (t.kind === 'treasure') {
            return { uid: Inventory.nextUid(), kind: K.TREASURE, defId: 'treasure', name: t.name, value: t.value, slots: t.slots || 0, qty: 1, bundle: 0 };
        }
        if (t.kind === 'key') {
            return { uid: Inventory.nextUid(), kind: K.KEY, defId: 'key', keyId: t.keyId, name: t.name, value: 0, slots: 0, qty: 1, bundle: 0 };
        }
        if (t.kind === 'weapon') {
            const extra = {};
            if (t.magicBonus) {
                extra.magicBonus = t.magicBonus;
                extra.name = t.name;
                extra.value = t.value || 0;
            }
            if (t.special) {
                extra.special = t.special;
            }
            return Inventory.createItem(K.WEAPON, t.weaponId, extra);
        }
        if (t.kind === 'magic') {
            const extra = {};
            if (t.spellId) {
                extra.spellId = t.spellId;
                extra.deciphered = !!t.deciphered;
                extra.name = t.name;
            }
            return Inventory.createItem(K.MAGIC, t.magicId, extra);
        }
        return { uid: Inventory.nextUid(), kind: K.TREASURE, defId: 'treasure', name: t.name, value: t.value || 0, slots: t.slots || 0, qty: 1, bundle: 0 };
    }

    /**
     * Adds an item, stacking bundles of the same gear (torches, spikes, oil).
     * @param {Object} item  Item to add.
     * @returns {Object}     The stored item (may be an existing stack).
     */
    add(item) {
        if (item.kind === FD.Enums.ItemKind.GEAR && item.bundle > 0) {
            for (const existing of this.items) {
                if (existing.kind === item.kind && existing.defId === item.defId) {
                    existing.qty += item.qty;
                    return existing;
                }
            }
        }
        this.items.push(item);
        return item;
    }

    /**
     * Removes an item by uid.
     * @param {string} uid  Item id.
     * @returns {Object|null} The removed item.
     */
    remove(uid) {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].uid === uid) {
                return this.items.splice(i, 1)[0];
            }
        }
        return null;
    }

    /**
     * Finds an item by uid.
     * @param {string} uid  Item id.
     * @returns {Object|null}
     */
    get(uid) {
        for (const item of this.items) {
            if (item.uid === uid) {
                return item;
            }
        }
        return null;
    }

    /**
     * Finds the first item with a data id (e.g. 'torch').
     * @param {string} defId  Data id.
     * @returns {Object|null}
     */
    findByDef(defId) {
        for (const item of this.items) {
            if (item.defId === defId) {
                return item;
            }
        }
        return null;
    }

    /**
     * True if at least one of the item is carried.
     * @param {string} defId  Data id.
     * @returns {boolean}
     */
    has(defId) {
        return this.count(defId) > 0;
    }

    /**
     * Counts units of an item (stack quantities summed).
     * @param {string} defId  Data id.
     * @returns {number}
     */
    count(defId) {
        let total = 0;
        for (const item of this.items) {
            if (item.defId === defId) {
                total += item.qty || 1;
            }
        }
        return total;
    }

    /**
     * Uses up units of a stackable item.
     * @param {string} defId  Data id.
     * @param {number} [n]    Units to use (default 1).
     * @returns {boolean}     False if there were not enough.
     */
    consume(defId, n) {
        let needed = n || 1;
        if (this.count(defId) < needed) {
            return false;
        }
        for (let i = this.items.length - 1; i >= 0 && needed > 0; i--) {
            const item = this.items[i];
            if (item.defId !== defId) {
                continue;
            }
            const take = Math.min(item.qty || 1, needed);
            item.qty = (item.qty || 1) - take;
            needed -= take;
            if (item.qty <= 0) {
                this.items.splice(i, 1);
            }
        }
        return true;
    }

    /**
     * Slots one item takes. Worn armour and shields cost nothing (rule 42).
     * Bundles cost `slots` per started bundle (TABLE 5: 1 Slot per 6 torches).
     * @param {Object} item      The item.
     * @param {Object} equipped  The character's equipped map (uids).
     * @returns {number}
     */
    static slotsFor(item, equipped) {
        if (equipped) {
            // RULE 42: worn armour costs no Slots; GM RULING: a carried shield is worn too
            if (equipped.armour === item.uid || equipped.shield === item.uid) {
                return 0;
            }
        }
        if (item.coins) {
            return 0;
        }
        if (item.bundle > 0) {
            return Math.ceil(item.qty / item.bundle) * item.slots;
        }
        return item.slots || 0;
    }

    /**
     * Total Slots used by items (coins are counted separately with gold).
     * @param {Object} equipped  Equipped uids.
     * @returns {number}
     */
    slotsUsed(equipped) {
        let total = 0;
        for (const item of this.items) {
            total += Inventory.slotsFor(item, equipped);
        }
        return total;
    }

    /**
     * Total value of loose coins found in the dungeon.
     * @returns {number}
     */
    coinValue() {
        let total = 0;
        for (const item of this.items) {
            if (item.coins) {
                total += item.value;
            }
        }
        return total;
    }

    /**
     * Items of the treasure kind (coins, gems, objects) plus valued magic items.
     * @returns {Object[]}
     */
    treasureItems() {
        return this.items.filter(i => i.kind === FD.Enums.ItemKind.TREASURE);
    }

    /**
     * Serialises the inventory.
     * @returns {Object[]}
     */
    toJSON() {
        return this.items.map(i => Object.assign({}, i));
    }
}

FD.Model.Inventory = Inventory;
