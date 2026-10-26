/**
 * Enumerations shared across every layer. Each is a frozen object so that,
 * like a C# enum, its values cannot be changed at runtime.
 */

/** RULE 4d (Clash Board): three zones in a row. Distance = |zoneA - zoneB|. */
FD.Enums.Zone = Object.freeze({ PARTY: 0, CENTRE: 1, ENEMY: 2 });

/** Display names for the zones, indexed by FD.Enums.Zone value. */
FD.Enums.ZoneName = Object.freeze(['Party', 'Centre', 'Enemy']);

/** RULE 12: the six attributes, in the order they are rolled. */
FD.Enums.Attr = Object.freeze({ STR: 'STR', INT: 'INT', WIS: 'WIS', DEX: 'DEX', CON: 'CON', CHA: 'CHA' });

/** RULE 16: the five saving throw categories. */
FD.Enums.Save = Object.freeze({
    DEATH: 'death',
    WANDS: 'wands',
    PARALYSIS: 'paralysis',
    BREATH: 'breath',
    SPELLS: 'spells'
});

/** Display names for saving throws. */
FD.Enums.SaveName = Object.freeze({
    death: 'Death / Poison',
    wands: 'Wands',
    paralysis: 'Paralysis / Stone',
    breath: 'Breath',
    spells: 'Spells'
});

/** RULE 35 (Doors): the states a door can be in. */
FD.Enums.DoorState = Object.freeze({
    OPEN: 'open',
    CLOSED: 'closed',
    STUCK: 'stuck',
    LOCKED: 'locked',
    BARRED: 'barred'
});

/** Lifecycle of a monster on the Clash Board and in the dungeon. */
FD.Enums.MonsterState = Object.freeze({
    STANDING: 'standing',
    FLED: 'fled',
    SURRENDERED: 'surrendered',
    ASLEEP: 'asleep',
    TURNED: 'turned',
    CHARMED: 'charmed',
    DEAD: 'dead'
});

/** RULE 48 (Encounter Distance). */
FD.Enums.Distance = Object.freeze({ CLOSE: 'close', NORMAL: 'normal', DISTANT: 'distant' });

/** TABLE 12 (Reaction) result ids. */
FD.Enums.Reaction = Object.freeze({
    ATTACK: 'attack',
    HOSTILE: 'hostile',
    UNCERTAIN: 'uncertain',
    TALKATIVE: 'talkative',
    FRIENDLY: 'friendly'
});

/** State of a placed encounter inside a room. */
FD.Enums.EncounterState = Object.freeze({
    PENDING: 'pending',
    PEACEFUL: 'peaceful',
    DEFEATED: 'defeated',
    GONE: 'gone'
});

/** Screens the ScreenManager can show. */
FD.Enums.Screen = Object.freeze({
    TITLE: 'title',
    CREATION: 'creation',
    SHOPPE: 'shoppe',
    SPELL_PREP: 'spellPrep',
    EXPLORATION: 'exploration',
    ENCOUNTER: 'encounter',
    COMBAT: 'combat',
    TOWN: 'town',
    GAME_OVER: 'gameOver'
});

/** Actions the player may declare in a combat round (RULE 56). */
FD.Enums.CombatAction = Object.freeze({
    HOLD: 'hold',
    ATTACK: 'attack',
    MISSILE: 'missile',
    CAST: 'cast',
    TURN: 'turn',
    ITEM: 'item',
    WITHDRAW: 'withdraw',
    RETREAT: 'retreat',
    LEAVE: 'leave',
    SURRENDER: 'surrender'
});

/** Item kinds held in an Inventory. */
FD.Enums.ItemKind = Object.freeze({
    GEAR: 'gear',
    WEAPON: 'weapon',
    ARMOUR: 'armour',
    SHIELD: 'shield',
    TREASURE: 'treasure',
    MAGIC: 'magic',
    SPELLBOOK: 'spellbook',
    KEY: 'key'
});
