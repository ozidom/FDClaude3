/**
 * TABLE 11 (Monsters). The "Board Behaviour" column is encoded as behaviour
 * tags, each handled by one function in MonsterAI:
 *   rushesCentre, prefersMissiles, holdsCentre, slowAdvance, seeksGap, ambusher, advance.
 * Special abilities are tags: undead, large, intelligent, humanoid, animal,
 * ignoresMorale, actsLast, paralysis, poison, energyDrain, needsMagicWeapon,
 * attach, evil, flying.
 */
FD.Data.Monsters = {
    giantRat: {
        id: 'giantRat', name: 'Giant Rat', plural: 'Giant Rats', hd: '1/2', ac: 12, move: 3,
        attacks: [{ name: 'Bite', damage: '1d3' }], morale: 8,
        tags: ['animal'], behaviour: ['rushesCentre'],
        special: 'Disease if the adventure uses it.', board: 'Often begins Enemy Front and rushes the Centre.'
    },
    kobold: {
        id: 'kobold', name: 'Kobold', plural: 'Kobolds', hd: '1/2', ac: 12, move: 2,
        attacks: [{ name: 'Weapon', damage: '1d4' }], morale: 6,
        tags: ['intelligent', 'humanoid', 'evil'], behaviour: ['prefersMissiles'],
        special: '—', board: 'Prefers numbers, missiles and retreat.'
    },
    goblin: {
        id: 'goblin', name: 'Goblin', plural: 'Goblins', hd: '1-1', ac: 13, move: 2,
        attacks: [{ name: 'Weapon', damage: '1d6' }], morale: 7,
        tags: ['intelligent', 'humanoid', 'evil'], behaviour: ['advance'],
        special: '—', board: 'Front fighters; Rear missile users where possible.'
    },
    bandit: {
        id: 'bandit', name: 'Bandit', plural: 'Bandits', hd: '1', ac: 12, move: 2,
        attacks: [{ name: 'Weapon', damage: '1d6' }], morale: 8,
        tags: ['intelligent', 'humanoid'], behaviour: ['advance'],
        special: 'Variable gear.', board: 'Place according to weapons carried.'
    },
    orc: {
        id: 'orc', name: 'Orc', plural: 'Orcs', hd: '1', ac: 13, move: 2,
        attacks: [{ name: 'Weapon', damage: '1d6' }], morale: 8,
        tags: ['intelligent', 'humanoid', 'evil'], behaviour: ['rushesCentre'],
        special: '—', board: 'Usually begins Front and pushes into Centre aggressively.'
    },
    skeleton: {
        id: 'skeleton', name: 'Skeleton', plural: 'Skeletons', hd: '1', ac: 13, move: 2,
        attacks: [{ name: 'Weapon', damage: '1d6' }], morale: 12, undeadType: 'skeleton',
        tags: ['undead', 'ignoresMorale', 'evil'], behaviour: ['advance'],
        special: 'Undead.', board: 'Never checks normal Morale.'
    },
    stirge: {
        id: 'stirge', name: 'Stirge', plural: 'Stirges', hd: '1', ac: 12, move: 3,
        attacks: [{ name: 'Attach', damage: '1d3' }], morale: 9,
        tags: ['animal', 'attach', 'flying'], behaviour: ['seeksGap'],
        special: 'Drains blood after attaching.', board: 'Moves rapidly from Enemy Rear to Centre; seeks unguarded targets.'
    },
    zombie: {
        id: 'zombie', name: 'Zombie', plural: 'Zombies', hd: '2', ac: 11, move: 1,
        attacks: [{ name: 'Slam', damage: '1d8' }], morale: 12, undeadType: 'zombie',
        tags: ['undead', 'ignoresMorale', 'actsLast', 'evil'], behaviour: ['slowAdvance'],
        special: 'Always acts last.', board: 'Slow advance; no normal Morale checks.'
    },
    giantSpider: {
        id: 'giantSpider', name: 'Giant Spider', plural: 'Giant Spiders', hd: '2', ac: 12, move: 3,
        attacks: [{ name: 'Bite', damage: '1d6' }], morale: 7,
        tags: ['animal', 'poison'], behaviour: ['ambusher'],
        special: 'Poison Save.', board: 'May ambush from a Room feature and inflict Poison.'
    },
    giantSnake: {
        id: 'giantSnake', name: 'Giant Snake', plural: 'Giant Snakes', hd: '2+2', ac: 12, move: 2,
        attacks: [{ name: 'Bite', damage: '1d6' }], morale: 8,
        tags: ['animal'], behaviour: ['seeksGap'],
        special: 'Pack hunter.', board: 'Rapidly closes; looks for a gap to reach Party Rear.'
    },
    ghoul: {
        id: 'ghoul', name: 'Ghoul', plural: 'Ghouls', hd: '2', ac: 13, move: 3, undeadType: 'ghoul',
        attacks: [{ name: 'Claw', damage: '1d3' }, { name: 'Claw', damage: '1d3' }, { name: 'Bite', damage: '1d3' }], morale: 9,
        tags: ['undead', 'paralysis', 'evil', 'intelligent'], behaviour: ['advance'],
        special: 'Paralysis.', board: 'Successful attacks may force a Paralysis Save.'
    },
    hobgoblin: {
        id: 'hobgoblin', name: 'Hobgoblin', plural: 'Hobgoblins', hd: '1+1', ac: 13, move: 2,
        attacks: [{ name: 'Weapon', damage: '1d8' }], morale: 8,
        tags: ['intelligent', 'humanoid', 'evil'], behaviour: ['holdsCentre'],
        special: 'Disciplined.', board: 'Holds Front formation longer than Goblins.'
    },
    bugbear: {
        id: 'bugbear', name: 'Bugbear', plural: 'Bugbears', hd: '3+1', ac: 14, move: 2,
        attacks: [{ name: 'Weapon', damage: '1d8' }], morale: 9, surpriseChance: 3,
        tags: ['intelligent', 'humanoid', 'evil'], behaviour: ['ambusher'],
        special: 'Surprise 1-3/d6.', board: 'Often begins closer due to effective ambush.'
    },
    wight: {
        id: 'wight', name: 'Wight', plural: 'Wights', hd: '3', ac: 14, move: 2, undeadType: 'wight',
        attacks: [{ name: 'Touch', damage: '1d4' }], morale: 12,
        tags: ['undead', 'energyDrain', 'needsMagicWeapon', 'evil', 'intelligent'], behaviour: ['advance'],
        special: 'Energy Drain; magic/silver weapons.', board: 'Dangerous Level 3 foe. Normal weapons fail to harm it.'
    },
    ogre: {
        id: 'ogre', name: 'Ogre', plural: 'Ogres', hd: '4+1', ac: 14, move: 2,
        attacks: [{ name: 'Club', damage: '1d10' }], morale: 10,
        tags: ['large', 'intelligent', 'humanoid', 'evil'], behaviour: ['holdsCentre'],
        special: 'Large.', board: 'Usually holds Centre once engaged; very hard to get past.'
    },
    gelatinousCube: {
        id: 'gelatinousCube', name: 'Gelatinous Cube', plural: 'Gelatinous Cubes', hd: '4', ac: 11, move: 1,
        attacks: [{ name: 'Touch', damage: '2d4' }], morale: 12,
        tags: ['paralysis', 'ignoresMorale', 'large'], behaviour: ['slowAdvance'],
        special: 'Paralysis.', board: 'May occupy or block a Corridor/Room; difficult to bypass.'
    },
    troglodyte: {
        id: 'troglodyte', name: 'Troglodyte', plural: 'Troglodytes', hd: '2', ac: 14, move: 2,
        attacks: [{ name: 'Claw', damage: '1d4' }, { name: 'Claw', damage: '1d4' }, { name: 'Bite', damage: '1d4' }], morale: 9,
        tags: ['intelligent', 'humanoid', 'evil'], behaviour: ['ambusher'],
        special: 'Stench; camouflage.', board: 'Often hides or begins at Enemy Front; prefers ambush.'
    }
};

/**
 * RULE 59 (Monster Attack Bonus table): AB by Hit Dice value.
 * Up to 1 HD +0; over 1 to 2 +1; over 2 to 3 +2; 4 HD and over +3.
 * GM RULING: between 3 and 4 (e.g. 3+1) uses HD - 1 = +2, as rule 59's text says.
 */
FD.Data.MONSTER_AB_TABLE = [
    { maxHd: 1, ab: 0 },
    { maxHd: 2, ab: 1 },
    { maxHd: 3.99, ab: 2 },
    { maxHd: 999, ab: 3 }
];
