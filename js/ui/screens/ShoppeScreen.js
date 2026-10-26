/**
 * The Shoppe (rule 1b, rule 66): buy from Tables 5-7, equip, and sell. Shows a
 * live Slot counter and warnings for forgotten essentials.
 */
class ShoppeScreen {
    /**
     * @param {FD.Game} game  Game controller.
     */
    constructor(game) {
        this.game = game;
        this.tab = 'gear';
    }

    /**
     * Gives the optional starting rumour once (rule 1a) when entering.
     * @returns {void}
     */
    enter() {
        const state = this.game.state;
        if (!state.hasDelved) {
            FD.Rules.TownRules.startingRumour(state);
        }
    }

    /**
     * @param {HTMLElement} root  Container.
     * @returns {void}
     */
    render(root) {
        const h = FD.UI.Dom.h;
        const state = this.game.state;
        const pc = state.character;
        const tabs = [['gear', 'Equipment (T5)'], ['weapons', 'Weapons (T6)'], ['armour', 'Armour (T7)']];
        let intro = null;
        if (!state.hasDelved) {
            intro = h('div', { class: 'panel' },
                h('h2', { text: state.dungeon.name }),
                h('p', { class: 'room-desc', text: state.dungeon.intro }),
                state.town.rumoursKnown.length ? h('p', { class: 'small' }, 'A rumour you heard: "' + state.town.rumoursKnown[0].text + '"') : null,
                h('p', { class: 'small muted', text: 'The Shoppe (rule 1b): spend your gold. Anything not bought now must be found inside, so remember light, rope and a way to carry treasure home. Unused purchases can be returned at full price until you first enter the dungeon.' }));
        }
        const leftPanel = h('div', { class: 'panel' },
            h('div', { class: 'shop-tabs' }, tabs.map(t => h('button', { class: this.tab === t[0] ? 'selected' : '', on: { click: () => { this.tab = t[0]; this.game.sync(); } } }, t[1]))),
            this.renderTable(state));

        const warnings = this.warnings(state);
        const enc = FD.Rules.EncumbranceRules.summary(pc);
        const rightPanel = h('div', null,
            h('div', { class: 'panel' },
                h('div', { class: 'row' }, h('h2', { text: pc.gold + ' gp', style: 'margin:0' }), h('div', { class: 'spacer' }),
                    h('span', { class: 'tag' + (enc.encumbered ? ' warn' : ''), text: 'Slots ' + enc.used + '/' + enc.max + (enc.encumbered ? ' ENCUMBERED' : '') }),
                    h('span', { class: 'tag', text: 'AC ' + pc.armourClass })),
                warnings.length ? h('ul', { class: 'warning-list' }, warnings.map(w => h('li', { text: w }))) : h('p', { class: 'small good', text: 'You look ready.' }),
                h('div', { class: 'row', style: 'margin-top:.6rem' },
                    h('div', { class: 'spacer' }),
                    h('button', { class: 'primary', on: { click: () => this.done() } }, state.hasDelved ? 'Back to town' : 'Done shopping'))),
            FD.UI.Components.CharacterSheetView.render(state, { itemActions: (item) => this.itemActions(state, item) }));

        root.appendChild(h('div', { class: 'wizard' },
            h('h2', { text: 'The Shoppe' }),
            intro,
            h('div', { class: 'two-col' }, leftPanel, rightPanel)));
    }

    /**
     * The item table for the current tab.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {HTMLElement}
     */
    renderTable(state) {
        const h = FD.UI.Dom.h;
        const K = FD.Enums.ItemKind;
        const rows = [];
        const buyButton = (kind, defId) => {
            const check = FD.Rules.TownRules.canBuy(state, kind, defId);
            return h('button', { class: 'small', disabled: !check.ok, title: check.reason || null, on: { click: () => this.game.act((s) => FD.Rules.TownRules.buy(s, kind, defId)) } }, 'Buy');
        };
        const warnTag = (kind, defId) => {
            const check = FD.Rules.TownRules.canBuy(state, kind, defId);
            return check.warning ? h('span', { class: 'tag warn', title: check.warning, text: 'not for ' + state.character.cls.name + 's' }) : null;
        };
        if (this.tab === 'gear') {
            for (const id of FD.Data.EQUIPMENT_ORDER) {
                const e = FD.Data.Equipment[id];
                let name = e.name;
                if (e.bundle > 1) {
                    name += ' (' + e.bundle + ')';
                }
                rows.push(h('tr', null, h('td', null, name, h('span', { class: 'desc', text: e.desc })), h('td', { class: 'num', text: e.cost + ' gp' }), h('td', { class: 'num', text: e.slots + 's' }), h('td', null, buyButton(K.GEAR, id))));
            }
            return h('table', { class: 'shop-table' }, h('tr', null, h('th', { text: 'Item' }), h('th', { text: 'Cost' }), h('th', { text: 'Slots' }), h('th', { text: '' })), rows);
        }
        if (this.tab === 'weapons') {
            for (const id of FD.Data.WEAPON_ORDER) {
                const w = FD.Data.Weapons[id];
                const notes = [];
                if (w.reach) {
                    notes.push('reach');
                }
                if (w.missile) {
                    notes.push('missile, ' + FD.Rules.CombatEngine.maxZoneDistance(w.range) + ' zone(s)');
                }
                if (w.thrownRange) {
                    notes.push('thrown 1 zone');
                }
                if (w.twoHanded) {
                    notes.push('two-handed');
                }
                if (w.reload) {
                    notes.push('reload');
                }
                rows.push(h('tr', null, h('td', null, w.name, warnTag(K.WEAPON, id), h('span', { class: 'desc', text: notes.join(', ') })), h('td', { class: 'num', text: w.damage }), h('td', { class: 'num', text: w.cost + ' gp' }), h('td', { class: 'num', text: w.slots + 's' }), h('td', null, buyButton(K.WEAPON, id))));
            }
            return h('table', { class: 'shop-table' }, h('tr', null, h('th', { text: 'Weapon' }), h('th', { text: 'Dmg' }), h('th', { text: 'Cost' }), h('th', { text: 'Slots' }), h('th', { text: '' })), rows);
        }
        for (const id of FD.Data.ARMOUR_ORDER) {
            const a = FD.Data.Armour[id];
            rows.push(h('tr', null, h('td', null, a.name, warnTag(K.ARMOUR, id), h('span', { class: 'desc', text: 'AC ' + a.ac + ' + DEX; worn armour costs no Slots' })), h('td', { class: 'num', text: a.cost + ' gp' }), h('td', null, buyButton(K.ARMOUR, id))));
        }
        rows.push(h('tr', null, h('td', null, 'Shield', warnTag(K.SHIELD, 'shield'), h('span', { class: 'desc', text: '+1 AC; not with a two-handed weapon' })), h('td', { class: 'num', text: FD.Data.Shield.cost + ' gp' }), h('td', null, buyButton(K.SHIELD, 'shield'))));
        return h('table', { class: 'shop-table' }, h('tr', null, h('th', { text: 'Armour' }), h('th', { text: 'Cost' }), h('th', { text: '' })), rows);
    }

    /**
     * Buttons for an inventory row: equip/unequip and sell.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} item               Inventory item.
     * @returns {Object[]}
     */
    itemActions(state, item) {
        const pc = state.character;
        const R = FD.Rules;
        const out = [];
        const equipped = R.EquipmentRules.isEquipped(pc, item.uid);
        const can = R.EquipmentRules.canEquip(pc, item);
        if (equipped) {
            out.push({ label: 'Unequip', onClick: () => this.game.act(() => R.EquipmentRules.unequip(pc, item.uid)) });
        } else if (can.slot) {
            out.push({ label: 'Equip', disabled: !can.ok, title: can.reason, onClick: () => this.game.act(() => FD.Core.log.add(R.EquipmentRules.equip(pc, item.uid).text, 'info')) });
        }
        const value = R.TownRules.sellValue(state, item);
        if (item.kind !== FD.Enums.ItemKind.SPELLBOOK && item.kind !== FD.Enums.ItemKind.KEY) {
            const label = state.hasDelved ? 'Sell ' + value : 'Return ' + value;
            out.push({ label: label, title: state.hasDelved ? 'Treasure at value; equipment at half price (rule 66)' : 'Full refund before your first delve', onClick: () => this.game.act((s) => R.TownRules.sell(s, item.uid)) });
        }
        return out;
    }

    /**
     * Checklist of commonly forgotten essentials.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string[]}
     */
    warnings(state) {
        const pc = state.character;
        const inv = pc.inventory;
        const out = [];
        if (!inv.has('torch') && !inv.has('lantern') && !pc.prepared.some(p => p.spellId === 'light') && pc.spellbook.indexOf('light') < 0) {
            out.push('No light source! Darkness means a wandering check every turn (rule 41b).');
        }
        if ((inv.has('torch') || inv.has('lantern')) && !inv.has('tinderbox')) {
            out.push('No tinderbox to light your torches (TABLE 5).');
        }
        if (inv.has('lantern') && !inv.has('oil')) {
            out.push('A lantern needs oil flasks.');
        }
        if (pc.classId === 'cleric' && !inv.has('holySymbol')) {
            out.push('Clerics need a Holy Symbol to Turn Undead.');
        }
        if (pc.classId === 'thief' && !inv.has('thievesTools')) {
            out.push("Thieves need Thieves' Tools to pick locks.");
        }
        if (!pc.equipped.weapon) {
            out.push('No weapon equipped: you will fight with your fists (1d2).');
        }
        if (pc.isEncumbered) {
            out.push('Encumbered: corridors take double time and you cannot outrun pursuers (rule 42).');
        }
        return out;
    }

    /**
     * Leaves the Shoppe: back to town, or on to spell preparation / the dungeon.
     * @returns {void}
     */
    done() {
        this.game.act((state) => {
            if (state.hasDelved) {
                state.screen = FD.Enums.Screen.TOWN;
                return;
            }
            if (FD.Rules.TownRules.needsSpellPrep(state.character)) {
                state.screen = FD.Enums.Screen.SPELL_PREP;
            } else {
                FD.Rules.ExplorationRules.enterDungeon(state);
            }
        });
    }
}

FD.UI.Screens.ShoppeScreen = ShoppeScreen;
