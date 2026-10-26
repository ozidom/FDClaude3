/**
 * Experience and levelling (rules 67, 71) and level drain (TABLE 11, Wight).
 */
class ExperienceRules {
    /**
     * XP needed for the next level, or null at the maximum.
     * TABLE 3: the XP column for the next row.
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {number|null}
     */
    static nextLevelXp(character) {
        if (character.level >= FD.Core.config.maxLevel) {
            return null;
        }
        const row = character.cls.levels[character.level];
        return row ? row.xp : null;
    }

    /**
     * Value of treasure carried that has not yet earned XP.
     * RULE 67 / TABLE 14: 1 XP per 1 gp of treasure brought out.
     * GM RULING: magic items and gear give no XP (only their sale value).
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {number}
     */
    static treasureValue(character) {
        let total = 0;
        for (const item of character.inventory.items) {
            if (item.kind === FD.Enums.ItemKind.TREASURE && !item.xpAwarded) {
                total += item.value || 0;
            }
        }
        return total;
    }

    /**
     * Awards XP when the party leaves the dungeon.
     * RULE 67: treasure carried out = 1 XP per gp; defeated monsters 10 XP per HD.
     * Coins found are added to the purse.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {Object}  Summary for the Town screen.
     */
    static awardDelve(state) {
        const pc = state.character;
        const treasureXp = ExperienceRules.treasureValue(pc);
        let coins = 0;
        for (const item of pc.inventory.items.slice()) {
            if (item.kind !== FD.Enums.ItemKind.TREASURE || item.xpAwarded) {
                continue;
            }
            item.xpAwarded = true;
            if (item.coins) {
                coins += item.value;
                pc.inventory.remove(item.uid);
            }
        }
        pc.gold += coins;
        const monsterXp = state.delve.monsterXp;
        const gained = treasureXp + monsterXp;
        const before = pc.xp;
        const levelBefore = pc.level;
        const result = ExperienceRules.applyXp(pc, gained);
        FD.Core.log.add('[R67 Experience] Treasure ' + treasureXp + ' XP + monsters ' + monsterXp + ' XP = ' + gained + ' XP.', 'rule');
        state.delve.monsterXp = 0;
        return {
            treasureXp: treasureXp,
            monsterXp: monsterXp,
            coins: coins,
            gained: gained,
            before: before,
            after: pc.xp,
            lost: result.lost,
            levelBefore: levelBefore,
            levelAfter: pc.level,
            hpGain: result.hpGain,
            needsSpellChoice: result.needsSpellChoice,
            defeated: state.delve.defeatedNames.slice()
        };
    }

    /**
     * Adds XP, levelling at most once.
     * RULE 71: reaching the next row of TABLE 3 grants that level. An adventurer
     * cannot gain more than one level in a single Delve; any XP beyond one point
     * short of the following level is lost. Level 3 is the maximum.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {number} gained                 XP earned this delve.
     * @returns {{lost:number, levelled:boolean, hpGain:number, needsSpellChoice:boolean}}
     */
    static applyXp(character, gained) {
        let xp = character.xp + gained;
        let lost = 0;
        let levelled = false;
        let hpGain = 0;
        let needsSpellChoice = false;
        const next = ExperienceRules.nextLevelXp(character);
        if (next !== null && xp >= next) {
            const up = ExperienceRules.levelUp(character);
            levelled = true;
            hpGain = up.hpGain;
            needsSpellChoice = up.needsSpellChoice;
            // RULE 71: XP beyond one point short of the following level is lost
            const following = ExperienceRules.nextLevelXp(character);
            if (following !== null && xp > following - 1) {
                lost = xp - (following - 1);
                xp = following - 1;
            }
        }
        character.xp = xp;
        return { lost: lost, levelled: levelled, hpGain: hpGain, needsSpellChoice: needsSpellChoice };
    }

    /**
     * Gains one level.
     * RULE 71: roll one more Hit Die + CON modifier (minimum 1); attack bonus and
     * saves follow Tables 3 and 4; spell slots follow TABLE 8; Thief Skills TABLE 9;
     * a Wizard adds one new spell to their book.
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {{hpGain:number, needsSpellChoice:boolean}}
     */
    static levelUp(character) {
        character.level++;
        const die = character.cls.hitDie;
        const roll = FD.Core.dice.roll(die);
        const conMod = character.modifier('CON');
        const gain = Math.max(1, roll + conMod);
        character.hpMax += gain;
        character.hpCurrent += gain;
        FD.Core.log.roll('R71', 'Level Up HP', 'd' + die + '=' + roll + ' ' + FD.Data.Attributes.formatMod(conMod) + ' CON', '+' + gain + ' HP');
        FD.Core.log.add(character.name + ' reaches level ' + character.level + '!', 'good');
        return { hpGain: gain, needsSpellChoice: character.classId === 'wizard' };
    }

    /**
     * Wizard spells that could be added on levelling (rule 71 step 3 / 53b).
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {string[]}  Spell ids of levels the Wizard can cast, not yet known.
     */
    static levelSpellChoices(character) {
        const slots = character.maxSpellSlots;
        const out = [];
        for (const levelText of Object.keys(slots)) {
            const level = parseInt(levelText, 10);
            for (const id of FD.Data.SpellLists.wizard[level] || []) {
                if (character.spellbook.indexOf(id) < 0) {
                    out.push(id);
                }
            }
        }
        return out;
    }

    /**
     * Energy drain.
     * TABLE 11 (Wight): lose 1 level. GM RULING: a level 1 adventurer dies; otherwise
     * lose one Hit Die of maximum HP and drop to the start of the new level.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{died:boolean}}
     */
    static drainLevel(state) {
        const pc = state.character;
        if (pc.level <= 1) {
            FD.Core.log.add('Cold floods through you. You have no life left to give.', 'danger');
            pc.hpCurrent = 0;
            return { died: true };
        }
        pc.level--;
        const roll = FD.Core.dice.roll(pc.cls.hitDie);
        pc.hpMax = Math.max(1, pc.hpMax - roll);
        pc.hpCurrent = Math.min(pc.hpCurrent, pc.hpMax);
        pc.xp = pc.cls.levels[pc.level - 1].xp;
        FD.Core.log.roll('T11', 'Energy Drain', 'd' + pc.cls.hitDie + '=' + roll, 'you drop to level ' + pc.level + ' and lose ' + roll + ' max HP');
        return { died: false };
    }
}

FD.Rules.ExperienceRules = ExperienceRules;
