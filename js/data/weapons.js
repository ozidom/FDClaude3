/**
 * TABLE 6 (Weapons).
 * `range` is the Table 6 Range value. `thrownRange` is the range when thrown.
 * Zone reach on the 3-zone board is worked out in CombatEngine.maxZoneDistance()
 * (RULE CONFLICT 2, see SPEC §11).
 */
FD.Data.Weapons = {
    dagger: { id: 'dagger', name: 'Dagger', cost: 3, damage: '1d4', slots: 0, range: 1, thrownRange: 2 },
    // TABLE 6 lists no price for a club; GM RULING: any stout stick, free.
    club: { id: 'club', name: 'Club', cost: 0, damage: '1d4', slots: 1, range: 1 },
    staff: { id: 'staff', name: 'Staff', cost: 2, damage: '1d4', slots: 2, range: 1, twoHanded: true },
    handAxe: { id: 'handAxe', name: 'Hand Axe', cost: 4, damage: '1d6', slots: 1, range: 1, thrownRange: 2 },
    mace: { id: 'mace', name: 'Mace', cost: 5, damage: '1d6', slots: 1, range: 1 },
    shortSword: { id: 'shortSword', name: 'Short Sword', cost: 7, damage: '1d6', slots: 1, range: 1 },
    spear: { id: 'spear', name: 'Spear', cost: 3, damage: '1d6', slots: 2, range: 1, thrownRange: 2, reach: true },
    sword: { id: 'sword', name: 'Sword', cost: 10, damage: '1d8', slots: 1, range: 1 },
    battleAxe: { id: 'battleAxe', name: 'Battle Axe', cost: 7, damage: '1d8', slots: 2, range: 1, twoHanded: true },
    twoHandedSword: { id: 'twoHandedSword', name: 'Two-Handed Sword', cost: 10, damage: '1d10', slots: 2, range: 1, twoHanded: true },
    poleArm: { id: 'poleArm', name: 'Pole Arm', cost: 7, damage: '1d10', slots: 3, range: 1, reach: true, twoHanded: true },
    sling: { id: 'sling', name: 'Sling', cost: 2, damage: '1d4', slots: 1, range: 2, missile: true },
    shortBow: { id: 'shortBow', name: 'Short Bow', cost: 25, damage: '1d6', slots: 2, range: 3, missile: true },
    longBow: { id: 'longBow', name: 'Long Bow', cost: 40, damage: '1d6', slots: 2, range: 6, missile: true },
    crossbow: { id: 'crossbow', name: 'Crossbow', cost: 30, damage: '1d6', slots: 2, range: 2, missile: true, reload: true }
};

/** GM RULING: an unarmed adventurer punches for 1d2. */
FD.Data.UNARMED = { id: 'unarmed', name: 'Fists', cost: 0, damage: '1d2', slots: 0, range: 1 };

/** Order the weapons appear in the Shoppe. */
FD.Data.WEAPON_ORDER = [
    'dagger', 'club', 'staff', 'handAxe', 'mace', 'shortSword', 'spear', 'sword', 'battleAxe',
    'twoHandedSword', 'poleArm', 'sling', 'shortBow', 'longBow', 'crossbow'
];
