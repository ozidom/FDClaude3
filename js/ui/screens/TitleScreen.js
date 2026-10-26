/**
 * Title screen: new game, continue, optional rules, and a short how-to-play.
 */
class TitleScreen {
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
        const game = this.game;
        const hasSave = FD.Core.SaveStore.exists();
        const cfg = FD.Core.config;
        const toggle = (key, label) => h('label', null,
            h('input', { type: 'checkbox', checked: !!cfg[key], on: { change: (e) => { cfg[key] = e.target.checked; } } }),
            label);

        root.appendChild(h('div', { class: 'title-screen' },
            h('h1', { text: 'Fast Dungeons' }),
            h('div', { class: 'subtitle', text: 'Fast-paced old school adventures in the underdark · v0.79 "The RADiCAL Version" by Dom Millar' }),
            h('div', { class: 'menu' },
                hasSave ? h('button', { class: 'primary', on: { click: () => game.continueGame() } }, 'Continue') : null,
                h('button', { class: hasSave ? '' : 'primary', on: { click: () => this.confirmNew(hasSave) } }, 'New Adventurer')),
            h('div', { class: 'panel' },
                h('h2', { text: 'How to play' }),
                h('p', { text: 'You are a lone adventurer. The computer is your Game Master: it describes each room, rolls the dice and runs the monsters. Every roll appears in the Adventure Log with the rule it comes from, so you learn the rules as you play.' }),
                h('p', { text: 'Create an adventurer, buy gear in the Shoppe (remember light!), then explore the Sunken Crypt one Dungeon Turn at a time. Torches burn down, wandering monsters prowl, and every room is a choice. Talk before you fight: monsters have their own motives. Carry treasure back out through the entrance to earn XP and level up.' }),
                h('p', { class: 'small muted', text: 'Keys 1-9 trigger actions. In combat, click a zone to move and a monster to target, then press Enter. The game saves automatically whenever you are in town.' })),
            h('div', { class: 'panel options-list' },
                h('h2', { text: 'Optional rules' }),
                toggle('hiddenEmotionTest', 'Hidden Emotion Test with important NPCs (rule 50a)'),
                toggle('maxDamage', 'Maximum damage on every damage roll (rule 59b)'),
                toggle('startingRumour', 'One rumour before the first delve (rule 1a; rule 66 says no)'),
                toggle('rerollAttributes', 'Allow rerolling attributes during creation (not in the rules)'),
                h('p', { class: 'small muted', text: 'Options are saved with the game.' })),
            h('p', { class: 'small muted', style: 'margin-top:1rem' }, 'Rules text: ', h('a', { href: 'FastDungeonsv0.79.txt', target: '_blank' }, 'FastDungeonsv0.79.txt'), ' · ', h('a', { href: 'tests.html', target: '_blank' }, 'run the tests'))
        ));
    }

    /**
     * Starts a new game, confirming first if a save would be replaced.
     * @param {boolean} hasSave  A save exists.
     * @returns {void}
     */
    confirmNew(hasSave) {
        if (!hasSave) {
            this.game.newGame();
            return;
        }
        FD.UI.Components.Modal.show({
            title: 'Start over?',
            body: 'Starting a new game replaces your saved adventure when you next reach town.',
            buttons: [
                { label: 'Cancel' },
                { label: 'Start a new game', primary: true, onClick: () => this.game.newGame() }
            ]
        });
    }
}

FD.UI.Screens.TitleScreen = TitleScreen;
