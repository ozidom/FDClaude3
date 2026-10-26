/**
 * FD.Game: the bootstrap and controller. Builds the GameState, registers the
 * screens, shows the Title, and after every player action re-syncs the screen
 * with state.screen. Autosaves whenever the game is in town (SPEC §2).
 */
class Game {
    constructor() {
        this.root = document.getElementById('screen');
        this.screens = new FD.UI.ScreenManager(this, this.root);
        const S = FD.Enums.Screen;
        const UI = FD.UI.Screens;
        this.screens.register(S.TITLE, new UI.TitleScreen(this));
        this.screens.register(S.CREATION, new UI.CreationScreen(this));
        this.screens.register(S.SHOPPE, new UI.ShoppeScreen(this));
        this.screens.register(S.SPELL_PREP, new UI.SpellPrepScreen(this));
        this.screens.register(S.EXPLORATION, new UI.ExplorationScreen(this));
        this.screens.register(S.ENCOUNTER, new UI.EncounterScreen(this));
        this.screens.register(S.COMBAT, new UI.CombatScreen(this));
        this.screens.register(S.TOWN, new UI.TownScreen(this));
        this.screens.register(S.GAME_OVER, new UI.GameOverScreen(this));
        /** @type {FD.Model.GameState} */
        this.state = FD.Model.GameState.newGame();
    }

    /**
     * Mounts the shared views and shows the Title screen.
     * @returns {void}
     */
    start() {
        FD.UI.Components.LogView.mount();
        FD.UI.Components.ToastView.mount();
        document.addEventListener('keydown', (e) => FD.UI.Components.ActionBar.handleKey(e));
        this.applyTheme(FD.Core.SaveStore.getPref('theme', 'dark'));
        document.getElementById('btn-theme').addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            this.applyTheme(next);
            FD.Core.SaveStore.setPref('theme', next);
        });
        document.getElementById('btn-help').addEventListener('click', () => this.showHelp());
        this.state.screen = FD.Enums.Screen.TITLE;
        this.sync();
    }

    /**
     * Sets the colour theme.
     * @param {string} theme  'dark' or 'light'.
     * @returns {void}
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    }

    /**
     * Runs a player action against the state, then re-syncs the screen.
     * Errors are reported in the log instead of freezing the game.
     * @param {Function} fn  Receives the GameState.
     * @returns {void}
     */
    act(fn) {
        try {
            fn(this.state);
        } catch (err) {
            console.error(err);
            FD.Core.log.add('Something went wrong: ' + err.message, 'danger');
        }
        this.sync();
    }

    /**
     * Shows the screen named by state.screen (or refreshes it) and autosaves in town.
     * @returns {void}
     */
    sync() {
        const S = FD.Enums.Screen;
        const name = this.state.screen;
        if (name === S.TOWN || name === S.GAME_OVER) {
            this.save();
        }
        if (name !== this.screens.currentName) {
            this.screens.show(name);
        } else {
            this.screens.refresh();
        }
        this.updateStatus();
    }

    /**
     * Saves to localStorage (silently ignored if unavailable).
     * @returns {boolean}
     */
    save() {
        if (!this.state.character && this.state.screen !== FD.Enums.Screen.GAME_OVER) {
            return false;
        }
        return FD.Core.SaveStore.save(this.state);
    }

    /**
     * Starts a brand-new game.
     * @returns {void}
     */
    newGame() {
        const options = Object.assign({}, FD.Core.config);
        FD.Core.log.clear();
        this.state = FD.Model.GameState.newGame();
        FD.Core.Config.apply(options);
        FD.Core.log.add('A new adventure begins.', 'rule');
        this.state.screen = FD.Enums.Screen.CREATION;
        this.sync();
    }

    /**
     * Loads the saved game.
     * @returns {void}
     */
    continueGame() {
        const data = FD.Core.SaveStore.load();
        if (!data) {
            return;
        }
        try {
            this.state = FD.Model.GameState.fromJSON(data);
        } catch (err) {
            console.error(err);
            FD.UI.Components.Modal.show({ title: 'Save could not be loaded', body: err.message });
            return;
        }
        FD.Core.log.add('Welcome back.', 'rule');
        this.sync();
    }

    /**
     * Returns to the Title screen.
     * @returns {void}
     */
    toTitle() {
        this.state.screen = FD.Enums.Screen.TITLE;
        this.sync();
    }

    /**
     * Updates the status line in the top bar.
     * @returns {void}
     */
    updateStatus() {
        const el = document.getElementById('status');
        const s = this.state;
        const pc = s.character;
        if (!pc || s.screen === FD.Enums.Screen.TITLE) {
            el.textContent = '';
            return;
        }
        let text = pc.name + ' · ' + pc.race.name + ' ' + pc.cls.name + ' ' + pc.level + ' · HP ' + pc.hpCurrent + '/' + pc.hpMax + ' · ' + pc.gold + ' gp';
        if (s.delve.active) {
            text += ' · Delve ' + s.delve.number + ', turn ' + s.clock.totalTurns + ' · pending XP ' + s.delve.monsterXp;
        } else {
            text += ' · Day ' + s.town.day;
        }
        el.textContent = text;
    }

    /**
     * Shows a quick reference of the core procedures.
     * @returns {void}
     */
    showHelp() {
        const h = FD.UI.Dom.h;
        FD.UI.Components.Modal.show({
            title: 'Quick reference',
            body: h('div', { class: 'small' },
                h('h3', { text: 'Dungeon Turn (rule 30)' }),
                h('p', { text: '1 Describe · 2 Choose · 3 Resolve · 4 Update the map · 5 Advance the Clock (light burns) · 6 The Dungeon Answers: a wandering monster check every 2nd turn, every turn in darkness.' }),
                h('h3', { text: 'Combat round (rule 56)' }),
                h('p', { text: 'Declare (spells before initiative) · Initiative d6 each side, ties simultaneous · Morale · Movement (2 zones, 1 encumbered; blocked by enemies; engaged needs Withdraw/Retreat) · Missiles (not in Small rooms or your own zone) · Spells · Melee (same zone, reach = adjacent) · Surrender/Withdraw/Retreat/Pursuit.' }),
                h('h3', { text: 'Hitting' }),
                h('p', { text: 'd20 + Attack Bonus (Table 3) + STR (melee) or DEX (missile) ≥ target AC.' }),
                h('h3', { text: 'Keys' }),
                h('p', { text: '1-9 actions · Enter fights the round on the Clash Board.' }),
                h('p', null, 'Full rules: ', h('a', { href: 'FastDungeonsv0.79.txt', target: '_blank' }, 'FastDungeonsv0.79.txt'))),
            buttons: [{ label: 'Close', primary: true }]
        });
    }
}

FD.Game = Game;

window.addEventListener('DOMContentLoaded', () => {
    FD.game = new Game();
    FD.game.start();
});
