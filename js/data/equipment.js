/**
 * TABLE 5 (Equipment). Stackable items list a bundle: `bundle` units take
 * `slots` Slots (e.g. 6 torches = 1 Slot). `method` marks an item that can be
 * used to search with no roll (rule 38).
 */
FD.Data.Equipment = {
    backpack: { id: 'backpack', name: 'Backpack', cost: 5, slots: 0, desc: 'Organises carried items; does not increase maximum Slots.' },
    sack: { id: 'sack', name: 'Sack', cost: 1, slots: 0, desc: 'Holds loose treasure.' },
    largeSack: { id: 'largeSack', name: 'Large Sack', cost: 2, slots: 0, desc: 'Holds more loose treasure.' },
    rope: { id: 'rope', name: "Rope, 50'", cost: 1, slots: 1, desc: 'Cross, descend or climb hazards. With a grappling hook, crosses chasms.' },
    pole: { id: 'pole', name: "10' Pole", cost: 1, slots: 2, method: true, desc: 'Probe floors and pits from safety: finds pit traps with no roll (rule 38).' },
    spikes: { id: 'spikes', name: 'Iron Spikes', cost: 1, slots: 1, qty: 12, bundle: 12, desc: 'Jam doors shut (needs a hammer).' },
    hammer: { id: 'hammer', name: 'Hammer', cost: 2, slots: 1, desc: 'Drives spikes. Loud: may trigger a Wandering Monster check.' },
    crowbar: { id: 'crowbar', name: 'Crowbar', cost: 2, slots: 1, desc: '+2 to force doors; pry lids open from a safe angle.' },
    grapplingHook: { id: 'grapplingHook', name: 'Grappling Hook', cost: 1, slots: 1, desc: 'With rope, overcomes vertical obstacles and chasms.' },
    tinderbox: { id: 'tinderbox', name: 'Tinderbox', cost: 3, slots: 0, desc: 'Lights torches and lanterns.' },
    torch: { id: 'torch', name: 'Torches', cost: 1, slots: 1, qty: 6, bundle: 6, desc: 'Each torch burns 6 Dungeon Turns (rule 41). Sold in bundles of 6.' },
    lantern: { id: 'lantern', name: 'Lantern', cost: 10, slots: 1, desc: 'Burns one oil flask for 24 Dungeon Turns.' },
    oil: { id: 'oil', name: 'Oil Flask', cost: 2, slots: 1, qty: 1, bundle: 1, throwable: true, desc: 'Fuels a lantern for 24 turns, or thrown burning for 1d8.' },
    waterskin: { id: 'waterskin', name: 'Waterskin', cost: 1, slots: 1, desc: 'Holds water.' },
    rations: { id: 'rations', name: 'Rations, 7 days', cost: 5, slots: 1, qty: 1, bundle: 1, desc: 'Food. Hungry creatures may accept it as an offering.' },
    chalk: { id: 'chalk', name: 'Chalk', cost: 1, slots: 0, desc: 'Mark rooms and corridors.' },
    mirror: { id: 'mirror', name: 'Mirror, small', cost: 5, slots: 0, method: true, desc: 'Peek into the next room without entering: no surprise for you (rule 38).' },
    bell: { id: 'bell', name: 'Bell', cost: 1, slots: 0, desc: 'Rig alarms; makes noise.' },
    holySymbol: { id: 'holySymbol', name: 'Holy Symbol', cost: 25, slots: 0, desc: 'Required for a Cleric to Turn Undead.' },
    holyWater: { id: 'holyWater', name: 'Holy Water', cost: 25, slots: 1, qty: 1, bundle: 1, throwable: true, desc: 'Thrown at undead for 1d8 damage.' },
    thievesTools: { id: 'thievesTools', name: "Thieves' Tools", cost: 25, slots: 1, desc: 'Required for a Thief to pick locks.' },
    stakes: { id: 'stakes', name: 'Wooden Stakes', cost: 1, slots: 1, desc: 'Secure doors, objects or hazards.' },
    smallChest: { id: 'smallChest', name: 'Small Chest', cost: 10, slots: 2, desc: 'Carries valuables securely.' },
    shovel: { id: 'shovel', name: 'Shovel', cost: 3, slots: 2, desc: 'Dig and clear rubble.' }
};

/** Order the equipment appears in the Shoppe. */
FD.Data.EQUIPMENT_ORDER = [
    'torch', 'tinderbox', 'lantern', 'oil', 'rope', 'grapplingHook', 'pole', 'spikes', 'hammer',
    'crowbar', 'mirror', 'holySymbol', 'holyWater', 'thievesTools', 'backpack', 'sack', 'largeSack',
    'waterskin', 'rations', 'chalk', 'bell', 'stakes', 'smallChest', 'shovel'
];
