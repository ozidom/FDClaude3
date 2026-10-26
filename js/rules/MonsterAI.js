/**
 * Monster movement decisions on the Clash Board. Reads the "Board Behaviour"
 * column of TABLE 11, encoded as behaviour tags; each tag maps to one small
 * decision function that returns the zone the monster wants to reach.
 */
class MonsterAI {
    /**
     * Chooses where a monster wants to move this round.
     * @param {FD.Model.Monster} m        The monster.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {number}                  Destination zone.
     */
    static decideMove(m, state) {
        const c = state.combat;
        // GM RULING: monsters cannot find an invisible adventurer, so they hold
        if (state.character.conditions.invisible) {
            return m.zone;
        }
        for (const tag of m.behaviour) {
            const fn = MonsterAI.BEHAVIOURS[tag];
            if (fn) {
                return fn(m, c, state);
            }
        }
        return MonsterAI.advance(m, c, state);
    }

    /**
     * Default: close with the adventurer.
     * @param {FD.Model.Monster} m           Monster.
     * @param {FD.Model.CombatState} c       Combat.
     * @returns {number}
     */
    static advance(m, c) {
        return c.pcZone;
    }

    /**
     * TABLE 11 (Giant Rat, Orc): rushes the Centre and pushes on at full speed.
     * @param {FD.Model.Monster} m           Monster.
     * @param {FD.Model.CombatState} c       Combat.
     * @returns {number}
     */
    static rushesCentre(m, c) {
        return c.pcZone;
    }

    /**
     * TABLE 11 (Kobold, rear Goblins): stays back and shoots where possible.
     * Moves to the nearest zone that is in range but not the adventurer's own zone.
     * @param {FD.Model.Monster} m           Monster.
     * @param {FD.Model.CombatState} c       Combat.
     * @param {FD.Model.GameState} state     Game state.
     * @returns {number}
     */
    static prefersMissiles(m, c, state) {
        if (!m.missile || c.roomSize === 1) {
            return c.pcZone;
        }
        const maxDist = FD.Rules.CombatEngine.maxZoneDistance(FD.Data.Weapons[m.missile].range);
        const dist = Math.abs(m.zone - c.pcZone);
        if (dist >= 1 && dist <= maxDist) {
            return m.zone;
        }
        let best = m.zone;
        let bestMove = 99;
        for (let z = 0; z <= 2; z++) {
            const d = Math.abs(z - c.pcZone);
            if (d >= 1 && d <= maxDist && Math.abs(z - m.zone) < bestMove) {
                best = z;
                bestMove = Math.abs(z - m.zone);
            }
        }
        return best;
    }

    /**
     * TABLE 11 (Ogre, Hobgoblin): takes the Centre and holds it once engaged.
     * Only leaves the Centre to deal with an adventurer who has slipped behind it.
     * @param {FD.Model.Monster} m           Monster.
     * @param {FD.Model.CombatState} c       Combat.
     * @returns {number}
     */
    static holdsCentre(m, c) {
        if (c.pcZone === m.zone) {
            return m.zone;
        }
        if (c.pcZone === FD.Enums.Zone.ENEMY) {
            return c.pcZone;
        }
        return FD.Enums.Zone.CENTRE;
    }

    /**
     * TABLE 11 (Zombie): slow advance; its Move of 1 does the rest.
     * @param {FD.Model.Monster} m           Monster.
     * @param {FD.Model.CombatState} c       Combat.
     * @returns {number}
     */
    static slowAdvance(m, c) {
        return c.pcZone;
    }

    /**
     * TABLE 11 (Stirge, Giant Snake): rapidly closes, seeking an unguarded target.
     * With a single adventurer the gap is always the adventurer.
     * @param {FD.Model.Monster} m           Monster.
     * @param {FD.Model.CombatState} c       Combat.
     * @returns {number}
     */
    static seeksGap(m, c) {
        return c.pcZone;
    }

    /**
     * TABLE 11 (Spider, Bugbear, Troglodyte): ambushers close in at once.
     * Their head start comes from setup (CombatEngine.start), not from here.
     * @param {FD.Model.Monster} m           Monster.
     * @param {FD.Model.CombatState} c       Combat.
     * @returns {number}
     */
    static ambusher(m, c) {
        return c.pcZone;
    }
}

/** Behaviour tag -> decision function. Add one entry per new tag (SPEC §13). */
MonsterAI.BEHAVIOURS = {
    advance: MonsterAI.advance,
    rushesCentre: MonsterAI.rushesCentre,
    prefersMissiles: MonsterAI.prefersMissiles,
    holdsCentre: MonsterAI.holdsCentre,
    slowAdvance: MonsterAI.slowAdvance,
    seeksGap: MonsterAI.seeksGap,
    ambusher: MonsterAI.ambusher
};

FD.Rules.MonsterAI = MonsterAI;
