/**
 * Tests for attribute modifiers, AC, saves, slots and creation (Milestone 1).
 */
FD.Tests.suite('Character & creation', (t) => {
    const eq = FD.Tests.eq;
    const ok = FD.Tests.ok;
    const K = FD.Enums.ItemKind;

    t.it('RULE 13: modifier boundaries', () => {
        const m = FD.Rules.AttributeRules.modifier;
        eq(m(3), -3);
        eq(m(4), -2);
        eq(m(5), -2);
        eq(m(6), -1);
        eq(m(8), -1);
        eq(m(9), 0);
        eq(m(12), 0);
        eq(m(13), 1);
        eq(m(15), 1);
        eq(m(16), 2);
        eq(m(17), 2);
        eq(m(18), 3);
    });

    t.it('RULE 42: STR 16 gives 12 slots', () => {
        const pc = FD.Tests.makeCharacter({ attributes: { STR: 16 } });
        eq(pc.maxSlots, 12);
    });

    t.it('RULE 42: 100 coins = 1 slot and worn armour is free', () => {
        const pc = FD.Tests.makeCharacter({ gold: 250 });
        const chain = pc.inventory.add(FD.Model.Inventory.createItem(K.ARMOUR, 'chain'));
        eq(pc.usedSlots, 2 + 2, 'carried chain 2 + coins 2');
        FD.Rules.EquipmentRules.equip(pc, chain.uid);
        eq(pc.usedSlots, 2, 'worn chain costs nothing');
    });

    t.it('TABLE 5: six torches take one slot', () => {
        const pc = FD.Tests.makeCharacter();
        pc.inventory.add(FD.Model.Inventory.createItem(K.GEAR, 'torch'));
        eq(pc.usedSlots, 1);
        pc.inventory.add(FD.Model.Inventory.createItem(K.GEAR, 'torch'));
        eq(pc.inventory.count('torch'), 12);
        eq(pc.usedSlots, 2);
        pc.inventory.consume('torch', 6);
        eq(pc.usedSlots, 1);
    });

    t.it('AC: Dorn (chain + shield, DEX 10) is 15', () => {
        const pc = FD.Tests.makeCharacter({ attributes: { STR: 15 } });
        const chain = pc.inventory.add(FD.Model.Inventory.createItem(K.ARMOUR, 'chain'));
        const shield = pc.inventory.add(FD.Model.Inventory.createItem(K.SHIELD, 'shield'));
        FD.Rules.EquipmentRules.equip(pc, chain.uid);
        FD.Rules.EquipmentRules.equip(pc, shield.uid);
        eq(pc.armourClass, 15);
    });

    t.it('AC: Mara (leather, DEX 16) is 14', () => {
        const pc = FD.Tests.makeCharacter({ raceId: 'halfling', classId: 'thief', attributes: { DEX: 16 } });
        const leather = pc.inventory.add(FD.Model.Inventory.createItem(K.ARMOUR, 'leather'));
        FD.Rules.EquipmentRules.equip(pc, leather.uid);
        eq(pc.armourClass, 14);
    });

    t.it('TABLE 7: no shield bonus with a two-handed weapon', () => {
        const pc = FD.Tests.makeCharacter();
        const shield = pc.inventory.add(FD.Model.Inventory.createItem(K.SHIELD, 'shield'));
        const sword = pc.inventory.add(FD.Model.Inventory.createItem(K.WEAPON, 'twoHandedSword'));
        FD.Rules.EquipmentRules.equip(pc, shield.uid);
        eq(pc.armourClass, 11);
        FD.Rules.EquipmentRules.equip(pc, sword.uid);
        eq(pc.armourClass, 10);
    });

    t.it('TABLE 3 / RULE CONFLICT 4: Dorn attacks at +2 (AB 1 + STR 1)', () => {
        const pc = FD.Tests.makeCharacter({ attributes: { STR: 15 } });
        eq(pc.attackBonus + pc.modifier('STR'), 2);
    });

    t.it('TABLE 4: saving throws by class', () => {
        eq(FD.Tests.makeCharacter({ classId: 'fighter' }).saves.death, 12);
        eq(FD.Tests.makeCharacter({ classId: 'cleric' }).saves.spells, 15);
        eq(FD.Tests.makeCharacter({ classId: 'wizard' }).saves.paralysis, 13);
        eq(FD.Tests.makeCharacter({ classId: 'thief' }).saves.breath, 16);
    });

    t.it('TABLE 2: race restrictions', () => {
        const f = FD.Rules.CharacterFactory;
        ok(!f.isClassAllowed('dwarf', 'wizard'), 'dwarf wizard');
        ok(!f.isClassAllowed('elf', 'thief'), 'elf thief');
        ok(f.isClassAllowed('halfling', 'thief'), 'halfling thief');
        ok(f.isClassAllowed('human', 'wizard'), 'human wizard');
    });

    t.it('TABLE 1 step 5: HP is at least 1', () => {
        FD.Core.dice.force([1, 3, 3, 3]);
        const pc = FD.Rules.CharacterFactory.create({ name: 'Weak', raceId: 'human', classId: 'wizard', attributes: { STR: 10, INT: 10, WIS: 10, DEX: 10, CON: 3, CHA: 10 }, wizardSpell: 'sleep' });
        eq(pc.hpMax, 1);
        eq(pc.gold, 90, '3d6 x10 with 3,3,3');
        ok(pc.spellbook.indexOf('readMagic') >= 0 && pc.spellbook.indexOf('sleep') >= 0, 'RULE 53b spellbook');
        ok(pc.hasSpellbook, 'spellbook item');
    });

    t.it('TABLE 9: thief skills by level', () => {
        const pc = FD.Tests.makeCharacter({ classId: 'thief', level: 2 });
        eq(pc.thiefSkills.openLocks, 20);
        eq(pc.thiefSkills.climb, 88);
        eq(FD.Tests.makeCharacter().thiefSkills, null);
    });

    t.it('RULE 25 / 26: class weapon restrictions', () => {
        const cleric = FD.Tests.makeCharacter({ classId: 'cleric' });
        ok(!FD.Rules.EquipmentRules.canUseWeapon(cleric, 'sword').ok, 'cleric sword');
        ok(FD.Rules.EquipmentRules.canUseWeapon(cleric, 'mace').ok, 'cleric mace');
        const wiz = FD.Tests.makeCharacter({ classId: 'wizard' });
        ok(!FD.Rules.EquipmentRules.canWearArmour(wiz, 'leather').ok, 'wizard armour');
        ok(FD.Rules.EquipmentRules.canUseWeapon(wiz, 'dagger').ok, 'wizard dagger');
    });
});
