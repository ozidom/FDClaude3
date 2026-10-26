/**
 * The CLASH board (RULE 4d): three zones as columns with tokens for the PC and
 * monsters. Clicking a zone plans a move there; clicking a monster targets it.
 */
class ClashBoardView {
    /**
     * Renders the board.
     * @param {FD.Model.GameState} state  Game state.
     * @param {Object} ui                 { plannedZone, targetUid, legalMoves, onZone(zone), onToken(uid) }.
     * @returns {HTMLElement}
     */
    static render(state, ui) {
        const h = FD.UI.Dom.h;
        const c = state.combat;
        const pc = state.character;
        const zoneClasses = ['party', 'centre', 'enemy'];
        const board = h('div', { class: 'clash-board' });
        for (let z = 0; z <= 2; z++) {
            const legal = ui.legalMoves[z];
            const tokens = [];
            if (c.pcZone === z) {
                tokens.push(h('div', { class: 'token pc', title: 'You: AC ' + pc.armourClass + ', HP ' + pc.hpCurrent + '/' + pc.hpMax }, pc.name, h('span', { class: 'hpline', text: 'HP ' + pc.hpCurrent + '/' + pc.hpMax })));
            }
            if (ui.plannedZone === z && c.pcZone !== z) {
                tokens.push(h('div', { class: 'token pc ghost', text: 'move here' }));
            }
            for (const m of c.monsters) {
                if (m.zone !== z) {
                    continue;
                }
                const out = !m.isStanding;
                let status = '';
                if (m.state !== 'standing') {
                    status = m.state;
                } else if (m.fleeing) {
                    status = 'fleeing';
                } else if (m.webbedRounds > 0) {
                    status = 'webbed';
                } else if (m.attached) {
                    status = 'attached';
                } else if (!m.aware) {
                    status = 'unaware';
                }
                // GM view of wounds without exact HP: describe the state
                let wound = 'unhurt';
                if (m.hp < m.hpMax) {
                    wound = m.hp <= m.hpMax / 2 ? 'badly hurt' : 'wounded';
                }
                const label = m.name;
                const sub = (m.state === 'dead' ? 'dead' : wound) + (status && status !== 'dead' ? ' · ' + status : '');
                tokens.push(h('button', {
                    class: 'token monster' + (out ? ' out' : '') + (ui.targetUid === m.uid ? ' target' : ''),
                    disabled: out,
                    title: m.name + ' — AC ' + m.ac + ', HD ' + m.hd + ', Move ' + m.move + (m.missile ? ', ' + (m.weaponName || 'missile') : '') + (m.reach ? ', reach' : ''),
                    on: {
                        click: (e) => {
                            e.stopPropagation();
                            ui.onToken(m.uid);
                        }
                    }
                }, label, h('span', { class: 'hpline', text: sub })));
            }
            const zoneEl = h('div', {
                class: 'zone ' + zoneClasses[z] + (ui.plannedZone === z ? ' planned' : '') + (legal && !legal.ok ? ' illegal' : ''),
                title: legal && !legal.ok ? legal.reason : 'Plan to move here',
                on: { click: () => ui.onZone(z) }
            },
            h('div', { class: 'zone-name', text: FD.Enums.ZoneName[z] }),
            h('div', { class: 'zone-tokens' }, tokens),
            h('div', { class: 'spacer' }),
            h('button', { class: 'small', disabled: legal && !legal.ok, title: legal && !legal.ok ? legal.reason : 'Plan to move here', on: { click: (e) => { e.stopPropagation(); ui.onZone(z); } } }, c.pcZone === z ? 'Stay' : 'Move here'));
            board.appendChild(zoneEl);
        }
        return board;
    }
}

FD.UI.Components.ClashBoardView = ClashBoardView;
