/**
 * Shows one screen at a time in the #screen element. Screens re-render fully
 * after every action; the DOM is small, so this keeps views simple.
 */
class ScreenManager {
    /**
     * @param {FD.Game} game       The game controller.
     * @param {HTMLElement} root   Container element.
     */
    constructor(game, root) {
        this.game = game;
        this.root = root;
        /** @type {Object<string, Object>} */
        this.screens = {};
        this.currentName = null;
        this.current = null;
    }

    /**
     * Registers a screen object.
     * @param {string} name    FD.Enums.Screen value.
     * @param {Object} screen  Has render(root) and optional enter().
     * @returns {void}
     */
    register(name, screen) {
        this.screens[name] = screen;
    }

    /**
     * Switches to a screen.
     * @param {string} name  FD.Enums.Screen value.
     * @returns {void}
     */
    show(name) {
        this.currentName = name;
        this.current = this.screens[name];
        if (this.current && this.current.enter) {
            this.current.enter();
        }
        this.refresh();
        window.scrollTo(0, 0);
    }

    /**
     * Re-renders the current screen.
     * @returns {void}
     */
    refresh() {
        FD.UI.Components.ActionBar.reset();
        FD.UI.Dom.clear(this.root);
        if (this.current) {
            this.current.render(this.root);
        }
    }
}

FD.UI.ScreenManager = ScreenManager;
