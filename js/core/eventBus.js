/**
 * A minimal publish/subscribe hub, like C# events. Lets the model and rules
 * announce things (a log line, a dice roll, a light going out) without
 * knowing anything about the UI that listens.
 */
class EventBus {
    constructor() {
        /** @type {Object<string, Function[]>} */
        this.handlers = {};
    }

    /**
     * Subscribes to an event.
     * @param {string} name        Event name.
     * @param {Function} handler   Called with the payload.
     * @returns {Function}         Call it to unsubscribe.
     */
    on(name, handler) {
        if (!this.handlers[name]) {
            this.handlers[name] = [];
        }
        this.handlers[name].push(handler);
        return () => this.off(name, handler);
    }

    /**
     * Removes a subscription.
     * @param {string} name        Event name.
     * @param {Function} handler   The handler passed to on().
     * @returns {void}
     */
    off(name, handler) {
        const list = this.handlers[name];
        if (!list) {
            return;
        }
        const index = list.indexOf(handler);
        if (index >= 0) {
            list.splice(index, 1);
        }
    }

    /**
     * Raises an event. A failing handler is reported but does not stop others.
     * @param {string} name     Event name.
     * @param {*} [payload]     Data passed to each handler.
     * @returns {void}
     */
    emit(name, payload) {
        const list = this.handlers[name];
        if (!list) {
            return;
        }
        const copy = list.slice();
        for (const handler of copy) {
            try {
                handler(payload);
            } catch (err) {
                console.error('Event handler for "' + name + '" failed', err);
            }
        }
    }
}

FD.Core.EventBus = EventBus;
/** The shared event bus. */
FD.Core.events = new EventBus();
