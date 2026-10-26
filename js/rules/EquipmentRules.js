/**
 * What an adventurer may wield and wear (TABLE 1 notes, rules 24-27,
 * TABLE 6 and TABLE 7), and equipping items.
 */
class EquipmentRules {
    /**
     * Checks whether the class may use a weapon.
     * RULE 25: Clerics only club, mace, staff, sling. RULE 26: Wizards only dagger, staff.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {string} weaponId               TABLE 6 id.
     * @returns {{ok:boolean, reason:string}}
     */
    static canUseWeapon(character, weaponId) {
        const allowed = character.cls.weapons;
        if (allowed === 'any' || allowed.indexOf(weaponId) >= 0) {
            return { ok: true, reason: '' };
        }
        let rule = 'rule 25';
        if (character.classId === 'wizard') {
            rule = 'rule 26';
        }
        return { ok: false, reason: character.cls.name + 's cannot use that weapon (' + rule + ')' };
    }

    /**
     * Checks whether the class may wear armour.
     * RULE 26: Wizards wear none. RULE 27: Thieves leather only.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {string} armourId               TABLE 7 id.
     * @returns {{ok:boolean, reason:string}}
     */
    static canWearArmour(character, armourId) {
        if (character.cls.armour.indexOf(armourId) >= 0) {
            return { ok: true, reason: '' };
        }
        let rule = 'rule 27';
        if (character.classId === 'wizard') {
            rule = 'rule 26';
        }
        return { ok: false, reason: character.cls.name + 's cannot wear that armour (' + rule + ')' };
    }

    /**
     * Checks whether the class may use a shield (TABLE 1 notes).
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {{ok:boolean, reason:string}}
     */
    static canUseShield(character) {
        if (character.cls.shield) {
            return { ok: true, reason: '' };
        }
        return { ok: false, reason: character.cls.name + 's cannot use a shield (TABLE 1 notes)' };
    }

    /**
     * Checks whether an inventory item can be equipped.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {Object} item                   Inventory item.
     * @returns {{ok:boolean, reason:string, slot:string|null}}
     */
    static canEquip(character, item) {
        const K = FD.Enums.ItemKind;
        if (item.kind === K.WEAPON) {
            const r = EquipmentRules.canUseWeapon(character, item.defId);
            return { ok: r.ok, reason: r.reason, slot: 'weapon' };
        }
        if (item.kind === K.ARMOUR) {
            const r = EquipmentRules.canWearArmour(character, item.defId);
            return { ok: r.ok, reason: r.reason, slot: 'armour' };
        }
        if (item.kind === K.SHIELD) {
            const r = EquipmentRules.canUseShield(character);
            return { ok: r.ok, reason: r.reason, slot: 'shield' };
        }
        if (item.kind === K.MAGIC) {
            const def = FD.Data.MagicItems[item.defId];
            if (def && def.ring) {
                return { ok: true, reason: '', slot: 'ring' };
            }
            if (def && def.boots) {
                return { ok: true, reason: '', slot: 'boots' };
            }
        }
        return { ok: false, reason: 'Not something you equip', slot: null };
    }

    /**
     * Equips an item, replacing whatever was in that slot.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {string} uid                    Item uid.
     * @returns {{ok:boolean, text:string}}
     */
    static equip(character, uid) {
        const item = character.inventory.get(uid);
        if (!item) {
            return { ok: false, text: 'No such item.' };
        }
        const check = EquipmentRules.canEquip(character, item);
        if (!check.ok) {
            return { ok: false, text: check.reason };
        }
        character.equipped[check.slot] = uid;
        let text = 'You equip the ' + item.name + '.';
        // TABLE 7: a shield cannot normally be used with a two-handed weapon
        if (character.equipped.shield && character.weapon.def.twoHanded) {
            text += ' (Two-handed: your shield gives no AC while you wield it.)';
        }
        return { ok: true, text: text };
    }

    /**
     * Removes an item from its equipped slot.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {string} uid                    Item uid.
     * @returns {void}
     */
    static unequip(character, uid) {
        for (const slot of Object.keys(character.equipped)) {
            if (character.equipped[slot] === uid) {
                character.equipped[slot] = null;
            }
        }
    }

    /**
     * True if the item is equipped in any slot.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {string} uid                    Item uid.
     * @returns {boolean}
     */
    static isEquipped(character, uid) {
        for (const slot of Object.keys(character.equipped)) {
            if (character.equipped[slot] === uid) {
                return true;
            }
        }
        return false;
    }
}

FD.Rules.EquipmentRules = EquipmentRules;
