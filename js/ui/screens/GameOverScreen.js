/**
 * Game Over (rule 67): the epitaph. The fallen adventurer's gear stays where
 * they died (rule 68) and a new adventurer can be raised in town (rule 66a).
 */
class GameOverScreen {
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
        const e = state.lastEpitaph;
        root.appendChild(h('div', { class: 'epitaph' },
            h('div', { class: 'stone' },
                h('div', { class: 'muted small ui', text: 'HERE LIES' }),
                h('h2', { text: e.name }),
                h('p', { text: e.race + ' ' + e.cls + ' of level ' + e.level + ', ' + e.xp + ' XP' }),
                h('p', { class: 'room-desc', text: 'Who ' + e.cause + ' in the ' + e.room + ', on turn ' + e.turn + ' of delve ' + e.delve + '.' }),
                h('p', { class: 'small muted', text: 'Dead at 0 HP, beyond recovery (rule 67). Their gold and gear lie where they fell, waiting for whoever comes next (rule 68).' })),
            h('div', { class: 'row', style: 'justify-content:center;margin-top:1.2rem' },
                h('button', { class: 'primary', on: { click: () => this.game.act((s) => { s.character = null; s.screen = FD.Enums.Screen.CREATION; }) } }, 'Raise a new adventurer in town (rule 66a)'),
                h('button', { on: { click: () => this.game.toTitle() } }, 'Title screen'))));
    }
}

FD.UI.Screens.GameOverScreen = GameOverScreen;
