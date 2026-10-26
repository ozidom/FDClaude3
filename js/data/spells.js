/**
 * TABLE 8 spell lists with effect handlers (rule 53, SPEC §9).
 *
 * Each spell is { id, name, level, classes, range, duration, save, kind,
 * usableIn, targeting, desc, cast(ctx) }.
 *   range     - zones on the Clash Board (RULE 53f); 0 = self/touch.
 *   kind      - 'mechanical' (changes game state) or 'narrative' (GM text only).
 *   usableIn  - 'explore', 'combat' or both.
 *   targeting - 'none' | 'monster' | 'zone' | 'door'.
 *
 * cast(ctx) receives { state, character, combat, target, targetZone, corridor }
 * and returns { ok, text }. Handlers call rules services at run time, so this
 * file stays pure data at load time.
 * Durations: GM RULING, B/X durations with a B/X "turn" = one Dungeon Turn (RULE 53f).
 */
(function () {
    const log = () => FD.Core.log;
    const dice = () => FD.Core.dice;

    /**
     * Shared narrative handler: shows GM text and any reaction the current
     * room defines for this spell in its `spellHooks`.
     * @param {Object} ctx        Spell context.
     * @param {string} spellId    Spell id to look up in room.spellHooks.
     * @param {string} fallback   Text shown when the room has no hook.
     * @returns {{ok:boolean, text:string}}
     */
    function narrative(ctx, spellId, fallback) {
        const room = ctx.state.dungeon.getRoom(ctx.state.currentRoomId);
        let text = fallback;
        if (room && room.spellHooks && room.spellHooks[spellId]) {
            text = room.spellHooks[spellId];
        }
        log().narrate(text);
        return { ok: true, text: text };
    }

    /**
     * Applies a timed effect to the caster.
     * @param {Object} ctx      Spell context.
     * @param {Object} effect   { id, name, turns, data }.
     * @param {string} text     Log text.
     * @returns {{ok:boolean, text:string}}
     */
    function selfEffect(ctx, effect, text) {
        FD.Rules.SpellRules.addEffect(ctx.character, effect);
        log().add(text, 'good');
        return { ok: true, text: text };
    }

    const SPELLS = {
        // ---------------- Cleric Level 1 ----------------
        cureLightWounds: {
            id: 'cureLightWounds', name: 'Cure Light Wounds', level: 1, classes: ['cleric'],
            range: 0, duration: 'Instant', save: null, kind: 'mechanical',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'Restore 1d6+1 HP to a touched character.',
            cast(ctx) {
                // TABLE 8: restore 1d6+1 HP
                const r = dice().rollExpr('1d6+1', false);
                const healed = ctx.character.heal(r.total);
                log().roll('T8', 'Cure Light Wounds', r.text, 'healed ' + healed + ' HP');
                return { ok: true, text: 'Healed ' + healed + ' HP.' };
            }
        },
        detectEvil: {
            id: 'detectEvil', name: 'Detect Evil', level: 1, classes: ['cleric', 'wizard'], wizardLevel: 2,
            range: 2, duration: '6 turns', save: null, kind: 'narrative',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'The GM indicates nearby supernatural evil.',
            cast(ctx) {
                const text = FD.Rules.SpellRules.senseEvil(ctx.state);
                return narrative(ctx, 'detectEvil', text);
            }
        },
        detectMagic: {
            id: 'detectMagic', name: 'Detect Magic', level: 1, classes: ['cleric', 'wizard'],
            range: 2, duration: '2 turns', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'none',
            desc: 'Reveals magical objects and effects in the current Room.',
            cast(ctx) {
                const found = FD.Rules.SearchAndTrapRules.revealMagic(ctx.state);
                let text;
                if (found.length === 0) {
                    text = 'Nothing in this room glows with magic.';
                } else {
                    text = 'A faint glow reveals: ' + found.join(', ') + '.';
                }
                log().add(text, 'good');
                return { ok: true, text: text };
            }
        },
        light: {
            id: 'light', name: 'Light', level: 1, classes: ['cleric', 'wizard'],
            range: 1, duration: '12 turns', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'none',
            desc: 'Creates light without a torch for 12 Dungeon Turns.',
            cast(ctx) {
                FD.Rules.LightRules.addMagicLight(ctx.state, 'Light spell', 12, false);
                return { ok: true, text: 'A cool white light springs up around you (12 turns).' };
            }
        },
        protectionFromEvil: {
            id: 'protectionFromEvil', name: 'Protection from Evil', level: 1, classes: ['cleric', 'wizard'],
            range: 0, duration: '12 turns', save: null, kind: 'mechanical',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'Evil monsters attack you at -1; +1 to your saves against them.',
            cast(ctx) {
                return selfEffect(ctx, { id: 'protEvil', name: 'Protection from Evil', turns: 12 },
                    'A ward of faint light surrounds you: evil attacks you at -1 (12 turns).');
            }
        },
        purifyFoodAndWater: {
            id: 'purifyFoodAndWater', name: 'Purify Food and Water', level: 1, classes: ['cleric'],
            range: 0, duration: 'Instant', save: null, kind: 'narrative',
            usableIn: ['explore'], targeting: 'none',
            desc: 'Makes contaminated food and water safe.',
            cast(ctx) {
                return narrative(ctx, 'purifyFoodAndWater', 'Your water and rations are made clean and wholesome.');
            }
        },
        removeFear: {
            id: 'removeFear', name: 'Remove Fear', level: 1, classes: ['cleric'],
            range: 0, duration: 'Instant', save: null, kind: 'narrative',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'Ends or suppresses fear.',
            cast(ctx) {
                return narrative(ctx, 'removeFear', 'A calm settles over you. Whatever dread this place holds loosens its grip.');
            }
        },
        resistCold: {
            id: 'resistCold', name: 'Resist Cold', level: 1, classes: ['cleric'],
            range: 0, duration: '6 turns', save: null, kind: 'narrative',
            usableIn: ['explore'], targeting: 'none',
            desc: 'Reduces damage and effects from cold.',
            cast(ctx) {
                return narrative(ctx, 'resistCold', 'Warmth spreads through your limbs; the crypt chill no longer bites.');
            }
        },

        // ---------------- Wizard Level 1 ----------------
        charmPerson: {
            id: 'charmPerson', name: 'Charm Person', level: 1, classes: ['wizard'],
            range: 2, duration: 'Until broken', save: 'spells', kind: 'mechanical',
            usableIn: ['combat'], targeting: 'monster',
            desc: 'A humanoid of up to 4+1 HD becomes friendly (save vs Spells).',
            cast(ctx) {
                const m = ctx.target;
                if (!m || !m.hasTag('humanoid') || m.hdValue > 4.25) {
                    const t = (m ? m.name : 'That creature') + ' is not a person the spell can charm.';
                    log().add(t, 'info');
                    return { ok: true, text: t };
                }
                // RULE 53f: unwilling targets save vs Spells
                const save = FD.Rules.SavingThrowRules.monsterSave(m, 'spells', 'Charm Person');
                if (save.success) {
                    return { ok: true, text: m.name + ' shrugs off the charm.' };
                }
                m.state = FD.Enums.MonsterState.CHARMED;
                const t = m.name + ' lowers its weapon and regards you as a friend.';
                log().add(t, 'good');
                return { ok: true, text: t };
            }
        },
        floatingDisc: {
            id: 'floatingDisc', name: 'Floating Disc', level: 1, classes: ['wizard'],
            range: 0, duration: '6 turns', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'none',
            desc: 'A floating carrier: +10 Slots for 6 Dungeon Turns.',
            cast(ctx) {
                return selfEffect(ctx, { id: 'floatingDisc', name: 'Floating Disc', turns: 6, data: { slots: 10 } },
                    'A shimmering disc floats at your hip, ready to carry 10 more Slots (6 turns).');
            }
        },
        holdPortal: {
            id: 'holdPortal', name: 'Hold Portal', level: 1, classes: ['wizard'],
            range: 1, duration: '2d6 turns', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'door',
            desc: 'Holds a door shut for 2d6 Dungeon Turns. Nothing passes it.',
            cast(ctx) {
                const r = dice().rollExpr('2d6', false);
                ctx.corridor.door.heldTurns = r.total;
                log().roll('T8', 'Hold Portal', r.text, 'door held for ' + r.total + ' turns');
                return { ok: true, text: 'The door is magically held for ' + r.total + ' turns.' };
            }
        },
        magicMissile: {
            id: 'magicMissile', name: 'Magic Missile', level: 1, classes: ['wizard'],
            range: 2, duration: 'Instant', save: null, kind: 'mechanical',
            usableIn: ['combat'], targeting: 'monster',
            desc: 'Automatically hits a visible target for 1d6+1. No save (rule 53f).',
            cast(ctx) {
                const m = ctx.target;
                // TABLE 8: auto-hit, 1d6+1; RULE 53f: no save
                const r = dice().rollExpr('1d6+1', FD.Core.config.maxDamage);
                log().roll('T8', 'Magic Missile', r.text, r.total + ' damage to ' + m.name);
                FD.Rules.CombatEngine.damageMonster(ctx.state, m, r.total, 'Magic Missile');
                return { ok: true, text: 'Magic Missile strikes ' + m.name + ' for ' + r.total + '.' };
            }
        },
        readLanguages: {
            id: 'readLanguages', name: 'Read Languages', level: 1, classes: ['wizard'],
            range: 0, duration: '2 turns', save: null, kind: 'narrative',
            usableIn: ['explore'], targeting: 'none',
            desc: 'Understand an otherwise unreadable mundane text.',
            cast(ctx) {
                return narrative(ctx, 'readLanguages', 'There is no writing here worth reading.');
            }
        },
        readMagic: {
            id: 'readMagic', name: 'Read Magic', level: 1, classes: ['wizard'],
            range: 0, duration: '1 turn', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'none',
            desc: 'Deciphers magical writing so scrolls can be cast (rule 53h).',
            cast(ctx) {
                let count = 0;
                for (const item of ctx.character.inventory.items) {
                    if (item.defId === 'scroll' && !item.deciphered) {
                        item.deciphered = true;
                        item.name = 'Scroll of ' + FD.Data.Spells[item.spellId].name;
                        count++;
                    }
                }
                let text;
                if (count === 0) {
                    text = 'You have no undeciphered magical writing.';
                } else {
                    text = 'The runes resolve into meaning: ' + count + ' scroll(s) deciphered.';
                }
                log().add(text, 'good');
                return { ok: true, text: text };
            }
        },
        shield: {
            id: 'shield', name: 'Shield', level: 1, classes: ['wizard'],
            range: 0, duration: '2 turns', save: null, kind: 'mechanical',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'GM RULING: +4 AC for 2 Dungeon Turns (the B/X Shield conversion).',
            cast(ctx) {
                return selfEffect(ctx, { id: 'shieldSpell', name: 'Shield', turns: 2, data: { ac: 4 } },
                    'An invisible barrier hardens around you: +4 AC (2 turns).');
            }
        },
        sleep: {
            id: 'sleep', name: 'Sleep', level: 1, classes: ['wizard'],
            range: 2, duration: '4d4 turns', save: null, kind: 'mechanical',
            usableIn: ['combat'], targeting: 'zone',
            desc: '2d8 HD of creatures of 4+1 HD or less in one zone fall asleep. No save. Not undead.',
            cast(ctx) {
                // TABLE 8 / SPEC §9: 2d8 HD of creatures <= 4 HD; RULE 53f: no save
                const pool = dice().rollExpr('2d8', false);
                let remaining = pool.total;
                const candidates = FD.Rules.CombatEngine.monstersInZone(ctx.combat, ctx.targetZone)
                    .filter(m => !m.hasTag('undead') && m.hdValue <= 4.25)
                    .sort((a, b) => a.hdValue - b.hdValue);
                const slept = [];
                for (const m of candidates) {
                    // GM RULING: each creature counts its HD rounded up, minimum 1
                    const cost = Math.max(1, Math.ceil(m.hdValue));
                    if (cost <= remaining) {
                        remaining -= cost;
                        m.state = FD.Enums.MonsterState.ASLEEP;
                        slept.push(m.name);
                    }
                }
                let outcome = 'no one sleeps';
                if (slept.length > 0) {
                    outcome = slept.join(', ') + ' fall asleep';
                }
                log().roll('T8', 'Sleep', pool.text + ' HD in ' + FD.Enums.ZoneName[ctx.targetZone], outcome);
                return { ok: true, text: outcome };
            }
        },
        ventriloquism: {
            id: 'ventriloquism', name: 'Ventriloquism', level: 1, classes: ['wizard'],
            range: 1, duration: '2 turns', save: null, kind: 'narrative',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'Throws your voice into the current or a nearby room.',
            cast(ctx) {
                return narrative(ctx, 'ventriloquism', 'Your voice echoes from the far side of the chamber. Nothing here is fooled, but it is good practice.');
            }
        },

        // ---------------- Wizard Level 2 ----------------
        continualLight: {
            id: 'continualLight', name: 'Continual Light', level: 2, classes: ['wizard'],
            range: 1, duration: 'Permanent', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'none',
            desc: 'Creates a permanent magical light on an object you carry.',
            cast(ctx) {
                FD.Rules.LightRules.addMagicLight(ctx.state, 'Continual Light', 0, true);
                return { ok: true, text: 'Your staff-head blazes with a light that will not fade.' };
            }
        },
        detectInvisible: {
            id: 'detectInvisible', name: 'Detect Invisible', level: 2, classes: ['wizard'],
            range: 2, duration: '6 turns', save: null, kind: 'narrative',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'Invisible creatures become visible to you.',
            cast(ctx) {
                return narrative(ctx, 'detectInvisible', 'You see nothing hidden by magic here.');
            }
        },
        esp: {
            id: 'esp', name: 'ESP', level: 2, classes: ['wizard'],
            range: 2, duration: '12 turns', save: null, kind: 'mechanical',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'Read surface thoughts: listening always succeeds and the Hidden Emotion is revealed.',
            cast(ctx) {
                return selfEffect(ctx, { id: 'esp', name: 'ESP', turns: 12 },
                    'Whispers of nearby minds brush against your own (12 turns).');
            }
        },
        invisibility: {
            id: 'invisibility', name: 'Invisibility', level: 2, classes: ['wizard'],
            range: 0, duration: 'Until you attack or cast', save: null, kind: 'mechanical',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'You cannot be targeted, and monsters you meet are unaware, until you attack or cast.',
            cast(ctx) {
                ctx.character.conditions.invisible = true;
                const t = 'You fade from sight.';
                log().add(t, 'good');
                return { ok: true, text: t };
            }
        },
        knock: {
            id: 'knock', name: 'Knock', level: 2, classes: ['wizard'],
            range: 1, duration: 'Instant', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'door',
            desc: 'Opens a stuck, locked, barred or magically held door.',
            cast(ctx) {
                const door = ctx.corridor.door;
                door.state = FD.Enums.DoorState.CLOSED;
                door.heldTurns = 0;
                door.wizardLocked = false;
                door.barredFrom = null;
                const t = 'With a sharp clack, the door swings free.';
                log().add(t, 'good');
                return { ok: true, text: t };
            }
        },
        levitate: {
            id: 'levitate', name: 'Levitate', level: 2, classes: ['wizard'],
            range: 0, duration: '6 turns', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'none',
            desc: 'Float past pits and chasms for 6 Dungeon Turns.',
            cast(ctx) {
                return selfEffect(ctx, { id: 'levitate', name: 'Levitate', turns: 6 },
                    'Your feet lift from the floor (6 turns). Pits and chasms hold no fear.');
            }
        },
        locateObject: {
            id: 'locateObject', name: 'Locate Object', level: 2, classes: ['wizard'],
            range: 2, duration: '2 turns', save: null, kind: 'narrative',
            usableIn: ['explore'], targeting: 'none',
            desc: 'The GM indicates the direction of a known object.',
            cast(ctx) {
                return narrative(ctx, 'locateObject', FD.Rules.SpellRules.locateTreasure(ctx.state));
            }
        },
        mirrorImage: {
            id: 'mirrorImage', name: 'Mirror Image', level: 2, classes: ['wizard'],
            range: 0, duration: '6 turns', save: null, kind: 'mechanical',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: '1d4 images: each attack aimed at you destroys an image instead.',
            cast(ctx) {
                const r = dice().rollExpr('1d4', false);
                FD.Rules.SpellRules.addEffect(ctx.character, { id: 'mirrorImage', name: 'Mirror Image', turns: 6, data: { images: r.total } });
                log().roll('T8', 'Mirror Image', r.text, r.total + ' images');
                return { ok: true, text: r.total + ' images of you shimmer into being.' };
            }
        },
        phantasmalForce: {
            id: 'phantasmalForce', name: 'Phantasmal Force', level: 2, classes: ['wizard'],
            range: 2, duration: 'Concentration', save: null, kind: 'narrative',
            usableIn: ['explore', 'combat'], targeting: 'none',
            desc: 'Creates an illusion interpreted by the GM.',
            cast(ctx) {
                return narrative(ctx, 'phantasmalForce', 'Your illusion shimmers convincingly in the gloom, but there is no one here to fool.');
            }
        },
        web: {
            id: 'web', name: 'Web', level: 2, classes: ['wizard'],
            range: 2, duration: '1d4 rounds / 48 turns on a door', save: null, kind: 'mechanical',
            usableIn: ['combat', 'explore'], targeting: 'zone',
            desc: 'Combat: creatures in a zone are stuck 1d4 rounds (large: 1). Exploring: webs a doorway shut for 48 turns.',
            cast(ctx) {
                if (ctx.combat) {
                    const caught = [];
                    for (const m of FD.Rules.CombatEngine.monstersInZone(ctx.combat, ctx.targetZone)) {
                        let rounds = 1;
                        if (!m.hasTag('large')) {
                            rounds = dice().roll(4);
                        }
                        m.webbedRounds = rounds;
                        caught.push(m.name + ' (' + rounds + ')');
                    }
                    let outcome = 'nothing is caught';
                    if (caught.length > 0) {
                        outcome = 'stuck: ' + caught.join(', ');
                    }
                    log().roll('T8', 'Web', FD.Enums.ZoneName[ctx.targetZone] + ' zone', outcome);
                    return { ok: true, text: outcome };
                }
                ctx.corridor.door.heldTurns = 48;
                const t = 'Sticky strands seal the doorway (48 turns).';
                log().add(t, 'good');
                return { ok: true, text: t };
            }
        },
        wizardLock: {
            id: 'wizardLock', name: 'Wizard Lock', level: 2, classes: ['wizard'],
            range: 1, duration: 'Permanent', save: null, kind: 'mechanical',
            usableIn: ['explore'], targeting: 'door',
            desc: 'Magically locks a door. You may pass it freely; nothing else can.',
            cast(ctx) {
                ctx.corridor.door.wizardLocked = true;
                const t = 'Glowing sigils lock the door against all but you.';
                log().add(t, 'good');
                return { ok: true, text: t };
            }
        }
    };

    FD.Data.Spells = SPELLS;

    /** TABLE 8: Cleric Level 1 list. */
    FD.Data.SpellLists = {
        cleric: { 1: ['cureLightWounds', 'detectEvil', 'detectMagic', 'light', 'protectionFromEvil', 'purifyFoodAndWater', 'removeFear', 'resistCold'] },
        wizard: {
            1: ['charmPerson', 'detectMagic', 'floatingDisc', 'holdPortal', 'light', 'magicMissile', 'protectionFromEvil', 'readLanguages', 'readMagic', 'shield', 'sleep', 'ventriloquism'],
            2: ['continualLight', 'detectEvil', 'detectInvisible', 'esp', 'invisibility', 'knock', 'levitate', 'locateObject', 'mirrorImage', 'phantasmalForce', 'web', 'wizardLock']
        }
    };

    /**
     * Returns the level a spell has on a given class list. Detect Evil is
     * Cleric 1 but Wizard 2 (TABLE 8).
     * @param {string} spellId   Spell id.
     * @param {string} listId    'cleric' or 'wizard'.
     * @returns {number}         Spell level, or 0 if not on that list.
     */
    FD.Data.spellLevelFor = function (spellId, listId) {
        const lists = FD.Data.SpellLists[listId];
        if (!lists) {
            return 0;
        }
        for (const level of Object.keys(lists)) {
            if (lists[level].indexOf(spellId) >= 0) {
                return parseInt(level, 10);
            }
        }
        return 0;
    };
})();
