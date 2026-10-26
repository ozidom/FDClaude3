/**
 * Monster morale (rule 52, 52a, 57, 63 and TABLE 13). Roll 2d6; a result
 * greater than the Morale score fails.
 */
class MoraleRules {
    /**
     * Rolls a morale check for a group.
     * RULE 52 (Morale): monsters do not automatically fight to the death.
     * TABLE 13: roll 2d6; if the roll is greater than the Morale score, it fails.
     * @param {FD.Model.Monster[]} group  Monsters checking (all of one kind normally).
     * @param {string} reason             Trigger, for the log.
     * @returns {{passed:boolean, roll:number, morale:number}}
     */
    static check(group, reason) {
        let morale = 0;
        for (const m of group) {
            morale = Math.max(morale, m.morale);
        }
        const r = FD.Core.dice.rollExpr('2d6', false);
        const passed = r.total <= morale;
        FD.Core.log.roll('R52', 'Morale (' + reason + ')', r.text + ' vs ' + morale, passed ? 'they hold' : 'MORALE FAILS');
        return { passed: passed, roll: r.total, morale: morale };
    }

    /**
     * True if a monster checks morale at all.
     * SPEC §8: undead and monsters tagged ignoresMorale skip it.
     * @param {FD.Model.Monster} m  Monster.
     * @returns {boolean}
     */
    static checksMorale(m) {
        return !m.hasTag('undead') && !m.hasTag('ignoresMorale');
    }

    /**
     * Works out which morale trigger (if any) is due.
     * RULE 52a: a check when a side suffers its first casualty and again when
     * about half its members have been defeated.
     * @param {FD.Model.CombatState} combat  The fight.
     * @returns {string|null}  'first casualty' | 'half defeated' | null.
     */
    static dueTrigger(combat) {
        const defeated = combat.defeated.length;
        if (!combat.halfChecked && combat.startingCount > 1 && defeated >= Math.ceil(combat.startingCount / 2) && combat.casualties > 0) {
            combat.halfChecked = true;
            combat.firstCasualtyChecked = true;
            return FD.Data.Morale.triggers.halfDefeated;
        }
        if (!combat.firstCasualtyChecked && combat.casualties > 0) {
            combat.firstCasualtyChecked = true;
            return FD.Data.Morale.triggers.firstCasualty;
        }
        return null;
    }

    /**
     * Checks morale if due and applies a failure.
     * TABLE 13 (Failed Morale Result): animals flee; intelligent monsters that are
     * engaged or cut off (the PC stands in the Enemy zone) surrender; other
     * intelligent monsters bargain (combat pauses and parley resumes).
     * @param {FD.Model.GameState} state  Game state.
     * @returns {string|null}  'bargain' if combat should pause for parley, else null.
     */
    static resolveCombatMorale(state) {
        const combat = state.combat;
        const reason = MoraleRules.dueTrigger(combat);
        if (!reason) {
            return null;
        }
        const group = combat.standing.filter(m => MoraleRules.checksMorale(m));
        if (group.length === 0) {
            return null;
        }
        const result = MoraleRules.check(group, reason);
        if (result.passed) {
            return null;
        }
        let bargain = false;
        const cutOff = combat.pcZone === FD.Enums.Zone.ENEMY;
        for (const m of group) {
            if (!m.hasTag('intelligent')) {
                // TABLE 13: animal - flee or cower
                m.fleeing = true;
                FD.Core.log.add(m.name + ' panics and flees!', 'good');
            } else if (m.zone === combat.pcZone || cutOff) {
                // TABLE 13: surrounded - surrender; stop attacking, leave tokens in place
                m.state = FD.Enums.MonsterState.SURRENDERED;
                FD.Core.log.add(m.name + ' throws down its weapon and surrenders!', 'good');
            } else {
                // TABLE 13: intelligent monster - bargain
                bargain = true;
                FD.Core.log.add(m.name + ' backs away. "Perhaps we have misunderstood the situation."', 'good');
            }
        }
        if (bargain) {
            return 'bargain';
        }
        return null;
    }
}

FD.Rules.MoraleRules = MoraleRules;
