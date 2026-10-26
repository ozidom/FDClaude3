/**
 * Combat on the Clash Board (SPEC §8). The player plans a move (click a zone),
 * picks an action (buttons or keys 1-9), optionally a target (click a token),
 * then fights the round (Enter). Illegal choices are disabled with a reason.
 */
class CombatScreen {
    /**
     * @param {FD.Game} game  Game controller.
     */
    constructor(game) {
        this.game = game;
        this.selectedKey = null;
        this.targetUid = null;
        this.plannedZone = 0;
        this.dropTreasure = false;
        this.lastRound = -1;
    }

    /**
     * Resets the declaration when a fight starts.
     * @returns {void}
     */
    enter() {
        this.selectedKey = null;
        this.targetUid = null;
        this.dropTreasure = false;
        this.lastRound = -1;
    }

    /**
     * Unique key for an action descriptor.
     * @param {Object} a  Descriptor.
     * @returns {string}
     */
    static keyOf(a) {
        return a.type + '|' + (a.itemUid || '') + '|' + (a.spellId || '') + '|' + (a.source || '');
    }

    /**
     * @param {HTMLElement} root  Container.
     * @returns {void}
     */
    render(root) {
        const h = FD.UI.Dom.h;
        const state = this.game.state;
        const c = state.combat;
        const A = FD.Enums.CombatAction;
        const E = FD.Rules.CombatEngine;
        if (c.round !== this.lastRound) {
            this.lastRound = c.round;
            this.plannedZone = c.pcZone;
            const t = c.getMonster(this.targetUid);
            if (!t || !t.isStanding) {
                this.targetUid = null;
            }
        }
        const legalMoves = E.legalMoves(state);
        if (!legalMoves[this.plannedZone].ok) {
            this.plannedZone = c.pcZone;
        }
        const actions = E.legalActions(state, this.plannedZone);
        let selected = actions.find(a => CombatScreen.keyOf(a) === this.selectedKey && a.enabled);
        if (!selected) {
            selected = actions.find(a => a.type === A.ATTACK && a.enabled) || actions.find(a => a.type === A.HOLD);
            this.selectedKey = CombatScreen.keyOf(selected);
        }
        if (selected.type === A.CAST) {
            // RULE 53e: a caster may not move in a round they cast
            this.plannedZone = c.pcZone;
        }
        const groupOf = (a) => {
            if (a.type === A.ATTACK || a.type === A.MISSILE) {
                return 'Fight';
            }
            if (a.type === A.CAST || a.type === A.TURN || a.type === A.ITEM) {
                return 'Magic & items';
            }
            if (a.type === A.WITHDRAW || a.type === A.RETREAT || a.type === A.LEAVE) {
                return 'Get away';
            }
            return 'Other';
        };
        const shown = actions.map(a => Object.assign({}, a, { group: groupOf(a), selected: CombatScreen.keyOf(a) === this.selectedKey }));
        const bar = FD.UI.Components.ActionBar.render(shown, (a) => {
            this.selectedKey = CombatScreen.keyOf(a);
            this.game.sync();
        });
        FD.UI.Components.ActionBar.extraKeys.Enter = () => this.commit();

        const board = FD.UI.Components.ClashBoardView.render(state, {
            plannedZone: this.plannedZone,
            targetUid: this.targetUid,
            legalMoves: legalMoves,
            onZone: (z) => {
                if (!legalMoves[z].ok) {
                    return;
                }
                this.plannedZone = z;
                if (selected.type === A.CAST && z !== c.pcZone) {
                    this.selectedKey = null;
                }
                this.game.sync();
            },
            onToken: (uid) => {
                this.targetUid = uid;
                this.game.sync();
            }
        });

        const target = c.getMonster(this.targetUid);
        let moveText = 'stay in the ' + FD.Enums.ZoneName[c.pcZone];
        if (this.plannedZone !== c.pcZone) {
            moveText = 'move to the ' + FD.Enums.ZoneName[this.plannedZone];
        }
        if (selected.type === A.WITHDRAW || selected.type === A.RETREAT || selected.type === A.LEAVE) {
            moveText = 'fall back';
        }
        const summary = h('div', { class: 'declare-summary' },
            'You will ', h('b', { text: moveText }), ', then ', h('b', { text: selected.label }),
            target && (selected.type === A.ATTACK || selected.type === A.MISSILE || selected.type === A.CAST) ? [' → ', h('b', { text: target.name })] : (selected.type === A.ATTACK ? ' (nearest enemy in reach)' : ''),
            '.');

        let initiative = '';
        if (c.order === 'pc') {
            initiative = 'Last round: you won initiative.';
        } else if (c.order === 'monsters') {
            initiative = 'Last round: they won initiative.';
        } else if (c.order === 'tie') {
            initiative = 'Last round: initiative tied.';
        }

        const main = h('div', { class: 'col-main' },
            h('div', { class: 'panel' },
                h('div', { class: 'combat-head' },
                    h('h2', { text: 'Clash!', style: 'margin:0' }),
                    h('span', { class: 'round', text: 'Round ' + c.round }),
                    c.round === 1 && c.distance === 'distant' ? h('span', { class: 'tag warn', text: 'Distant: Centre closed this round' }) : null,
                    c.roomSize === 1 ? h('span', { class: 'tag warn', text: 'Small room: no missiles' }) : null,
                    c.dark ? h('span', { class: 'tag warn', text: 'Darkness -4' }) : null,
                    h('span', { class: 'muted small', text: initiative })),
                board,
                summary,
                h('div', { class: 'row' },
                    state.character.inventory.treasureItems().length > 0 ? h('label', { style: 'display:flex;gap:.4rem;align-items:center;margin:0' },
                        h('input', { type: 'checkbox', checked: this.dropTreasure, on: { change: (e) => { this.dropTreasure = e.target.checked; } } }),
                        'Drop treasure if I flee (rule 65)') : null,
                    h('div', { class: 'spacer' }),
                    h('button', { class: 'primary', on: { click: () => this.commit() } }, 'Fight round ' + c.round + ' (Enter)')),
                h('p', { class: 'small muted', text: 'Round order (rule 56): declare → initiative → morale → movement → missiles → spells → melee → surrender/withdraw/pursuit. Click a zone to plan a move, a monster to target it.' })),
            h('div', { class: 'panel' }, h('h2', { text: 'Your action' }), bar));

        root.appendChild(h('div', { class: 'play-grid' },
            h('div', { class: 'col-sheet' }, FD.UI.Components.CharacterSheetView.render(state, { inventoryOpen: false })),
            main,
            h('div', { class: 'col-side' }, FD.UI.Components.ClockView.render(state), FD.UI.Components.MapView.render(state))));
    }

    /**
     * Builds the declaration and runs the round.
     * @returns {void}
     */
    commit() {
        const state = this.game.state;
        const c = state.combat;
        if (!c) {
            return;
        }
        const actions = FD.Rules.CombatEngine.legalActions(state, this.plannedZone);
        const selected = actions.find(a => CombatScreen.keyOf(a) === this.selectedKey && a.enabled) || actions.find(a => a.type === FD.Enums.CombatAction.HOLD);
        let targetZone = null;
        const target = c.getMonster(this.targetUid);
        if (selected.targeting === 'zone') {
            if (target && target.isStanding) {
                targetZone = target.zone;
            } else {
                // Pick the zone with the most standing enemies
                let best = FD.Enums.Zone.ENEMY;
                let bestCount = -1;
                for (let z = 0; z <= 2; z++) {
                    const n = FD.Rules.CombatEngine.monstersInZone(c, z).length;
                    if (n > bestCount) {
                        best = z;
                        bestCount = n;
                    }
                }
                targetZone = best;
            }
        }
        const decl = {
            zone: this.plannedZone,
            action: {
                type: selected.type,
                itemUid: selected.itemUid || null,
                spellId: selected.spellId || null,
                source: selected.source || null,
                targetUid: this.targetUid,
                targetZone: targetZone
            },
            dropTreasure: this.dropTreasure
        };
        this.game.act((s) => FD.Rules.CombatEngine.runRound(s, decl));
    }
}

FD.UI.Screens.CombatScreen = CombatScreen;
