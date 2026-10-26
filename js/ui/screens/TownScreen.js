/**
 * Town between delves (SPEC §10, rules 66-72): delve summary and XP, level-up,
 * healing, shopping, spell copying, rumours, and the way back down.
 */
class TownScreen {
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
        const pc = state.character;
        const T = FD.Rules.TownRules;
        const town = state.town;

        let summary = null;
        const s = town.lastSummary;
        if (s) {
            const rows = [
                ['Treasure carried out', s.treasureXp + ' XP'],
                ['Monsters defeated', s.monsterXp + ' XP' + (s.defeated.length ? ' (' + s.defeated.join(', ') + ')' : '')],
                ['Coins added to purse', s.coins + ' gp'],
                ['Total', s.gained + ' XP (' + s.before + ' → ' + s.after + ')']
            ];
            if (s.lost > 0) {
                rows.push(['Lost to the level cap', s.lost + ' XP (rule 71: one level per delve)']);
            }
            summary = h('div', { class: 'panel' },
                h('h2', { text: 'Back from the dungeon' }),
                h('table', { class: 'summary-table small' }, rows.map(r => h('tr', null, h('td', { class: 'muted', text: r[0] }), h('td', { text: r[1] })))),
                s.levelAfter > s.levelBefore ? h('p', { class: 'good', text: 'LEVEL UP! You are now level ' + s.levelAfter + ' (+' + s.hpGain + ' HP). Attack bonus, saves, spells and skills follow Tables 3, 4, 8 and 9 (rule 71).' }) : null,
                h('p', { class: 'small muted', text: 'Rule 67: XP comes from treasure brought out (1 XP per gp) and defeated monsters (10 XP per Hit Die, minimum 5).' }));
        }

        let spellChoice = null;
        if (town.pendingSpellChoice) {
            spellChoice = h('div', { class: 'panel' },
                h('h2', { text: 'Add a spell to your book (rule 71)' }),
                h('div', { class: 'card-grid' }, FD.Rules.ExperienceRules.levelSpellChoices(pc).map(id => h('button', { class: 'card', on: { click: () => this.game.act((st) => T.chooseLevelSpell(st, id)) } },
                    h('div', { class: 'card-title', text: FD.Data.Spells[id].name + ' (L' + FD.Data.spellLevelFor(id, 'wizard') + ')' }),
                    h('div', { class: 'card-body', text: FD.Data.Spells[id].desc })))));
        }

        const actions = [];
        actions.push({ id: 'enter', group: 'The dungeon', label: 'Return to ' + state.dungeon.name, enabled: !town.pendingSpellChoice, reason: 'Choose your new spell first', cost: '' });
        actions.push({ id: 'shop', group: 'Town', label: 'Visit the Shoppe (buy at list, sell treasure at value, gear at half)', enabled: true, cost: '' });
        actions.push({ id: 'restDay', group: 'Town', label: 'Rest a day (1d3 HP, recover spells)', enabled: true, cost: '1 day' });
        actions.push({ id: 'restWeek', group: 'Town', label: 'Rest a week (all HP)', enabled: pc.hpCurrent < pc.hpMax, reason: 'You are at full health', cost: '7 days' });
        const rumoursLeft = state.dungeon.rumours.length - town.rumoursKnown.length;
        actions.push({ id: 'rumour', group: 'Town', label: 'Ask around for rumours (' + rumoursLeft + ' unheard)', enabled: rumoursLeft > 0, reason: 'You have heard every rumour', cost: '1 day' });
        if (pc.classId === 'wizard') {
            for (const cpy of T.copyableSpells(state)) {
                const cost = 100 * cpy.level;
                actions.push({ id: 'copy', group: 'Spellcraft', label: 'Copy ' + FD.Data.Spells[cpy.spellId].name + ' into your book', enabled: pc.gold >= cost, reason: 'Needs ' + cost + ' gp', cost: '7 days, ' + cost + ' gp', spellId: cpy.spellId, sourceUid: cpy.source.uid });
            }
            if (!pc.hasSpellbook) {
                const rc = T.rewriteCost(pc);
                actions.push({ id: 'rewrite', group: 'Spellcraft', label: 'Rewrite your lost spellbook', enabled: pc.gold >= rc.gold, reason: 'Needs ' + rc.gold + ' gp', cost: rc.days + ' days, ' + rc.gold + ' gp' });
            }
        }
        actions.push({ id: 'title', group: 'Game', label: 'Save and return to the title screen', enabled: true, cost: '' });

        const bar = FD.UI.Components.ActionBar.render(actions, (a) => this.choose(a));

        const rumours = town.rumoursKnown.length ? h('ul', { class: 'plain-list' }, town.rumoursKnown.map(r => h('li', { text: '"' + r.text + '"' }))) : h('p', { class: 'muted small', text: 'No rumours yet. Some are true, some are not; only the dungeon will tell.' });
        const graves = state.graveyard.length ? h('div', { class: 'panel' }, h('h3', { text: 'The graveyard' }), h('ul', { class: 'plain-list' }, state.graveyard.map(g => h('li', { class: 'small', text: g.name + ', ' + g.race + ' ' + g.cls + ' ' + g.level + ': ' + g.cause + ' in the ' + g.room + '.' })))) : null;

        root.appendChild(h('div', { class: 'two-col' },
            h('div', null,
                summary,
                spellChoice,
                h('div', { class: 'panel' },
                    h('div', { class: 'row' }, h('h2', { text: 'Town · day ' + town.day, style: 'margin:0' }), h('div', { class: 'spacer' }), h('span', { class: 'tag ok', text: 'Saved' })),
                    h('p', { class: 'small muted', text: 'Between delves you may do as many things as you have days for (rule 72). Anything you left in the dungeon is still there (rule 68).' }),
                    bar),
                h('div', { class: 'panel' }, h('h3', { text: 'Rumours (rule 66)' }), rumours),
                graves),
            FD.UI.Components.CharacterSheetView.render(state)));
    }

    /**
     * Runs a town action.
     * @param {Object} a  Action descriptor.
     * @returns {void}
     */
    choose(a) {
        const T = FD.Rules.TownRules;
        if (a.id === 'enter') {
            this.game.act((state) => {
                state.town.lastSummary = null;
                if (T.needsSpellPrep(state.character)) {
                    state.screen = FD.Enums.Screen.SPELL_PREP;
                } else {
                    FD.Rules.ExplorationRules.enterDungeon(state);
                }
            });
        } else if (a.id === 'shop') {
            this.game.act((state) => { state.screen = FD.Enums.Screen.SHOPPE; });
        } else if (a.id === 'restDay') {
            this.game.act((state) => T.restDay(state));
        } else if (a.id === 'restWeek') {
            this.game.act((state) => T.restWeek(state));
        } else if (a.id === 'rumour') {
            this.game.act((state) => T.askRumour(state));
        } else if (a.id === 'copy') {
            this.game.act((state) => T.copySpell(state, a.spellId, a.sourceUid));
        } else if (a.id === 'rewrite') {
            this.game.act((state) => T.rewriteSpellbook(state));
        } else if (a.id === 'title') {
            this.game.save();
            this.game.toTitle();
        }
    }
}

FD.UI.Screens.TownScreen = TownScreen;
