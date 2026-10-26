# Fast Dungeons (web): Game Specification

**Source rules:** `FastDungeonsv0.79.txt` (Fast Dungeons v0.79, "The RADiCAL Version", Dom Millar 2026)
**Target:** a single-player, turn-based dungeon crawler written in plain HTML, CSS and JavaScript, with no libraries. You play it by opening `index.html`.

## Design decisions

| Decision | Choice |
|---|---|
| Clash Board | 3 zones: Party / Centre / Enemy (rule 4d) |
| Party | A single adventurer controlled by the player |
| Dungeon source | Hand-authored data file(s); one starter dungeon ships with the game |
| Scope | Full loop: Create → Shoppe → Delve → Town (heal, trade, XP, level up to 3, respawn) → Delve again |

---

## 1. Overview
- **Genre:** single-player, turn-based point-crawl dungeon crawler. The computer acts as the GM: it describes rooms, rolls dice, runs monsters and applies the rules.
- **Core loop** (rules 1–3, 30, 66–68): Title → Character Creation → Shoppe → Spell Preparation → Exploration ⇄ Encounter ⇄ Combat → Leave Dungeon → Town → Delve again. The game ends when the player quits. A dead PC is replaced by a new one in town (rule 66a).
- **The four components** (rule 4) each map to a UI panel: **MAP** (player map), **SHEET** (character sheet), **CLOCK** (turns, light, rest, wandering monster tracker) and **CLASH** (3-zone combat board).
- **Logging:** every dice roll goes to the Adventure Log, tagged with its rule. Example: `[R36 Listen] d6=2 → fail (needed 1)`. The player learns the rules by playing.

## 2. Technical constraints
- No libraries, no build step, no server. The game must run from `file://`.
- **No ES modules.** Chrome blocks `<script type="module">` on `file://`. Instead, use classic `<script>` tags in a fixed load order, all under one global namespace, `window.FD`. This works like a C# namespace: each file adds to `FD.Core`, `FD.Data`, `FD.Model`, `FD.Rules` or `FD.UI`.
- Target modern evergreen browsers (ES2020: `class`, `const`/`let`, arrow functions, template strings, optional chaining).
- Save the game to `localStorage` under the key `fd.save.v1`, wrapped in try/catch. The game must still work if storage is unavailable. Autosave on entering town and on leaving the dungeon.
- The map is drawn with inline SVG created by JS, and everything else with DOM and CSS. No canvas is needed.
- The layout must work from 1024px wide down to phone width (panels stack).

## 3. Coding standards (for C# readability)
- **One class per file,** with PascalCase class names and camelCase methods and fields. Constants use `UPPER_SNAKE`.
- **Enums** are frozen objects, for example `FD.Enums.Zone = Object.freeze({ PARTY: 0, CENTRE: 1, ENEMY: 2 })`.
- **JSDoc on every function and class** (`/** ... */` with `@param {Type}`, `@returns {Type}`), the equivalent of C# XML doc comments. Every function comment explains *what* it does and *why*.
- **Rule citations:** a rule implementation states the rule in its JSDoc and again inline:
  ```js
  /**
   * Attempts to listen at a door.
   * RULE 36 (Listening): succeeds on 1 on 1d6; 1–2 for Dwarves, Elves, Halflings.
   * A Thief uses Hear Noise from Table 9 instead.
   * @param {FD.Model.Character} character  The adventurer listening.
   * @param {FD.Model.Door} door            The door being listened at.
   * @returns {FD.Rules.CheckResult}        Success flag, roll and log text.
   */
  listen(character, door) {
      // RULE 36: base chance is 1 in 6
      let chance = 1;
      // RULE 36 / TABLE 2: demi-humans hear on 1–2
      if (character.race.keenHearing) chance = 2;
      ...
  }
  ```
  Tables are cited the same way: `// TABLE 6 (Weapons)`. Where this spec resolves a contradiction in the rules, the comment says so: `// RULE CONFLICT: ...` or `// GM RULING: ...` (see §11).
- **Layers never reach across:** data → model → rules → UI. Rules classes never touch the DOM. UI classes never roll dice or change state directly; they call rules services. This is like a service layer under an MVC view.
- **Dice go through `FD.Core.Dice`.** It wraps a seedable RNG so tests are deterministic. No `Math.random()` anywhere else.
- No clever one-liners. Prefer explicit `if` and `for` over chained reduces. Use `===` only.

## 4. File structure
```
index.html                 entry point; <script> tags in load order
tests.html                 browser test runner (no libraries)
SPEC.md / RULES-COVERAGE.md
css/   theme.css (colour tokens, light/dark) · layout.css · map.css · clash.css · sheet.css
js/core/      namespace.js · enums.js · config.js · dice.js · eventBus.js · gameLog.js
js/data/      (pure data, named after the rule tables)
    attributes.js        Rule 13 modifier table
    races.js             Table 2
    classes.js           Table 3 (levels/HD/AB), Table 4 (saves), Table 8 (slots), Table 9 (thief skills)
    equipment.js         Table 5
    weapons.js           Table 6
    armour.js            Table 7
    spells.js            Table 8 spell lists + effect handlers
    turnUndead.js        Table 10
    monsters.js          Table 11
    reaction.js          Table 12
    morale.js            Table 13
    treasure.js          Tables 14 & 15
    wanderingMonsters.js Table 16
    emotions.js          Table 17
js/dungeons/  dungeonRegistry.js · sunkenCrypt.js
js/model/     Character.js · Inventory.js · Monster.js · Dungeon.js (Room, Corridor, Door, Feature, Trap)
              Clock.js · CombatState.js · GameState.js (root aggregate; toJSON/fromJSON)
js/rules/     AttributeRules.js · CharacterFactory.js · SavingThrowRules.js · ExplorationRules.js
              DoorRules.js · SearchAndTrapRules.js · LightRules.js · EncumbranceRules.js
              WanderingMonsterRules.js · EncounterRules.js · ParleyRules.js · MoraleRules.js
              CombatEngine.js · MonsterAI.js · SpellRules.js · TurnUndeadRules.js
              TownRules.js · ExperienceRules.js
js/ui/        ScreenManager.js · screens/*Screen.js · components/ (CharacterSheetView, ClockView,
              MapView, ClashBoardView, LogView, ActionBar, Modal)
js/main.js    FD.Game bootstrap: builds GameState, registers screens, shows Title
js/tests/     testRunner.js · *.test.js
```

## 5. Data model (key classes)
- **Character:** name, age (rule 5b, 16–40), background, race, class, level, xp, the six attributes (rule 12), hpMax/hpCurrent, gold, inventory, equipped weapon/armour/shield, spellbook, preparedSpells, usedSlots, conditions (paralysed, invisible, poisoned…).
  - Derived getters: `modifier(attr)` (rule 13), `armourClass` (Table 1 step 6 and Table 7), `attackBonus` (Table 3), `saves` (Table 4), `maxSlots` (rule 42: 10 + STR mod), `usedSlots`, `isEncumbered`, `thiefSkills` (Table 9).
- **Monster:** created from a Table 11 template. It holds HD, AC, move, attacks, morale, `tags` (undead, large, intelligent, animal, ignoresMorale, actsLast, paralysis, poison, energyDrain, needsMagicWeapon), hp (rolled from HD), zone, state (standing/fled/surrendered/asleep/turned/dead) and `aware`.
- **Dungeon / Room / Corridor / Door:**
  - Room: id, name, size 1–3 (rule 31b), description, hidden features, treasure, encounter, `discovered`, `searched`, `isEntrance`.
  - Corridor: from, to, turns (rule 31d), door, `secret`, `discovered`.
  - Door: one of the rule 35 states: open, closed, stuck, locked, barred, secret.
  - All of this state persists between delves (rule 68: anything left inside remains part of the dungeon).
- **Clock:** totalTurns, turnsSinceRest (rule 44), turnsUntilWanderingCheck (rule 45), and light sources, each with turnsRemaining (rule 41). It raises events: `turnAdvanced`, `lightOut`, `restNeeded`.
- **GameState:** character, dungeon, clock, screen, log, combat (nullable), town data (rumours known, day count) and config.

## 6. Exploration (rules 29–45)
The `ExplorationScreen` shows the room description, the actions available, the map, the clock and the sheet. Each exploration action runs `ExplorationRules.performAction()`, which follows **rule 30** exactly:
1. **Describe:** show the obvious contents of the room (rule 31a).
2. **Choose:** the player picks an action.
3. **Resolve:** apply the action's rules.
4. **Update:** update the map (rule 33).
5. **Time:** advance the Clock by the action's cost and burn light.
6. **The Dungeon Answers:** check for wandering monsters every 2nd turn. Noise and darkness add extra checks.

| Action | Cost | Rules |
|---|---|---|
| Move through a corridor | corridor.turns; ×2 if encumbered | 31d, 42, 43 |
| Search the room thoroughly | 1 turn | 38, 40 (secret doors 1/6, Elf 1–2), Table 2 (Dwarf finds stonework 1–2) |
| Search with a method (10' pole, mirror) | 1 turn | 38: a suitable item finds a matching feature with no roll (e.g. a pole finds a pit trap) |
| Listen at a door | free action, 0 turns | 36 |
| Force a stuck door | 1 turn if it fails, plus a wandering monster check | 37 (STR check) |
| Pick a lock | 1 turn | Table 9 Open Locks; needs Thieves' Tools (Table 5) |
| Find/remove traps | 1 turn | Table 9 |
| Spike or wedge a door | free action | 35, Table 5 |
| Light a torch or lantern | free action | 41, Table 5 (torch 6 turns, oil 24) |
| Rest | 1 turn | 44: resets the rest counter. After 5 turns without rest: −1 to hit and to checks until rested (config value; a GM ruling, see §11) |
| Camp overnight | 48 turns | 53g: recover spells; 3 wandering monster checks; light keeps burning |
| Cast a utility spell | 1 turn | 53e–f |
| Leave the dungeon | only from the entrance room | 66, 68 |

Also:
- **Darkness** (rule 41b): moving is only possible back along known routes. Search is unavailable, visual actions fail automatically, attacks take −4, and every turn triggers a wandering monster check.
- **Infravision** never works (rule 41a).
- **Traps** (rule 39): an action that could set off an unfound trap triggers it on 1–2 on d6. A fall deals 1d6 per 10 ft (rule 39a). Poison is a save or die (rule 39b).
- **Entering a room** with an encounter starts §7.

## 7. Encounters (rules 46–52)
`EncounterRules.begin(room or wandering)` works through these steps:
1. **Surprise** (rule 47): each side rolls a d6 and is surprised on 1–2.
   - A Bugbear surprises on 1–3.
   - A Thief who passes Move Silently first leaves the monsters automatically unaware.
   - Boots of Elvenkind give −1 to the monsters' surprise roll.
2. **Distance** (rule 48): Close, Normal or Distant, taken from the room data and the surprise result.
3. **Reaction** (rule 49, Table 12): roll 2d6 + CHA modifier, unless the encounter data fixes the reaction (e.g. undead always attack).
4. **Parley options:**
   - Talk.
   - Offer gold or items, which gives a +1 or +2 bonus to a reroll; this is the GM ruling for rule 50.
   - Attack.
   - Back away, which leaves the room through the corridor you came in by.
   - On a friendly result, the monster may share information or allow passage.
5. **Hidden Emotion Test, single-player version** (rule 50a): used for NPCs flagged `important`.
   - The game secretly rolls an emotion from Table 17 and shows the NPC's opening line written for that emotion. Each important NPC has six lines in its data.
   - The player guesses the emotion. A correct guess is "everyone correct", so the NPC reveals its `secret` or offers major help. A wrong guess is "nobody correct", so the NPC withholds, misleads, makes demands or escalates.
   - The ESP spell reveals the emotion.
   - A config setting turns the test off, as the optional rule allows.
6. **Motivation** (rule 51): each encounter's data lists what the monster wants. This shapes the reaction text and what it will accept as a bribe.

## 8. Combat (rules 54–65) on the 3-zone Clash Board
- **Zones:** `PARTY = 0`, `CENTRE = 1`, `ENEMY = 2`. Distance = |zoneA − zoneB|.
- **Setup** (rules 4d, 48): the PC starts in Party and the monsters in Enemy.
  - **Close:** monsters start in Centre.
  - **Distant:** nobody may enter Centre in round 1.
  - A surprised side loses round 1.
- **Each round** (`CombatEngine.runRound`) follows rule 56. Before initiative, the player declares an action: move (0–2 zones, or 1 if encumbered, per rule 58) plus one of attack, shoot/throw, cast, turn undead, use item, withdraw, retreat, surrender or leave the board. A spell must be declared before initiative (rules 53e, 61a, 61c).
  1. **Initiative** (rule 55): each side rolls a d6. The higher side acts first in every step. On a tie, both sides act and all damage is applied at the end of the round, held in a `pendingDamage` queue.
  2. **Morale** (rules 52, 57, Table 13): checked after the first casualty and again when half the group is defeated. A roll of 2d6 above the morale score is a failure. Undead and monsters tagged `ignoresMorale` skip it. On a failure, Table 13 decides the outcome: Flee (move toward the Enemy zone and off the board), Surrender for intelligent monsters, and Bargain, which hands back to parley.
  3. **Movement** (rule 58): each zone costs 1 point of movement. Monsters use their Move value.
     - **Blocking** (58b): you cannot move past a zone with a standing enemy.
     - **Engaged** (58c): you can only leave by Withdraw or Retreat.
     - **Leaving the board** (58e): moving out the back of your own home zone takes you out of the fight.
     - A caster cannot move in a round they cast.
  4. **Missiles** (rule 60): d20 + Table 3 attack bonus + DEX modifier, and +1 for a Halfling (Table 2). Not allowed in a Small room or at a target in your own zone.
  5. **Spells and Turn Undead** (rules 61, 61c, 61d, Table 10). A caster hit before their spell resolves loses the spell. Turning needs a Holy Symbol. A turn affects 2d6 HD of undead: turned undead move away and off the board, destroyed undead are removed.
  6. **Melee** (rules 59, 62): the target must be in the same zone, or in an adjacent zone with a Reach weapon (spear, pole arm).
     - PC roll: d20 + Table 3 attack bonus + STR modifier.
     - Monster roll: d20 + HD-based attack bonus from the rule 59 table.
     - A total ≥ AC hits.
     - Backstab (Table 9): +4 to hit and ×2 damage against an unaware target.
     - Darkness: −4. Protection from Evil: −1 to the attacks of evil monsters. Halfling: +2 AC against `large` monsters.
     - A Wight needs a magic or silver weapon.
  7. **Surrender, Withdraw, Retreat and Pursuit** (rules 63–65):
     - **Withdraw:** move 1 zone toward home; no free attacks. From the home zone, this leaves the board.
     - **Retreat:** full move; each engaged enemy gets one free attack.
     - **Pursuit:** if the PC leaves the board, compare speeds. An encumbered PC cannot outrun (rule 42). Dropping treasure lets the PC escape automatically. The monster's motivation applies.
- **Damage** (rule 59a): roll the weapon or monster damage. Optional maximum damage is a config setting (rule 59b). At 0 HP the creature is dead with no recovery (rule 67).
- **Specials** (Table 11 tags):
  - Ghoul and Gelatinous Cube paralysis: save vs Paralysis. Elves are immune to the ghoul's.
  - Spider poison: save or die.
  - Wight energy drain: lose 1 level.
  - Zombie: always acts last.
  - Stirge: attaches and drains 1d3 per round.
  - Monsters save as Fighters (rule 16).
- **Combat ends** (rule 58e) when every member of one side has left, died, surrendered or stopped fighting. The game then returns to Exploration, awards monster XP to a pending pool (rule 67) and makes loot available.

**MonsterAI** reads the "Board Behaviour" column of Table 11, encoded as tags such as `rushesCentre`, `prefersMissiles`, `holdsCentre`, `slowAdvance` and `seeksGap`. Each tag maps to one small, commented decision function.

## 9. Character creation and magic
- **Creation** follows Table 1, steps 1–14, one wizard page per group:
  - Roll 3d6 in order (rule 12). Reroll is allowed only before choosing; this is a config setting with default off.
  - Choose a race; Table 2 restrictions disable classes the race cannot take.
  - Choose a class.
  - HP = class HD + CON modifier, minimum 1.
  - Saves come from Table 4.
  - Starting gold is 3d6×10 (rule 5e).
  - Name, age and background.
- **Shoppe** (rule 1b): Tables 5–7, with class restrictions on weapons and armour (Table 1 notes, rules 24–27). It shows a live slot counter and an encumbrance warning. Coins count 1 slot per 100 (rule 42).
- **Spells:**
  - A Wizard's spellbook starts with Read Magic plus one chosen L1 spell (rule 53b). A Cleric has access to the full Cleric list from level 2 (rule 53c).
  - The preparation screen fills Table 8 slots before each delve (rule 53d).
  - Range is in zones; duration is in rounds or Clock turns (rule 53f). Unwilling targets save vs Spells, except against Magic Missile and Sleep.
  - Scrolls (rule 53h): a Wizard needs Read Magic; a Cleric does not.
- **Spell effects:** each spell in `spells.js` is `{ id, name, level, classes, range, duration, save, kind: "mechanical" | "narrative", cast(context) }`.
  - **Mechanical spells:** Cure Light Wounds, Light, Protection from Evil, Detect Magic, Magic Missile (1d6+1, auto-hit), Sleep (2d8 HD of creatures ≤4 HD), Shield, Charm Person, Hold Portal, Floating Disc (+slots), Knock, Web, Invisibility, Mirror Image (1d4 images), Continual Light, Levitate (crosses pits), Wizard Lock and ESP.
  - **Narrative spells** (Detect Evil, Purify Food and Water, Remove Fear, Resist Cold, Read Languages, Ventriloquism, Locate Object, Detect Invisible, Phantasmal Force) show GM text, and the dungeon data may react to them through hooks.

## 10. Town, XP and levelling (rules 66–71)
- **Leaving the dungeon** is possible only from the entrance room (rule 66). XP = gp value of treasure carried out (rule 67, Table 14) + 10 XP per monster HD, minimum 5 per monster.
- **Levelling** (rule 71): reaching the XP shown in Table 3 grants the level. Roll 1 more HD + CON modifier (minimum 1). Update the attack bonus, saves, spell slots and thief skills. A Wizard adds one spell. At most one level per delve; XP beyond one point short of the following level is lost. Level 3 is the maximum.
- **TownScreen actions**, each costing days:
  - Rest: 1d3 HP per day, or a full week to restore all HP.
  - Buy at list price, or sell treasure at value and equipment at half price.
  - Copy a spell: 1 week and 100 gp per spell level.
  - Rewrite a lost spellbook.
  - Ask for rumours: 1 day each; the game secretly rolls a d6, 1–4 true and 5–6 false.
  - A night's rest recovers all spells.
  - Respawn a new PC if dead (rule 66a).
- **Death** (rule 67): a Game Over panel shows the epitaph. Gold and items on the body stay in the dungeon room where the PC died, so a new PC can recover them (rule 68).

## 11. Rule conflicts and GM rulings
Each of these is marked `// RULE CONFLICT` or `// GM RULING` in the code.
1. **Clash zones:** rule 4d (3 zones) vs the Glossary (5 zones). Use 3 zones, per the design decision.
2. **Weapon ranges on 3 zones** (Table 6): maximum zone distance = Range − 1, capped at 2.
   - Melee Range 1 = same zone.
   - Thrown Range 2 = adjacent zone.
   - Sling and Crossbow (Range 2) = adjacent zone.
   - Short Bow (3) and Long Bow (6) = anywhere on the board.
   - The Long Bow's −1 per range step beyond 3 never applies, because the board is too short.
   - The Crossbow's "anywhere" text conflicts with its Range value of 2. Range 2 wins, plus a reload: it fires every other round.
3. **Hit test:** rule 59 says "equals or exceeds", but its formulas use ">". Use ≥, which matches rule 59's text and the Glossary.
4. **PC attack bonus:** rule 59 says levels 1–3 have no attack bonus, but Table 3 lists +1 for a level 1 Fighter. Use Table 3, which the sample play confirms (Dorn).
5. **Rumours:** rule 1a (optional rumour at the start) vs rule 66 (not at the start). Config `startingRumour`, default off.
6. **Running without rest** (rule 44): GM ruling of −1 to hit and to checks until rested.
7. **Night length** (rule 53g): 48 Dungeon Turns, set in config.
8. **Duplicate numbers:** rule 66 and rule 67 are each used twice, and the round sequence (rule 56) and rules 57/58 are numbered off by one. The code cites the rule by number *and* name, for example `RULE 58b (Blocking)`.
9. **Single player:** marching order (34) and no split party (43a) have no effect, and the Hidden Emotion Test is adapted (see §7).

## 12. Starter dungeon: "The Sunken Crypt"
File: `js/dungeons/sunkenCrypt.js`. Built on the sample of play in Appendix H. It has about 14 rooms, sized 1–3, with x/y map coordinates. It includes:
- An entrance.
- A goblin guardroom with an important NPC who has six emotion lines and a secret about a loose flagstone.
- A rat nest.
- A pit-trap corridor (a 10' pole finds it).
- A stuck door and a locked door.
- A secret door to a treasury.
- A crypt with skeletons.
- A zombie hall.
- A spider lair (poison).
- A stirge cave.
- A deep optional wing (a ghoul, then a wight's tomb) for level 2–3 return delves.
- The dungeon's own wandering monster table; the default is Table 16.
- Treasure from Table 14 and magic items from Table 15: Potion of Healing, a scroll, Weapon +1 and Ring of Protection +1.

## 13. How to extend
- **New monster:** add an entry to `data/monsters.js`. Any new behaviour tag needs one function in `MonsterAI`.
- **New spell:** add an entry with a `cast(context)` handler in `data/spells.js`.
- **New item:** add an entry to `equipment.js` or `treasure.js`, using optional `onUse` and `searchMethod` hooks.
- **New dungeon:** add a file in `js/dungeons/`, call `FD.Dungeons.register(...)`, and add a `<script>` tag.
- **Optional rules:** toggle them in `core/config.js` (`maxDamage`, `hiddenEmotionTest`, `startingRumour`, `rerollAttributes`, `nightRestTurns`, `noRestPenalty`).
- **Rule coverage:** `RULES-COVERAGE.md` maps every rule and table to Implemented, Adapted, Narrative or N/A, plus the file and function that implement it.

## 14. UI
- **Theme:** a dark "torchlight" palette defined as CSS custom properties in `theme.css`, with a light theme as well.
- **Exploration layout:** a 3-column grid with the Sheet, then Room + Actions, then Map + Clock. The Log runs along the bottom.
- **Combat layout:** the Clash Board shows 3 zones as columns, with tokens for the PC and the monsters. Clicking a zone moves there; clicking a token targets it. The action bar shows only legal actions; illegal ones are disabled, with a tooltip citing the rule (e.g. "Engaged: rule 58c").
- **Dice:** results show in the log and in a brief on-screen toast.
- **Accessibility:** every action is a `<button>`, and keyboard shortcuts are 1–9 for actions.

## 15. Delivery milestones
1. Core, data tables and the Character model, with tests (dice, modifiers, AC, saves, slots).
2. Creation, Shoppe and Spell Prep screens.
3. Exploration, Clock and Map, with the starter dungeon.
4. Encounters (surprise, reaction, parley, emotion test).
5. Combat engine and Monster AI.
6. Spells and Turn Undead.
7. Town, XP, levelling, save/load.
8. The rules coverage document, plus a polish pass.

## 16. Verification
- Open `index.html` by double-click in Chrome, Firefox and Safari. There should be no console errors and no network requests.
- Open `tests.html`. The seeded-dice unit tests for every `FD.Rules` service should all be green. Examples:
  - The rule 13 modifier boundaries.
  - Rule 42: STR 16 → 12 slots.
  - Rule 59: a monster at 2+2 HD has AB +2.
  - Table 10 lookups.
  - The rule 71 one-level cap.
- Do a manual playthrough: create a character, shop, explore to the goblins, run the emotion test, fight, trigger a morale failure, find the secret door, leave, level up, return.
- Grep the code for `RULE ` and check it against `RULES-COVERAGE.md`. Every row marked Implemented should have at least one citation in code.
