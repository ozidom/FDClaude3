/**
 * The SHEET (RULE 4b): attributes and modifiers, AC, HP, saves, attack bonus,
 * Slots, spells, thief skills, XP and inventory. Read-only except for the
 * item buttons, which call back into the screen (which calls rules services).
 */
class CharacterSheetView {
    /**
     * Renders the sheet.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} [opts]             { itemActions: (item) => [{label, onClick, disabled, title}] }.
     * @returns {HTMLElement}
     */
    static render(state, opts) {
        const h = FD.UI.Dom.h;
        const kv = FD.UI.Dom.kv;
        const o = opts || {};
        const pc = state.character;
        const fmt = FD.Data.Attributes.formatMod;
        if (!pc) {
            return h('div', { class: 'panel' }, h('p', { class: 'muted', text: 'No adventurer.' }));
        }
        const next = FD.Rules.ExperienceRules.nextLevelXp(pc);
        const hpPct = Math.max(0, Math.round(100 * pc.hpCurrent / pc.hpMax));
        const enc = FD.Rules.EncumbranceRules.summary(pc);

        const attrs = h('div', { class: 'attr-mini' }, FD.Data.Attributes.ORDER.map(a => h('div', { title: FD.Data.Attributes.NAMES[a] + ': ' + FD.Data.Attributes.HELP[a] },
            h('div', { class: 'k', text: a }),
            h('div', { class: 'v', text: pc.attributes[a] }),
            h('div', { class: 'm', text: fmt(pc.modifier(a)) }))));

        const weapon = pc.weapon;
        const meleeBonus = pc.attackBonus + pc.modifier('STR') + weapon.magicBonus;
        const stats = h('div', { class: 'stat-row' },
            h('div', { class: 'stat', title: 'Armour Class (TABLE 1 step 6, TABLE 7)' }, h('div', { class: 'k', text: 'AC' }), h('div', { class: 'v', text: pc.armourClass })),
            h('div', { class: 'stat', title: 'Melee attack: Table 3 AB ' + fmt(pc.attackBonus) + ' + STR ' + fmt(pc.modifier('STR')) + (weapon.magicBonus ? ' + magic' : '') }, h('div', { class: 'k', text: 'Melee' }), h('div', { class: 'v', text: fmt(meleeBonus) })),
            h('div', { class: 'stat' + (enc.encumbered ? ' warn' : ''), title: 'Slots used / 10 + STR mod (rule 42)' }, h('div', { class: 'k', text: 'Slots' }), h('div', { class: 'v', text: enc.used + '/' + enc.max })));

        const saves = h('div', null, Object.keys(FD.Enums.SaveName).map(k => kv(FD.Enums.SaveName[k], pc.saves[k] + '+' + (pc.saveBonus ? ' (' + fmt(pc.saveBonus) + ')' : ''))));

        const conditions = [];
        if (pc.conditions.invisible) {
            conditions.push(h('span', { class: 'tag ok', text: 'Invisible' }));
        }
        if (pc.conditions.paralysedRounds > 0) {
            conditions.push(h('span', { class: 'tag warn', text: 'Paralysed ' + pc.conditions.paralysedRounds }));
        }
        if (enc.encumbered) {
            conditions.push(h('span', { class: 'tag warn', text: 'Encumbered', title: 'Corridors x2 turns, 1 zone per round, cannot outrun (rule 42)' }));
        }
        if (state.delve.active && state.clock.isFatigued) {
            conditions.push(h('span', { class: 'tag warn', text: 'Tired -' + state.config.noRestPenalty, title: 'Rule 44 GM ruling: rest to remove' }));
        }
        for (const e of pc.effects) {
            let extra = '';
            if (e.id === 'mirrorImage') {
                extra = ' ' + e.data.images + ' img';
            }
            conditions.push(h('span', { class: 'tag ok', text: e.name + extra + ' (' + e.turns + 't)' }));
        }

        let spells = null;
        if (pc.prepared.length > 0) {
            spells = h('div', null, h('h3', { text: 'Prepared spells' }), pc.prepared.map(p => h('span', { class: 'spell-chip' + (p.used ? ' used' : ''), title: FD.Data.Spells[p.spellId].desc, text: FD.Data.Spells[p.spellId].name })));
        }
        let book = null;
        if (pc.classId === 'wizard') {
            book = h('details', { class: 'sheet-section' }, h('summary', { text: 'Spellbook' + (pc.hasSpellbook ? '' : ' (LOST)') }),
                pc.spellbook.map(id => h('span', { class: 'spell-chip', title: FD.Data.Spells[id].desc, text: FD.Data.Spells[id].name })));
        }
        let skills = null;
        if (pc.thiefSkills) {
            const ts = pc.thiefSkills;
            skills = h('details', { class: 'sheet-section' }, h('summary', { text: 'Thief skills (TABLE 9)' }),
                Object.keys(FD.Data.ThiefSkills).map(k => kv(FD.Data.ThiefSkills[k].name, ts[k] + '%')),
                kv('Hear Noise', '1-2 on d6'), kv('Backstab', '+4 / x2'));
        }

        const inv = h('ul', { class: 'inv-list' }, pc.inventory.items.map(item => {
            const equipped = FD.Rules.EquipmentRules.isEquipped(pc, item.uid);
            const slots = FD.Model.Inventory.slotsFor(item, pc.equipped);
            let name = item.name;
            if (item.bundle > 0 && item.qty > 1) {
                name += ' x' + item.qty;
            }
            if (item.kind === FD.Enums.ItemKind.TREASURE && item.value) {
                name += ' (' + item.value + ' gp)';
            }
            const buttons = o.itemActions ? o.itemActions(item) : [];
            return h('li', null,
                h('span', { class: 'nm', text: name }),
                equipped ? h('span', { class: 'eq', text: 'worn' }) : null,
                h('span', { class: 'sl', text: slots ? slots + 's' : '' }),
                buttons.map(b => h('button', { class: 'small', disabled: !!b.disabled, title: b.title || null, on: { click: b.onClick } }, b.label)));
        }));

        return h('div', { class: 'panel sheet' },
            h('h2', { class: 'sheet-name', text: pc.name }),
            h('div', { class: 'sheet-sub', text: pc.race.name + ' ' + pc.cls.name + ' ' + pc.level + ' · age ' + pc.age }),
            h('div', { class: 'hp-bar', title: 'Hit Points (rule 14)' }, h('div', { class: 'fill', style: 'width:' + hpPct + '%' }), h('div', { class: 'txt', text: 'HP ' + pc.hpCurrent + ' / ' + pc.hpMax })),
            stats,
            attrs,
            conditions.length ? h('div', { style: 'margin-bottom:.4rem' }, conditions) : null,
            kv('Weapon', weapon.def.name + ' ' + weapon.def.damage + (weapon.magicBonus ? ' +' + weapon.magicBonus : '')),
            kv('Missile', fmt(pc.attackBonus + pc.modifier('DEX') + pc.race.missileBonus), 'Table 3 AB + DEX' + (pc.race.missileBonus ? ' + Halfling +1' : '') + ' (rule 60)'),
            kv('XP', pc.xp + (next !== null ? ' / ' + next : ' (max level)')),
            kv('Gold', pc.gold + ' gp'),
            spells,
            h('details', { class: 'sheet-section' }, h('summary', { text: 'Saving throws (TABLE 4)' }), saves),
            skills,
            book,
            h('details', { class: 'sheet-section', open: o.inventoryOpen === false ? null : '' }, h('summary', { text: 'Inventory (' + pc.inventory.items.length + ')' }),
                pc.inventory.items.length ? inv : h('p', { class: 'muted small', text: 'Nothing carried.' }),
                o.footer || null),
            pc.background ? h('details', { class: 'sheet-section' }, h('summary', { text: 'Background' }), h('p', { class: 'small', text: pc.background })) : null
        );
    }
}

FD.UI.Components.CharacterSheetView = CharacterSheetView;
