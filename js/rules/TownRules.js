/**
 * Town between delves (RULE 1b, RULE 66, RULE 66a, RULE 72 Downtime): healing, buying and selling,
 * copying spells, rewriting a spellbook, rumours, and starting the next delve.
 */
class TownRules {
    /**
     * Arrives in town at the end of a delve.
     * RULE 67: XP is awarded after the party escapes. RULE 71: levelling happens now.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {Object}  The delve summary.
     */
    static enterTown(state) {
        const pc = state.character;
        const summary = FD.Rules.ExperienceRules.awardDelve(state);
        state.town.lastSummary = summary;
        state.town.pendingSpellChoice = summary.needsSpellChoice;
        state.delve.active = false;
        state.combat = null;
        state.encounter = null;
        state.currentRoomId = null;
        pc.effects = [];
        pc.conditions.invisible = false;
        pc.conditions.paralysedRounds = 0;
        state.clock.resetForDelve();
        state.screen = FD.Enums.Screen.TOWN;
        return summary;
    }

    /**
     * Rests one day.
     * RULE 66: each full day of rest restores 1d3 HP; a night's rest in town
     * recovers all spell slots.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static restDay(state) {
        const pc = state.character;
        state.town.day += 1;
        const r = FD.Core.dice.rollExpr('1d3', false);
        const healed = pc.heal(r.total);
        FD.Rules.SpellRules.recoverSpells(pc);
        FD.Core.log.roll('R66', 'Rest a day', r.text, 'healed ' + healed + ' HP; spells recovered');
    }

    /**
     * Rests a full week.
     * RULE 66: a full week of rest restores all HP.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static restWeek(state) {
        const pc = state.character;
        state.town.day += 7;
        pc.hpCurrent = pc.hpMax;
        FD.Rules.SpellRules.recoverSpells(pc);
        FD.Core.log.add('[R66 Healing] A week of rest restores you to full health (' + pc.hpMax + ' HP).', 'rule');
    }

    /**
     * List price of a shop item (TABLES 5-7).
     * @param {string} kind   FD.Enums.ItemKind value.
     * @param {string} defId  Data id.
     * @returns {number}      Price in gp.
     */
    static price(kind, defId) {
        const K = FD.Enums.ItemKind;
        if (kind === K.GEAR) {
            return FD.Data.Equipment[defId].cost;
        }
        if (kind === K.WEAPON) {
            return FD.Data.Weapons[defId].cost;
        }
        if (kind === K.ARMOUR) {
            return FD.Data.Armour[defId].cost;
        }
        if (kind === K.SHIELD) {
            return FD.Data.Shield.cost;
        }
        return 0;
    }

    /**
     * Can the adventurer buy this? Class restrictions are shown as warnings but do
     * not block buying (the item may be sold on); only gold blocks.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} kind               Item kind.
     * @param {string} defId              Data id.
     * @returns {{ok:boolean, reason:string, warning:string}}
     */
    static canBuy(state, kind, defId) {
        const pc = state.character;
        const cost = TownRules.price(kind, defId);
        let warning = '';
        const K = FD.Enums.ItemKind;
        if (kind === K.WEAPON) {
            warning = FD.Rules.EquipmentRules.canUseWeapon(pc, defId).reason;
        } else if (kind === K.ARMOUR) {
            warning = FD.Rules.EquipmentRules.canWearArmour(pc, defId).reason;
        } else if (kind === K.SHIELD) {
            warning = FD.Rules.EquipmentRules.canUseShield(pc).reason;
        }
        if (cost > pc.gold) {
            return { ok: false, reason: 'Not enough gold', warning: warning };
        }
        return { ok: true, reason: '', warning: warning };
    }

    /**
     * Buys an item at list price.
     * RULE 1b / 66: buy anything on Tables 5-7 at the listed price.
     * Usable weapons and armour are equipped automatically if the slot is empty.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} kind               Item kind.
     * @param {string} defId              Data id.
     * @returns {Object|null}  The item bought.
     */
    static buy(state, kind, defId) {
        const pc = state.character;
        const check = TownRules.canBuy(state, kind, defId);
        if (!check.ok) {
            return null;
        }
        pc.gold -= TownRules.price(kind, defId);
        const item = pc.inventory.add(FD.Model.Inventory.createItem(kind, defId));
        const can = FD.Rules.EquipmentRules.canEquip(pc, item);
        if (can.ok && can.slot && !pc.equipped[can.slot]) {
            FD.Rules.EquipmentRules.equip(pc, item.uid);
        }
        return item;
    }

    /**
     * What the shop pays for an item.
     * RULE 66: treasure sells at its value; equipment at half price.
     * GM RULING: before the first delve, unused purchases are returned at full price.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} item               Inventory item.
     * @returns {number}  gp.
     */
    static sellValue(state, item) {
        const K = FD.Enums.ItemKind;
        if (item.kind === K.SPELLBOOK || item.kind === K.KEY) {
            return 0;
        }
        if (item.kind === K.TREASURE || item.kind === K.MAGIC || item.magicBonus) {
            return item.value || 0;
        }
        let cost = item.cost || 0;
        if (item.bundle > 0) {
            // Partly used bundles sell pro rata
            cost = Math.floor(cost * item.qty / item.bundle);
        }
        if (!state.hasDelved) {
            return cost;
        }
        return Math.floor(cost / 2);
    }

    /**
     * Sells an item.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} uid                Item uid.
     * @returns {number}  gp received.
     */
    static sell(state, uid) {
        const pc = state.character;
        const item = pc.inventory.get(uid);
        if (!item) {
            return 0;
        }
        const value = TownRules.sellValue(state, item);
        FD.Rules.EquipmentRules.unequip(pc, uid);
        pc.inventory.remove(uid);
        pc.gold += value;
        return value;
    }

    /**
     * Spells a Wizard could copy into their book in town: from wizard scrolls and
     * captured spellbooks, of a level they can cast.
     * RULE 53b / 66 (Copying Spells).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{spellId:string, level:number, source:Object}[]}
     */
    static copyableSpells(state) {
        const pc = state.character;
        if (pc.classId !== 'wizard' || !pc.hasSpellbook) {
            return [];
        }
        const maxLevel = Object.keys(pc.maxSpellSlots).length;
        const out = [];
        for (const item of pc.inventory.items) {
            let spells = [];
            if (item.defId === 'scroll' && item.spellId) {
                spells = [item.spellId];
            } else if (item.kind === FD.Enums.ItemKind.SPELLBOOK && Array.isArray(item.spells)) {
                spells = item.spells;
            }
            for (const id of spells) {
                const level = FD.Data.spellLevelFor(id, 'wizard');
                if (level > 0 && level <= maxLevel && pc.spellbook.indexOf(id) < 0) {
                    out.push({ spellId: id, level: level, source: item });
                }
            }
        }
        return out;
    }

    /**
     * Copies a spell into the Wizard's book.
     * RULE 66: one week and 100 gp of inks per spell level; a scroll copied is used up.
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} spellId            Spell id.
     * @param {string} sourceUid          Scroll or spellbook uid.
     * @returns {{ok:boolean, text:string}}
     */
    static copySpell(state, spellId, sourceUid) {
        const pc = state.character;
        const level = FD.Data.spellLevelFor(spellId, 'wizard');
        const cost = 100 * level;
        if (pc.gold < cost) {
            return { ok: false, text: 'Copying costs ' + cost + ' gp of inks.' };
        }
        pc.gold -= cost;
        state.town.day += 7;
        pc.spellbook.push(spellId);
        const source = pc.inventory.get(sourceUid);
        if (source && source.defId === 'scroll') {
            pc.inventory.remove(sourceUid);
        }
        const text = '[R66 Copying Spells] A week of careful work and ' + cost + ' gp: ' + FD.Data.Spells[spellId].name + ' is in your book.';
        FD.Core.log.add(text, 'rule');
        return { ok: true, text: text };
    }

    /**
     * Cost of rewriting a lost spellbook.
     * RULE 66: one week and 100 gp per spell level, for each spell.
     * @param {FD.Model.Character} pc  The Wizard.
     * @returns {{gold:number, days:number}}
     */
    static rewriteCost(pc) {
        let gold = 0;
        for (const id of pc.spellbook) {
            gold += 100 * FD.Data.spellLevelFor(id, 'wizard');
        }
        return { gold: gold, days: 7 * pc.spellbook.length };
    }

    /**
     * Rewrites a lost spellbook from memory.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{ok:boolean, text:string}}
     */
    static rewriteSpellbook(state) {
        const pc = state.character;
        const cost = TownRules.rewriteCost(pc);
        if (pc.gold < cost.gold) {
            return { ok: false, text: 'You need ' + cost.gold + ' gp.' };
        }
        pc.gold -= cost.gold;
        state.town.day += cost.days;
        pc.inventory.add(FD.Model.Inventory.createItem(FD.Enums.ItemKind.SPELLBOOK, 'spellbook'));
        const text = '[R66 Replacing a Spellbook] ' + cost.days + ' days and ' + cost.gold + ' gp later, your book is whole again.';
        FD.Core.log.add(text, 'rule');
        return { ok: true, text: text };
    }

    /**
     * Spends a day asking for rumours.
     * RULE 66 (Rumours): the GM rolls 1d6 in secret; 1-4 true, 5-6 false or twisted.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string|null}  The rumour heard, or null if none are left.
     */
    static askRumour(state) {
        const rumours = state.dungeon.rumours;
        const known = state.town.rumoursKnown.map(r => r.index);
        const unknown = [];
        for (let i = 0; i < rumours.length; i++) {
            if (known.indexOf(i) < 0) {
                unknown.push(i);
            }
        }
        state.town.day += 1;
        if (unknown.length === 0) {
            FD.Core.log.add('You spend a day in the tavern but hear nothing new.', 'info');
            return null;
        }
        const index = unknown[FD.Core.dice.roll(unknown.length) - 1];
        const truthRoll = FD.Core.dice.d6();
        const isTrue = truthRoll <= 4;
        const text = isTrue ? rumours[index].trueText : rumours[index].falseText;
        state.town.rumoursKnown.push({ index: index, text: text, isTrue: isTrue });
        FD.Core.log.add('[R66 Rumours] The GM rolls 1d6 in secret. Only the dungeon will tell.', 'roll');
        FD.Core.log.narrate('Rumour: "' + text + '"');
        return text;
    }

    /**
     * RULE 1a / RULE CONFLICT 5: rule 1a offers one rumour at the start; rule 66 says none.
     * Gives the starting rumour only if config.startingRumour is on.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static startingRumour(state) {
        if (!state.config.startingRumour || state.town.startingRumourGiven) {
            return;
        }
        state.town.startingRumourGiven = true;
        const day = state.town.day;
        TownRules.askRumour(state);
        state.town.day = day;
    }

    /**
     * Adds the spell a Wizard chose on levelling (rule 71 step 3).
     * @param {FD.Model.GameState} state  Game state.
     * @param {string} spellId            Spell id.
     * @returns {void}
     */
    static chooseLevelSpell(state, spellId) {
        const pc = state.character;
        if (pc.spellbook.indexOf(spellId) < 0) {
            pc.spellbook.push(spellId);
        }
        state.town.pendingSpellChoice = false;
        FD.Core.log.add('You add ' + FD.Data.Spells[spellId].name + ' to your spellbook (rule 71).', 'good');
    }

    /**
     * True if the character should prepare spells before entering.
     * @param {FD.Model.Character} pc  The adventurer.
     * @returns {boolean}
     */
    static needsSpellPrep(pc) {
        return pc.canCastSpells;
    }
}

FD.Rules.TownRules = TownRules;
