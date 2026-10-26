/**
 * Character creation wizard following TABLE 1 (steps 1-14):
 * page 1 attributes, page 2 race and class (and a Wizard's first spell),
 * page 3 name, age and background, then HP and gold are rolled.
 */
class CreationScreen {
    /**
     * @param {FD.Game} game  Game controller.
     */
    constructor(game) {
        this.game = game;
        this.reset();
    }

    /**
     * Clears the draft when the screen is entered.
     * @returns {void}
     */
    enter() {
        this.reset();
    }

    /**
     * Resets the draft character.
     * @returns {void}
     */
    reset() {
        this.draft = { step: 1, attributes: null, raceId: null, classId: null, wizardSpell: null, name: '', age: 20, background: '' };
    }

    /**
     * @param {HTMLElement} root  Container.
     * @returns {void}
     */
    render(root) {
        const h = FD.UI.Dom.h;
        const d = this.draft;
        const steps = ['1 Attributes', '2 Race & Class', '3 Who are you?'];
        let body;
        if (d.step === 1) {
            body = this.renderAttributes();
        } else if (d.step === 2) {
            body = this.renderRaceClass();
        } else {
            body = this.renderDetails();
        }
        root.appendChild(h('div', { class: 'wizard' },
            h('h2', { text: 'Create your adventurer (TABLE 1)' }),
            h('div', { class: 'steps' }, steps.map((s, i) => h('span', { class: d.step === i + 1 ? 'on' : '', text: s }))),
            body));
    }

    /**
     * Page 1: roll 3d6 in order (rule 12).
     * @returns {HTMLElement}
     */
    renderAttributes() {
        const h = FD.UI.Dom.h;
        const d = this.draft;
        const fmt = FD.Data.Attributes.formatMod;
        const canRoll = d.attributes === null || FD.Core.config.rerollAttributes;
        return h('div', { class: 'panel stack' },
            h('p', { text: 'Roll 3d6 in order for Strength, Intelligence, Wisdom, Dexterity, Constitution and Charisma (rule 12). What you roll is who you are.' }),
            h('div', { class: 'attr-grid' }, FD.Data.Attributes.ORDER.map(a => h('div', { class: 'attr-box', title: FD.Data.Attributes.HELP[a] },
                h('div', { class: 'name', text: a }),
                h('div', { class: 'score', text: d.attributes ? d.attributes[a] : '–' }),
                h('div', { class: 'mod', text: d.attributes ? fmt(FD.Data.Attributes.modifierFor(d.attributes[a])) : '' })))),
            h('p', { class: 'small muted', text: 'Modifiers (rule 13): 3 = -3, 4-5 = -2, 6-8 = -1, 9-12 = 0, 13-15 = +1, 16-17 = +2, 18 = +3.' }),
            h('div', { class: 'row' },
                h('button', { class: d.attributes ? '' : 'primary', disabled: !canRoll, title: canRoll ? null : 'Rerolling is off (optional rule on the title screen)', on: { click: () => { d.attributes = FD.Rules.CharacterFactory.rollAttributes(); this.game.sync(); } } }, d.attributes ? 'Reroll' : 'Roll 3d6 in order'),
                h('div', { class: 'spacer' }),
                h('button', { on: { click: () => this.game.toTitle() } }, 'Back to title'),
                h('button', { class: 'primary', disabled: !d.attributes, on: { click: () => { d.step = 2; this.game.sync(); } } }, 'Next: race & class')));
    }

    /**
     * Page 2: race (TABLE 2) and class (TABLE 3), with race restrictions.
     * @returns {HTMLElement}
     */
    renderRaceClass() {
        const h = FD.UI.Dom.h;
        const d = this.draft;
        const races = FD.Data.RACE_ORDER.map(id => {
            const r = FD.Data.Races[id];
            return h('button', { class: 'card' + (d.raceId === id ? ' selected' : ''), on: { click: () => { d.raceId = id; if (d.classId && !FD.Rules.CharacterFactory.isClassAllowed(id, d.classId)) { d.classId = null; } this.game.sync(); } } },
                h('div', { class: 'card-title', text: r.name }),
                h('div', { class: 'card-body', text: r.ability }),
                h('div', { class: 'card-body', text: 'Classes: ' + r.classes.map(c => FD.Data.Classes[c].name).join(', ') }));
        });
        const classes = FD.Data.CLASS_ORDER.map(id => {
            const c = FD.Data.Classes[id];
            const allowed = !d.raceId || FD.Rules.CharacterFactory.isClassAllowed(d.raceId, id);
            return h('button', {
                class: 'card' + (d.classId === id ? ' selected' : ''),
                disabled: !allowed,
                title: allowed ? null : FD.Data.Races[d.raceId].name + 's cannot be ' + c.name + 's (TABLE 2)',
                on: { click: () => { d.classId = id; this.game.sync(); } }
            },
            h('div', { class: 'card-title', text: c.name + ' (d' + c.hitDie + ')' }),
            h('div', { class: 'card-body', text: c.description }));
        });
        let spellPick = null;
        if (d.classId === 'wizard') {
            spellPick = h('div', { class: 'panel' },
                h('h3', { text: 'Your spellbook: Read Magic plus one Level 1 spell (rule 53b)' }),
                h('div', { class: 'card-grid' }, FD.Rules.CharacterFactory.wizardStartingChoices().map(id => {
                    const s = FD.Data.Spells[id];
                    return h('button', { class: 'card' + (d.wizardSpell === id ? ' selected' : ''), on: { click: () => { d.wizardSpell = id; this.game.sync(); } } },
                        h('div', { class: 'card-title', text: s.name }),
                        h('div', { class: 'card-body', text: s.desc }));
                })));
        }
        const ready = d.raceId && d.classId && (d.classId !== 'wizard' || d.wizardSpell);
        return h('div', { class: 'stack' },
            h('div', { class: 'panel' }, h('h3', { text: 'Race (TABLE 2)' }), h('div', { class: 'card-grid' }, races)),
            h('div', { class: 'panel' }, h('h3', { text: 'Class (TABLE 3)' }), h('div', { class: 'card-grid' }, classes)),
            spellPick,
            h('div', { class: 'row' },
                h('button', { on: { click: () => { d.step = 1; this.game.sync(); } } }, 'Back'),
                h('div', { class: 'spacer' }),
                h('button', { class: 'primary', disabled: !ready, on: { click: () => { d.step = 3; this.game.sync(); } } }, 'Next: who are you?')));
    }

    /**
     * Page 3: name, age 16-40 and background (rule 5), then roll HP and gold.
     * @returns {HTMLElement}
     */
    renderDetails() {
        const h = FD.UI.Dom.h;
        const d = this.draft;
        const cls = FD.Data.Classes[d.classId];
        const con = FD.Data.Attributes.modifierFor(d.attributes.CON);
        return h('div', { class: 'panel stack' },
            h('div', null, h('label', { text: 'Name (rule 5a)' }), h('input', { type: 'text', value: d.name, attrs: { maxlength: 40, placeholder: 'e.g. Dorn' }, on: { input: (e) => { d.name = e.target.value; } } })),
            h('div', null, h('label', { text: 'Age, 16-40 (rule 5b)' }), h('input', { type: 'number', value: String(d.age), attrs: { min: 16, max: 40 }, on: { input: (e) => { d.age = e.target.value; } } })),
            h('div', null, h('label', { text: 'Background, a few sentences (rule 5c)' }), h('textarea', { value: d.background, attrs: { maxlength: 400 }, on: { input: (e) => { d.background = e.target.value; } } })),
            h('p', { class: 'small muted', text: 'When you finish, the game rolls Hit Points (d' + cls.hitDie + ' ' + FD.Data.Attributes.formatMod(con) + ' CON, minimum 1, TABLE 1 step 5) and starting gold (3d6 x 10 gp, rule 5e).' }),
            h('div', { class: 'row' },
                h('button', { on: { click: () => { d.step = 2; this.game.sync(); } } }, 'Back'),
                h('div', { class: 'spacer' }),
                h('button', { class: 'primary', on: { click: () => this.finish() } }, 'Roll HP & gold and begin')));
    }

    /**
     * Creates the character and moves on to the Shoppe.
     * @returns {void}
     */
    finish() {
        const d = this.draft;
        this.game.act((state) => {
            state.character = FD.Rules.CharacterFactory.create({
                name: d.name, age: d.age, background: d.background, raceId: d.raceId, classId: d.classId,
                attributes: d.attributes, wizardSpell: d.wizardSpell
            });
            // RULE 66a: a new adventurer starts fresh in town; the fallen one's pending XP is gone
            state.town.lastSummary = null;
            state.town.pendingSpellChoice = false;
            state.delve.monsterXp = 0;
            state.delve.defeatedNames = [];
            state.screen = FD.Enums.Screen.SHOPPE;
        });
    }
}

FD.UI.Screens.CreationScreen = CreationScreen;
