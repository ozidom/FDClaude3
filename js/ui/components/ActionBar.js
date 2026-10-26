/**
 * Renders a list of action descriptors as grouped <button>s. The first nine
 * enabled actions get keyboard shortcuts 1-9 (SPEC §14 Accessibility).
 * Disabled actions stay visible with a tooltip citing the rule.
 */
class ActionBar {
    /**
     * Clears the keyboard map before a screen re-renders.
     * @returns {void}
     */
    static reset() {
        ActionBar.keymap = {};
        ActionBar.extraKeys = {};
    }

    /**
     * Builds the action buttons.
     * @param {Object[]} actions    { id, label, group, enabled, reason, cost, selected }.
     * @param {Function} onAction   Called with the chosen descriptor.
     * @param {Object} [opts]       { grouped (default true) }.
     * @returns {HTMLElement}
     */
    static render(actions, onAction, opts) {
        const h = FD.UI.Dom.h;
        const o = opts || {};
        const grouped = o.grouped !== false;
        const container = h('div', { class: 'action-bar' });
        const groups = [];
        const byGroup = {};
        for (const a of actions) {
            const g = grouped ? (a.group || 'Actions') : '';
            if (!byGroup[g]) {
                byGroup[g] = [];
                groups.push(g);
            }
            byGroup[g].push(a);
        }
        let key = Object.keys(ActionBar.keymap).length + 1;
        for (const g of groups) {
            const list = h('div', { class: 'action-list' });
            for (const a of byGroup[g]) {
                let keyLabel = '';
                if (a.enabled && key <= 9) {
                    keyLabel = String(key);
                    ActionBar.keymap[key] = () => onAction(a);
                    key++;
                }
                const btn = h('button', {
                    class: 'action-btn' + (a.selected ? ' selected' : ''),
                    disabled: !a.enabled,
                    title: a.enabled ? (a.title || null) : a.reason,
                    attrs: { 'aria-keyshortcuts': keyLabel || null },
                    on: { click: () => onAction(a) }
                },
                h('span', { class: 'key' + (keyLabel ? '' : ' blank'), text: keyLabel || '·' }),
                h('span', { class: 'label' }, a.label, !a.enabled && a.reason ? h('span', { class: 'why', text: a.reason }) : null),
                a.cost ? h('span', { class: 'cost', text: a.cost }) : null);
                list.appendChild(btn);
            }
            container.appendChild(h('div', { class: 'action-group' }, g ? h('h3', { text: g }) : null, list));
        }
        return container;
    }

    /**
     * Global keyboard handler: 1-9 trigger actions; extra keys (e.g. Enter) per screen.
     * @param {KeyboardEvent} e  Key event.
     * @returns {void}
     */
    static handleKey(e) {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            return;
        }
        if (FD.UI.Components.Modal.isOpen || e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }
        if (/^[1-9]$/.test(e.key) && ActionBar.keymap[e.key]) {
            e.preventDefault();
            ActionBar.keymap[e.key]();
            return;
        }
        if (ActionBar.extraKeys[e.key]) {
            e.preventDefault();
            ActionBar.extraKeys[e.key]();
        }
    }
}

ActionBar.keymap = {};
ActionBar.extraKeys = {};
FD.UI.Components.ActionBar = ActionBar;
