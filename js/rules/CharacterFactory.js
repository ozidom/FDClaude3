/**
 * Builds new adventurers following TABLE 1 (Character Creation), steps 1-14.
 */
class CharacterFactory {
    /**
     * TABLE 1 step 1 / RULE 12: roll 3d6 in order for STR, INT, WIS, DEX, CON, CHA.
     * @returns {Object<string, number>}  Scores by attribute.
     */
    static rollAttributes() {
        const scores = {};
        const parts = [];
        for (const attr of FD.Data.Attributes.ORDER) {
            const r = FD.Core.dice.rollExpr('3d6', false);
            scores[attr] = r.total;
            parts.push(attr + ' ' + r.total);
        }
        FD.Core.log.roll('R12', 'Attributes', '3d6 in order', parts.join(', '));
        return scores;
    }

    /**
     * TABLE 2: the classes a race may take.
     * @param {string} raceId  Race id.
     * @returns {string[]}     Class ids.
     */
    static allowedClasses(raceId) {
        return FD.Data.Races[raceId].classes.slice();
    }

    /**
     * TABLE 2 (Class Restriction).
     * @param {string} raceId   Race id.
     * @param {string} classId  Class id.
     * @returns {boolean}
     */
    static isClassAllowed(raceId, classId) {
        return FD.Data.Races[raceId].classes.indexOf(classId) >= 0;
    }

    /**
     * Wizard Level 1 spells a new Wizard may choose (rule 53b): any L1 spell but Read Magic.
     * @returns {string[]}  Spell ids.
     */
    static wizardStartingChoices() {
        return FD.Data.SpellLists.wizard[1].filter(id => id !== 'readMagic');
    }

    /**
     * Creates the adventurer, rolling HP and starting gold.
     * TABLE 1 step 5: HP = class Hit Die + CON modifier, minimum 1.
     * RULE 5a-5c: name, age and background. RULE 5e: starting gold is 3d6 x 10 gp.
     * RULE 53b: a Wizard's book holds Read Magic plus one chosen L1 spell.
     * @param {Object} opts  { name, age, background, raceId, classId, attributes, wizardSpell }.
     * @returns {FD.Model.Character}
     */
    static create(opts) {
        if (!CharacterFactory.isClassAllowed(opts.raceId, opts.classId)) {
            throw new Error('TABLE 2: a ' + opts.raceId + ' cannot be a ' + opts.classId);
        }
        const cls = FD.Data.Classes[opts.classId];
        const conMod = FD.Data.Attributes.modifierFor(opts.attributes.CON);
        // TABLE 1 step 5: roll the class Hit Die + CON modifier, minimum 1
        const hdRoll = FD.Core.dice.roll(cls.hitDie);
        const hp = Math.max(1, hdRoll + conMod);
        FD.Core.log.roll('T1', 'Hit Points', 'd' + cls.hitDie + '=' + hdRoll + ' ' + FD.Data.Attributes.formatMod(conMod) + ' CON', hp + ' HP (minimum 1)');
        // RULE 5e: 3d6 x 10 gp
        const goldRoll = FD.Core.dice.rollExpr('3d6', false);
        const gold = goldRoll.total * 10;
        FD.Core.log.roll('R5e', 'Starting Gold', goldRoll.text + ' x10', gold + ' gp');

        // RULE 5b: age 16-40
        let age = parseInt(opts.age, 10);
        if (isNaN(age)) {
            age = 20;
        }
        age = Math.max(16, Math.min(40, age));

        const character = new FD.Model.Character({
            name: (opts.name || '').trim() || 'Nameless',
            age: age,
            background: opts.background || '',
            raceId: opts.raceId,
            classId: opts.classId,
            level: 1,
            xp: 0,
            attributes: Object.assign({}, opts.attributes),
            hpMax: hp,
            hpCurrent: hp,
            gold: gold
        });
        if (opts.classId === 'wizard') {
            // RULE 53b: Read Magic plus one chosen Level 1 spell
            character.spellbook = ['readMagic'];
            if (opts.wizardSpell && opts.wizardSpell !== 'readMagic') {
                character.spellbook.push(opts.wizardSpell);
            }
            character.inventory.add(FD.Model.Inventory.createItem(FD.Enums.ItemKind.SPELLBOOK, 'spellbook'));
        }
        FD.Core.log.add(character.name + ', ' + character.race.name + ' ' + cls.name + ' of level 1, steps into the story.', 'good');
        return character;
    }
}

FD.Rules.CharacterFactory = CharacterFactory;
