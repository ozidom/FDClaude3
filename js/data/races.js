/**
 * TABLE 2 (Races), with RULE 19 (Human), RULE 20 (Dwarf), RULE 21 (Elf), RULE 22 (Halfling).
 */
FD.Data.Races = {
    human: {
        id: 'human',
        name: 'Human',
        core: 'Adaptable',
        ability: 'May choose any Class.',
        classes: ['fighter', 'cleric', 'wizard', 'thief'],
        keenHearing: false,
        secretDoorChance: 1,
        stoneworkChance: 1,
        ghoulImmune: false,
        missileBonus: 0,
        acVsLarge: 0,
        description: 'Humans are adaptable and ambitious, with no special senses or limits (rule 19).'
    },
    dwarf: {
        id: 'dwarf',
        name: 'Dwarf',
        core: 'Dungeon craft',
        ability: 'Detects unusual stonework on 1-2 on d6 when searching. Hears on 1-2 (rule 36).',
        classes: ['cleric', 'thief', 'fighter'],
        keenHearing: true,
        secretDoorChance: 1,
        stoneworkChance: 2,
        ghoulImmune: false,
        missileBonus: 0,
        acVsLarge: 0,
        description: 'Hardy underground folk with an instinct for stonework (rule 20).'
    },
    elf: {
        id: 'elf',
        name: 'Elf',
        core: 'Keen senses',
        ability: 'Detects secret doors on 1-2 on d6; immune to ghoul paralysis. Hears on 1-2 (rule 36).',
        classes: ['cleric', 'wizard', 'fighter'],
        keenHearing: true,
        secretDoorChance: 2,
        stoneworkChance: 1,
        ghoulImmune: true,
        missileBonus: 0,
        acVsLarge: 0,
        description: 'Keen-sensed folk with an affinity for magic (rule 21).'
    },
    halfling: {
        id: 'halfling',
        name: 'Halfling',
        core: 'Small and stealthy',
        ability: '+1 to missile attacks; +2 AC against larger-than-human attackers. Hears on 1-2 (rule 36).',
        classes: ['cleric', 'thief', 'fighter'],
        keenHearing: true,
        secretDoorChance: 1,
        stoneworkChance: 1,
        ghoulImmune: false,
        missileBonus: 1,
        acVsLarge: 2,
        description: 'Small, nimble and unobtrusive (rule 22).'
    }
};

/** Order the races appear in on the creation screen. */
FD.Data.RACE_ORDER = ['human', 'dwarf', 'elf', 'halfling'];
