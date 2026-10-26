/**
 * Turning Undead (rule 61d, TABLE 10).
 */
class TurnUndeadRules {
    /**
     * TABLE 10 lookup.
     * @param {number} level        Cleric level 1-3.
     * @param {string} undeadType   'skeleton' | 'zombie' | 'ghoul' | 'wight' | 'wraith'.
     * @returns {number|string|null}  Target number, 'T', 'D', or null (cannot turn).
     */
    static lookup(level, undeadType) {
        const row = FD.Data.TurnUndead[Math.max(1, Math.min(3, level))];
        if (!row || row[undeadType] === undefined) {
            return null;
        }
        return row[undeadType];
    }

    /**
     * Can the Cleric attempt to turn now?
     * TABLE 5: turning needs a Holy Symbol.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {{ok:boolean, reason:string}}
     */
    static canTurn(state) {
        const pc = state.character;
        if (!pc.cls.turnUndead) {
            return { ok: false, reason: 'Only Clerics turn undead (rule 25)' };
        }
        if (!pc.inventory.has('holySymbol')) {
            return { ok: false, reason: 'Needs a Holy Symbol (TABLE 5)' };
        }
        const undead = state.combat.standing.filter(m => m.hasTag('undead'));
        if (undead.length === 0) {
            return { ok: false, reason: 'No undead to turn' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * Attempts to turn undead.
     * RULE 61d / TABLE 10: roll 2d6 against the number for the Cleric's level and
     * each undead type; T turns and D destroys automatically. A success affects
     * 2d6 HD of undead, weakest first (GM RULING: at least one creature).
     * Turned undead move away and off the board; destroyed undead are removed.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {void}
     */
    static attempt(state) {
        const c = state.combat;
        const pc = state.character;
        const check = TurnUndeadRules.canTurn(state);
        if (!check.ok) {
            FD.Core.log.add(check.reason, 'info');
            return;
        }
        pc.conditions.invisible = false;
        const undead = c.standing.filter(m => m.hasTag('undead') && m.undeadType).sort((a, b) => a.hdValue - b.hdValue);
        const roll = FD.Core.dice.rollExpr('2d6', false);
        const results = {};
        const notes = [];
        for (const m of undead) {
            if (results[m.undeadType] !== undefined) {
                continue;
            }
            const entry = TurnUndeadRules.lookup(pc.level, m.undeadType);
            let result = 'fail';
            if (entry === 'D') {
                result = 'destroy';
            } else if (entry === 'T') {
                result = 'turn';
            } else if (typeof entry === 'number' && roll.total >= entry) {
                result = 'turn';
            }
            results[m.undeadType] = result;
            notes.push(m.undeadType + ' ' + (entry === null ? '—' : entry));
        }
        const anySuccess = Object.keys(results).some(k => results[k] !== 'fail');
        FD.Core.log.roll('T10', 'Turn Undead', roll.text + ' vs ' + notes.join(', '), anySuccess ? 'SUCCESS' : 'fail');
        if (!anySuccess) {
            FD.Core.log.add('You raise your holy symbol. The undead do not falter.', 'info');
            return;
        }
        const pool = FD.Core.dice.rollExpr(FD.Data.TURN_HD_DICE, false);
        let remaining = pool.total;
        const affected = [];
        for (const m of undead) {
            const result = results[m.undeadType];
            if (result === 'fail') {
                continue;
            }
            const cost = Math.max(1, Math.ceil(m.hdValue));
            if (cost > remaining && affected.length > 0) {
                continue;
            }
            remaining -= cost;
            if (result === 'destroy') {
                m.state = FD.Enums.MonsterState.DEAD;
                m.hp = 0;
                c.casualties++;
                affected.push(m.name + ' (destroyed)');
            } else {
                m.fleeing = true;
                m.turnedFlag = true;
                affected.push(m.name + ' (turned)');
            }
        }
        FD.Core.log.roll('T10', 'HD affected', pool.text, affected.join(', '));
    }
}

FD.Rules.TurnUndeadRules = TurnUndeadRules;
