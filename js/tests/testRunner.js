/**
 * A tiny test runner with no libraries. Suites register with
 * FD.Tests.suite(name, fn); fn receives a `t` object with it/eq/ok helpers.
 * Works in the browser (tests.html) and in a plain JS context.
 */
class TestRunner {
    constructor() {
        /** @type {{name:string, fn:Function}[]} */
        this.suites = [];
    }

    /**
     * Registers a suite.
     * @param {string} name   Suite name.
     * @param {Function} fn   Receives the test helper.
     * @returns {void}
     */
    suite(name, fn) {
        this.suites.push({ name: name, fn: fn });
    }

    /**
     * Runs every suite.
     * @returns {{suite:string, name:string, passed:boolean, error:string}[]}
     */
    run() {
        const results = [];
        for (const s of this.suites) {
            const t = {
                it: (name, testFn) => {
                    // Every test starts from a known seed and an empty log
                    FD.Core.dice.seed(12345);
                    FD.Core.Config.apply({});
                    FD.Core.log.clear();
                    try {
                        testFn();
                        results.push({ suite: s.name, name: name, passed: true, error: '' });
                    } catch (err) {
                        results.push({ suite: s.name, name: name, passed: false, error: err && err.message ? err.message : String(err) });
                    }
                }
            };
            try {
                s.fn(t);
            } catch (err) {
                results.push({ suite: s.name, name: '(suite setup)', passed: false, error: err.message });
            }
        }
        return results;
    }
}

/**
 * Asserts strict equality.
 * @param {*} actual    Value produced.
 * @param {*} expected  Value wanted.
 * @param {string} [msg]  Description.
 * @returns {void}
 */
FD.Tests.eq = function (actual, expected, msg) {
    if (actual !== expected) {
        throw new Error((msg ? msg + ': ' : '') + 'expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
    }
};

/**
 * Asserts a condition.
 * @param {boolean} cond  Condition.
 * @param {string} msg    Description.
 * @returns {void}
 */
FD.Tests.ok = function (cond, msg) {
    if (!cond) {
        throw new Error(msg || 'assertion failed');
    }
};

/**
 * Builds a test character without rolling anything.
 * @param {Object} [opts]  { raceId, classId, level, attributes, hp }.
 * @returns {FD.Model.Character}
 */
FD.Tests.makeCharacter = function (opts) {
    const o = opts || {};
    const attrs = Object.assign({ STR: 10, INT: 10, WIS: 10, DEX: 10, CON: 10, CHA: 10 }, o.attributes || {});
    return new FD.Model.Character({
        name: 'Tester', raceId: o.raceId || 'human', classId: o.classId || 'fighter', level: o.level || 1,
        attributes: attrs, hpMax: o.hp || 8, hpCurrent: o.hp || 8, gold: o.gold || 0
    });
};

/**
 * Builds a game state with a character standing in a room of the starter dungeon.
 * @param {Object} [opts]  Character options plus { roomId }.
 * @returns {FD.Model.GameState}
 */
FD.Tests.makeState = function (opts) {
    const o = opts || {};
    const state = FD.Model.GameState.newGame();
    state.character = FD.Tests.makeCharacter(o);
    state.delve.active = true;
    state.currentRoomId = o.roomId || 'r1';
    state.screen = FD.Enums.Screen.EXPLORATION;
    state.clock.addLight({ name: 'Torch', type: 'torch', turnsRemaining: 50, permanent: false });
    return state;
};

FD.Tests.Runner = new TestRunner();
FD.Tests.suite = function (name, fn) {
    FD.Tests.Runner.suite(name, fn);
};
