/**
 * Exploration (SPEC §6): Sheet | Room + Actions | Map + Clock, with the log below.
 * Each button runs ExplorationRules.performAction(), which follows rule 30.
 */
class ExplorationScreen {
    /**
     * @param {FD.Game} game  Game controller.
     */
    constructor(game) {
        this.game = game;
    }

    /**
     * @param {HTMLElement} root  Container.
     * @returns {void}
     */
    render(root) {
        const h = FD.UI.Dom.h;
        const state = this.game.state;
        const room = state.room;
        const desc = FD.Rules.ExplorationRules.describeRoom(state);
        const actions = FD.Rules.ExplorationRules.availableActions(state);
        const bar = FD.UI.Components.ActionBar.render(actions, (a) => this.game.act((s) => FD.Rules.ExplorationRules.performAction(s, a)));

        const exits = state.dungeon.knownExits(room.id).map(c => {
            const label = FD.Rules.ExplorationRules.exitLabel(state, c);
            const tags = [];
            if (c.door) {
                tags.push(h('span', { class: 'tag' + (c.door.state === 'open' || c.door.state === 'closed' ? '' : ' warn'), text: 'door: ' + c.door.label }));
            }
            if (c.trap && !c.trap.hidden && !c.trap.disarmed) {
                tags.push(h('span', { class: 'tag warn', text: c.trap.name }));
            }
            if (c.obstacle) {
                tags.push(h('span', { class: 'tag warn', text: c.obstacle.name + (c.ropeFixed ? ' (rope fixed)' : '') }));
            }
            if (c.turns > 1) {
                tags.push(h('span', { class: 'tag', text: c.turns + ' turns' }));
            }
            return h('li', null, c.description + ' → ', h('b', { text: label }), tags);
        });

        const visible = desc.dark ? [] : room.visibleTreasure();
        const features = desc.dark ? [] : room.features.filter(f => !f.hidden);
        let monsters = null;
        if (room.encounter && room.encounter.state === FD.Enums.EncounterState.PEACEFUL && FD.Rules.DoorRules.roomIsOccupied(room)) {
            const live = room.encounter.live.filter(m => m.state === 'standing');
            monsters = h('p', { class: 'small' }, h('b', { text: 'Here: ' }), live.map(m => m.name).join(', '), ' (', FD.Data.reactionById(room.encounter.lastReaction || 'uncertain').name.toLowerCase(), ')');
        }

        const main = h('div', { class: 'col-main' },
            h('div', { class: 'panel' },
                h('div', { class: 'room-size', text: desc.dark ? 'Unknown' : room.sizeName + ' room' + (room.searched ? ' · searched' : '') }),
                h('h2', { class: 'room-title', text: desc.title }),
                h('p', { class: 'room-desc', text: desc.text }),
                monsters,
                features.length ? h('p', { class: 'small' }, h('b', { text: 'Found: ' }), features.map(f => f.name).join(', ')) : null,
                visible.length ? h('p', { class: 'small' }, h('b', { text: 'You see: ' }), visible.map(t => t.item ? t.item.name : t.name).join(', ')) : null,
                h('h3', { text: 'Exits' }),
                exits.length ? h('ul', { class: 'exit-list' }, exits) : h('p', { class: 'muted small', text: 'No exits you know of.' })),
            h('div', { class: 'panel' }, h('h2', { text: 'What do you do?' }), bar));

        const sheet = FD.UI.Components.CharacterSheetView.render(state, {
            itemActions: (item) => this.itemActions(state, item),
            footer: state.character.gold >= 100 ? h('button', { class: 'small', style: 'margin-top:.4rem', title: 'Coins weigh 1 Slot per 100 (rule 42)', on: { click: () => this.game.act((s) => FD.Rules.ExplorationRules.dropGold(s)) } }, 'Drop 100 gp') : null
        });

        root.appendChild(h('div', { class: 'play-grid' },
            h('div', { class: 'col-sheet' }, sheet),
            main,
            h('div', { class: 'col-side' }, FD.UI.Components.MapView.render(state), FD.UI.Components.ClockView.render(state))));
    }

    /**
     * Inventory buttons while exploring: drink, equip, drop.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} item               Inventory item.
     * @returns {Object[]}
     */
    itemActions(state, item) {
        const R = FD.Rules;
        const pc = state.character;
        const out = [];
        const def = FD.Data.MagicItems[item.defId];
        if (item.kind === FD.Enums.ItemKind.MAGIC && def && def.use && def.use !== 'speed') {
            out.push({ label: 'Drink', onClick: () => this.game.act((s) => R.ExplorationRules.useItem(s, item.uid)) });
        }
        const equipped = R.EquipmentRules.isEquipped(pc, item.uid);
        const can = R.EquipmentRules.canEquip(pc, item);
        if (!equipped && can.slot) {
            out.push({ label: 'Equip', disabled: !can.ok, title: can.reason, onClick: () => this.game.act(() => FD.Core.log.add(R.EquipmentRules.equip(pc, item.uid).text, 'info')) });
        }
        if (item.kind !== FD.Enums.ItemKind.ARMOUR || !equipped) {
            out.push({ label: 'Drop', title: 'Leave it here (rule 68: it stays in the dungeon)', onClick: () => this.game.act((s) => R.ExplorationRules.dropItem(s, item.uid)) });
        }
        return out;
    }
}

FD.UI.Screens.ExplorationScreen = ExplorationScreen;
