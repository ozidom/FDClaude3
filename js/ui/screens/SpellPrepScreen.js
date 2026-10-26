/**
 * Spell preparation (rule 53d): fill the TABLE 8 slots before each delve.
 */
class SpellPrepScreen {
    /**
     * @param {FD.Game} game  Game controller.
     */
    constructor(game) {
        this.game = game;
        this.picks = {};
    }

    /**
     * Starts from the previous preparation.
     * @returns {void}
     */
    enter() {
        const pc = this.game.state.character;
        this.picks = {};
        const slots = pc.maxSpellSlots;
        for (const levelText of Object.keys(slots)) {
            const level = parseInt(levelText, 10);
            const allowed = FD.Rules.SpellRules.preparableSpells(pc, level);
            const previous = pc.prepared.filter(p => p.level === level).map(p => p.spellId).filter(id => allowed.indexOf(id) >= 0);
            const list = [];
            for (let i = 0; i < slots[level]; i++) {
                list.push(previous[i] || allowed[0] || '');
            }
            this.picks[level] = list;
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
        const slots = pc.maxSpellSlots;
        const sections = [];
        if (pc.classId === 'wizard' && !pc.hasSpellbook) {
            sections.push(h('p', { class: 'danger', text: 'Without your spellbook you cannot prepare spells (rule 53b). Rewrite it in town.' }));
        }
        for (const levelText of Object.keys(slots)) {
            const level = parseInt(levelText, 10);
            const allowed = FD.Rules.SpellRules.preparableSpells(pc, level);
            if (slots[level] === 0) {
                continue;
            }
            const selects = (this.picks[level] || []).map((spellId, i) => {
                const sel = h('select', { on: { change: (e) => { this.picks[level][i] = e.target.value; this.game.sync(); } } },
                    allowed.map(id => h('option', { value: id, selected: id === spellId, text: FD.Data.Spells[id].name })));
                sel.value = spellId;
                const s = FD.Data.Spells[spellId];
                return h('div', { style: 'margin-bottom:.6rem' },
                    h('label', { text: 'Level ' + level + ' slot ' + (i + 1) }), sel,
                    s ? h('p', { class: 'small muted', text: s.desc + ' Range ' + s.range + ' zone(s). ' + s.duration + '.' + (s.kind === 'narrative' ? ' (Narrative)' : '') }) : null);
            });
            sections.push(h('div', null, h('h3', { text: 'Level ' + level + ' (' + slots[level] + ' slot' + (slots[level] > 1 ? 's' : '') + ', TABLE 8)' }), selects));
        }
        let note = 'A Cleric has every Cleric spell of a level they can cast (rule 53c).';
        if (pc.classId === 'wizard') {
            note = 'A Wizard prepares from their spellbook (rule 53b). The same spell may fill more than one slot (rule 53d).';
        }
        root.appendChild(h('div', { class: 'wizard' },
            h('h2', { text: 'Prepare spells (rule 53d)' }),
            h('div', { class: 'panel' },
                h('p', { class: 'small muted', text: note + ' Used spells return after a full night\'s rest (rule 53g).' }),
                sections,
                h('div', { class: 'row' },
                    h('button', { on: { click: () => this.game.act((s) => { s.screen = s.hasDelved ? FD.Enums.Screen.TOWN : FD.Enums.Screen.SHOPPE; }) } }, 'Back'),
                    h('div', { class: 'spacer' }),
                    h('button', { class: 'primary', on: { click: () => this.enterDungeon() } }, 'Enter the dungeon')))));
    }

    /**
     * Prepares the chosen spells and starts the delve.
     * @returns {void}
     */
    enterDungeon() {
        this.game.act((state) => {
            const r = FD.Rules.SpellRules.prepare(state.character, this.picks);
            if (!r.ok) {
                FD.Core.log.add(r.reason, 'danger');
                return;
            }
            FD.Rules.ExplorationRules.enterDungeon(state);
        });
    }
}

FD.UI.Screens.SpellPrepScreen = SpellPrepScreen;
