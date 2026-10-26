/**
 * TABLE 14 (Treasure) and TABLE 15 (Magic Items).
 * Treasure only gives XP if it reaches the dungeon exit (rule 67).
 */
FD.Data.TreasureTypes = {
    coins: { name: 'Loose Coins', slots: 'Every 100 coins = 1 Slot' },
    coinSack: { name: 'Coin Sack', slots: 1 },
    heavyCoinSack: { name: 'Heavy Coin Sack', slots: 2 },
    gem: { name: 'Gem', slots: 0 },
    jewellery: { name: 'Jewellery', slots: 0 },
    silverObject: { name: 'Silver Object', slots: 1 },
    goldenObject: { name: 'Golden Object', slots: 1 },
    artObject: { name: 'Art Object', slots: 2 },
    chest: { name: 'Treasure Chest', slots: 3 }
};

/**
 * TABLE 15 (Magic Items). `use` names the effect handled by SpellRules.useItem.
 * `value` is a GM RULING sale price in town.
 */
FD.Data.MagicItems = {
    potionHealing: { id: 'potionHealing', name: 'Potion of Healing', slots: 0, value: 100, use: 'heal', desc: 'Drink to restore 1d6+1 HP.' },
    potionInvisibility: { id: 'potionInvisibility', name: 'Potion of Invisibility', slots: 0, value: 150, use: 'invisibility', desc: 'Become Invisible until you attack.' },
    potionSpeed: { id: 'potionSpeed', name: 'Potion of Speed', slots: 0, value: 150, use: 'speed', desc: 'GM RULING: +1 zone of movement for this fight.' },
    scroll: { id: 'scroll', name: 'Scroll', slots: 0, value: 100, desc: 'One spell. Wizards need Read Magic first (rule 53h).' },
    weaponPlus1: { id: 'weaponPlus1', name: 'Weapon +1', value: 300, desc: '+1 to attack and damage.' },
    armourPlus1: { id: 'armourPlus1', name: 'Armour +1', value: 300, desc: '+1 AC.' },
    shieldPlus1: { id: 'shieldPlus1', name: 'Shield +1', value: 200, desc: '+1 AC beyond the shield bonus.' },
    ringProtection: { id: 'ringProtection', name: 'Ring of Protection +1', slots: 0, value: 400, ring: true, desc: '+1 AC and +1 to Saving Throws while worn.' },
    bootsElvenkind: { id: 'bootsElvenkind', name: 'Boots of Elvenkind', slots: 0, value: 300, boots: true, desc: 'Monsters roll surprise at -1.' }
};
