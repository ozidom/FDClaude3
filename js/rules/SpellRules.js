/**
 * Magic (rule 53): preparing spells into TABLE 8 slots, casting from slots
 * and scrolls, recovering spells, timed effects, and magic item use (TABLE 15).
 */
class SpellRules {
    /**
     * The spell list a character draws on, or null.
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {string|null}  'cleric' | 'wizard' | null.
     */
    static listFor(character) {
        return character.cls.spellList;
    }

    /**
     * Spells that may fill a slot of a given level.
     * RULE 53b: a Wizard prepares from their spellbook (and needs it).
     * RULE 53c: a Cleric has every Cleric spell of a level they can cast.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {number} level                  Spell level.
     * @returns {string[]}  Spell ids.
     */
    static preparableSpells(character, level) {
        const list = SpellRules.listFor(character);
        if (list === 'cleric') {
            return (FD.Data.SpellLists.cleric[level] || []).slice();
        }
        if (list === 'wizard') {
            if (!character.hasSpellbook) {
                return [];
            }
            return character.spellbook.filter(id => FD.Data.spellLevelFor(id, 'wizard') === level);
        }
        return [];
    }

    /**
     * Fills the spell slots before a delve.
     * RULE 53d: each caster chooses which spells fill their slots; the same
     * spell may fill more than one slot.
     * @param {FD.Model.Character} character  The adventurer.
     * @param {Object<number, string[]>} picks  Spell ids per level, one per slot.
     * @returns {{ok:boolean, reason:string}}
     */
    static prepare(character, picks) {
        const slots = character.maxSpellSlots;
        const prepared = [];
        for (const levelText of Object.keys(slots)) {
            const level = parseInt(levelText, 10);
            const chosen = (picks[level] || []).filter(id => !!id);
            if (chosen.length > slots[level]) {
                return { ok: false, reason: 'Too many level ' + level + ' spells (TABLE 8)' };
            }
            const allowed = SpellRules.preparableSpells(character, level);
            for (const id of chosen) {
                if (allowed.indexOf(id) < 0) {
                    return { ok: false, reason: FD.Data.Spells[id].name + ' cannot be prepared' };
                }
                prepared.push({ spellId: id, level: level, used: false });
            }
        }
        character.prepared = prepared;
        if (prepared.length > 0) {
            FD.Core.log.add('Spells prepared (rule 53d): ' + prepared.map(p => FD.Data.Spells[p.spellId].name).join(', ') + '.', 'good');
        }
        return { ok: true, reason: '' };
    }

    /**
     * RULE 53g / 66: used spells return after a full night's rest.
     * @param {FD.Model.Character} character  The adventurer.
     * @returns {void}
     */
    static recoverSpells(character) {
        for (const p of character.prepared) {
            p.used = false;
        }
    }

    /**
     * Spells the adventurer could cast right now, from slots and scrolls.
     * RULE 53h: a Wizard needs Read Magic to cast from a scroll; a Cleric does not.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} context            'explore' or 'combat'.
     * @returns {Object[]}  { spellId, name, level, source, itemUid, count, targeting, reason }.
     */
    static castableSpells(state, context) {
        const pc = state.character;
        const out = [];
        const bySpell = {};
        for (const p of pc.prepared) {
            if (p.used) {
                continue;
            }
            const spell = FD.Data.Spells[p.spellId];
            if (spell.usableIn.indexOf(context) < 0) {
                continue;
            }
            if (bySpell[p.spellId]) {
                bySpell[p.spellId].count++;
                continue;
            }
            const entry = { spellId: p.spellId, name: spell.name, level: p.level, source: 'slot', itemUid: null, count: 1, targeting: spell.targeting, reason: '' };
            bySpell[p.spellId] = entry;
            out.push(entry);
        }
        const list = SpellRules.listFor(pc);
        for (const item of pc.inventory.items) {
            if (item.defId !== 'scroll' || !item.spellId) {
                continue;
            }
            const spell = FD.Data.Spells[item.spellId];
            if (spell.usableIn.indexOf(context) < 0) {
                continue;
            }
            if (!list || FD.Data.spellLevelFor(item.spellId, list) === 0) {
                continue;
            }
            let reason = '';
            if (list === 'wizard' && !item.deciphered) {
                reason = 'Cast Read Magic on the scroll first (rule 53h)';
            }
            out.push({ spellId: item.spellId, name: spell.name, level: spell.level, source: 'scroll', itemUid: item.uid, count: 1, targeting: spell.targeting, reason: reason });
        }
        return out;
    }

    /**
     * Uses up the slot or scroll for a spell.
     * RULE 53a: a used slot stays used until spells are recovered.
     * RULE 53h: casting from a scroll uses no slot; the scroll is crossed off.
     * @param {FD.Model.Character} pc  The caster.
     * @param {string} spellId         Spell id.
     * @param {string} source          'slot' or 'scroll'.
     * @param {string} itemUid         Scroll uid when source is 'scroll'.
     * @returns {boolean}              False if nothing was available.
     */
    static consume(pc, spellId, source, itemUid) {
        if (source === 'scroll') {
            return pc.inventory.remove(itemUid) !== null;
        }
        for (const p of pc.prepared) {
            if (p.spellId === spellId && !p.used) {
                p.used = true;
                return true;
            }
        }
        return false;
    }

    /**
     * Casts a spell.
     * RULE 53e: casting is the caster's action; the target must be visible and in range.
     * GM RULING: casting any other spell ends Invisibility.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} spellId            Spell id.
     * @param {Object} opts               { source, itemUid, target, targetZone, corridor }.
     * @returns {{ok:boolean, text:string}}
     */
    static cast(state, spellId, opts) {
        const pc = state.character;
        const spell = FD.Data.Spells[spellId];
        if (!SpellRules.consume(pc, spellId, opts.source, opts.itemUid)) {
            return { ok: false, text: 'You have no ' + spell.name + ' ready.' };
        }
        if (pc.conditions.invisible && spellId !== 'invisibility') {
            pc.conditions.invisible = false;
            FD.Core.log.add('Casting breaks your invisibility.', 'info');
        }
        let from = '';
        if (opts.source === 'scroll') {
            from = ' from a scroll (rule 53h)';
        }
        FD.Core.log.add('[R53e Cast] You cast ' + spell.name + from + '.', 'rule');
        const ctx = {
            state: state,
            character: pc,
            combat: state.combat,
            target: opts.target || null,
            targetZone: opts.targetZone,
            corridor: opts.corridor || null
        };
        return spell.cast(ctx);
    }

    /**
     * RULE 61c: a disrupted spell is lost (the slot or scroll is used).
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} action             Declared cast action.
     * @returns {void}
     */
    static loseSpell(state, action) {
        SpellRules.consume(state.character, action.spellId, action.source, action.itemUid);
    }

    /**
     * Adds or refreshes a timed effect on a character.
     * RULE 53f: durations are counted in Dungeon Turns on the Clock.
     * @param {FD.Model.Character} character  Target.
     * @param {Object} effect                 { id, name, turns, data }.
     * @returns {void}
     */
    static addEffect(character, effect) {
        character.effects = character.effects.filter(e => e.id !== effect.id);
        character.effects.push({ id: effect.id, name: effect.name, turns: effect.turns, data: effect.data || {} });
    }

    /**
     * Counts down effects by one Dungeon Turn and removes expired ones.
     * @param {FD.Model.Character} character  Target.
     * @returns {string[]}  Names of effects that ended.
     */
    static tickEffects(character) {
        const ended = [];
        for (const e of character.effects) {
            e.turns--;
            if (e.turns <= 0) {
                ended.push(e.name);
            }
        }
        character.effects = character.effects.filter(e => e.turns > 0);
        return ended;
    }

    /**
     * Uses a magic item.
     * TABLE 15: Potion of Healing restores 1d6+1; Potion of Invisibility makes you
     * Invisible; GM RULING: Potion of Speed gives +1 zone of movement for a fight.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} uid                Item uid.
     * @returns {{ok:boolean, text:string}}
     */
    static useItem(state, uid) {
        const pc = state.character;
        const item = pc.inventory.get(uid);
        if (!item) {
            return { ok: false, text: 'No such item.' };
        }
        const def = FD.Data.MagicItems[item.defId];
        if (!def || !def.use) {
            return { ok: false, text: 'You cannot use that.' };
        }
        if (def.use === 'heal') {
            const r = FD.Core.dice.rollExpr('1d6+1', false);
            const healed = pc.heal(r.total);
            pc.inventory.remove(uid);
            FD.Core.log.roll('T15', 'Potion of Healing', r.text, 'healed ' + healed + ' HP');
            return { ok: true, text: 'Healed ' + healed + ' HP.' };
        }
        if (def.use === 'invisibility') {
            pc.conditions.invisible = true;
            pc.inventory.remove(uid);
            FD.Core.log.add('You drink the potion and fade from sight (TABLE 15).', 'good');
            return { ok: true, text: 'You are invisible.' };
        }
        if (def.use === 'speed') {
            if (!state.combat) {
                return { ok: false, text: 'Save it for a fight.' };
            }
            state.combat.pcSpeedBonus = 1;
            pc.inventory.remove(uid);
            FD.Core.log.add('The world slows around you: +1 zone of movement this fight.', 'good');
            return { ok: true, text: 'You are quickened.' };
        }
        return { ok: false, text: 'Nothing happens.' };
    }

    /**
     * Detect Evil (TABLE 8): names nearby rooms where evil creatures still lurk.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string}  GM text.
     */
    static senseEvil(state) {
        const here = state.room;
        const parts = [];
        if (SpellRules.roomHasEvil(here)) {
            parts.push('Evil is here, in this very room.');
        }
        for (const c of state.dungeon.corridorsFrom(here.id)) {
            const other = state.dungeon.getRoom(c.otherEnd(here.id));
            if (SpellRules.roomHasEvil(other)) {
                let way = c.description.toLowerCase();
                if (c.secret && !c.discovered) {
                    way = 'behind a blank stretch of wall';
                }
                parts.push('Evil waits beyond ' + way);
            }
        }
        if (parts.length === 0) {
            return 'You sense no evil close at hand.';
        }
        return parts.join(' ');
    }

    /**
     * True if a room holds standing evil monsters.
     * @param {FD.Model.Room} room  The room.
     * @returns {boolean}
     */
    static roomHasEvil(room) {
        if (!FD.Rules.DoorRules.roomIsOccupied(room)) {
            return false;
        }
        const enc = room.encounter;
        for (const g of enc.monsters) {
            if (FD.Data.Monsters[g.monster].tags.indexOf('evil') >= 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Locate Object (TABLE 8): points toward treasure in an adjacent room.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string}  GM text.
     */
    static locateTreasure(state) {
        for (const c of state.dungeon.corridorsFrom(state.currentRoomId)) {
            const other = state.dungeon.getRoom(c.otherEnd(state.currentRoomId));
            if (other.treasure.length > 0) {
                let way = c.description.toLowerCase();
                if (c.secret && !c.discovered) {
                    way = 'the wall itself; something lies behind it';
                }
                return 'The spell tugs you toward ' + way;
            }
        }
        return 'Nothing you seek lies within range.';
    }
}

FD.Rules.SpellRules = SpellRules;
