/**
 * Starter dungeon: "The Sunken Crypt" (SPEC §12), built on the Appendix H
 * sample of play. 14 rooms, sized 1-3 (rule 31b), with x/y map coordinates.
 *
 * Format notes:
 *  - room.features: things that can be found. `hidden` features need a search;
 *    `type` 'stonework' uses the race stonework chance (TABLE 2, Dwarf 1-2).
 *    `foundBy` lists items that find it with no roll (rule 38). `knowledge`
 *    names a flag (learned from an NPC) that lets the player go straight to it.
 *  - room.treasure: items lying in the room. `featureId` hides one until that
 *    feature is found; `trapId` links it to a room trap set off by looting.
 *  - corridor.label: a short name for buttons ("north door").
 *  - corridor.door: { state } per rule 35. `barredFrom` is the room the bar is on.
 *  - corridor.trap / corridor.obstacle: hazards met when moving through.
 *  - encounter: placed monsters (rules 46-52). `important` NPCs use the
 *    Hidden Emotion Test (rule 50a).
 */
FD.Dungeons.register({
    id: 'sunkenCrypt',
    name: 'The Sunken Crypt',
    intro: 'Two days down the marsh road, the drowned chapel of St. Orrin leans into the reeds. ' +
        'Beneath it lies the crypt of the Morrow family: once rich, now forgotten. Since the floods, ' +
        'villagers whisper of lights below, of goblins on the marsh, and of a knight who walks at night ' +
        'with an empty sword-hand. The reeve offers you nothing but the right to keep what you find.',
    entranceId: 'r1',

    rumours: [
        { trueText: 'The goblins in the old guardroom are more frightened than you are.', falseText: 'The goblins in the old guardroom eat adventurers raw.' },
        { trueText: "Old Sir Aldous Morrow's sword was hidden away, not buried with him.", falseText: 'Sir Aldous Morrow was buried with his sword in his hands.' },
        { trueText: 'Something in the long chapel passage swallows the careless. Test the floor.', falseText: 'The long chapel passage is the safest way to the crypt.' },
        { trueText: 'The Morrows walled up their treasury somewhere near the crypt door.', falseText: 'The Morrow treasury lies at the bottom of the well.' },
        { trueText: 'Ghouls haunt the deep stair, but elves do not fear their touch.', falseText: 'Ghouls can be bought off with fresh meat.' },
        { trueText: 'Only silver or magic will hurt the thing in the lowest tomb.', falseText: 'Fire is the only thing the lowest tomb fears.' }
    ],

    wandering: {
        chance: 1,
        table: [
            { roll: 1, monster: 'giantRat', number: '1d3', text: 'Giant rats squeal out of a crack in the wall.' },
            { roll: 2, monster: 'kobold', number: '1d3', text: 'A band of kobold scouts creeps out of the dark.', motivation: { text: 'Scavenging for anything shiny.', wants: 'gold', bribeMin: 5, pursues: true } },
            { roll: 3, monster: 'goblin', number: '1d2', text: 'A goblin patrol stumbles into you.', motivation: { text: 'Bored, hungry and greedy.', wants: 'gold', bribeMin: 5, pursues: true } },
            { roll: 4, monster: 'skeleton', number: '1d2', text: 'Bones clatter. Skeletons in rusted mail shamble towards your light.', reaction: 'attack' },
            { roll: 5, monster: 'stirge', number: '1', text: 'Leathery wings flutter overhead. Stirges!', reaction: 'attack' },
            { roll: 6, monster: 'zombie', number: '1', text: 'A bloated zombie lurches out of the black water.', reaction: 'attack' }
        ]
    },

    rooms: [
        {
            id: 'r1', name: 'Flooded Stair', size: 2, x: 3, y: 8, isEntrance: true,
            description: 'Worn steps descend into ankle-deep black water. Daylight is a grey square above you. ' +
                'A heavy door stands to the north, a muddy tunnel runs east, and a narrow passage leads west.',
            features: [],
            treasure: [],
            spellHooks: {
                detectEvil: 'Evil lies below, faint but certain, like rot under fresh paint.'
            }
        },
        {
            id: 'r2', name: 'Goblin Guardroom', size: 1, x: 3, y: 6,
            description: 'A small guardroom. An overturned table makes a barricade across the far corner. ' +
                'A second door leads north.',
            features: [],
            treasure: [
                { id: 't2a', name: 'Goblin purse', kind: 'coins', value: 12 }
            ],
            encounter: {
                id: 'e2',
                monsters: [
                    { monster: 'goblin', count: 2, names: ['Snig', 'Grub'], loadout: [{ reach: true, weaponName: 'Spear' }, { missile: 'crossbow', weaponName: 'Crossbow' }] }
                ],
                description: 'Two goblins crouch behind the overturned table. One has a spear; the other has a crossbow pointed roughly in your direction. Neither attacks.',
                listenText: 'You hear whispering on the other side. At least two voices. One says, "Maybe humans go away."',
                distance: 'close',
                motivation: { text: 'Guarding the crypt door by standing very far away from it. They want to stay alive, and they like shiny coins.', wants: 'gold', bribeMin: 5, pursues: false },
                friendlyText: 'The spear goblin lowers his weapon. "Skeletons came out of crypt yesterday. Ate nobody, because skeletons do not eat. But very stabby." He points to the north door. "Crypt is there. We guard it by standing very far away."',
                hostileText: '"You stay there. We stay here. Everyone remains extremely alive."',
                guardsTreasure: true,
                important: {
                    name: 'Snig',
                    lines: {
                        1: '"You! Big-feet! You stomp in here like you own the place? This is OUR room!"',
                        2: '"Crypt? No. No crypt here. Definitely no dead humans walking around in armour."',
                        3: '"Ooh. Shiny buckles. Shiny boots. Shiny purse, maybe? Everything has a price down here, big-feet."',
                        4: '"Please. The dead ones come closer every night. Grub says we leave, boss says stay. You help us?"',
                        5: '"Hello! Hello! You look lost. Everyone down here is lost. Sit! Table is broken but floor is good."',
                        6: '"Crypt? Oh yes, crypt is that way, past the rats. Very safe. No traps. Go, go."'
                    },
                    secretFlag: 'flagstone',
                    secretText: 'Snig leans close and lowers his voice. "Loose flagstone by crypt door. Skeletons never step on it. Never! Something under it, Snig thinks."',
                    failOutcomes: {
                        1: { effect: 'attack', text: 'Snig\'s patience snaps. "Grub! Shoot them!"' },
                        2: { effect: 'flee', text: 'Snig squeals. Both goblins bolt through the north door and are gone.' },
                        3: { effect: 'demand', gold: 10, text: '"Ten gold. Then maybe Snig remembers things."' },
                        4: { effect: 'withhold', text: '"You no help us? Then we no help you." Snig turns his back.' },
                        5: { effect: 'withhold', text: 'Snig chatters happily about mushrooms and the damp for ten minutes and tells you nothing useful.' },
                        6: { effect: 'mislead', text: 'Snig grins. "Crypt is past the rats, through chapel, down the long passage. Nice wide floor. Perfectly safe."' }
                    }
                }
            }
        },
        {
            id: 'r3', name: 'Rat Nest', size: 2, x: 5, y: 8,
            description: 'A mud-floored cave heaped with gnawed bones, rags and filth. It stinks. An archway leads north.',
            features: [],
            treasure: [
                { id: 't3a', name: 'Gnawed leather purse', kind: 'coins', value: 23 },
                { id: 't3b', name: 'Tarnished silver ring', kind: 'treasure', value: 40, slots: 0 }
            ],
            encounter: {
                id: 'e3',
                monsters: [{ monster: 'giantRat', count: '1d3' }],
                description: 'Giant rats the size of dogs rise from the filth, whiskers twitching at your light.',
                listenText: 'Scratching, squeaking, and the wet crunch of something being eaten.',
                distance: 'normal',
                motivation: { text: 'Hungry. Food might buy them off.', wants: 'food', bribeMin: 0, pursues: true },
                guardsTreasure: true
            }
        },
        {
            id: 'r4', name: 'Collapsed Chapel', size: 3, x: 6, y: 6,
            description: 'A broad chapel, half its roof fallen in. Broken pews lie in drifts. A heavy stone altar stands at the east end, ' +
                'its face carved with faded writing. A long flagstoned passage leads west, a warped door east, and an archway south.',
            features: [
                { id: 'f4a', name: 'Hollow altar stone', type: 'stonework', hidden: true, findChance: 1, foundBy: ['pole'], text: 'One stone of the altar rings hollow. Behind it is a small dry niche.' }
            ],
            treasure: [
                { id: 't4a', name: 'Potion of Healing', kind: 'magic', magicId: 'potionHealing', featureId: 'f4a' },
                { id: 't4b', name: 'Offering coins', kind: 'coins', value: 60, featureId: 'f4a' }
            ],
            spellHooks: {
                readLanguages: 'The altar inscription reads: "Here the Morrows keep their dead, and their dead keep their gold. Sir Aldous sleeps below, his sword-hand empty."',
                detectEvil: 'The chapel itself is clean, but evil seeps up through the floor from below.'
            }
        },
        {
            id: 'r5', name: 'Crypt Antechamber', size: 2, x: 3, y: 4,
            description: 'Two stone knights flank a bronze-banded door carved with the Morrow crest. Dust lies thick everywhere, ' +
                'except for a neat path that curves around one flagstone near the crypt door.',
            features: [
                { id: 'f5a', name: 'Loose flagstone', type: 'stonework', hidden: true, findChance: 1, foundBy: ['pole'], knowledge: 'flagstone', text: 'The flagstone lifts with a grind. Beneath it is a small cavity.' }
            ],
            treasure: [
                { id: 't5a', name: 'Bronze key', kind: 'key', keyId: 'bronzeKey', featureId: 'f5a' },
                { id: 't5b', name: 'Mouldy pouch', kind: 'coins', value: 50, featureId: 'f5a' },
                { id: 't5c', name: 'Scroll (undeciphered)', kind: 'magic', magicId: 'scroll', spellId: 'sleep', featureId: 'f5a' }
            ],
            spellHooks: {
                detectEvil: 'Cold malice waits beyond the crypt door, and fainter evil far below.'
            }
        },
        {
            id: 'r6', name: 'The Crypt', size: 3, x: 3, y: 2,
            description: 'Rows of stone niches line the walls, most now empty. Grave goods lie scattered on the floor. ' +
                'An iron gate in the east wall leads on.',
            features: [],
            treasure: [
                { id: 't6a', name: 'Silver chalice', kind: 'treasure', value: 120, slots: 1 },
                { id: 't6b', name: 'Grave coins', kind: 'coins', value: 150 }
            ],
            encounter: {
                id: 'e6',
                monsters: [{ monster: 'skeleton', count: 2 }],
                description: 'Two skeletons in rusted mail turn their empty eyes towards your light and raise their blades.',
                listenText: 'A dry clatter, like dice in a cup. Then silence.',
                distance: 'normal',
                reaction: 'attack',
                motivation: { text: 'Mindless guardians of the Morrow dead.', wants: 'none', pursues: true }
            }
        },
        {
            id: 'r7', name: 'Spider Lair', size: 2, x: 8, y: 6,
            description: 'Thick grey webs drape every surface. A body hangs in a silk cocoon in the corner. ' +
                'A narrow crack in the far wall leads on.',
            features: [],
            treasure: [
                { id: 't7a', name: "Dead adventurer's purse", kind: 'coins', value: 120 },
                { id: 't7b', name: 'Ring of Protection +1', kind: 'magic', magicId: 'ringProtection' },
                { id: 't7c', name: 'Dagger', kind: 'weapon', weaponId: 'dagger' }
            ],
            encounter: {
                id: 'e7',
                monsters: [{ monster: 'giantSpider', count: 1 }],
                description: 'Something huge and many-legged drops from the ceiling on a line of silk!',
                listenText: 'Nothing but a faint, steady creak, like rope under strain.',
                distance: 'close',
                reaction: 'attack',
                motivation: { text: 'Hungry, and you are in its larder.', wants: 'food', pursues: false },
                guardsTreasure: true
            }
        },
        {
            id: 'r8', name: 'Morrow Treasury', size: 1, x: 1, y: 4,
            description: 'A tiny vault. An iron-bound chest sits on a stone plinth.',
            features: [],
            traps: [
                { id: 'needle', name: 'Poison needle in the chest lock', type: 'poison', triggerOn: 'loot', hidden: true, findChance: 1, foundBy: [], text: 'A needle flicks out of the lock!' }
            ],
            treasure: [
                { id: 't8a', name: 'Heavy coin sack (600 gp)', kind: 'treasure', value: 600, slots: 2, trapId: 'needle' },
                { id: 't8b', name: 'Blue sapphire', kind: 'treasure', value: 150, slots: 0, trapId: 'needle' },
                { id: 't8c', name: "Morrow's Blade (Sword +1)", kind: 'weapon', weaponId: 'sword', magicBonus: 1, value: 300, special: 'morrowBlade', trapId: 'needle' }
            ],
            spellHooks: {
                detectMagic: 'The sword in the chest glows a steady blue.'
            }
        },
        {
            id: 'r9', name: 'Zombie Hall', size: 3, x: 6, y: 2,
            description: 'A long hall of cracked pillars. The floor is wet. A stout door stands in the east wall, ' +
                'and a spiral stair descends in the north.',
            features: [],
            treasure: [
                { id: 't9a', name: 'Bronze censer', kind: 'treasure', value: 80, slots: 1 }
            ],
            encounter: {
                id: 'e9',
                monsters: [{ monster: 'zombie', count: 2 }],
                description: 'Two bloated zombies turn slowly towards you and begin to shuffle closer.',
                listenText: 'A slow, wet shuffling. Over and over.',
                distance: 'distant',
                reaction: 'attack',
                motivation: { text: 'Mindless hunger.', wants: 'none', pursues: true }
            }
        },
        {
            id: 'r10', name: 'Stirge Cave', size: 2, x: 9, y: 4,
            description: 'A damp cave with a high, dark ceiling. Something rustles above. A dead elf lies against the wall.',
            features: [],
            treasure: [
                { id: 't10a', name: 'Three agates', kind: 'treasure', value: 150, slots: 0 },
                { id: 't10b', name: 'Boots of Elvenkind', kind: 'magic', magicId: 'bootsElvenkind' }
            ],
            encounter: {
                id: 'e10',
                monsters: [{ monster: 'stirge', count: '1d2' }],
                description: 'Stirges drop from the ceiling, long beaks quivering!',
                listenText: 'A papery flutter of many wings.',
                distance: 'normal',
                reaction: 'attack',
                motivation: { text: 'Thirsty for blood.', wants: 'none', pursues: true }
            }
        },
        {
            id: 'r11', name: 'Ossuary Stair', size: 1, x: 6, y: 0,
            description: 'Skulls are stacked to the ceiling. Beyond the stair foot, a ledge runs along the edge of a black chasm.',
            features: [],
            treasure: []
        },
        {
            id: 'r12', name: 'Ghoul Warren', size: 2, x: 8, y: 0,
            description: 'Low tunnels knot together here. Gnawed bones crunch underfoot. A stone slab door is set in the east wall.',
            features: [],
            treasure: [
                { id: 't12a', name: 'Gold necklace', kind: 'treasure', value: 400, slots: 0 },
                { id: 't12b', name: 'Potion of Healing', kind: 'magic', magicId: 'potionHealing' }
            ],
            encounter: {
                id: 'e12',
                monsters: [{ monster: 'ghoul', count: 1 }],
                description: 'A grey, hunched thing looks up from its meal and grins with too many teeth.',
                listenText: 'Gnawing. A low, contented giggle.',
                distance: 'normal',
                reaction: 'attack',
                motivation: { text: 'Fresh meat.', wants: 'none', pursues: true }
            }
        },
        {
            id: 'r13', name: "Wight's Tomb", size: 3, x: 10, y: 0,
            description: 'A vaulted tomb. On a stone bier lies an empty scabbard. Coin and gold glitter in the shadows behind it.',
            features: [],
            treasure: [
                { id: 't13a', name: 'Heavy coin sack (600 gp)', kind: 'treasure', value: 600, slots: 2 },
                { id: 't13d', name: 'Heavy coin sack (600 gp)', kind: 'treasure', value: 600, slots: 2 },
                { id: 't13b', name: 'Golden circlet', kind: 'treasure', value: 800, slots: 1 },
                { id: 't13c', name: 'Scroll (Cure Light Wounds)', kind: 'magic', magicId: 'scroll', spellId: 'cureLightWounds', deciphered: true }
            ],
            encounter: {
                id: 'e13',
                monsters: [{ monster: 'wight', count: 1, names: ['Sir Aldous Morrow'] }],
                description: 'A figure in black mail rises from beside the bier. Its eyes are pale points of light, and its right hand is empty.',
                listenText: 'A slow, rattling breath, and a voice reciting names.',
                distance: 'normal',
                reaction: 'hostile',
                motivation: { text: 'Cannot rest without his sword. Hates thieves.', wants: 'none', pursues: false },
                friendlyText: 'The wight regards you for a long moment. "My blade was taken from me. I will not rest until it lies upon my bier."',
                guardsTreasure: true,
                giftItem: { special: 'morrowBlade', label: "Lay Morrow's Blade on the bier", text: 'You lay the blade on the bier. Sir Aldous closes his hand around the hilt, sighs, and crumbles into dust. The tomb is still.' },
                important: {
                    name: 'Sir Aldous Morrow',
                    lines: {
                        1: '"Thieves! You walk on my family\'s bones and dare to breathe in my tomb?"',
                        2: '"Is it morning? No. Do not open the shutters. I am not ready to be judged."',
                        3: '"Gold. You carry gold. The Morrows always need more gold. Leave it at my feet."',
                        4: '"My hand... my sword-hand is empty. A knight cannot rest without his blade."',
                        5: '"Ah, guests. It has been so long since anyone came to pay their respects."',
                        6: '"Come closer, child. Let me see your face. I mean you no harm at all."'
                    },
                    secretFlag: 'morrowBlade',
                    secretText: 'The wight\'s voice cracks. "My blade. My grandson hid it behind the crypt wall when the plague came. Lay it upon my bier and I shall rest at last."',
                    failOutcomes: {
                        1: { effect: 'attack', text: 'The wight hisses and reaches for you with cold fingers.' },
                        2: { effect: 'withhold', text: 'The wight turns away, muttering prayers that are no longer heard.' },
                        3: { effect: 'demand', gold: 50, text: '"Fifty gold upon the bier, and I may remember what I lost."' },
                        4: { effect: 'attack', text: '"You do not understand. None of you ever understand!" It lunges.' },
                        5: { effect: 'withhold', text: 'The wight speaks warmly of a feast four hundred years gone, and tells you nothing.' },
                        6: { effect: 'attack', text: 'You step closer. Cold fingers close on your arm!' }
                    }
                }
            }
        },
        {
            id: 'r14', name: 'Well Room', size: 1, x: 1, y: 8,
            description: 'A small, quiet room around an old stone well. There is only the one door. A good place to rest.',
            features: [
                { id: 'f14a', name: 'Wet niche in the well wall', type: 'stonework', hidden: true, findChance: 1, foundBy: [], text: 'Just below the well lip, a loose stone hides a niche.' }
            ],
            treasure: [
                { id: 't14a', name: 'Pouch of old silver coins', kind: 'coins', value: 25, featureId: 'f14a' }
            ],
            spellHooks: {
                purifyFoodAndWater: 'The well water clears. It is sweet and cold.'
            }
        }
    ],

    corridors: [
        { id: 'c1', label: 'north door', from: 'r1', to: 'r2', turns: 1, description: 'A short passage ending at a heavy wooden door. Black water trickles under it.', door: { state: 'closed' } },
        { id: 'c2', label: 'east tunnel', from: 'r1', to: 'r3', turns: 1, description: 'A low tunnel, slick with mud.' },
        { id: 'c3', label: 'west passage', from: 'r1', to: 'r14', turns: 1, description: 'A narrow side passage to an iron-bound door.', door: { state: 'closed' } },
        { id: 'c4', label: 'north door', from: 'r2', to: 'r5', turns: 1, description: 'The door the goblins guard by standing very far away from it.', door: { state: 'closed' } },
        { id: 'c5', label: 'north archway', from: 'r3', to: 'r4', turns: 1, description: 'A crumbling archway.' },
        {
            id: 'c6', label: 'long west passage', from: 'r4', to: 'r5', turns: 1, description: 'A long flagstoned passage.',
            trap: { id: 'pit', name: "Pit trap (10')", type: 'pit', feet: 10, hidden: true, findChance: 1, foundBy: ['pole'], text: 'A flagstone tips under you and you drop into a pit!' }
        },
        { id: 'c7', label: 'warped east door', from: 'r4', to: 'r7', turns: 1, description: 'A warped door, swollen with damp.', door: { state: 'stuck' } },
        { id: 'c8', label: 'crypt door', from: 'r5', to: 'r6', turns: 1, description: 'The bronze-banded crypt door.', door: { state: 'closed' } },
        { id: 'c9', label: 'secret panel', from: 'r5', to: 'r8', turns: 1, description: 'A narrow stone panel that pivots on a hidden pin.', secret: true, door: { state: 'closed' } },
        { id: 'c10', label: 'iron gate', from: 'r6', to: 'r9', turns: 1, description: 'An iron gate, locked with a heavy bronze lock.', door: { state: 'locked', keyId: 'bronzeKey' } },
        { id: 'c11', label: 'narrow crack', from: 'r7', to: 'r10', turns: 2, description: 'A narrow crack in the rock. You must squeeze through.' },
        { id: 'c12', label: 'stout door', from: 'r9', to: 'r10', turns: 1, description: 'A dripping tunnel and a stout door.', door: { state: 'barred', barredFrom: 'r9' } },
        { id: 'c13', label: 'spiral stair', from: 'r9', to: 'r11', turns: 2, description: 'A spiral stair winding down into colder dark.' },
        {
            id: 'c14', label: 'chasm ledge', from: 'r11', to: 'r12', turns: 1, description: 'A crumbling ledge along a black chasm.',
            obstacle: { type: 'chasm', name: 'Chasm ledge', fall: '2d6', text: 'The ledge is narrow and crumbling. A fall would be a long one.' }
        },
        { id: 'c15', label: 'slab door', from: 'r12', to: 'r13', turns: 1, description: 'A stone slab door carved with a kneeling knight.', door: { state: 'stuck' } }
    ]
});
