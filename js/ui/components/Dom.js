/**
 * Tiny DOM builder so views read like markup: Dom.h('div', {class:'x'}, child...).
 * Never builds HTML from strings, so text from data can't inject markup.
 */
class Dom {
    /**
     * Creates an element.
     * @param {string} tag             Tag name.
     * @param {Object|null} [props]    class, text, on:{event:fn}, attrs:{}, style, disabled, title, value, type...
     * @param {...(Node|string|number|Array|null|false)} children  Children to append.
     * @returns {HTMLElement}
     */
    static h(tag, props, ...children) {
        const el = document.createElement(tag);
        Dom.applyProps(el, props);
        Dom.append(el, children);
        return el;
    }

    /**
     * Creates an SVG element.
     * @param {string} tag         SVG tag name.
     * @param {Object} [attrs]     Attributes (class allowed).
     * @param {...*} children      Children.
     * @returns {SVGElement}
     */
    static svg(tag, attrs, ...children) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) {
            for (const key of Object.keys(attrs)) {
                if (attrs[key] !== null && attrs[key] !== undefined) {
                    el.setAttribute(key, String(attrs[key]));
                }
            }
        }
        Dom.append(el, children);
        return el;
    }

    /**
     * Applies a props object to an element.
     * @param {HTMLElement} el  Element.
     * @param {Object|null} props  Props.
     * @returns {void}
     */
    static applyProps(el, props) {
        if (!props) {
            return;
        }
        for (const key of Object.keys(props)) {
            const value = props[key];
            if (value === null || value === undefined || value === false && key !== 'disabled' && key !== 'checked') {
                continue;
            }
            if (key === 'class') {
                el.className = value;
            } else if (key === 'text') {
                el.textContent = String(value);
            } else if (key === 'on') {
                for (const evt of Object.keys(value)) {
                    el.addEventListener(evt, value[evt]);
                }
            } else if (key === 'attrs') {
                for (const a of Object.keys(value)) {
                    if (value[a] !== null && value[a] !== undefined) {
                        el.setAttribute(a, String(value[a]));
                    }
                }
            } else if (key === 'style') {
                el.style.cssText = value;
            } else if (key === 'disabled' || key === 'checked' || key === 'value' || key === 'selected') {
                el[key] = value;
            } else {
                el.setAttribute(key, String(value));
            }
        }
    }

    /**
     * Appends children, flattening arrays and skipping null/false.
     * @param {Node} el            Parent.
     * @param {Array} children     Children.
     * @returns {void}
     */
    static append(el, children) {
        for (const child of children) {
            if (child === null || child === undefined || child === false) {
                continue;
            }
            if (Array.isArray(child)) {
                Dom.append(el, child);
            } else if (child instanceof Node) {
                el.appendChild(child);
            } else {
                el.appendChild(document.createTextNode(String(child)));
            }
        }
    }

    /**
     * Removes all children of an element.
     * @param {Node} el  Element.
     * @returns {void}
     */
    static clear(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }

    /**
     * A label/value row used on the sheet.
     * @param {string} k   Label.
     * @param {*} v        Value.
     * @param {string} [title]  Tooltip.
     * @returns {HTMLElement}
     */
    static kv(k, v, title) {
        return Dom.h('div', { class: 'kv', title: title || null }, Dom.h('span', { class: 'k', text: k }), Dom.h('span', { class: 'v', text: v }));
    }
}

FD.UI.Dom = Dom;
