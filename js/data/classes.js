/**
 * TABLE 3 (Class & Levels 1-3), TABLE 4 (Saving Throws), TABLE 8 (spell slots)
 * and TABLE 9 (Thief Skills), with the arms & armour notes from TABLE 1 and
 * rules 24-27.
 */
FD.Data.Classes = {
    fighter: {
        id: 'fighter',
        name: 'Fighter',
        hitDie: 8,
        // TABLE 3 (Fighter)
        levels: [
            { level: 1, xp: 0, ab: 1, ability: 'Arms & Armour' },
            { level: 2, xp: 2000, ab: 2, ability: 'Veteran' },
            { level: 3, xp: 4000, ab: 3, ability: 'Warrior' }
        ],
        // TABLE 4 (Fighter 1-3)
        saves: { death: 12, wands: 13, paralysis: 14, breath: 15, spells: 16 },
        // RULE 24: all normal weapons, armour and shields
        weapons: 'any',
        armour: ['leather', 'chain', 'plate'],
        shield: true,
        spellList: null,
        turnUndead: false,
        thief: false,
        description: 'Master of physical combat. Any weapon, armour and shield (rule 24).'
    },
    cleric: {
        id: 'cleric',
        name: 'Cleric',
        hitDie: 6,
        // TABLE 3 (Cleric)
        levels: [
            { level: 1, xp: 0, ab: 0, ability: 'Turn Undead' },
            { level: 2, xp: 1500, ab: 1, ability: '1 x L1 spell' },
            { level: 3, xp: 3000, ab: 1, ability: '2 x L1 spells' }
        ],
        // TABLE 4 (Cleric 1-3)
        saves: { death: 11, wands: 12, paralysis: 14, breath: 16, spells: 15 },
        // RULE 25: non-edged weapons only: club, mace, staff, sling
        weapons: ['club', 'mace', 'staff', 'sling'],
        armour: ['leather', 'chain', 'plate'],
        shield: true,
        spellList: 'cleric',
        turnUndead: true,
        thief: false,
        description: 'Holy warrior. Blunt weapons, any armour. Turns undead; spells from level 2 (rule 25).'
    },
    wizard: {
        id: 'wizard',
        name: 'Wizard',
        hitDie: 4,
        // TABLE 3 (Wizard)
        levels: [
            { level: 1, xp: 0, ab: 0, ability: '1 x L1 spell' },
            { level: 2, xp: 2500, ab: 0, ability: '2 x L1 spells' },
            { level: 3, xp: 5000, ab: 1, ability: '2 x L1, 1 x L2' }
        ],
        // TABLE 4 (Wizard 1-3)
        saves: { death: 13, wands: 14, paralysis: 13, breath: 16, spells: 15 },
        // RULE 26: dagger and staff only, no armour or shield
        weapons: ['dagger', 'staff'],
        armour: [],
        shield: false,
        spellList: 'wizard',
        turnUndead: false,
        thief: false,
        description: 'Arcane caster. Dagger or staff, no armour. Learns from a spellbook (rule 26).'
    },
    thief: {
        id: 'thief',
        name: 'Thief',
        hitDie: 4,
        // TABLE 3 (Thief)
        levels: [
            { level: 1, xp: 0, ab: 0, ability: 'Thief Skills, Backstab' },
            { level: 2, xp: 1200, ab: 1, ability: 'Improved Skills' },
            { level: 3, xp: 2400, ab: 1, ability: 'Improved Skills' }
        ],
        // TABLE 4 (Thief 1-3)
        saves: { death: 13, wands: 14, paralysis: 13, breath: 16, spells: 15 },
        // RULE 27: any normal weapon, leather or none, no shield
        weapons: 'any',
        armour: ['leather'],
        shield: false,
        spellList: null,
        turnUndead: false,
        thief: true,
        description: 'Locks, traps, stealth and the backstab. Leather armour only, no shield (rule 27).'
    }
};

/** Order the classes appear in on the creation screen. */
FD.Data.CLASS_ORDER = ['fighter', 'cleric', 'wizard', 'thief'];

/**
 * TABLE 8 (Spell Slots by Character Level): slots[classId][level][spellLevel].
 */
FD.Data.SpellSlots = {
    cleric: {
        1: { 1: 0 },
        2: { 1: 1 },
        3: { 1: 2 }
    },
    wizard: {
        1: { 1: 1 },
        2: { 1: 2 },
        3: { 1: 2, 2: 1 }
    }
};

/**
 * TABLE 9 (Thief Skills): percentage by level (index 0 = level 1).
 * Hear Noise is 1-2 on d6 at every level and Backstab is +4 / x2.
 */
FD.Data.ThiefSkills = {
    openLocks: { name: 'Open Locks', values: [15, 20, 25] },
    findTraps: { name: 'Find/Remove Traps', values: [10, 15, 20] },
    pickPockets: { name: 'Pick Pockets', values: [20, 25, 30] },
    moveSilently: { name: 'Move Silently', values: [20, 25, 30] },
    climb: { name: 'Climb Sheer Surfaces', values: [87, 88, 89] },
    hide: { name: 'Hide in Shadows', values: [10, 15, 20] }
};

/** TABLE 9: Hear Noise succeeds on 1-2 on d6 at levels 1-3. */
FD.Data.THIEF_HEAR_NOISE = 2;
/** TABLE 9: Backstab bonus to hit. */
FD.Data.BACKSTAB_TO_HIT = 4;
/** TABLE 9: Backstab damage multiplier. */
FD.Data.BACKSTAB_MULTIPLIER = 2;
