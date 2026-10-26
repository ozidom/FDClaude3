/**
 * Shows each dice roll briefly on screen (SPEC §14 Dice). Listens to the
 * 'dice' event raised by GameLog.roll().
 */
class ToastView {
    /**
     * Subscribes to dice events.
     * @returns {void}
     */
    static mount() {
        ToastView.root = document.getElementById('toasts');
        FD.Core.events.on('dice', (roll) => ToastView.show(roll));
    }

    /**
     * Shows one toast, keeping at most three on screen.
     * @param {Object} roll  { rule, label, detail, outcome }.
     * @returns {void}
     */
    static show(roll) {
        const h = FD.UI.Dom.h;
        if (!ToastView.root) {
            return;
        }
        const el = h('div', { class: 'toast' },
            h('span', { text: roll.label + ': ' }),
            h('span', { class: 'die', text: roll.detail }),
            roll.outcome ? h('span', { text: ' → ' + roll.outcome }) : null);
        ToastView.root.appendChild(el);
        while (ToastView.root.children.length > 3) {
            ToastView.root.removeChild(ToastView.root.firstChild);
        }
        setTimeout(() => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 2600);
    }
}

FD.UI.Components.ToastView = ToastView;
