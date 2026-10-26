/**
 * Encounters (SPEC §7): shows surprise, distance, reaction and motivation, the
 * Hidden Emotion Test for important NPCs, and the parley options.
 */
class EncounterScreen {
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
        const enc = state.encounter;
        const def = enc.def;
        const R = FD.Rules.EncounterRules;
        const reaction = FD.Data.reactionById(enc.reaction);

        const facts = h('div', { class: 'row', style: 'margin:.4rem 0' },
            h('span', { class: 'tag' + (enc.surprise.pc ? ' warn' : ''), text: enc.surprise.pc ? 'You are surprised' : 'You are ready', title: 'Rule 47' }),
            h('span', { class: 'tag' + (enc.surprise.monsters ? ' ok' : ''), text: enc.surprise.monsters ? 'They are unaware' : 'They have seen you', title: 'Rule 47' }),
            h('span', { class: 'tag', text: 'Distance: ' + enc.distance, title: 'Rule 48' }),
            h('span', { class: 'tag' + (enc.reaction === 'attack' || enc.reaction === 'hostile' ? ' warn' : (enc.reaction === 'friendly' || enc.reaction === 'talkative' ? ' ok' : '')), text: 'Reaction: ' + reaction.name, title: 'TABLE 12' }),
            enc.bargain ? h('span', { class: 'tag ok', text: 'Bargaining (+2)', title: 'TABLE 13' }) : null);

        const monsterList = h('ul', { class: 'plain-list' }, enc.monsters.map(m => h('li', null, h('b', { text: m.name }),
            h('span', { class: 'muted small', text: ' — HD ' + m.hd + ', AC ' + m.ac + (m.weaponName ? ', ' + m.weaponName : '') + (m.hp < m.hpMax ? ', wounded' : '') }))));

        let emotion = null;
        if (enc.phase === 'emotion') {
            const imp = def.important;
            const esp = state.character.hasEffect('esp');
            emotion = h('div', { class: 'panel' },
                h('h3', { text: 'Hidden Emotion Test (rule 50a)' }),
                h('div', { class: 'npc-line', text: imp.name + ': ' + imp.lines[enc.emotion] }),
                h('p', { class: 'small muted', text: 'The GM secretly rolled an emotion (TABLE 17) and ' + imp.name + ' spoke in that mood. Guess it. Right: they reveal their secret. Wrong: they may withhold, mislead, flee, demand or attack.' }),
                esp ? h('p', { class: 'small good', text: 'ESP: you sense ' + FD.Data.Emotions[enc.emotion].name.toUpperCase() + '.' }) : null,
                h('div', { class: 'emotion-grid' }, Object.keys(FD.Data.Emotions).map((k, i) => {
                    const id = parseInt(k, 10);
                    FD.UI.Components.ActionBar.keymap[i + 1] = () => this.game.act((s) => R.guessEmotion(s, id));
                    return h('button', { on: { click: () => this.game.act((s) => R.guessEmotion(s, id)) } }, (i + 1) + '. ' + FD.Data.Emotions[k].name);
                })));
        }

        let demand = null;
        if (enc.phase === 'demand') {
            demand = h('p', { class: 'npc-line', text: 'They demand ' + enc.demand.gold + ' gold.' });
        }

        const options = R.options(state).map(o => Object.assign({ group: 'Choices' }, o));
        const bar = FD.UI.Components.ActionBar.render(options, (o) => this.choose(o), { grouped: false });

        const main = h('div', { class: 'col-main' },
            h('div', { class: 'panel' },
                h('div', { class: 'room-size', text: state.room.name + (enc.wandering ? ' · wandering monsters' : '') }),
                h('h2', { class: 'room-title', text: 'Encounter!' }),
                h('p', { class: 'room-desc', text: def.description }),
                facts,
                h('p', { class: 'small muted', text: reaction.text }),
                def.motivation ? h('p', { class: 'small' }, h('b', { text: 'What they want (rule 51): ' }), def.motivation.text) : null,
                monsterList),
            emotion,
            h('div', { class: 'panel' }, h('h2', { text: 'What do you do?' }), demand, enc.phase === 'emotion' ? h('p', { class: 'muted small', text: 'Make your guess above.' }) : bar));

        root.appendChild(h('div', { class: 'play-grid' },
            h('div', { class: 'col-sheet' }, FD.UI.Components.CharacterSheetView.render(state, { inventoryOpen: false })),
            main,
            h('div', { class: 'col-side' }, FD.UI.Components.MapView.render(state), FD.UI.Components.ClockView.render(state))));
    }

    /**
     * Runs a chosen encounter option.
     * @param {Object} o  Option descriptor.
     * @returns {void}
     */
    choose(o) {
        const R = FD.Rules.EncounterRules;
        const state = this.game.state;
        if (o.id === 'offerGold') {
            const enc = state.encounter;
            const min = (enc.def.motivation && enc.def.motivation.bribeMin) || 5;
            FD.UI.Components.Modal.prompt({
                title: 'Offer gold',
                label: 'How much? You have ' + state.character.gold + ' gp. They seem to want about ' + min + ' gp; three times that is generous.',
                value: Math.min(state.character.gold, min),
                min: 1,
                max: state.character.gold,
                onOk: (amount) => this.game.act((s) => R.offerGold(s, amount))
            });
            return;
        }
        const map = {
            talk: R.talk,
            offerFood: R.offerFood,
            gift: R.giveGift,
            attack: R.attack,
            backAway: R.backAway,
            carryOn: R.carryOn,
            payDemand: R.payDemand,
            refuseDemand: R.refuseDemand
        };
        const fn = map[o.id];
        if (fn) {
            this.game.act((s) => fn.call(R, s));
        }
    }
}

FD.UI.Screens.EncounterScreen = EncounterScreen;
