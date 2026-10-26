/**
 * A simple modal dialog. Only one is open at a time.
 */
class Modal {
    /**
     * Opens a modal.
     * @param {Object} opts  { title, body (Node|string), buttons: [{label, primary, onClick, close}], dismissable }.
     * @returns {void}
     */
    static show(opts) {
        const h = FD.UI.Dom.h;
        Modal.close();
        const root = document.getElementById('modal-root');
        let body = opts.body;
        if (typeof body === 'string') {
            body = h('p', { text: body });
        }
        const buttons = (opts.buttons || [{ label: 'OK', primary: true }]).map(b => h('button', {
            class: b.primary ? 'primary' : '',
            on: {
                click: () => {
                    if (b.close !== false) {
                        Modal.close();
                    }
                    if (b.onClick) {
                        b.onClick();
                    }
                }
            }
        }, b.label));
        const modal = h('div', { class: 'modal', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Dialog' } },
            opts.title ? h('h2', { text: opts.title }) : null,
            body,
            h('div', { class: 'buttons' }, buttons));
        const backdrop = h('div', {
            class: 'modal-backdrop',
            on: {
                click: (e) => {
                    if (e.target === backdrop && opts.dismissable !== false) {
                        Modal.close();
                    }
                }
            }
        }, modal);
        root.appendChild(backdrop);
        Modal.isOpen = true;
        const primary = modal.querySelector('button.primary') || modal.querySelector('button');
        if (primary) {
            primary.focus();
        }
    }

    /**
     * Opens a numeric prompt.
     * @param {Object} opts  { title, label, value, min, max, onOk(number) }.
     * @returns {void}
     */
    static prompt(opts) {
        const h = FD.UI.Dom.h;
        const input = h('input', { type: 'number', attrs: { min: opts.min, max: opts.max }, value: String(opts.value) });
        Modal.show({
            title: opts.title,
            body: h('div', null, h('label', { text: opts.label }), input),
            buttons: [
                { label: 'Cancel' },
                { label: 'OK', primary: true, onClick: () => opts.onOk(parseInt(input.value, 10) || 0) }
            ]
        });
        input.focus();
        input.select();
    }

    /**
     * Closes the open modal, if any.
     * @returns {void}
     */
    static close() {
        const root = document.getElementById('modal-root');
        if (root) {
            FD.UI.Dom.clear(root);
        }
        Modal.isOpen = false;
    }
}

Modal.isOpen = false;
FD.UI.Components.Modal = Modal;
