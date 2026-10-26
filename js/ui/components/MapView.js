/**
 * The player's MAP (RULE 4a, RULE 33), drawn as inline SVG. Only discovered rooms
 * and corridors appear; visible exits to unexplored rooms end in "?"; secret
 * corridors stay hidden until found. The party marker shows the current room.
 */
class MapView {
    /**
     * Renders the map.
     * @param {FD.Model.GameState} state  Game state.
     * @returns {HTMLElement}
     */
    static render(state) {
        const h = FD.UI.Dom.h;
        const s = FD.UI.Dom.svg;
        const dungeon = state.dungeon;
        const CELL = 56;
        const PAD = 42;
        // Crop to what the party has discovered (rooms plus the stubs of visible exits),
        // never smaller than a 4 x 3 cell window so a fresh map is not absurdly zoomed
        let minX = 99;
        let maxX = -99;
        let minY = 99;
        let maxY = -99;
        const include = (x, y) => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        };
        for (const r of dungeon.rooms) {
            if (r.discovered) {
                include(r.x, r.y);
            }
        }
        for (const c of dungeon.corridors) {
            const a = dungeon.getRoom(c.from);
            const b = dungeon.getRoom(c.to);
            if (c.discovered && a.discovered !== b.discovered) {
                const known = a.discovered ? a : b;
                const other = a.discovered ? b : a;
                include(known.x + (other.x - known.x) * 0.7, known.y + (other.y - known.y) * 0.7);
            }
        }
        if (minX > maxX) {
            include(0, 0);
        }
        const growX = Math.max(0, 4 - (maxX - minX));
        const growY = Math.max(0, 3 - (maxY - minY));
        minX -= growX / 2;
        maxX += growX / 2;
        minY -= growY / 2;
        maxY += growY / 2;
        const px = (x) => PAD + (x - minX) * CELL;
        const py = (y) => PAD + (y - minY) * CELL;
        const width = PAD * 2 + (maxX - minX) * CELL;
        const height = PAD * 2 + (maxY - minY) * CELL;
        const svg = s('svg', { viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': 'Player map of ' + dungeon.name });

        // Corridors first so rooms draw over them
        for (const c of dungeon.corridors) {
            if (!c.discovered) {
                continue;
            }
            const a = dungeon.getRoom(c.from);
            const b = dungeon.getRoom(c.to);
            let known = a;
            let other = b;
            if (!a.discovered) {
                known = b;
                other = a;
            }
            if (!known.discovered) {
                continue;
            }
            const x1 = px(known.x);
            const y1 = py(known.y);
            let x2 = px(other.x);
            let y2 = py(other.y);
            const full = other.discovered;
            let cls = 'map-line';
            if (c.secret) {
                cls += ' secret';
            }
            if (!full) {
                // RULE 33: a visible but unexplored exit is a line ending in "?"
                x2 = x1 + (x2 - x1) * 0.55;
                y2 = y1 + (y2 - y1) * 0.55;
                cls += ' unexplored';
            }
            svg.appendChild(s('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: cls }, s('title', null, c.description)));
            const mx = full ? (x1 + x2) / 2 : x1 + (x2 - x1) * 0.6;
            const my = full ? (y1 + y2) / 2 : y1 + (y2 - y1) * 0.6;
            if (c.door) {
                let dcls = 'map-door ' + c.door.state;
                if (c.door.isSecured) {
                    dcls = 'map-door secured';
                }
                svg.appendChild(s('rect', { x: mx - 5, y: my - 5, width: 10, height: 10, rx: 2, class: dcls }, s('title', null, 'Door: ' + c.door.label)));
            }
            if (c.trap && !c.trap.hidden && !c.trap.disarmed) {
                svg.appendChild(s('text', { x: mx + 10, y: my - 8, class: 'map-trap' }, '!', s('title', null, c.trap.name)));
            }
            if (c.obstacle) {
                svg.appendChild(s('text', { x: mx, y: my + 12, class: 'map-trap' }, c.ropeFixed ? '≈' : '~', s('title', null, c.obstacle.name + (c.ropeFixed ? ' (rope fixed)' : ''))));
            }
            if (!full) {
                svg.appendChild(s('text', { x: x2 + (x2 - x1) * 0.12, y: y2 + (y2 - y1) * 0.12, class: 'map-q' }, '?'));
            }
        }

        // Rooms
        for (const r of dungeon.rooms) {
            if (!r.discovered) {
                continue;
            }
            const w = 40 + r.size * 8;
            const hgt = 26 + r.size * 4;
            let cls = 'map-room';
            if (r.id === state.currentRoomId) {
                cls += ' current';
            }
            if (r.isEntrance) {
                cls += ' entrance';
            }
            const g = s('g', { class: cls });
            g.appendChild(s('title', null, r.name + ' (' + r.sizeName + ')'));
            g.appendChild(s('rect', { x: px(r.x) - w / 2, y: py(r.y) - hgt / 2, width: w, height: hgt, rx: 4 }));
            const words = r.name.split(' ');
            if (words.length > 1 && r.name.length > 10) {
                const half = Math.ceil(words.length / 2);
                g.appendChild(s('text', { x: px(r.x), y: py(r.y) - 5 }, words.slice(0, half).join(' ')));
                g.appendChild(s('text', { x: px(r.x), y: py(r.y) + 6 }, words.slice(half).join(' ')));
            } else {
                g.appendChild(s('text', { x: px(r.x), y: py(r.y) }, r.name));
            }
            svg.appendChild(g);
            if (r.id === state.currentRoomId) {
                svg.appendChild(s('circle', { cx: px(r.x) + w / 2 - 2, cy: py(r.y) - hgt / 2 + 2, r: 6, class: 'map-marker' }, s('title', null, 'You are here')));
            }
        }

        return h('div', { class: 'panel' },
            h('h3', { text: 'Map' }),
            h('div', { class: 'map-wrap' }, svg),
            h('div', { class: 'map-legend', text: '● you  ▢ door (red = stuck/locked/barred, blue = secured)  ? unexplored  ! known trap' }));
    }
}

FD.UI.Components.MapView = MapView;
