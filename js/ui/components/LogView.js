/**
 * The Adventure Log panel along the bottom of the page. Appends each entry as
 * it is logged and keeps the newest in view.
 */
class LogView {
    /**
     * Subscribes to the log and draws existing entries.
     * @returns {void}
     */
    static mount() {
        LogView.el = document.getElementById('log');
        FD.Core.events.on('log', (entry) => LogView.append(entry));
        FD.Core.events.on('logCleared', () => LogView.redraw());
        const toggle = document.getElementById('btn-log-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const panel = document.getElementById('log-panel');
                panel.classList.toggle('collapsed');
                toggle.textContent = panel.classList.contains('collapsed') ? 'Show' : 'Hide';
            });
        }
        LogView.redraw();
    }

    /**
     * Redraws every entry (after a load or clear).
     * @returns {void}
     */
    static redraw() {
        if (!LogView.el) {
            return;
        }
        FD.UI.Dom.clear(LogView.el);
        for (const entry of FD.Core.log.entries) {
            LogView.append(entry, true);
        }
        LogView.el.scrollTop = LogView.el.scrollHeight;
    }

    /**
     * Adds one entry.
     * @param {{text:string, kind:string}} entry  Log entry.
     * @param {boolean} [noScroll]                Skip scrolling (batch redraw).
     * @returns {void}
     */
    static append(entry, noScroll) {
        if (!LogView.el) {
            return;
        }
        LogView.el.appendChild(FD.UI.Dom.h('div', { class: 'log-entry ' + entry.kind, text: entry.text }));
        while (LogView.el.children.length > FD.Core.log.limit) {
            LogView.el.removeChild(LogView.el.firstChild);
        }
        if (!noScroll) {
            LogView.el.scrollTop = LogView.el.scrollHeight;
        }
    }
}

FD.UI.Components.LogView = LogView;
