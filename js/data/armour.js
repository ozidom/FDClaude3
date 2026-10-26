/**
 * TABLE 7 (Armour). Worn armour costs no Slots (rule 42).
 * `carriedSlots` is a GM RULING for armour carried but not worn ("counts as
 * heavy carried equipment if removed").
 */
FD.Data.Armour = {
    leather: { id: 'leather', name: 'Leather', cost: 20, ac: 12, carriedSlots: 1 },
    chain: { id: 'chain', name: 'Chain', cost: 40, ac: 14, carriedSlots: 2 },
    plate: { id: 'plate', name: 'Plate', cost: 60, ac: 16, carriedSlots: 3 }
};

/** TABLE 7: a shield adds +1 AC. GM RULING: a shield carried unworn is 1 Slot. */
FD.Data.Shield = { id: 'shield', name: 'Shield', cost: 10, acBonus: 1, carriedSlots: 1 };

/** TABLE 7 / TABLE 1 step 6: base AC with no armour. */
FD.Data.BASE_AC = 10;

/** Order the armour appears in the Shoppe. */
FD.Data.ARMOUR_ORDER = ['leather', 'chain', 'plate'];
