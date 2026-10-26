/**
 * Tests for the FD.Rules services, using seeded and forced dice.
 */
FD.Tests.suite('Exploration rules', (t) => {
    const eq = FD.Tests.eq;
    const ok = FD.Tests.ok;

    t.it('RULE 36: humans listen on 1, dwarves on 1-2', () => {
        const state = FD.Tests.makeState({ roomId: 'r1' });
        const c1 = state.dungeon.getCorridor('c1');
        FD.Core.dice.force([2]);
        ok(!FD.Rules.DoorRules.listen(state, c1).success, 'human fails on 2');
        const dwarf = FD.Tests.makeState({ roomId: 'r1', raceId: 'dwarf', classId: 'fighter' });
        FD.Core.dice.force([2]);
        ok(FD.Rules.DoorRules.listen(dwarf, dwarf.dungeon.getCorridor('c1')).success, 'dwarf hears on 2');
    });

    t.it('RULE 36: a successful listen hears the goblins', () => {
        const state = FD.Tests.makeState({ roomId: 'r1' });
        FD.Core.dice.force([1]);
        const r = FD.Rules.DoorRules.listen(state, state.dungeon.getCorridor('c1'));
        ok(r.text.indexOf('Maybe humans go away') >= 0, r.text);
    });

    t.it('RULE 37: forcing a stuck door uses a STR check', () => {
        const state = FD.Tests.makeState({ roomId: 'r4', attributes: { STR: 12 } });
        const c7 = state.dungeon.getCorridor('c7');
        FD.Core.dice.force([15]);
        const fail = FD.Rules.DoorRules.force(state, c7);
        ok(!fail.success && fail.turns === 1 && fail.extraChecks === 1, 'failure costs a turn and a check');
        FD.Core.dice.force([12]);
        ok(FD.Rules.DoorRules.force(state, c7).success, 'success on 12 vs STR 12');
        eq(c7.door.state, 'closed');
    });

    t.it('RULE 40: elves find secret doors on 1-2', () => {
        const state = FD.Tests.makeState({ roomId: 'r5', raceId: 'elf' });
        FD.Core.dice.force([2]);
        FD.Rules.SearchAndTrapRules.searchRoom(state);
        ok(state.dungeon.getCorridor('c9').discovered, 'secret door found');
        const human = FD.Tests.makeState({ roomId: 'r5' });
        FD.Core.dice.force([2]);
        FD.Rules.SearchAndTrapRules.searchRoom(human);
        ok(!human.dungeon.getCorridor('c9').discovered, 'human misses on 2');
    });

    t.it('TABLE 2: dwarves find stonework on 1-2', () => {
        const state = FD.Tests.makeState({ roomId: 'r5', raceId: 'dwarf' });
        FD.Core.dice.force([2]);
        FD.Rules.SearchAndTrapRules.searchRoom(state);
        ok(!state.room.getFeature('f5a').hidden, 'flagstone found');
        eq(state.room.visibleTreasure().length, 3);
    });

    t.it("RULE 38: a 10' pole finds the pit trap with no roll", () => {
        const state = FD.Tests.makeState({ roomId: 'r4' });
        FD.Rules.SearchAndTrapRules.probeWithPole(state);
        ok(!state.dungeon.getCorridor('c6').trap.hidden, 'pit found');
    });

    t.it('RULE 39 / 39a: an unfound pit triggers on 1-2 and deals 1d6', () => {
        const state = FD.Tests.makeState({ roomId: 'r4', hp: 20 });
        const c6 = state.dungeon.getCorridor('c6');
        FD.Core.dice.force([2, 4]);
        FD.Rules.ExplorationRules.moveThrough(state, c6, {});
        eq(state.character.hpCurrent, 16);
        eq(state.currentRoomId, 'r5');
    });

    t.it('RULE 42: corridors cost double when encumbered', () => {
        const pc = FD.Tests.makeCharacter({ gold: 2000 });
        const c = new FD.Model.Corridor({ id: 'x', from: 'a', to: 'b', turns: 1 });
        ok(pc.isEncumbered, 'encumbered');
        eq(FD.Rules.EncumbranceRules.corridorTurns(pc, c), 2);
        eq(FD.Rules.EncumbranceRules.combatMove(pc), 1);
    });

    t.it('RULE 45: checks every second turn; RULE 41b every turn in the dark', () => {
        const state = FD.Tests.makeState();
        eq(FD.Rules.ExplorationRules.advanceTime(state, 4).checks, 2);
        state.clock.lights = [];
        eq(FD.Rules.ExplorationRules.advanceTime(state, 3).checks, 3);
    });

    t.it('RULE 41: a torch burns out after 6 turns', () => {
        const state = FD.Tests.makeState();
        state.clock.lights = [];
        state.character.inventory.add(FD.Model.Inventory.createItem('gear', 'torch'));
        state.character.inventory.add(FD.Model.Inventory.createItem('gear', 'tinderbox'));
        ok(FD.Rules.LightRules.canLightTorch(state).ok, 'can light');
        FD.Rules.LightRules.lightTorch(state);
        FD.Rules.ExplorationRules.advanceTime(state, 5);
        ok(!state.clock.isDark, 'still lit after 5');
        FD.Rules.ExplorationRules.advanceTime(state, 1);
        ok(state.clock.isDark, 'dark after 6');
    });

    t.it('RULE 44: fatigue penalty after five turns without rest', () => {
        const state = FD.Tests.makeState();
        FD.Rules.ExplorationRules.advanceTime(state, 5);
        eq(FD.Rules.AttributeRules.fatiguePenalty(state), 0);
        FD.Rules.ExplorationRules.advanceTime(state, 1);
        eq(FD.Rules.AttributeRules.fatiguePenalty(state), 1);
        state.clock.rest();
        eq(FD.Rules.AttributeRules.fatiguePenalty(state), 0);
    });

    t.it('RULE 66: leaving is only possible from the entrance', () => {
        const state = FD.Tests.makeState({ roomId: 'r3' });
        ok(!FD.Rules.ExplorationRules.availableActions(state).some(a => a.type === 'leave'), 'no leave in r3');
        state.currentRoomId = 'r1';
        ok(FD.Rules.ExplorationRules.availableActions(state).some(a => a.type === 'leave'), 'leave at entrance');
    });

    t.it('RULE 67 / 68: death leaves gear in the room', () => {
        const state = FD.Tests.makeState({ roomId: 'r3', gold: 40 });
        state.character.inventory.add(FD.Model.Inventory.createItem('weapon', 'sword'));
        const before = state.room.treasure.length;
        FD.Rules.ExplorationRules.handleDeath(state, 'tested to death');
        eq(state.room.treasure.length, before + 2);
        eq(state.screen, FD.Enums.Screen.GAME_OVER);
        eq(state.graveyard.length, 1);
    });
});

FD.Tests.suite('Encounter rules', (t) => {
    const eq = FD.Tests.eq;
    const ok = FD.Tests.ok;

    t.it('TABLE 12: reaction bands', () => {
        eq(FD.Data.reactionFor(2).id, 'attack');
        eq(FD.Data.reactionFor(3).id, 'hostile');
        eq(FD.Data.reactionFor(5).id, 'hostile');
        eq(FD.Data.reactionFor(6).id, 'uncertain');
        eq(FD.Data.reactionFor(8).id, 'uncertain');
        eq(FD.Data.reactionFor(9).id, 'talkative');
        eq(FD.Data.reactionFor(11).id, 'talkative');
        eq(FD.Data.reactionFor(12).id, 'friendly');
    });

    t.it('RULE 47: both sides surprised cancels out', () => {
        const state = FD.Tests.makeState({ roomId: 'r2' });
        const def = state.room.encounter;
        // spawn: 2 goblins HP, then surprise pc 1, monsters 1, then reaction 2d6
        FD.Core.dice.force([4, 4, 1, 1, 4, 4]);
        FD.Rules.EncounterRules.begin(state, def, {});
        ok(!state.encounter.surprise.pc && !state.encounter.surprise.monsters, 'no surprise');
        eq(state.encounter.reaction, 'uncertain');
    });

    t.it('RULE 50a: a correct emotion guess reveals the secret', () => {
        const state = FD.Tests.makeState({ roomId: 'r2' });
        FD.Core.dice.force([4, 4, 6, 6, 4, 4]);
        FD.Rules.EncounterRules.begin(state, state.room.encounter, {});
        FD.Core.dice.force([2]);
        FD.Rules.EncounterRules.talk(state);
        eq(state.encounter.phase, 'emotion');
        eq(state.encounter.emotion, 2);
        FD.Rules.EncounterRules.guessEmotion(state, 2);
        ok(state.knows('flagstone'), 'learned the flagstone');
        ok(FD.Rules.ExplorationRules.availableActions(FD.Tests.makeState({ roomId: 'r5' })).every(a => a.type !== 'recall'), 'other game unaffected');
    });

    t.it('RULE 50a: a wrong guess uses the fail outcome (Afraid -> flee)', () => {
        const state = FD.Tests.makeState({ roomId: 'r2' });
        FD.Core.dice.force([4, 4, 6, 6, 4, 4]);
        FD.Rules.EncounterRules.begin(state, state.room.encounter, {});
        FD.Core.dice.force([2]);
        FD.Rules.EncounterRules.talk(state);
        FD.Rules.EncounterRules.guessEmotion(state, 6);
        eq(state.screen, FD.Enums.Screen.EXPLORATION);
        eq(state.room.encounter.state, FD.Enums.EncounterState.GONE);
    });

    t.it('RULE 50: gold offer bonus', () => {
        const m = { wants: 'gold', bribeMin: 5 };
        eq(FD.Rules.ParleyRules.goldOfferBonus(m, 4), 0);
        eq(FD.Rules.ParleyRules.goldOfferBonus(m, 5), 1);
        eq(FD.Rules.ParleyRules.goldOfferBonus(m, 15), 2);
        eq(FD.Rules.ParleyRules.goldOfferBonus({ wants: 'food' }, 100), 0);
    });

    t.it('TABLE 13: 2d6 above morale fails', () => {
        const m = FD.Model.Monster.fromTemplate('goblin', 4);
        FD.Core.dice.force([4, 3]);
        ok(FD.Rules.MoraleRules.check([m], 'test').passed, '7 vs 7 holds');
        FD.Core.dice.force([4, 4]);
        ok(!FD.Rules.MoraleRules.check([m], 'test').passed, '8 vs 7 fails');
    });

    t.it('SPEC §7: undead skip morale', () => {
        ok(!FD.Rules.MoraleRules.checksMorale(FD.Model.Monster.fromTemplate('skeleton', 4)), 'skeleton');
        ok(FD.Rules.MoraleRules.checksMorale(FD.Model.Monster.fromTemplate('orc', 4)), 'orc');
    });
});

FD.Tests.suite('Combat rules', (t) => {
    const eq = FD.Tests.eq;
    const ok = FD.Tests.ok;

    /**
     * Puts the test state into a fight with the given monsters.
     * @param {FD.Model.GameState} state  Game state.
     * @param {FD.Model.Monster[]} monsters  Monsters.
     * @param {string} [distance]  Distance.
     * @returns {FD.Model.CombatState}
     */
    function fight(state, monsters, distance) {
        state.encounter = { def: { id: 'test', motivation: { pursues: true } }, monsters: monsters, surprise: { pc: false, monsters: false }, distance: distance || 'normal', wandering: true };
        return FD.Rules.CombatEngine.start(state);
    }

    t.it('RULE 59: monster AB by Hit Dice', () => {
        const ab = (hd) => {
            const m = FD.Model.Monster.fromTemplate('goblin', 4);
            m.hd = hd;
            return m.attackBonus;
        };
        eq(ab('1/2'), 0);
        eq(ab('1-1'), 0);
        eq(ab('1'), 0);
        eq(ab('1+1'), 1);
        eq(ab('2'), 1);
        eq(ab('2+2'), 2);
        eq(ab('3'), 2);
        eq(ab('4+1'), 3);
    });

    t.it('RULE 67: monster XP is 10 per HD, minimum 5', () => {
        eq(FD.Model.Monster.fromTemplate('giantRat', 2).xpValue, 5);
        eq(FD.Model.Monster.fromTemplate('zombie', 9).xpValue, 20);
        eq(FD.Model.Monster.fromTemplate('ogre', 20).xpValue, 40);
    });

    t.it('RULE CONFLICT 2: weapon range to zones', () => {
        const z = FD.Rules.CombatEngine.maxZoneDistance;
        eq(z(FD.Data.Weapons.sword.range), 0);
        eq(z(FD.Data.Weapons.dagger.thrownRange), 1);
        eq(z(FD.Data.Weapons.sling.range), 1);
        eq(z(FD.Data.Weapons.crossbow.range), 1);
        eq(z(FD.Data.Weapons.shortBow.range), 2);
        eq(z(FD.Data.Weapons.longBow.range), 2);
    });

    t.it('RULE CONFLICT 3: a total equal to AC hits', () => {
        const state = FD.Tests.makeState({ attributes: { STR: 10 }, hp: 30 });
        state.character.inventory.add(FD.Model.Inventory.createItem('weapon', 'sword'));
        state.character.equipped.weapon = state.character.inventory.items[0].uid;
        const goblin = FD.Model.Monster.fromTemplate('goblin', 20);
        fight(state, [goblin], 'close');
        state.combat.pcZone = FD.Enums.Zone.CENTRE;
        // AC 13: d20 12 + AB 1 = 13 hits; damage d8 = 5
        FD.Core.dice.force([12, 5]);
        FD.Rules.CombatEngine.pcMelee(state, { type: 'attack' });
        eq(goblin.hp, 15);
    });

    t.it('TABLE 9: backstab +4 and x2 against an unaware target', () => {
        const state = FD.Tests.makeState({ classId: 'thief', hp: 30 });
        const goblin = FD.Model.Monster.fromTemplate('goblin', 20);
        fight(state, [goblin], 'close');
        goblin.aware = false;
        state.combat.pcZone = FD.Enums.Zone.CENTRE;
        // fists 1d2: d20 9 + 0 + 4 = 13 hits AC 13; damage 2 x2 = 4
        FD.Core.dice.force([9, 2]);
        FD.Rules.CombatEngine.pcMelee(state, { type: 'attack' });
        eq(goblin.hp, 16);
    });

    t.it('RULE 58b: you cannot move through a zone with a standing enemy', () => {
        const state = FD.Tests.makeState();
        const goblin = FD.Model.Monster.fromTemplate('goblin', 5);
        fight(state, [goblin], 'close');
        const moves = FD.Rules.CombatEngine.legalMoves(state);
        ok(moves[1].ok, 'can enter Centre');
        ok(!moves[2].ok, 'cannot pass through Centre');
    });

    t.it('RULE 48: no one enters the Centre in round 1 at Distant', () => {
        const state = FD.Tests.makeState();
        fight(state, [FD.Model.Monster.fromTemplate('goblin', 5)], 'distant');
        ok(!FD.Rules.CombatEngine.legalMoves(state)[1].ok, 'Centre closed');
    });

    t.it('RULE 60: no missiles in a Small room', () => {
        const state = FD.Tests.makeState({ roomId: 'r2' });
        state.character.inventory.add(FD.Model.Inventory.createItem('weapon', 'sling'));
        fight(state, [FD.Model.Monster.fromTemplate('goblin', 5)]);
        const missile = FD.Rules.CombatEngine.legalActions(state, 0).find(a => a.type === 'missile');
        ok(!missile.enabled && missile.reason.indexOf('rule 60') >= 0, missile.reason);
    });

    t.it('RULE 55: a tie applies damage at the end of the round', () => {
        const state = FD.Tests.makeState({ hp: 30 });
        const goblin = FD.Model.Monster.fromTemplate('goblin', 1);
        fight(state, [goblin], 'close');
        state.combat.pcZone = FD.Enums.Zone.CENTRE;
        state.combat.simultaneous = true;
        FD.Core.dice.force([20, 1]);
        FD.Rules.CombatEngine.pcMelee(state, { type: 'attack' });
        eq(goblin.state, 'standing', 'still standing before end of round');
        FD.Rules.CombatEngine.applyPending(state);
        eq(goblin.state, 'dead');
    });

    t.it('TABLE 11: wights need magic or silver weapons', () => {
        const state = FD.Tests.makeState({ hp: 30 });
        const wight = FD.Model.Monster.fromTemplate('wight', 15);
        fight(state, [wight], 'close');
        state.combat.pcZone = FD.Enums.Zone.CENTRE;
        FD.Core.dice.force([20, 2]);
        FD.Rules.CombatEngine.pcMelee(state, { type: 'attack' });
        eq(wight.hp, 15);
    });

    t.it('TABLE 2: elves are immune to ghoul paralysis', () => {
        const state = FD.Tests.makeState({ raceId: 'elf', hp: 30 });
        const ghoul = FD.Model.Monster.fromTemplate('ghoul', 10);
        fight(state, [ghoul], 'close');
        state.combat.pcZone = FD.Enums.Zone.CENTRE;
        FD.Core.dice.force([20, 1]);
        FD.Rules.CombatEngine.monsterAttack(state, ghoul, ghoul.attacks[0], false);
        eq(state.character.conditions.paralysedRounds, 0);
    });

    t.it('RULE 52a: first casualty triggers a morale check', () => {
        const state = FD.Tests.makeState({ hp: 30 });
        const g1 = FD.Model.Monster.fromTemplate('goblin', 1);
        const g2 = FD.Model.Monster.fromTemplate('goblin', 5);
        fight(state, [g1, g2], 'close');
        g1.state = 'dead';
        state.combat.casualties = 1;
        eq(FD.Rules.MoraleRules.dueTrigger(state.combat), FD.Data.Morale.triggers.halfDefeated);
    });

    t.it('TABLE 10: turning undead lookups', () => {
        const L = FD.Rules.TurnUndeadRules.lookup;
        eq(L(1, 'skeleton'), 7);
        eq(L(1, 'wight'), null);
        eq(L(2, 'skeleton'), 'T');
        eq(L(3, 'skeleton'), 'D');
        eq(L(3, 'wraith'), 11);
    });

    t.it('RULE 61d: a successful turn drives skeletons off', () => {
        const state = FD.Tests.makeState({ classId: 'cleric', hp: 30 });
        state.character.inventory.add(FD.Model.Inventory.createItem('gear', 'holySymbol'));
        const s1 = FD.Model.Monster.fromTemplate('skeleton', 5);
        const s2 = FD.Model.Monster.fromTemplate('skeleton', 5);
        fight(state, [s1, s2]);
        // 2d6 = 4+4 = 8 >= 7; HD pool 2d6 = 1+1 = 2
        FD.Core.dice.force([4, 4, 1, 1]);
        FD.Rules.TurnUndeadRules.attempt(state);
        ok(s1.fleeing && s2.fleeing, 'both turned');
    });

    t.it('RULE 53f: Magic Missile auto-hits for 1d6+1', () => {
        const state = FD.Tests.makeState({ classId: 'wizard' });
        state.character.prepared = [{ spellId: 'magicMissile', level: 1, used: false }];
        const g = FD.Model.Monster.fromTemplate('goblin', 10);
        fight(state, [g]);
        FD.Core.dice.force([4]);
        FD.Rules.SpellRules.cast(state, 'magicMissile', { source: 'slot', target: g });
        eq(g.hp, 5);
        ok(state.character.prepared[0].used, 'slot used');
    });

    t.it('Sleep affects 2d8 HD of non-undead in one zone', () => {
        const state = FD.Tests.makeState({ classId: 'wizard' });
        state.character.prepared = [{ spellId: 'sleep', level: 1, used: false }];
        const rats = [FD.Model.Monster.fromTemplate('giantRat', 2), FD.Model.Monster.fromTemplate('giantRat', 2), FD.Model.Monster.fromTemplate('skeleton', 2)];
        fight(state, rats);
        FD.Core.dice.force([1, 1]);
        FD.Rules.SpellRules.cast(state, 'sleep', { source: 'slot', targetZone: FD.Enums.Zone.ENEMY });
        eq(rats[0].state, 'asleep');
        eq(rats[1].state, 'asleep');
        eq(rats[2].state, 'standing', 'undead immune');
    });

    t.it('RULE 42 / 65: an encumbered PC cannot outrun pursuers', () => {
        const state = FD.Tests.makeState({ roomId: 'r3', gold: 3000 });
        state.delve.cameFromCorridorId = 'c2';
        fight(state, [FD.Model.Monster.fromTemplate('zombie', 5)]);
        state.combat.pcLeftBoard = true;
        FD.Rules.CombatEngine.resolvePursuit(state, {});
        ok(!state.combat.over && !state.combat.pcLeftBoard, 'caught');
    });
});

FD.Tests.suite('Town, XP & saving', (t) => {
    const eq = FD.Tests.eq;
    const ok = FD.Tests.ok;

    t.it('RULE 71: one level per delve; excess XP lost', () => {
        const pc = FD.Tests.makeCharacter({ classId: 'fighter' });
        const r = FD.Rules.ExperienceRules.applyXp(pc, 5000);
        eq(pc.level, 2);
        eq(pc.xp, 3999);
        eq(r.lost, 1001);
    });

    t.it('RULE 71: level 3 is the maximum', () => {
        const pc = FD.Tests.makeCharacter({ classId: 'thief', level: 3 });
        pc.xp = 2400;
        FD.Rules.ExperienceRules.applyXp(pc, 10000);
        eq(pc.level, 3);
        eq(pc.xp, 12400);
    });

    t.it('RULE 71: levelling adds a Hit Die + CON (minimum 1)', () => {
        const pc = FD.Tests.makeCharacter({ classId: 'fighter', hp: 8, attributes: { CON: 3 } });
        FD.Core.dice.force([1]);
        FD.Rules.ExperienceRules.levelUp(pc);
        eq(pc.hpMax, 9);
    });

    t.it('RULE 67: XP from treasure carried out plus monsters', () => {
        const state = FD.Tests.makeState({ gold: 10 });
        state.character.inventory.add(FD.Model.Inventory.fromTreasure({ id: 'a', kind: 'coins', name: 'Purse', value: 50 }));
        state.character.inventory.add(FD.Model.Inventory.fromTreasure({ id: 'b', kind: 'treasure', name: 'Gem', value: 100, slots: 0 }));
        state.delve.monsterXp = 15;
        const s = FD.Rules.TownRules.enterTown(state);
        eq(s.gained, 165);
        eq(state.character.xp, 165);
        eq(state.character.gold, 60, 'coins go to the purse');
        eq(FD.Rules.ExperienceRules.treasureValue(state.character), 0, 'no XP twice');
    });

    t.it('RULE 66: selling treasure at value, gear at half', () => {
        const state = FD.Tests.makeState();
        state.hasDelved = true;
        const gem = state.character.inventory.add(FD.Model.Inventory.fromTreasure({ id: 'g', kind: 'treasure', name: 'Gem', value: 50 }));
        const sword = state.character.inventory.add(FD.Model.Inventory.createItem('weapon', 'sword'));
        eq(FD.Rules.TownRules.sellValue(state, gem), 50);
        eq(FD.Rules.TownRules.sellValue(state, sword), 5);
    });

    t.it('RULE 66: rumours are recorded, truth kept secret', () => {
        const state = FD.Tests.makeState();
        const text = FD.Rules.TownRules.askRumour(state);
        ok(typeof text === 'string' && text.length > 0, 'rumour text');
        eq(state.town.rumoursKnown.length, 1);
        eq(state.town.day, 2);
    });

    t.it('Save/load round trip keeps the character and dungeon state', () => {
        const state = FD.Tests.makeState({ roomId: 'r5', raceId: 'dwarf', gold: 77 });
        state.dungeon.getCorridor('c9').discovered = true;
        state.learn('flagstone');
        const copy = FD.Model.GameState.fromJSON(JSON.parse(JSON.stringify(state.toJSON())));
        eq(copy.character.gold, 77);
        eq(copy.character.raceId, 'dwarf');
        ok(copy.dungeon.getCorridor('c9').discovered, 'secret door remembered');
        ok(copy.knows('flagstone'), 'knowledge remembered');
        ok(copy.dungeon.getCorridor('c1').door instanceof FD.Model.Door, 'door rebuilt');
    });

    t.it('Placed monsters keep their HP between visits (rule 68)', () => {
        const state = FD.Tests.makeState({ roomId: 'r6' });
        FD.Rules.EncounterRules.begin(state, state.room.encounter, {});
        state.room.encounter.live[0].hp = 1;
        const copy = FD.Model.GameState.fromJSON(JSON.parse(JSON.stringify(state.toJSON())));
        const m = copy.dungeon.getRoom('r6').encounter.live[0];
        ok(m instanceof FD.Model.Monster, 'rebuilt as Monster');
        eq(m.hp, 1);
    });
});
