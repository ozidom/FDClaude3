/**
 * Tests for FD.Core: dice, config and the log.
 */
FD.Tests.suite('Core: Dice', (t) => {
    const eq = FD.Tests.eq;
    const ok = FD.Tests.ok;

    t.it('same seed gives the same sequence', () => {
        const a = new FD.Core.Dice(42);
        const b = new FD.Core.Dice(42);
        for (let i = 0; i < 20; i++) {
            eq(a.roll(20), b.roll(20), 'roll ' + i);
        }
    });

    t.it('rolls stay in range', () => {
        const d = new FD.Core.Dice(7);
        for (let i = 0; i < 500; i++) {
            const r = d.roll(6);
            ok(r >= 1 && r <= 6, 'd6 out of range: ' + r);
        }
    });

    t.it('forced results are used first', () => {
        const d = new FD.Core.Dice(1);
        d.force([2, 5]);
        eq(d.d6(), 2);
        eq(d.d6(), 5);
    });

    t.it('parses dice notation', () => {
        const p = FD.Core.Dice.parse('2d8+2');
        eq(p.count, 2);
        eq(p.sides, 8);
        eq(p.mod, 2);
        eq(FD.Core.Dice.parse('d6').count, 1);
        eq(FD.Core.Dice.parse('1d8-1').mod, -1);
        eq(FD.Core.Dice.parse('3').mod, 3);
    });

    t.it('RULE 59b: maximum damage uses the top face', () => {
        eq(FD.Core.dice.rollExpr('2d6+1', true).total, 13);
    });

    t.it('log formats rolls with their rule tag', () => {
        const text = FD.Core.log.roll('R36', 'Listen', 'd6=2', 'fail (needed 1)');
        eq(text, '[R36 Listen] d6=2 → fail (needed 1)');
    });
});
