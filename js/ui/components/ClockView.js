/**
 * The CLOCK panel (RULE 4c): turns elapsed, rest counter (rule 44), wandering
 * monster countdown (rule 45) and the burning light (rule 41).
 */
class ClockView {
    /**
     * Renders the clock.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {HTMLElement}
     */
    static render(state) {
        const h = FD.UI.Dom.h;
        const clock = state.clock;
        const cfg = state.config;
        const light = clock.activeLight;
        let lightText = 'DARKNESS: wandering check every turn (rule 41b)';
        let pct = 0;
        if (light) {
            if (light.permanent) {
                lightText = light.name + ' (permanent)';
                pct = 100;
            } else {
                let max = 6;
                if (light.type === 'lantern') {
                    max = 24;
                } else if (light.type === 'magic') {
                    max = 12;
                }
                lightText = light.name + ': ' + light.turnsRemaining + ' turn' + (light.turnsRemaining === 1 ? '' : 's') + ' left';
                pct = Math.min(100, Math.round(100 * light.turnsRemaining / max));
            }
        }
        const pips = [];
        const shown = Math.max(cfg.turnsBeforeRest, clock.turnsSinceRest);
        for (let i = 1; i <= Math.min(shown, 10); i++) {
            let cls = '';
            if (i <= clock.turnsSinceRest) {
                cls = i > cfg.turnsBeforeRest ? 'over' : 'on';
            }
            pips.push(h('span', { class: cls }));
        }
        return h('div', { class: 'panel clock' },
            h('h3', { text: 'Clock' }),
            h('div', { class: 'clock-grid' },
                h('div', { class: 'stat', title: 'Dungeon Turns elapsed (~10 minutes each, rule 29)' }, h('div', { class: 'k', text: 'Turn' }), h('div', { class: 'v', text: clock.totalTurns })),
                h('div', { class: 'stat' + (clock.isFatigued ? ' warn' : ''), title: 'Rest every 6th turn (rule 44)' }, h('div', { class: 'k', text: 'Rest' }), h('div', { class: 'v', text: clock.turnsSinceRest + '/' + cfg.turnsBeforeRest })),
                h('div', { class: 'stat', title: 'Turns until the next wandering monster check (rule 45)' }, h('div', { class: 'k', text: 'Wander' }), h('div', { class: 'v', text: clock.isDark ? 'every' : clock.turnsUntilWanderingCheck }))),
            h('div', { class: 'small ui' + (light ? '' : ' danger'), text: lightText }),
            h('div', { class: 'light-meter' + (light ? '' : ' dark') }, h('div', { class: 'fill', style: 'width:' + pct + '%' })),
            h('div', { class: 'small ui muted', text: 'Turns since rest' }),
            h('div', { class: 'pips' }, pips)
        );
    }
}

FD.UI.Components.ClockView = ClockView;
