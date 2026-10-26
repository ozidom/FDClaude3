# Fast Dungeons (web): Rules Coverage

Maps every rule and table in `FastDungeonsv0.79.txt` to how the game handles it.

| Status | Meaning |
|---|---|
| **Implemented** | Enforced by code; cited as `RULE n` / `TABLE n` in the named file |
| **Adapted** | Implemented with a change for single-player or the 3-zone board; see `RULE CONFLICT` / `GM RULING` comments |
| **Narrative** | Shown as GM text; no mechanical effect |
| **N/A** | Doesn't apply to this version (optional B/X material, placeholders, multi-player only) |

Check it with: `grep -rn "RULE \|TABLE \|RULE CONFLICT\|GM RULING" js/`

## I. Getting to the dungeon

| Rule | Name | Status | Where |
|---|---|---|---|
| 1a | Introduction (optional rumour) | Adapted | `ShoppeScreen` shows the intro; `TownRules.startingRumour` gives one rumour only if `config.startingRumour` is on (RULE CONFLICT 5) |
| 1b | The Shoppe | Implemented | `TownRules.buy/sell/canBuy`, `ShoppeScreen` |
| 2 | Enter the Dungeon | Implemented | `ExplorationRules.enterDungeon` |
| 2b | Types of dungeons | N/A | Dungeon data format supports any point crawl |
| 3a–3b | GM and players | Adapted | The computer is the GM; one player |
| 3c | Anything can be attempted | Adapted | `ExplorationRules.availableActions` offers the reasonable options |
| 3d | When should the GM roll | Narrative | Rolls happen only where a rule calls for one |
| 4a | The Dungeon Map | Implemented | `Dungeon` (GM map), `MapView` (player map) |
| 4b | The Character Sheet | Implemented | `Character`, `CharacterSheetView` |
| 4c | The Clock | Implemented | `Clock`, `ClockView` |
| 4d | The Clash Board | Adapted | `CombatEngine`, `ClashBoardView`: 3 zones (RULE CONFLICT 1) |

## III. The adventurer

| Rule | Name | Status | Where |
|---|---|---|---|
| 5a–5c | Name, age (16–40), background | Implemented | `CharacterFactory.create`, `CreationScreen.renderDetails` |
| 5e | Starting gold 3d6×10 | Implemented | `CharacterFactory.create` |
| 6–11 | The six attributes | Implemented | `data/attributes.js` (help text); effects wired into each rule |
| 12 | Generating attributes (3d6 in order) | Implemented | `CharacterFactory.rollAttributes` |
| 13 | Modifiers and Attribute Checks | Implemented | `data/attributes.js modifierFor`, `AttributeRules.check` |
| 14 | Hit Points | Implemented | `Character.heal/takeDamage` |
| 15 | Armour Class | Implemented | `Character.armourClass` |
| 16 | Saving Throws (monsters save as Fighters) | Implemented | `SavingThrowRules.save/monsterSave` |
| 17 | Alignment | Narrative | Monster `evil` tag only (Protection from Evil, Detect Evil) |
| 18 | Languages | N/A | Not tracked; speech is the `intelligent` tag (rule 50) |
| 19–22 | Human, Dwarf, Elf, Halfling | Implemented | `data/races.js` |
| 23 | B/X race-as-class | N/A | Optional import rule |
| 24–27 | Fighter, Cleric, Wizard, Thief | Implemented | `data/classes.js`, `EquipmentRules` (arms & armour) |
| 28 | Level (1–3) | Implemented | `config.maxLevel`, `ExperienceRules` |

## IV. Dungeon exploration

| Rule | Name | Status | Where |
|---|---|---|---|
| 29 | Dungeon Turns | Implemented | `Clock.tick` |
| 30 | The Dungeon Turn Procedure | Implemented | `ExplorationRules.performAction` (steps 1–6) |
| 31a | Rooms (describe the obvious) | Implemented | `ExplorationRules.describeRoom` |
| 31b | Room sizes 1–3 | Implemented | `Room.size`; Small rooms block missiles (rule 60) |
| 31c | Beyond Large rooms | N/A | "tbc" in the rules |
| 31d | Corridors (1 turn, more if long) | Implemented | `EncumbranceRules.corridorTurns`, `Corridor.turns` |
| 32 | Distances | N/A | The point crawl and 3-zone board replace distances |
| 33 | Discovering the map | Implemented | `ExplorationRules.discoverExits/arrive`, `MapView` ("?" stubs) |
| 34 | Marching order | N/A | Single adventurer (RULE CONFLICT 9) |
| 35 | Doors | Implemented | `DoorRules.passable/openForPassage/spike` |
| 36 | Listening | Implemented | `DoorRules.listen` |
| 37 | Forcing doors | Implemented | `DoorRules.force` |
| 38 | Searching (methods find without rolling) | Implemented | `SearchAndTrapRules.searchRoom/probeWithPole/peekWithMirror/useKnowledge` |
| 39 | Traps (1–2 on d6) | Implemented | `SearchAndTrapRules.triggers/lootTrap`, `ExplorationRules.moveThrough` |
| 39a | Falls (1d6 per 10') | Implemented | `SearchAndTrapRules.spring`, `ExplorationRules.crossObstacle` |
| 39b | Poison (save or die) | Implemented | `SearchAndTrapRules.spring` |
| 40 | Secret doors (1/6, Elf 1–2) | Implemented | `SearchAndTrapRules.searchRoom` |
| 41 | Light | Implemented | `LightRules`, `Clock.lights` |
| 41a | Infravision never works | Implemented | No race gets darkvision; darkness rules apply to all |
| 41b | Total darkness | Implemented | `ExplorationRules.availableActions/advanceTime/describeRoom`, `CombatEngine.situationalPenalty` (−4) |
| 42 | Encumbrance (10 + STR mod; 100 coins = 1 slot) | Implemented | `Character.maxSlots/usedSlots`, `EncumbranceRules` |
| 43 | Exploration movement | Implemented | `EncumbranceRules.corridorTurns` |
| 43a | No split party | N/A | Single adventurer |
| 44 | Rest | Adapted | `Clock.rest/isFatigued`; penalty is a GM RULING (`config.noRestPenalty`) |
| 45 | Wandering monster checks | Implemented | `WanderingMonsterRules.check`, `ExplorationRules.advanceTime` |

## V. Encounters

| Rule | Name | Status | Where |
|---|---|---|---|
| 46 | Beginning an encounter | Implemented | `EncounterRules.begin` |
| 47 | Surprise | Implemented | `EncounterRules.rollSurprise` (Bugbear 1–3, Move Silently, Boots, invisibility) |
| 48 | Encounter distance | Implemented | `EncounterRules.setDistance`, `CombatEngine.start/legalMoves` |
| 48a | B/X distances | N/A | Optional import rule |
| 49 | Reaction | Implemented | `ParleyRules.reactionRoll`, `EncounterRules.rollReaction` |
| 50 | Parley | Adapted | `EncounterRules.talk/offerGold/offerFood`; the bribe bonus is a GM RULING |
| 50a | Hidden Emotion Test | Adapted | `EncounterRules.talk/guessEmotion`, `ParleyRules.judgeGuess` (single-player, RULE CONFLICT 9); `config.hiddenEmotionTest` |
| 51 | Monster motivation | Implemented | Encounter `motivation` data: `wants` (bribes), `pursues` (rule 65), `guardsTreasure` |
| 52 | Morale | Implemented | `MoraleRules.check` |
| 52a | Morale timing | Implemented | `MoraleRules.dueTrigger` |

## VI. Spells

| Rule | Name | Status | Where |
|---|---|---|---|
| 53a | Spellcasters and slots | Implemented | `Character.maxSpellSlots`, `SpellRules.consume` |
| 53b | Wizard spellbooks | Implemented | `CharacterFactory.create`, `SpellRules.preparableSpells` |
| 53c | Cleric prayers | Implemented | `SpellRules.preparableSpells` |
| 53d | Preparing spells | Implemented | `SpellRules.prepare`, `SpellPrepScreen` |
| 53e | Casting (declare before initiative; no move) | Implemented | `CombatEngine.runRound/pcMovement`, `SpellRules.cast` |
| 53f | Range in zones, durations, saves | Implemented | `CombatEngine.pcSpellStep`, `data/spells.js` |
| 53g | Recovering spells / camping | Adapted | `ExplorationRules.campOvernight`; night length is a GM RULING (`config.nightRestTurns`) |
| 53h | Scrolls | Implemented | `SpellRules.castableSpells/consume`, Read Magic in `data/spells.js` |

## VII. Combat

| Rule | Name | Status | Where |
|---|---|---|---|
| 54 | Combat rounds | Implemented | `CombatState`, `CombatEngine.runRound` |
| 55 | Initiative (ties simultaneous) | Implemented | `CombatEngine.runRound/applyPending` |
| 56 | Combat round sequence | Implemented | `CombatEngine.runRound` (RULE CONFLICT 8: numbering) |
| 57 | Morale step | Implemented | `CombatEngine.afterStep` → `MoraleRules.resolveCombatMorale` |
| 58 | Combat movement (2 zones, 1 encumbered) | Implemented | `CombatEngine.legalMoves/pcMovement/moveMonster` |
| 58a | Melee range / reach | Implemented | `CombatEngine.pcMelee/monsterMelee` |
| 58b | Blocking | Implemented | `CombatEngine.zoneBlocked/legalMoves` |
| 58c | Engaged | Implemented | `CombatState.pcEngaged`, `CombatEngine.legalMoves` |
| 58d | Breaking through | Implemented | Movement allows entering the Enemy zone when nothing blocks |
| 58e | Leaving the board / combat end | Implemented | `CombatEngine.leaveBoard/afterStep/finish` |
| 59 | Attacking (total ≥ AC) | Adapted | `CombatEngine.pcMelee/monsterAttack`; ≥ per RULE CONFLICT 3; Table 3 AB per RULE CONFLICT 4 |
| 59a | Damage | Implemented | `CombatEngine.damagePc/damageMonster` |
| 59b | Optional maximum damage | Implemented | `Dice.rollExpr(maximise)`, `config.maxDamage` |
| 60 | Missile attacks | Adapted | `CombatEngine.pcMissile/monsterMissiles/maxZoneDistance` (RULE CONFLICT 2) |
| 61 | Magic step | Implemented | `CombatEngine.pcSpellStep` |
| 61a | Declare spells | Implemented | `CombatEngine.runRound` |
| 61b | Optional B/X ranges | N/A | Zones are used (rule 53f) |
| 61c | Casting under threat | Implemented | `CombatEngine.pcSpellStep` (`pcHurtThisRound`) |
| 61d | Turning undead | Implemented | `TurnUndeadRules.attempt` |
| 62 | Melee attacks (STR to hit and damage) | Implemented | `CombatEngine.pcMelee` |
| 63 | Surrender | Adapted | `CombatEngine.pcSurrender` (terms are a GM RULING); monsters via `MoraleRules` |
| 64 | Withdrawal and retreat | Implemented | `CombatEngine.legalActions/pcMovement` |
| 64a | Withdraw | Implemented | `CombatEngine.pcMovement/fleeMove` |
| 64b | Retreat (free attacks) | Implemented | `CombatEngine.freeAttacks` |
| 65 | Pursuit | Adapted | `CombatEngine.resolvePursuit` (catch chance is a GM RULING) |

## VIII. Town, death, recovery and levels

| Rule | Name | Status | Where |
|---|---|---|---|
| 66 | Returning to town (entrance only); healing, trade, copying, rewriting, rumours, respawn | Implemented | `ExplorationRules.leaveDungeon`, `TownRules`, `TownScreen` |
| 66a | New PCs respawn | Implemented | `GameOverScreen` → `CreationScreen` → town |
| 67 | Death (0 HP, no recovery) | Implemented | `ExplorationRules.handleDeath`, `CombatEngine.finish` |
| 67 | Experience (treasure 1 XP/gp; 10 XP/HD, min 5) | Implemented | `ExperienceRules.awardDelve`, `Monster.xpValue`, `CombatEngine.collectXp` |
| 68 | Ending the delve; things left stay | Implemented | `TownRules.enterTown`; room state persists in `Dungeon` and the save |
| 69–70 | (not in the rules) | N/A | — |
| 71 | Levelling up (one level per delve) | Implemented | `ExperienceRules.applyXp/levelUp/levelSpellChoices` |
| 72 | Downtime | Implemented | `TownRules` (each action costs days), `state.town.day` |
| 73 | Planes | N/A | Flavour for later versions |

## Tables

| Table | Name | Status | Where |
|---|---|---|---|
| 1 | Character creation (steps 1–14) | Implemented | `CharacterFactory`, `CreationScreen`, `ShoppeScreen`, `SpellPrepScreen`; step 12 (formation) N/A for one adventurer |
| 2 | Races | Implemented | `data/races.js`; abilities in `DoorRules.listen`, `SearchAndTrapRules.searchRoom`, `CombatEngine.pcMissile/monsterAttack`, `Character.acAgainst` |
| 3 | Class & levels 1–3 | Implemented | `data/classes.js`, `Character.attackBonus`, `ExperienceRules` |
| 4 | Saving throws | Implemented | `data/classes.js`, `SavingThrowRules` |
| 5 | Equipment | Implemented | `data/equipment.js`; torch/lantern/oil (`LightRules`), pole/mirror (`SearchAndTrapRules`), spikes/hammer (`DoorRules`), crowbar (`DoorRules.force`, `lootTrap`), rope+hook (`crossObstacle`), holy symbol (`TurnUndeadRules`), holy water/oil (`CombatEngine.missileProfile`), thieves' tools (`DoorRules.canPickLock`), rations (`EncounterRules.offerFood`). Sacks, chalk, bell, shovel, stakes, chest, waterskin and backpack are Narrative |
| 6 | Weapons | Adapted | `data/weapons.js`; zone ranges per RULE CONFLICT 2 |
| 7 | Armour | Implemented | `data/armour.js`, `Character.armourClass` |
| 8 | Spell slots and lists | Implemented | `data/classes.js` (slots), `data/spells.js` (lists and effects) |
| 9 | Thief skills | Implemented | `data/classes.js`; Open Locks (`DoorRules.pickLock`), Find/Remove (`SearchAndTrapRules.findAndRemoveTraps`), Move Silently (`ExplorationRules.moveThrough`), Climb (`crossObstacle`), Hear Noise (`DoorRules.listen`), Backstab (`CombatEngine.pcMelee`). Pick Pockets and Hide in Shadows: Narrative (shown on the sheet) |
| 10 | Turning undead | Implemented | `data/turnUndead.js`, `TurnUndeadRules` |
| 11 | Monsters | Implemented | `data/monsters.js`, `MonsterAI` (board behaviour), `CombatEngine.monsterAttack` (specials) |
| 12 | Reaction | Implemented | `data/reaction.js`, `ParleyRules` |
| 13 | Morale | Implemented | `data/morale.js`, `MoraleRules.resolveCombatMorale` |
| 14 | Treasure | Implemented | `Inventory.fromTreasure`, `ExperienceRules.treasureValue` |
| 15 | Magic items | Implemented | `data/treasure.js`; potions (`SpellRules.useItem`), scrolls, Weapon +1, Ring of Protection, Boots of Elvenkind. Armour/Shield +1 supported by `magicBonus`. Rope of Climbing, Bag of Holding, wands, Crystal Ball and Gauntlets are listed but not placed in the starter dungeon |
| 16 | Wandering monsters (default) | Implemented | `data/wanderingMonsters.js`; the starter dungeon supplies its own (rule 45) |
| 17 | Emotions | Implemented | `data/emotions.js`, `ParleyRules.rollEmotion` |

## Spells (Table 8)

| Spell | Kind | Effect in game |
|---|---|---|
| Cure Light Wounds | Mechanical | Heals 1d6+1 |
| Detect Evil | Narrative+ | Names adjacent rooms where evil still lurks |
| Detect Magic | Mechanical | Reveals magic in the room, including inside hidden features |
| Light | Mechanical | 12-turn light source |
| Protection from Evil | Mechanical | Evil attacks −1; +1 saves vs evil (12 turns) |
| Purify Food and Water, Remove Fear, Resist Cold | Narrative | GM text plus room `spellHooks` |
| Charm Person | Mechanical | Humanoid ≤4+1 HD, save vs Spells, stops fighting |
| Floating Disc | Mechanical | +10 Slots for 6 turns |
| Hold Portal | Mechanical | Door held 2d6 turns |
| Magic Missile | Mechanical | 1d6+1, auto-hit, no save |
| Read Languages | Narrative | Reads room inscriptions via `spellHooks` |
| Read Magic | Mechanical | Deciphers scrolls (rule 53h) |
| Shield | Mechanical | +4 AC for 2 turns (GM RULING) |
| Sleep | Mechanical | 2d8 HD in one zone, ≤4+1 HD, not undead, no save |
| Ventriloquism | Narrative | GM text |
| Continual Light | Mechanical | Permanent light |
| Detect Invisible, Phantasmal Force | Narrative | GM text |
| ESP | Mechanical | Listening always succeeds; reveals the Hidden Emotion |
| Invisibility | Mechanical | Can't be targeted; monsters unaware; ends on attack or cast |
| Knock | Mechanical | Opens stuck, locked, barred or held doors |
| Levitate | Mechanical | Crosses pits and chasms (6 turns) |
| Locate Object | Narrative+ | Points toward treasure in an adjacent room |
| Mirror Image | Mechanical | 1d4 images absorb attacks |
| Web | Mechanical | Combat: zone stuck 1d4 rounds; exploring: seals a door 48 turns |
| Wizard Lock | Mechanical | Door sealed against monsters |

## Rule conflicts (SPEC §11)

| # | Conflict | Resolution in code |
|---|---|---|
| 1 | 3 zones (4d) vs 5 zones (Glossary) | 3 zones: `CombatEngine` header |
| 2 | Weapon ranges on 3 zones | `CombatEngine.maxZoneDistance` = Range − 1, capped at 2; crossbow reload every other round |
| 3 | "equals or exceeds" vs ">" | ≥ in `pcMelee`, `pcMissile`, `monsterAttack` |
| 4 | No PC attack bonus (59) vs Table 3 | Table 3: `Character.attackBonus` |
| 5 | Starting rumour (1a) vs none (66) | `config.startingRumour`, default off |
| 6 | Running without rest | GM RULING −1 to hit and checks: `AttributeRules.fatiguePenalty` |
| 7 | Night length | GM RULING 48 turns: `config.nightRestTurns` |
| 8 | Duplicate rule numbers | Rules cited by number and name, e.g. `RULE 58b (Blocking)` |
| 9 | Single player | Marching order / split party N/A; Hidden Emotion Test adapted in `ParleyRules.judgeGuess` |

## Other GM rulings (search `GM RULING`)

These cover places where the rules leave a decision to the GM:

- A club costs nothing.
- Fists deal 1d2.
- Carried armour and shields take Slots.
- A crowbar gives +2 to force doors and lets you open trapped lids safely.
- A forced door stays unstuck.
- Listening is once per door per turn.
- A spiked door costs a lost spike to remove.
- A sealed room turns wanderers away while you rest.
- A whole search uses one d6, so the log never reveals what's hidden.
- A general search finds traps on a 1.
- A found trap is avoided.
- Climbing out of a pit costs a turn.
- Retreating along a known route is safe from traps.
- A fight takes one Dungeon Turn.
- A surprised party fights at Close distance.
- Backing away from hostile monsters: they attack on 1–3.
- Bribes give +1/+2 and food gives +2.
- Paralysis lasts 1d4 rounds, and attacks against a paralysed adventurer get +4.
- Energy drain at level 1 kills; at higher levels you lose a Hit Die.
- Sleeping foes are slain after the fight.
- Pursuit: faster monsters catch you on 1–3.
- Surrendering costs you your treasure and gold.
- Magic items give no XP.
- Before the first delve, the Shoppe refunds in full.
- Shield spell +4 AC.
- Potion of Speed: +1 zone of movement.
- Monster HP is rolled in secret.
