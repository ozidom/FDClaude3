/**
 * Saves and loads the game in localStorage under 'fd.save.v1'. Every access is
 * wrapped in try/catch: the game must still work when storage is unavailable
 * (private windows, file:// restrictions, blocked site data).
 */
class SaveStore {
    /**
     * Writes the game.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {boolean}  True if saved.
     */
    static save(state) {
        try {
            window.localStorage.setItem(SaveStore.KEY, JSON.stringify(state.toJSON()));
            return true;
        } catch (err) {
            console.warn('Save failed (storage unavailable?)', err);
            return false;
        }
    }

    /**
     * Reads the saved game data.
     * @returns {Object|null}  Parsed save, or null.
     */
    static load() {
        try {
            const text = window.localStorage.getItem(SaveStore.KEY);
            if (!text) {
                return null;
            }
            return JSON.parse(text);
        } catch (err) {
            console.warn('Load failed', err);
            return null;
        }
    }

    /**
     * @returns {boolean}  True if a save exists.
     */
    static exists() {
        return SaveStore.load() !== null;
    }

    /**
     * Deletes the save.
     * @returns {void}
     */
    static clear() {
        try {
            window.localStorage.removeItem(SaveStore.KEY);
        } catch (err) {
            console.warn('Clear failed', err);
        }
    }

    /**
     * Reads a small UI preference (e.g. theme).
     * @param {string} key       Preference key.
     * @param {string} fallback  Default.
     * @returns {string}
     */
    static getPref(key, fallback) {
        try {
            const v = window.localStorage.getItem('fd.pref.' + key);
            return v === null ? fallback : v;
        } catch (err) {
            return fallback;
        }
    }

    /**
     * Stores a small UI preference.
     * @param {string} key    Preference key.
     * @param {string} value  Value.
     * @returns {void}
     */
    static setPref(key, value) {
        try {
            window.localStorage.setItem('fd.pref.' + key, value);
        } catch (err) {
            // Preferences are a convenience only
        }
    }
}

/** localStorage key for the save file (SPEC §2). */
SaveStore.KEY = 'fd.save.v1';

FD.Core.SaveStore = SaveStore;
