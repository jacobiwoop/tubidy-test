var ks = Object.defineProperty;
var Ms = (t, e, n) => e in t ? ks(t, e, {
    enumerable: !0,
    configurable: !0,
    writable: !0,
    value: n
}) : t[e] = n;
var zn = (t, e, n) => Ms(t, typeof e != "symbol" ? e + "" : e, n);
const xe = new Map
  , Xt = {
    set(t, e, n) {
        xe.has(t) || xe.set(t, new Map);
        const r = xe.get(t);
        if (!r.has(e) && r.size !== 0) {
            console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${Array.from(r.keys())[0]}.`);
            return
        }
        r.set(e, n)
    },
    get(t, e) {
        return xe.has(t) && xe.get(t).get(e) || null
    },
    remove(t, e) {
        if (!xe.has(t))
            return;
        const n = xe.get(t);
        n.delete(e),
        n.size === 0 && xe.delete(t)
    }
}
  , Fs = 1e3
  , un = "transitionend"
  , Or = t => (t && window.CSS && window.CSS.escape && (t = t.replace(/#([^\s"#']+)/g, (e, n) => `#${CSS.escape(n)}`)),
t)
  , Bs = t => t == null ? `${t}` : Object.prototype.toString.call(t).match(/\s([a-z]+)/i)[1].toLowerCase()
  , $s = t => {
    if (!t)
        return 0;
    let {transitionDuration: e, transitionDelay: n} = window.getComputedStyle(t);
    const r = Number.parseFloat(e)
      , s = Number.parseFloat(n);
    return !r && !s ? 0 : (e = e.split(",")[0],
    n = n.split(",")[0],
    (Number.parseFloat(e) + Number.parseFloat(n)) * Fs)
}
  , js = t => {
    t.dispatchEvent(new Event(un))
}
  , ke = t => !t || typeof t != "object" ? !1 : (typeof t.jquery < "u" && (t = t[0]),
typeof t.nodeType < "u")
  , kt = t => ke(t) ? t.jquery ? t[0] : t : typeof t == "string" && t.length > 0 ? document.querySelector(Or(t)) : null
  , Cr = t => {
    if (!ke(t) || t.getClientRects().length === 0)
        return !1;
    const e = getComputedStyle(t).getPropertyValue("visibility") === "visible"
      , n = t.closest("details:not([open])");
    if (!n)
        return e;
    if (n !== t) {
        const r = t.closest("summary");
        if (r && r.parentNode !== n || r === null)
            return !1
    }
    return e
}
  , fn = t => !t || t.nodeType !== Node.ELEMENT_NODE || t.classList.contains("disabled") ? !0 : typeof t.disabled < "u" ? t.disabled : t.hasAttribute("disabled") && t.getAttribute("disabled") !== "false"
  , Hn = () => {}
  , zs = t => {
    t.offsetHeight
}
  , Tr = () => window.jQuery && !document.body.hasAttribute("data-bs-no-jquery") ? window.jQuery : null
  , Gt = []
  , Hs = t => {
    document.readyState === "loading" ? (Gt.length || document.addEventListener("DOMContentLoaded", () => {
        for (const e of Gt)
            e()
    }
    ),
    Gt.push(t)) : t()
}
  , Ze = () => document.documentElement.dir === "rtl"
  , xr = t => {
    Hs( () => {
        const e = Tr();
        if (e) {
            const n = t.NAME
              , r = e.fn[n];
            e.fn[n] = t.jQueryInterface,
            e.fn[n].Constructor = t,
            e.fn[n].noConflict = () => (e.fn[n] = r,
            t.jQueryInterface)
        }
    }
    )
}
  , dn = (t, e=[], n=t) => typeof t == "function" ? t.call(...e) : n
  , Us = (t, e, n=!0) => {
    if (!n) {
        dn(t);
        return
    }
    const s = $s(e) + 5;
    let o = !1;
    const i = ({target: a}) => {
        a === e && (o = !0,
        e.removeEventListener(un, i),
        dn(t))
    }
    ;
    e.addEventListener(un, i),
    setTimeout( () => {
        o || js(e)
    }
    , s)
}
  , qs = (t, e, n, r) => {
    const s = t.length;
    let o = t.indexOf(e);
    return o === -1 ? !n && r ? t[s - 1] : t[0] : (o += n ? 1 : -1,
    r && (o = (o + s) % s),
    t[Math.max(0, Math.min(o, s - 1))])
}
  , Vs = /[^.]*(?=\..*)\.|.*/
  , Ws = /\..*/
  , Ks = /::\d+$/
  , Qt = {};
let Un = 1;
const Lr = {
    mouseenter: "mouseover",
    mouseleave: "mouseout"
}
  , Js = new Set(["click", "dblclick", "mouseup", "mousedown", "contextmenu", "mousewheel", "DOMMouseScroll", "mouseover", "mouseout", "mousemove", "selectstart", "selectend", "keydown", "keypress", "keyup", "orientationchange", "touchstart", "touchmove", "touchend", "touchcancel", "pointerdown", "pointermove", "pointerup", "pointerleave", "pointercancel", "gesturestart", "gesturechange", "gestureend", "focus", "blur", "change", "reset", "select", "submit", "focusin", "focusout", "load", "unload", "beforeunload", "resize", "move", "DOMContentLoaded", "readystatechange", "error", "abort", "scroll"]);
function Rr(t, e) {
    return e && `${e}::${Un++}` || t.uidEvent || Un++
}
function Nr(t) {
    const e = Rr(t);
    return t.uidEvent = e,
    Qt[e] = Qt[e] || {},
    Qt[e]
}
function Ys(t, e) {
    return function n(r) {
        return An(r, {
            delegateTarget: t
        }),
        n.oneOff && J.off(t, r.type, e),
        e.apply(t, [r])
    }
}
function Xs(t, e, n) {
    return function r(s) {
        const o = t.querySelectorAll(e);
        for (let {target: i} = s; i && i !== this; i = i.parentNode)
            for (const a of o)
                if (a === i)
                    return An(s, {
                        delegateTarget: i
                    }),
                    r.oneOff && J.off(t, s.type, e, n),
                    n.apply(i, [s])
    }
}
function Dr(t, e, n=null) {
    return Object.values(t).find(r => r.callable === e && r.delegationSelector === n)
}
function Ir(t, e, n) {
    const r = typeof e == "string"
      , s = r ? n : e || n;
    let o = Pr(t);
    return Js.has(o) || (o = t),
    [r, s, o]
}
function qn(t, e, n, r, s) {
    if (typeof e != "string" || !t)
        return;
    let[o,i,a] = Ir(e, n, r);
    e in Lr && (i = (d => function(m) {
        if (!m.relatedTarget || m.relatedTarget !== m.delegateTarget && !m.delegateTarget.contains(m.relatedTarget))
            return d.call(this, m)
    }
    )(i));
    const l = Nr(t)
      , u = l[a] || (l[a] = {})
      , c = Dr(u, i, o ? n : null);
    if (c) {
        c.oneOff = c.oneOff && s;
        return
    }
    const p = Rr(i, e.replace(Vs, ""))
      , g = o ? Xs(t, n, i) : Ys(t, i);
    g.delegationSelector = o ? n : null,
    g.callable = i,
    g.oneOff = s,
    g.uidEvent = p,
    u[p] = g,
    t.addEventListener(a, g, o)
}
function pn(t, e, n, r, s) {
    const o = Dr(e[n], r, s);
    o && (t.removeEventListener(n, o, !!s),
    delete e[n][o.uidEvent])
}
function Gs(t, e, n, r) {
    const s = e[n] || {};
    for (const [o,i] of Object.entries(s))
        o.includes(r) && pn(t, e, n, i.callable, i.delegationSelector)
}
function Pr(t) {
    return t = t.replace(Ws, ""),
    Lr[t] || t
}
const J = {
    on(t, e, n, r) {
        qn(t, e, n, r, !1)
    },
    one(t, e, n, r) {
        qn(t, e, n, r, !0)
    },
    off(t, e, n, r) {
        if (typeof e != "string" || !t)
            return;
        const [s,o,i] = Ir(e, n, r)
          , a = i !== e
          , l = Nr(t)
          , u = l[i] || {}
          , c = e.startsWith(".");
        if (typeof o < "u") {
            if (!Object.keys(u).length)
                return;
            pn(t, l, i, o, s ? n : null);
            return
        }
        if (c)
            for (const p of Object.keys(l))
                Gs(t, l, p, e.slice(1));
        for (const [p,g] of Object.entries(u)) {
            const b = p.replace(Ks, "");
            (!a || e.includes(b)) && pn(t, l, i, g.callable, g.delegationSelector)
        }
    },
    trigger(t, e, n) {
        if (typeof e != "string" || !t)
            return null;
        const r = Tr()
          , s = Pr(e)
          , o = e !== s;
        let i = null
          , a = !0
          , l = !0
          , u = !1;
        o && r && (i = r.Event(e, n),
        r(t).trigger(i),
        a = !i.isPropagationStopped(),
        l = !i.isImmediatePropagationStopped(),
        u = i.isDefaultPrevented());
        const c = An(new Event(e,{
            bubbles: a,
            cancelable: !0
        }), n);
        return u && c.preventDefault(),
        l && t.dispatchEvent(c),
        c.defaultPrevented && i && i.preventDefault(),
        c
    }
};
function An(t, e={}) {
    for (const [n,r] of Object.entries(e))
        try {
            t[n] = r
        } catch {
            Object.defineProperty(t, n, {
                configurable: !0,
                get() {
                    return r
                }
            })
        }
    return t
}
function Vn(t) {
    if (t === "true")
        return !0;
    if (t === "false")
        return !1;
    if (t === Number(t).toString())
        return Number(t);
    if (t === "" || t === "null")
        return null;
    if (typeof t != "string")
        return t;
    try {
        return JSON.parse(decodeURIComponent(t))
    } catch {
        return t
    }
}
function Zt(t) {
    return t.replace(/[A-Z]/g, e => `-${e.toLowerCase()}`)
}
const Mt = {
    setDataAttribute(t, e, n) {
        t.setAttribute(`data-bs-${Zt(e)}`, n)
    },
    removeDataAttribute(t, e) {
        t.removeAttribute(`data-bs-${Zt(e)}`)
    },
    getDataAttributes(t) {
        if (!t)
            return {};
        const e = {}
          , n = Object.keys(t.dataset).filter(r => r.startsWith("bs") && !r.startsWith("bsConfig"));
        for (const r of n) {
            let s = r.replace(/^bs/, "");
            s = s.charAt(0).toLowerCase() + s.slice(1),
            e[s] = Vn(t.dataset[r])
        }
        return e
    },
    getDataAttribute(t, e) {
        return Vn(t.getAttribute(`data-bs-${Zt(e)}`))
    }
};
class Qs {
    static get Default() {
        return {}
    }
    static get DefaultType() {
        return {}
    }
    static get NAME() {
        throw new Error('You have to implement the static method "NAME", for each component!')
    }
    _getConfig(e) {
        return e = this._mergeConfigObj(e),
        e = this._configAfterMerge(e),
        this._typeCheckConfig(e),
        e
    }
    _configAfterMerge(e) {
        return e
    }
    _mergeConfigObj(e, n) {
        const r = ke(n) ? Mt.getDataAttribute(n, "config") : {};
        return {
            ...this.constructor.Default,
            ...typeof r == "object" ? r : {},
            ...ke(n) ? Mt.getDataAttributes(n) : {},
            ...typeof e == "object" ? e : {}
        }
    }
    _typeCheckConfig(e, n=this.constructor.DefaultType) {
        for (const [r,s] of Object.entries(n)) {
            const o = e[r]
              , i = ke(o) ? "element" : Bs(o);
            if (!new RegExp(s).test(i))
                throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${r}" provided type "${i}" but expected type "${s}".`)
        }
    }
}
const Zs = "5.3.8";
class kr extends Qs {
    constructor(e, n) {
        super(),
        e = kt(e),
        e && (this._element = e,
        this._config = this._getConfig(n),
        Xt.set(this._element, this.constructor.DATA_KEY, this))
    }
    dispose() {
        Xt.remove(this._element, this.constructor.DATA_KEY),
        J.off(this._element, this.constructor.EVENT_KEY);
        for (const e of Object.getOwnPropertyNames(this))
            this[e] = null
    }
    _queueCallback(e, n, r=!0) {
        Us(e, n, r)
    }
    _getConfig(e) {
        return e = this._mergeConfigObj(e, this._element),
        e = this._configAfterMerge(e),
        this._typeCheckConfig(e),
        e
    }
    static getInstance(e) {
        return Xt.get(kt(e), this.DATA_KEY)
    }
    static getOrCreateInstance(e, n={}) {
        return this.getInstance(e) || new this(e,typeof n == "object" ? n : null)
    }
    static get VERSION() {
        return Zs
    }
    static get DATA_KEY() {
        return `bs.${this.NAME}`
    }
    static get EVENT_KEY() {
        return `.${this.DATA_KEY}`
    }
    static eventName(e) {
        return `${e}${this.EVENT_KEY}`
    }
}
const en = t => {
    let e = t.getAttribute("data-bs-target");
    if (!e || e === "#") {
        let n = t.getAttribute("href");
        if (!n || !n.includes("#") && !n.startsWith("."))
            return null;
        n.includes("#") && !n.startsWith("#") && (n = `#${n.split("#")[1]}`),
        e = n && n !== "#" ? n.trim() : null
    }
    return e ? e.split(",").map(n => Or(n)).join(",") : null
}
  , K = {
    find(t, e=document.documentElement) {
        return [].concat(...Element.prototype.querySelectorAll.call(e, t))
    },
    findOne(t, e=document.documentElement) {
        return Element.prototype.querySelector.call(e, t)
    },
    children(t, e) {
        return [].concat(...t.children).filter(n => n.matches(e))
    },
    parents(t, e) {
        const n = [];
        let r = t.parentNode.closest(e);
        for (; r; )
            n.push(r),
            r = r.parentNode.closest(e);
        return n
    },
    prev(t, e) {
        let n = t.previousElementSibling;
        for (; n; ) {
            if (n.matches(e))
                return [n];
            n = n.previousElementSibling
        }
        return []
    },
    next(t, e) {
        let n = t.nextElementSibling;
        for (; n; ) {
            if (n.matches(e))
                return [n];
            n = n.nextElementSibling
        }
        return []
    },
    focusableChildren(t) {
        const e = ["a", "button", "input", "textarea", "select", "details", "[tabindex]", '[contenteditable="true"]'].map(n => `${n}:not([tabindex^="-"])`).join(",");
        return this.find(e, t).filter(n => !fn(n) && Cr(n))
    },
    getSelectorFromElement(t) {
        const e = en(t);
        return e && K.findOne(e) ? e : null
    },
    getElementFromSelector(t) {
        const e = en(t);
        return e ? K.findOne(e) : null
    },
    getMultipleElementsFromSelector(t) {
        const e = en(t);
        return e ? K.find(e) : []
    }
}
  , ei = "collapse"
  , ti = "bs.collapse"
  , ut = `.${ti}`
  , ni = ".data-api"
  , ri = `show${ut}`
  , si = `shown${ut}`
  , ii = `hide${ut}`
  , oi = `hidden${ut}`
  , ai = `click${ut}${ni}`
  , tn = "show"
  , We = "collapse"
  , At = "collapsing"
  , ci = "collapsed"
  , li = `:scope .${We} .${We}`
  , ui = "collapse-horizontal"
  , fi = "width"
  , di = "height"
  , pi = ".collapse.show, .collapse.collapsing"
  , hn = '[data-bs-toggle="collapse"]'
  , hi = {
    parent: null,
    toggle: !0
}
  , mi = {
    parent: "(null|element)",
    toggle: "boolean"
};
class lt extends kr {
    constructor(e, n) {
        super(e, n),
        this._isTransitioning = !1,
        this._triggerArray = [];
        const r = K.find(hn);
        for (const s of r) {
            const o = K.getSelectorFromElement(s)
              , i = K.find(o).filter(a => a === this._element);
            o !== null && i.length && this._triggerArray.push(s)
        }
        this._initializeChildren(),
        this._config.parent || this._addAriaAndCollapsedClass(this._triggerArray, this._isShown()),
        this._config.toggle && this.toggle()
    }
    static get Default() {
        return hi
    }
    static get DefaultType() {
        return mi
    }
    static get NAME() {
        return ei
    }
    toggle() {
        this._isShown() ? this.hide() : this.show()
    }
    show() {
        if (this._isTransitioning || this._isShown())
            return;
        let e = [];
        if (this._config.parent && (e = this._getFirstLevelChildren(pi).filter(a => a !== this._element).map(a => lt.getOrCreateInstance(a, {
            toggle: !1
        }))),
        e.length && e[0]._isTransitioning || J.trigger(this._element, ri).defaultPrevented)
            return;
        for (const a of e)
            a.hide();
        const r = this._getDimension();
        this._element.classList.remove(We),
        this._element.classList.add(At),
        this._element.style[r] = 0,
        this._addAriaAndCollapsedClass(this._triggerArray, !0),
        this._isTransitioning = !0;
        const s = () => {
            this._isTransitioning = !1,
            this._element.classList.remove(At),
            this._element.classList.add(We, tn),
            this._element.style[r] = "",
            J.trigger(this._element, si)
        }
          , i = `scroll${r[0].toUpperCase() + r.slice(1)}`;
        this._queueCallback(s, this._element, !0),
        this._element.style[r] = `${this._element[i]}px`
    }
    hide() {
        if (this._isTransitioning || !this._isShown() || J.trigger(this._element, ii).defaultPrevented)
            return;
        const n = this._getDimension();
        this._element.style[n] = `${this._element.getBoundingClientRect()[n]}px`,
        zs(this._element),
        this._element.classList.add(At),
        this._element.classList.remove(We, tn);
        for (const s of this._triggerArray) {
            const o = K.getElementFromSelector(s);
            o && !this._isShown(o) && this._addAriaAndCollapsedClass([s], !1)
        }
        this._isTransitioning = !0;
        const r = () => {
            this._isTransitioning = !1,
            this._element.classList.remove(At),
            this._element.classList.add(We),
            J.trigger(this._element, oi)
        }
        ;
        this._element.style[n] = "",
        this._queueCallback(r, this._element, !0)
    }
    _isShown(e=this._element) {
        return e.classList.contains(tn)
    }
    _configAfterMerge(e) {
        return e.toggle = !!e.toggle,
        e.parent = kt(e.parent),
        e
    }
    _getDimension() {
        return this._element.classList.contains(ui) ? fi : di
    }
    _initializeChildren() {
        if (!this._config.parent)
            return;
        const e = this._getFirstLevelChildren(hn);
        for (const n of e) {
            const r = K.getElementFromSelector(n);
            r && this._addAriaAndCollapsedClass([n], this._isShown(r))
        }
    }
    _getFirstLevelChildren(e) {
        const n = K.find(li, this._config.parent);
        return K.find(e, this._config.parent).filter(r => !n.includes(r))
    }
    _addAriaAndCollapsedClass(e, n) {
        if (e.length)
            for (const r of e)
                r.classList.toggle(ci, !n),
                r.setAttribute("aria-expanded", n)
    }
    static jQueryInterface(e) {
        const n = {};
        return typeof e == "string" && /show|hide/.test(e) && (n.toggle = !1),
        this.each(function() {
            const r = lt.getOrCreateInstance(this, n);
            if (typeof e == "string") {
                if (typeof r[e] > "u")
                    throw new TypeError(`No method named "${e}"`);
                r[e]()
            }
        })
    }
}
J.on(document, ai, hn, function(t) {
    (t.target.tagName === "A" || t.delegateTarget && t.delegateTarget.tagName === "A") && t.preventDefault();
    for (const e of K.getMultipleElementsFromSelector(this))
        lt.getOrCreateInstance(e, {
            toggle: !1
        }).toggle()
});
xr(lt);
var re = "top"
  , le = "bottom"
  , ue = "right"
  , se = "left"
  , $t = "auto"
  , et = [re, le, ue, se]
  , Be = "start"
  , Ke = "end"
  , Mr = "clippingParents"
  , Sn = "viewport"
  , qe = "popper"
  , Fr = "reference"
  , mn = et.reduce(function(t, e) {
    return t.concat([e + "-" + Be, e + "-" + Ke])
}, [])
  , On = [].concat(et, [$t]).reduce(function(t, e) {
    return t.concat([e, e + "-" + Be, e + "-" + Ke])
}, [])
  , Br = "beforeRead"
  , $r = "read"
  , jr = "afterRead"
  , zr = "beforeMain"
  , Hr = "main"
  , Ur = "afterMain"
  , qr = "beforeWrite"
  , Vr = "write"
  , Wr = "afterWrite"
  , Kr = [Br, $r, jr, zr, Hr, Ur, qr, Vr, Wr];
function _e(t) {
    return t ? (t.nodeName || "").toLowerCase() : null
}
function fe(t) {
    if (t == null)
        return window;
    if (t.toString() !== "[object Window]") {
        var e = t.ownerDocument;
        return e && e.defaultView || window
    }
    return t
}
function $e(t) {
    var e = fe(t).Element;
    return t instanceof e || t instanceof Element
}
function pe(t) {
    var e = fe(t).HTMLElement;
    return t instanceof e || t instanceof HTMLElement
}
function Cn(t) {
    if (typeof ShadowRoot > "u")
        return !1;
    var e = fe(t).ShadowRoot;
    return t instanceof e || t instanceof ShadowRoot
}
function gi(t) {
    var e = t.state;
    Object.keys(e.elements).forEach(function(n) {
        var r = e.styles[n] || {}
          , s = e.attributes[n] || {}
          , o = e.elements[n];
        !pe(o) || !_e(o) || (Object.assign(o.style, r),
        Object.keys(s).forEach(function(i) {
            var a = s[i];
            a === !1 ? o.removeAttribute(i) : o.setAttribute(i, a === !0 ? "" : a)
        }))
    })
}
function vi(t) {
    var e = t.state
      , n = {
        popper: {
            position: e.options.strategy,
            left: "0",
            top: "0",
            margin: "0"
        },
        arrow: {
            position: "absolute"
        },
        reference: {}
    };
    return Object.assign(e.elements.popper.style, n.popper),
    e.styles = n,
    e.elements.arrow && Object.assign(e.elements.arrow.style, n.arrow),
    function() {
        Object.keys(e.elements).forEach(function(r) {
            var s = e.elements[r]
              , o = e.attributes[r] || {}
              , i = Object.keys(e.styles.hasOwnProperty(r) ? e.styles[r] : n[r])
              , a = i.reduce(function(l, u) {
                return l[u] = "",
                l
            }, {});
            !pe(s) || !_e(s) || (Object.assign(s.style, a),
            Object.keys(o).forEach(function(l) {
                s.removeAttribute(l)
            }))
        })
    }
}
const Tn = {
    name: "applyStyles",
    enabled: !0,
    phase: "write",
    fn: gi,
    effect: vi,
    requires: ["computeStyles"]
};
function ye(t) {
    return t.split("-")[0]
}
var Me = Math.max
  , Ft = Math.min
  , Je = Math.round;
function gn() {
    var t = navigator.userAgentData;
    return t != null && t.brands && Array.isArray(t.brands) ? t.brands.map(function(e) {
        return e.brand + "/" + e.version
    }).join(" ") : navigator.userAgent
}
function Jr() {
    return !/^((?!chrome|android).)*safari/i.test(gn())
}
function Ye(t, e, n) {
    e === void 0 && (e = !1),
    n === void 0 && (n = !1);
    var r = t.getBoundingClientRect()
      , s = 1
      , o = 1;
    e && pe(t) && (s = t.offsetWidth > 0 && Je(r.width) / t.offsetWidth || 1,
    o = t.offsetHeight > 0 && Je(r.height) / t.offsetHeight || 1);
    var i = $e(t) ? fe(t) : window
      , a = i.visualViewport
      , l = !Jr() && n
      , u = (r.left + (l && a ? a.offsetLeft : 0)) / s
      , c = (r.top + (l && a ? a.offsetTop : 0)) / o
      , p = r.width / s
      , g = r.height / o;
    return {
        width: p,
        height: g,
        top: c,
        right: u + p,
        bottom: c + g,
        left: u,
        x: u,
        y: c
    }
}
function xn(t) {
    var e = Ye(t)
      , n = t.offsetWidth
      , r = t.offsetHeight;
    return Math.abs(e.width - n) <= 1 && (n = e.width),
    Math.abs(e.height - r) <= 1 && (r = e.height),
    {
        x: t.offsetLeft,
        y: t.offsetTop,
        width: n,
        height: r
    }
}
function Yr(t, e) {
    var n = e.getRootNode && e.getRootNode();
    if (t.contains(e))
        return !0;
    if (n && Cn(n)) {
        var r = e;
        do {
            if (r && t.isSameNode(r))
                return !0;
            r = r.parentNode || r.host
        } while (r)
    }
    return !1
}
function Oe(t) {
    return fe(t).getComputedStyle(t)
}
function yi(t) {
    return ["table", "td", "th"].indexOf(_e(t)) >= 0
}
function Le(t) {
    return (($e(t) ? t.ownerDocument : t.document) || window.document).documentElement
}
function jt(t) {
    return _e(t) === "html" ? t : t.assignedSlot || t.parentNode || (Cn(t) ? t.host : null) || Le(t)
}
function Wn(t) {
    return !pe(t) || Oe(t).position === "fixed" ? null : t.offsetParent
}
function bi(t) {
    var e = /firefox/i.test(gn())
      , n = /Trident/i.test(gn());
    if (n && pe(t)) {
        var r = Oe(t);
        if (r.position === "fixed")
            return null
    }
    var s = jt(t);
    for (Cn(s) && (s = s.host); pe(s) && ["html", "body"].indexOf(_e(s)) < 0; ) {
        var o = Oe(s);
        if (o.transform !== "none" || o.perspective !== "none" || o.contain === "paint" || ["transform", "perspective"].indexOf(o.willChange) !== -1 || e && o.willChange === "filter" || e && o.filter && o.filter !== "none")
            return s;
        s = s.parentNode
    }
    return null
}
function ft(t) {
    for (var e = fe(t), n = Wn(t); n && yi(n) && Oe(n).position === "static"; )
        n = Wn(n);
    return n && (_e(n) === "html" || _e(n) === "body" && Oe(n).position === "static") ? e : n || bi(t) || e
}
function Ln(t) {
    return ["top", "bottom"].indexOf(t) >= 0 ? "x" : "y"
}
function at(t, e, n) {
    return Me(t, Ft(e, n))
}
function _i(t, e, n) {
    var r = at(t, e, n);
    return r > n ? n : r
}
function Xr() {
    return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    }
}
function Gr(t) {
    return Object.assign({}, Xr(), t)
}
function Qr(t, e) {
    return e.reduce(function(n, r) {
        return n[r] = t,
        n
    }, {})
}
var Ei = function(e, n) {
    return e = typeof e == "function" ? e(Object.assign({}, n.rects, {
        placement: n.placement
    })) : e,
    Gr(typeof e != "number" ? e : Qr(e, et))
};
function wi(t) {
    var e, n = t.state, r = t.name, s = t.options, o = n.elements.arrow, i = n.modifiersData.popperOffsets, a = ye(n.placement), l = Ln(a), u = [se, ue].indexOf(a) >= 0, c = u ? "height" : "width";
    if (!(!o || !i)) {
        var p = Ei(s.padding, n)
          , g = xn(o)
          , b = l === "y" ? re : se
          , d = l === "y" ? le : ue
          , m = n.rects.reference[c] + n.rects.reference[l] - i[l] - n.rects.popper[c]
          , h = i[l] - n.rects.reference[l]
          , w = ft(o)
          , D = w ? l === "y" ? w.clientHeight || 0 : w.clientWidth || 0 : 0
          , A = m / 2 - h / 2
          , E = p[b]
          , S = D - g[c] - p[d]
          , L = D / 2 - g[c] / 2 + A
          , x = at(E, L, S)
          , z = l;
        n.modifiersData[r] = (e = {},
        e[z] = x,
        e.centerOffset = x - L,
        e)
    }
}
function Ai(t) {
    var e = t.state
      , n = t.options
      , r = n.element
      , s = r === void 0 ? "[data-popper-arrow]" : r;
    s != null && (typeof s == "string" && (s = e.elements.popper.querySelector(s),
    !s) || Yr(e.elements.popper, s) && (e.elements.arrow = s))
}
const Zr = {
    name: "arrow",
    enabled: !0,
    phase: "main",
    fn: wi,
    effect: Ai,
    requires: ["popperOffsets"],
    requiresIfExists: ["preventOverflow"]
};
function Xe(t) {
    return t.split("-")[1]
}
var Si = {
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto"
};
function Oi(t, e) {
    var n = t.x
      , r = t.y
      , s = e.devicePixelRatio || 1;
    return {
        x: Je(n * s) / s || 0,
        y: Je(r * s) / s || 0
    }
}
function Kn(t) {
    var e, n = t.popper, r = t.popperRect, s = t.placement, o = t.variation, i = t.offsets, a = t.position, l = t.gpuAcceleration, u = t.adaptive, c = t.roundOffsets, p = t.isFixed, g = i.x, b = g === void 0 ? 0 : g, d = i.y, m = d === void 0 ? 0 : d, h = typeof c == "function" ? c({
        x: b,
        y: m
    }) : {
        x: b,
        y: m
    };
    b = h.x,
    m = h.y;
    var w = i.hasOwnProperty("x")
      , D = i.hasOwnProperty("y")
      , A = se
      , E = re
      , S = window;
    if (u) {
        var L = ft(n)
          , x = "clientHeight"
          , z = "clientWidth";
        if (L === fe(n) && (L = Le(n),
        Oe(L).position !== "static" && a === "absolute" && (x = "scrollHeight",
        z = "scrollWidth")),
        L = L,
        s === re || (s === se || s === ue) && o === Ke) {
            E = le;
            var M = p && L === S && S.visualViewport ? S.visualViewport.height : L[x];
            m -= M - r.height,
            m *= l ? 1 : -1
        }
        if (s === se || (s === re || s === le) && o === Ke) {
            A = ue;
            var H = p && L === S && S.visualViewport ? S.visualViewport.width : L[z];
            b -= H - r.width,
            b *= l ? 1 : -1
        }
    }
    var U = Object.assign({
        position: a
    }, u && Si)
      , V = c === !0 ? Oi({
        x: b,
        y: m
    }, fe(n)) : {
        x: b,
        y: m
    };
    if (b = V.x,
    m = V.y,
    l) {
        var q;
        return Object.assign({}, U, (q = {},
        q[E] = D ? "0" : "",
        q[A] = w ? "0" : "",
        q.transform = (S.devicePixelRatio || 1) <= 1 ? "translate(" + b + "px, " + m + "px)" : "translate3d(" + b + "px, " + m + "px, 0)",
        q))
    }
    return Object.assign({}, U, (e = {},
    e[E] = D ? m + "px" : "",
    e[A] = w ? b + "px" : "",
    e.transform = "",
    e))
}
function Ci(t) {
    var e = t.state
      , n = t.options
      , r = n.gpuAcceleration
      , s = r === void 0 ? !0 : r
      , o = n.adaptive
      , i = o === void 0 ? !0 : o
      , a = n.roundOffsets
      , l = a === void 0 ? !0 : a
      , u = {
        placement: ye(e.placement),
        variation: Xe(e.placement),
        popper: e.elements.popper,
        popperRect: e.rects.popper,
        gpuAcceleration: s,
        isFixed: e.options.strategy === "fixed"
    };
    e.modifiersData.popperOffsets != null && (e.styles.popper = Object.assign({}, e.styles.popper, Kn(Object.assign({}, u, {
        offsets: e.modifiersData.popperOffsets,
        position: e.options.strategy,
        adaptive: i,
        roundOffsets: l
    })))),
    e.modifiersData.arrow != null && (e.styles.arrow = Object.assign({}, e.styles.arrow, Kn(Object.assign({}, u, {
        offsets: e.modifiersData.arrow,
        position: "absolute",
        adaptive: !1,
        roundOffsets: l
    })))),
    e.attributes.popper = Object.assign({}, e.attributes.popper, {
        "data-popper-placement": e.placement
    })
}
const Rn = {
    name: "computeStyles",
    enabled: !0,
    phase: "beforeWrite",
    fn: Ci,
    data: {}
};
var St = {
    passive: !0
};
function Ti(t) {
    var e = t.state
      , n = t.instance
      , r = t.options
      , s = r.scroll
      , o = s === void 0 ? !0 : s
      , i = r.resize
      , a = i === void 0 ? !0 : i
      , l = fe(e.elements.popper)
      , u = [].concat(e.scrollParents.reference, e.scrollParents.popper);
    return o && u.forEach(function(c) {
        c.addEventListener("scroll", n.update, St)
    }),
    a && l.addEventListener("resize", n.update, St),
    function() {
        o && u.forEach(function(c) {
            c.removeEventListener("scroll", n.update, St)
        }),
        a && l.removeEventListener("resize", n.update, St)
    }
}
const Nn = {
    name: "eventListeners",
    enabled: !0,
    phase: "write",
    fn: function() {},
    effect: Ti,
    data: {}
};
var xi = {
    left: "right",
    right: "left",
    bottom: "top",
    top: "bottom"
};
function Rt(t) {
    return t.replace(/left|right|bottom|top/g, function(e) {
        return xi[e]
    })
}
var Li = {
    start: "end",
    end: "start"
};
function Jn(t) {
    return t.replace(/start|end/g, function(e) {
        return Li[e]
    })
}
function Dn(t) {
    var e = fe(t)
      , n = e.pageXOffset
      , r = e.pageYOffset;
    return {
        scrollLeft: n,
        scrollTop: r
    }
}
function In(t) {
    return Ye(Le(t)).left + Dn(t).scrollLeft
}
function Ri(t, e) {
    var n = fe(t)
      , r = Le(t)
      , s = n.visualViewport
      , o = r.clientWidth
      , i = r.clientHeight
      , a = 0
      , l = 0;
    if (s) {
        o = s.width,
        i = s.height;
        var u = Jr();
        (u || !u && e === "fixed") && (a = s.offsetLeft,
        l = s.offsetTop)
    }
    return {
        width: o,
        height: i,
        x: a + In(t),
        y: l
    }
}
function Ni(t) {
    var e, n = Le(t), r = Dn(t), s = (e = t.ownerDocument) == null ? void 0 : e.body, o = Me(n.scrollWidth, n.clientWidth, s ? s.scrollWidth : 0, s ? s.clientWidth : 0), i = Me(n.scrollHeight, n.clientHeight, s ? s.scrollHeight : 0, s ? s.clientHeight : 0), a = -r.scrollLeft + In(t), l = -r.scrollTop;
    return Oe(s || n).direction === "rtl" && (a += Me(n.clientWidth, s ? s.clientWidth : 0) - o),
    {
        width: o,
        height: i,
        x: a,
        y: l
    }
}
function Pn(t) {
    var e = Oe(t)
      , n = e.overflow
      , r = e.overflowX
      , s = e.overflowY;
    return /auto|scroll|overlay|hidden/.test(n + s + r)
}
function es(t) {
    return ["html", "body", "#document"].indexOf(_e(t)) >= 0 ? t.ownerDocument.body : pe(t) && Pn(t) ? t : es(jt(t))
}
function ct(t, e) {
    var n;
    e === void 0 && (e = []);
    var r = es(t)
      , s = r === ((n = t.ownerDocument) == null ? void 0 : n.body)
      , o = fe(r)
      , i = s ? [o].concat(o.visualViewport || [], Pn(r) ? r : []) : r
      , a = e.concat(i);
    return s ? a : a.concat(ct(jt(i)))
}
function vn(t) {
    return Object.assign({}, t, {
        left: t.x,
        top: t.y,
        right: t.x + t.width,
        bottom: t.y + t.height
    })
}
function Di(t, e) {
    var n = Ye(t, !1, e === "fixed");
    return n.top = n.top + t.clientTop,
    n.left = n.left + t.clientLeft,
    n.bottom = n.top + t.clientHeight,
    n.right = n.left + t.clientWidth,
    n.width = t.clientWidth,
    n.height = t.clientHeight,
    n.x = n.left,
    n.y = n.top,
    n
}
function Yn(t, e, n) {
    return e === Sn ? vn(Ri(t, n)) : $e(e) ? Di(e, n) : vn(Ni(Le(t)))
}
function Ii(t) {
    var e = ct(jt(t))
      , n = ["absolute", "fixed"].indexOf(Oe(t).position) >= 0
      , r = n && pe(t) ? ft(t) : t;
    return $e(r) ? e.filter(function(s) {
        return $e(s) && Yr(s, r) && _e(s) !== "body"
    }) : []
}
function Pi(t, e, n, r) {
    var s = e === "clippingParents" ? Ii(t) : [].concat(e)
      , o = [].concat(s, [n])
      , i = o[0]
      , a = o.reduce(function(l, u) {
        var c = Yn(t, u, r);
        return l.top = Me(c.top, l.top),
        l.right = Ft(c.right, l.right),
        l.bottom = Ft(c.bottom, l.bottom),
        l.left = Me(c.left, l.left),
        l
    }, Yn(t, i, r));
    return a.width = a.right - a.left,
    a.height = a.bottom - a.top,
    a.x = a.left,
    a.y = a.top,
    a
}
function ts(t) {
    var e = t.reference, n = t.element, r = t.placement, s = r ? ye(r) : null, o = r ? Xe(r) : null, i = e.x + e.width / 2 - n.width / 2, a = e.y + e.height / 2 - n.height / 2, l;
    switch (s) {
    case re:
        l = {
            x: i,
            y: e.y - n.height
        };
        break;
    case le:
        l = {
            x: i,
            y: e.y + e.height
        };
        break;
    case ue:
        l = {
            x: e.x + e.width,
            y: a
        };
        break;
    case se:
        l = {
            x: e.x - n.width,
            y: a
        };
        break;
    default:
        l = {
            x: e.x,
            y: e.y
        }
    }
    var u = s ? Ln(s) : null;
    if (u != null) {
        var c = u === "y" ? "height" : "width";
        switch (o) {
        case Be:
            l[u] = l[u] - (e[c] / 2 - n[c] / 2);
            break;
        case Ke:
            l[u] = l[u] + (e[c] / 2 - n[c] / 2);
            break
        }
    }
    return l
}
function Ge(t, e) {
    e === void 0 && (e = {});
    var n = e
      , r = n.placement
      , s = r === void 0 ? t.placement : r
      , o = n.strategy
      , i = o === void 0 ? t.strategy : o
      , a = n.boundary
      , l = a === void 0 ? Mr : a
      , u = n.rootBoundary
      , c = u === void 0 ? Sn : u
      , p = n.elementContext
      , g = p === void 0 ? qe : p
      , b = n.altBoundary
      , d = b === void 0 ? !1 : b
      , m = n.padding
      , h = m === void 0 ? 0 : m
      , w = Gr(typeof h != "number" ? h : Qr(h, et))
      , D = g === qe ? Fr : qe
      , A = t.rects.popper
      , E = t.elements[d ? D : g]
      , S = Pi($e(E) ? E : E.contextElement || Le(t.elements.popper), l, c, i)
      , L = Ye(t.elements.reference)
      , x = ts({
        reference: L,
        element: A,
        placement: s
    })
      , z = vn(Object.assign({}, A, x))
      , M = g === qe ? z : L
      , H = {
        top: S.top - M.top + w.top,
        bottom: M.bottom - S.bottom + w.bottom,
        left: S.left - M.left + w.left,
        right: M.right - S.right + w.right
    }
      , U = t.modifiersData.offset;
    if (g === qe && U) {
        var V = U[s];
        Object.keys(H).forEach(function(q) {
            var Y = [ue, le].indexOf(q) >= 0 ? 1 : -1
              , ae = [re, le].indexOf(q) >= 0 ? "y" : "x";
            H[q] += V[ae] * Y
        })
    }
    return H
}
function ki(t, e) {
    e === void 0 && (e = {});
    var n = e
      , r = n.placement
      , s = n.boundary
      , o = n.rootBoundary
      , i = n.padding
      , a = n.flipVariations
      , l = n.allowedAutoPlacements
      , u = l === void 0 ? On : l
      , c = Xe(r)
      , p = c ? a ? mn : mn.filter(function(d) {
        return Xe(d) === c
    }) : et
      , g = p.filter(function(d) {
        return u.indexOf(d) >= 0
    });
    g.length === 0 && (g = p);
    var b = g.reduce(function(d, m) {
        return d[m] = Ge(t, {
            placement: m,
            boundary: s,
            rootBoundary: o,
            padding: i
        })[ye(m)],
        d
    }, {});
    return Object.keys(b).sort(function(d, m) {
        return b[d] - b[m]
    })
}
function Mi(t) {
    if (ye(t) === $t)
        return [];
    var e = Rt(t);
    return [Jn(t), e, Jn(e)]
}
function Fi(t) {
    var e = t.state
      , n = t.options
      , r = t.name;
    if (!e.modifiersData[r]._skip) {
        for (var s = n.mainAxis, o = s === void 0 ? !0 : s, i = n.altAxis, a = i === void 0 ? !0 : i, l = n.fallbackPlacements, u = n.padding, c = n.boundary, p = n.rootBoundary, g = n.altBoundary, b = n.flipVariations, d = b === void 0 ? !0 : b, m = n.allowedAutoPlacements, h = e.options.placement, w = ye(h), D = w === h, A = l || (D || !d ? [Rt(h)] : Mi(h)), E = [h].concat(A).reduce(function(k, N) {
            return k.concat(ye(N) === $t ? ki(e, {
                placement: N,
                boundary: c,
                rootBoundary: p,
                padding: u,
                flipVariations: d,
                allowedAutoPlacements: m
            }) : N)
        }, []), S = e.rects.reference, L = e.rects.popper, x = new Map, z = !0, M = E[0], H = 0; H < E.length; H++) {
            var U = E[H]
              , V = ye(U)
              , q = Xe(U) === Be
              , Y = [re, le].indexOf(V) >= 0
              , ae = Y ? "width" : "height"
              , B = Ge(e, {
                placement: U,
                boundary: c,
                rootBoundary: p,
                altBoundary: g,
                padding: u
            })
              , W = Y ? q ? ue : se : q ? le : re;
            S[ae] > L[ae] && (W = Rt(W));
            var _ = Rt(W)
              , y = [];
            if (o && y.push(B[V] <= 0),
            a && y.push(B[W] <= 0, B[_] <= 0),
            y.every(function(k) {
                return k
            })) {
                M = U,
                z = !1;
                break
            }
            x.set(U, y)
        }
        if (z)
            for (var O = d ? 3 : 1, P = function(N) {
                var F = E.find(function(X) {
                    var G = x.get(X);
                    if (G)
                        return G.slice(0, N).every(function(he) {
                            return he
                        })
                });
                if (F)
                    return M = F,
                    "break"
            }, I = O; I > 0; I--) {
                var R = P(I);
                if (R === "break")
                    break
            }
        e.placement !== M && (e.modifiersData[r]._skip = !0,
        e.placement = M,
        e.reset = !0)
    }
}
const ns = {
    name: "flip",
    enabled: !0,
    phase: "main",
    fn: Fi,
    requiresIfExists: ["offset"],
    data: {
        _skip: !1
    }
};
function Xn(t, e, n) {
    return n === void 0 && (n = {
        x: 0,
        y: 0
    }),
    {
        top: t.top - e.height - n.y,
        right: t.right - e.width + n.x,
        bottom: t.bottom - e.height + n.y,
        left: t.left - e.width - n.x
    }
}
function Gn(t) {
    return [re, ue, le, se].some(function(e) {
        return t[e] >= 0
    })
}
function Bi(t) {
    var e = t.state
      , n = t.name
      , r = e.rects.reference
      , s = e.rects.popper
      , o = e.modifiersData.preventOverflow
      , i = Ge(e, {
        elementContext: "reference"
    })
      , a = Ge(e, {
        altBoundary: !0
    })
      , l = Xn(i, r)
      , u = Xn(a, s, o)
      , c = Gn(l)
      , p = Gn(u);
    e.modifiersData[n] = {
        referenceClippingOffsets: l,
        popperEscapeOffsets: u,
        isReferenceHidden: c,
        hasPopperEscaped: p
    },
    e.attributes.popper = Object.assign({}, e.attributes.popper, {
        "data-popper-reference-hidden": c,
        "data-popper-escaped": p
    })
}
const rs = {
    name: "hide",
    enabled: !0,
    phase: "main",
    requiresIfExists: ["preventOverflow"],
    fn: Bi
};
function $i(t, e, n) {
    var r = ye(t)
      , s = [se, re].indexOf(r) >= 0 ? -1 : 1
      , o = typeof n == "function" ? n(Object.assign({}, e, {
        placement: t
    })) : n
      , i = o[0]
      , a = o[1];
    return i = i || 0,
    a = (a || 0) * s,
    [se, ue].indexOf(r) >= 0 ? {
        x: a,
        y: i
    } : {
        x: i,
        y: a
    }
}
function ji(t) {
    var e = t.state
      , n = t.options
      , r = t.name
      , s = n.offset
      , o = s === void 0 ? [0, 0] : s
      , i = On.reduce(function(c, p) {
        return c[p] = $i(p, e.rects, o),
        c
    }, {})
      , a = i[e.placement]
      , l = a.x
      , u = a.y;
    e.modifiersData.popperOffsets != null && (e.modifiersData.popperOffsets.x += l,
    e.modifiersData.popperOffsets.y += u),
    e.modifiersData[r] = i
}
const ss = {
    name: "offset",
    enabled: !0,
    phase: "main",
    requires: ["popperOffsets"],
    fn: ji
};
function zi(t) {
    var e = t.state
      , n = t.name;
    e.modifiersData[n] = ts({
        reference: e.rects.reference,
        element: e.rects.popper,
        placement: e.placement
    })
}
const kn = {
    name: "popperOffsets",
    enabled: !0,
    phase: "read",
    fn: zi,
    data: {}
};
function Hi(t) {
    return t === "x" ? "y" : "x"
}
function Ui(t) {
    var e = t.state
      , n = t.options
      , r = t.name
      , s = n.mainAxis
      , o = s === void 0 ? !0 : s
      , i = n.altAxis
      , a = i === void 0 ? !1 : i
      , l = n.boundary
      , u = n.rootBoundary
      , c = n.altBoundary
      , p = n.padding
      , g = n.tether
      , b = g === void 0 ? !0 : g
      , d = n.tetherOffset
      , m = d === void 0 ? 0 : d
      , h = Ge(e, {
        boundary: l,
        rootBoundary: u,
        padding: p,
        altBoundary: c
    })
      , w = ye(e.placement)
      , D = Xe(e.placement)
      , A = !D
      , E = Ln(w)
      , S = Hi(E)
      , L = e.modifiersData.popperOffsets
      , x = e.rects.reference
      , z = e.rects.popper
      , M = typeof m == "function" ? m(Object.assign({}, e.rects, {
        placement: e.placement
    })) : m
      , H = typeof M == "number" ? {
        mainAxis: M,
        altAxis: M
    } : Object.assign({
        mainAxis: 0,
        altAxis: 0
    }, M)
      , U = e.modifiersData.offset ? e.modifiersData.offset[e.placement] : null
      , V = {
        x: 0,
        y: 0
    };
    if (L) {
        if (o) {
            var q, Y = E === "y" ? re : se, ae = E === "y" ? le : ue, B = E === "y" ? "height" : "width", W = L[E], _ = W + h[Y], y = W - h[ae], O = b ? -z[B] / 2 : 0, P = D === Be ? x[B] : z[B], I = D === Be ? -z[B] : -x[B], R = e.elements.arrow, k = b && R ? xn(R) : {
                width: 0,
                height: 0
            }, N = e.modifiersData["arrow#persistent"] ? e.modifiersData["arrow#persistent"].padding : Xr(), F = N[Y], X = N[ae], G = at(0, x[B], k[B]), he = A ? x[B] / 2 - O - G - F - H.mainAxis : P - G - F - H.mainAxis, Kt = A ? -x[B] / 2 + O + G + X + H.mainAxis : I + G + X + H.mainAxis, rt = e.elements.arrow && ft(e.elements.arrow), Jt = rt ? E === "y" ? rt.clientTop || 0 : rt.clientLeft || 0 : 0, gt = (q = U == null ? void 0 : U[E]) != null ? q : 0, Re = W + he - gt - Jt, ce = W + Kt - gt, Ee = at(b ? Ft(_, Re) : _, W, b ? Me(y, ce) : y);
            L[E] = Ee,
            V[E] = Ee - W
        }
        if (a) {
            var st, vt = E === "x" ? re : se, Yt = E === "x" ? le : ue, ge = L[S], Q = S === "y" ? "height" : "width", it = ge + h[vt], yt = ge - h[Yt], He = [re, se].indexOf(w) !== -1, bt = (st = U == null ? void 0 : U[S]) != null ? st : 0, _t = He ? it : ge - x[Q] - z[Q] - bt + H.altAxis, Et = He ? ge + x[Q] + z[Q] - bt - H.altAxis : yt, Ce = b && He ? _i(_t, ge, Et) : at(b ? _t : it, ge, b ? Et : yt);
            L[S] = Ce,
            V[S] = Ce - ge
        }
        e.modifiersData[r] = V
    }
}
const is = {
    name: "preventOverflow",
    enabled: !0,
    phase: "main",
    fn: Ui,
    requiresIfExists: ["offset"]
};
function qi(t) {
    return {
        scrollLeft: t.scrollLeft,
        scrollTop: t.scrollTop
    }
}
function Vi(t) {
    return t === fe(t) || !pe(t) ? Dn(t) : qi(t)
}
function Wi(t) {
    var e = t.getBoundingClientRect()
      , n = Je(e.width) / t.offsetWidth || 1
      , r = Je(e.height) / t.offsetHeight || 1;
    return n !== 1 || r !== 1
}
function Ki(t, e, n) {
    n === void 0 && (n = !1);
    var r = pe(e)
      , s = pe(e) && Wi(e)
      , o = Le(e)
      , i = Ye(t, s, n)
      , a = {
        scrollLeft: 0,
        scrollTop: 0
    }
      , l = {
        x: 0,
        y: 0
    };
    return (r || !r && !n) && ((_e(e) !== "body" || Pn(o)) && (a = Vi(e)),
    pe(e) ? (l = Ye(e, !0),
    l.x += e.clientLeft,
    l.y += e.clientTop) : o && (l.x = In(o))),
    {
        x: i.left + a.scrollLeft - l.x,
        y: i.top + a.scrollTop - l.y,
        width: i.width,
        height: i.height
    }
}
function Ji(t) {
    var e = new Map
      , n = new Set
      , r = [];
    t.forEach(function(o) {
        e.set(o.name, o)
    });
    function s(o) {
        n.add(o.name);
        var i = [].concat(o.requires || [], o.requiresIfExists || []);
        i.forEach(function(a) {
            if (!n.has(a)) {
                var l = e.get(a);
                l && s(l)
            }
        }),
        r.push(o)
    }
    return t.forEach(function(o) {
        n.has(o.name) || s(o)
    }),
    r
}
function Yi(t) {
    var e = Ji(t);
    return Kr.reduce(function(n, r) {
        return n.concat(e.filter(function(s) {
            return s.phase === r
        }))
    }, [])
}
function Xi(t) {
    var e;
    return function() {
        return e || (e = new Promise(function(n) {
            Promise.resolve().then(function() {
                e = void 0,
                n(t())
            })
        }
        )),
        e
    }
}
function Gi(t) {
    var e = t.reduce(function(n, r) {
        var s = n[r.name];
        return n[r.name] = s ? Object.assign({}, s, r, {
            options: Object.assign({}, s.options, r.options),
            data: Object.assign({}, s.data, r.data)
        }) : r,
        n
    }, {});
    return Object.keys(e).map(function(n) {
        return e[n]
    })
}
var Qn = {
    placement: "bottom",
    modifiers: [],
    strategy: "absolute"
};
function Zn() {
    for (var t = arguments.length, e = new Array(t), n = 0; n < t; n++)
        e[n] = arguments[n];
    return !e.some(function(r) {
        return !(r && typeof r.getBoundingClientRect == "function")
    })
}
function zt(t) {
    t === void 0 && (t = {});
    var e = t
      , n = e.defaultModifiers
      , r = n === void 0 ? [] : n
      , s = e.defaultOptions
      , o = s === void 0 ? Qn : s;
    return function(a, l, u) {
        u === void 0 && (u = o);
        var c = {
            placement: "bottom",
            orderedModifiers: [],
            options: Object.assign({}, Qn, o),
            modifiersData: {},
            elements: {
                reference: a,
                popper: l
            },
            attributes: {},
            styles: {}
        }
          , p = []
          , g = !1
          , b = {
            state: c,
            setOptions: function(w) {
                var D = typeof w == "function" ? w(c.options) : w;
                m(),
                c.options = Object.assign({}, o, c.options, D),
                c.scrollParents = {
                    reference: $e(a) ? ct(a) : a.contextElement ? ct(a.contextElement) : [],
                    popper: ct(l)
                };
                var A = Yi(Gi([].concat(r, c.options.modifiers)));
                return c.orderedModifiers = A.filter(function(E) {
                    return E.enabled
                }),
                d(),
                b.update()
            },
            forceUpdate: function() {
                if (!g) {
                    var w = c.elements
                      , D = w.reference
                      , A = w.popper;
                    if (Zn(D, A)) {
                        c.rects = {
                            reference: Ki(D, ft(A), c.options.strategy === "fixed"),
                            popper: xn(A)
                        },
                        c.reset = !1,
                        c.placement = c.options.placement,
                        c.orderedModifiers.forEach(function(H) {
                            return c.modifiersData[H.name] = Object.assign({}, H.data)
                        });
                        for (var E = 0; E < c.orderedModifiers.length; E++) {
                            if (c.reset === !0) {
                                c.reset = !1,
                                E = -1;
                                continue
                            }
                            var S = c.orderedModifiers[E]
                              , L = S.fn
                              , x = S.options
                              , z = x === void 0 ? {} : x
                              , M = S.name;
                            typeof L == "function" && (c = L({
                                state: c,
                                options: z,
                                name: M,
                                instance: b
                            }) || c)
                        }
                    }
                }
            },
            update: Xi(function() {
                return new Promise(function(h) {
                    b.forceUpdate(),
                    h(c)
                }
                )
            }),
            destroy: function() {
                m(),
                g = !0
            }
        };
        if (!Zn(a, l))
            return b;
        b.setOptions(u).then(function(h) {
            !g && u.onFirstUpdate && u.onFirstUpdate(h)
        });
        function d() {
            c.orderedModifiers.forEach(function(h) {
                var w = h.name
                  , D = h.options
                  , A = D === void 0 ? {} : D
                  , E = h.effect;
                if (typeof E == "function") {
                    var S = E({
                        state: c,
                        name: w,
                        instance: b,
                        options: A
                    })
                      , L = function() {};
                    p.push(S || L)
                }
            })
        }
        function m() {
            p.forEach(function(h) {
                return h()
            }),
            p = []
        }
        return b
    }
}
var Qi = zt()
  , Zi = [Nn, kn, Rn, Tn]
  , eo = zt({
    defaultModifiers: Zi
})
  , to = [Nn, kn, Rn, Tn, ss, ns, is, Zr, rs]
  , os = zt({
    defaultModifiers: to
});
const no = Object.freeze(Object.defineProperty({
    __proto__: null,
    afterMain: Ur,
    afterRead: jr,
    afterWrite: Wr,
    applyStyles: Tn,
    arrow: Zr,
    auto: $t,
    basePlacements: et,
    beforeMain: zr,
    beforeRead: Br,
    beforeWrite: qr,
    bottom: le,
    clippingParents: Mr,
    computeStyles: Rn,
    createPopper: os,
    createPopperBase: Qi,
    createPopperLite: eo,
    detectOverflow: Ge,
    end: Ke,
    eventListeners: Nn,
    flip: ns,
    hide: rs,
    left: se,
    main: Hr,
    modifierPhases: Kr,
    offset: ss,
    placements: On,
    popper: qe,
    popperGenerator: zt,
    popperOffsets: kn,
    preventOverflow: is,
    read: $r,
    reference: Fr,
    right: ue,
    start: Be,
    top: re,
    variationPlacements: mn,
    viewport: Sn,
    write: Vr
}, Symbol.toStringTag, {
    value: "Module"
}))
  , er = "dropdown"
  , ro = "bs.dropdown"
  , ze = `.${ro}`
  , Mn = ".data-api"
  , so = "Escape"
  , tr = "Tab"
  , io = "ArrowUp"
  , nr = "ArrowDown"
  , oo = 2
  , ao = `hide${ze}`
  , co = `hidden${ze}`
  , lo = `show${ze}`
  , uo = `shown${ze}`
  , as = `click${ze}${Mn}`
  , cs = `keydown${ze}${Mn}`
  , fo = `keyup${ze}${Mn}`
  , Ve = "show"
  , po = "dropup"
  , ho = "dropend"
  , mo = "dropstart"
  , go = "dropup-center"
  , vo = "dropdown-center"
  , Ie = '[data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)'
  , yo = `${Ie}.${Ve}`
  , Nt = ".dropdown-menu"
  , bo = ".navbar"
  , _o = ".navbar-nav"
  , Eo = ".dropdown-menu .dropdown-item:not(.disabled):not(:disabled)"
  , wo = Ze() ? "top-end" : "top-start"
  , Ao = Ze() ? "top-start" : "top-end"
  , So = Ze() ? "bottom-end" : "bottom-start"
  , Oo = Ze() ? "bottom-start" : "bottom-end"
  , Co = Ze() ? "left-start" : "right-start"
  , To = Ze() ? "right-start" : "left-start"
  , xo = "top"
  , Lo = "bottom"
  , Ro = {
    autoClose: !0,
    boundary: "clippingParents",
    display: "dynamic",
    offset: [0, 2],
    popperConfig: null,
    reference: "toggle"
}
  , No = {
    autoClose: "(boolean|string)",
    boundary: "(string|element)",
    display: "string",
    offset: "(array|string|function)",
    popperConfig: "(null|object|function)",
    reference: "(string|element|object)"
};
class be extends kr {
    constructor(e, n) {
        super(e, n),
        this._popper = null,
        this._parent = this._element.parentNode,
        this._menu = K.next(this._element, Nt)[0] || K.prev(this._element, Nt)[0] || K.findOne(Nt, this._parent),
        this._inNavbar = this._detectNavbar()
    }
    static get Default() {
        return Ro
    }
    static get DefaultType() {
        return No
    }
    static get NAME() {
        return er
    }
    toggle() {
        return this._isShown() ? this.hide() : this.show()
    }
    show() {
        if (fn(this._element) || this._isShown())
            return;
        const e = {
            relatedTarget: this._element
        };
        if (!J.trigger(this._element, lo, e).defaultPrevented) {
            if (this._createPopper(),
            "ontouchstart"in document.documentElement && !this._parent.closest(_o))
                for (const r of [].concat(...document.body.children))
                    J.on(r, "mouseover", Hn);
            this._element.focus(),
            this._element.setAttribute("aria-expanded", !0),
            this._menu.classList.add(Ve),
            this._element.classList.add(Ve),
            J.trigger(this._element, uo, e)
        }
    }
    hide() {
        if (fn(this._element) || !this._isShown())
            return;
        const e = {
            relatedTarget: this._element
        };
        this._completeHide(e)
    }
    dispose() {
        this._popper && this._popper.destroy(),
        super.dispose()
    }
    update() {
        this._inNavbar = this._detectNavbar(),
        this._popper && this._popper.update()
    }
    _completeHide(e) {
        if (!J.trigger(this._element, ao, e).defaultPrevented) {
            if ("ontouchstart"in document.documentElement)
                for (const r of [].concat(...document.body.children))
                    J.off(r, "mouseover", Hn);
            this._popper && this._popper.destroy(),
            this._menu.classList.remove(Ve),
            this._element.classList.remove(Ve),
            this._element.setAttribute("aria-expanded", "false"),
            Mt.removeDataAttribute(this._menu, "popper"),
            J.trigger(this._element, co, e)
        }
    }
    _getConfig(e) {
        if (e = super._getConfig(e),
        typeof e.reference == "object" && !ke(e.reference) && typeof e.reference.getBoundingClientRect != "function")
            throw new TypeError(`${er.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);
        return e
    }
    _createPopper() {
        if (typeof no > "u")
            throw new TypeError("Bootstrap's dropdowns require Popper (https://popper.js.org/docs/v2/)");
        let e = this._element;
        this._config.reference === "parent" ? e = this._parent : ke(this._config.reference) ? e = kt(this._config.reference) : typeof this._config.reference == "object" && (e = this._config.reference);
        const n = this._getPopperConfig();
        this._popper = os(e, this._menu, n)
    }
    _isShown() {
        return this._menu.classList.contains(Ve)
    }
    _getPlacement() {
        const e = this._parent;
        if (e.classList.contains(ho))
            return Co;
        if (e.classList.contains(mo))
            return To;
        if (e.classList.contains(go))
            return xo;
        if (e.classList.contains(vo))
            return Lo;
        const n = getComputedStyle(this._menu).getPropertyValue("--bs-position").trim() === "end";
        return e.classList.contains(po) ? n ? Ao : wo : n ? Oo : So
    }
    _detectNavbar() {
        return this._element.closest(bo) !== null
    }
    _getOffset() {
        const {offset: e} = this._config;
        return typeof e == "string" ? e.split(",").map(n => Number.parseInt(n, 10)) : typeof e == "function" ? n => e(n, this._element) : e
    }
    _getPopperConfig() {
        const e = {
            placement: this._getPlacement(),
            modifiers: [{
                name: "preventOverflow",
                options: {
                    boundary: this._config.boundary
                }
            }, {
                name: "offset",
                options: {
                    offset: this._getOffset()
                }
            }]
        };
        return (this._inNavbar || this._config.display === "static") && (Mt.setDataAttribute(this._menu, "popper", "static"),
        e.modifiers = [{
            name: "applyStyles",
            enabled: !1
        }]),
        {
            ...e,
            ...dn(this._config.popperConfig, [void 0, e])
        }
    }
    _selectMenuItem({key: e, target: n}) {
        const r = K.find(Eo, this._menu).filter(s => Cr(s));
        r.length && qs(r, n, e === nr, !r.includes(n)).focus()
    }
    static jQueryInterface(e) {
        return this.each(function() {
            const n = be.getOrCreateInstance(this, e);
            if (typeof e == "string") {
                if (typeof n[e] > "u")
                    throw new TypeError(`No method named "${e}"`);
                n[e]()
            }
        })
    }
    static clearMenus(e) {
        if (e.button === oo || e.type === "keyup" && e.key !== tr)
            return;
        const n = K.find(yo);
        for (const r of n) {
            const s = be.getInstance(r);
            if (!s || s._config.autoClose === !1)
                continue;
            const o = e.composedPath()
              , i = o.includes(s._menu);
            if (o.includes(s._element) || s._config.autoClose === "inside" && !i || s._config.autoClose === "outside" && i || s._menu.contains(e.target) && (e.type === "keyup" && e.key === tr || /input|select|option|textarea|form/i.test(e.target.tagName)))
                continue;
            const a = {
                relatedTarget: s._element
            };
            e.type === "click" && (a.clickEvent = e),
            s._completeHide(a)
        }
    }
    static dataApiKeydownHandler(e) {
        const n = /input|textarea/i.test(e.target.tagName)
          , r = e.key === so
          , s = [io, nr].includes(e.key);
        if (!s && !r || n && !r)
            return;
        e.preventDefault();
        const o = this.matches(Ie) ? this : K.prev(this, Ie)[0] || K.next(this, Ie)[0] || K.findOne(Ie, e.delegateTarget.parentNode)
          , i = be.getOrCreateInstance(o);
        if (s) {
            e.stopPropagation(),
            i.show(),
            i._selectMenuItem(e);
            return
        }
        i._isShown() && (e.stopPropagation(),
        i.hide(),
        o.focus())
    }
}
J.on(document, cs, Ie, be.dataApiKeydownHandler);
J.on(document, cs, Nt, be.dataApiKeydownHandler);
J.on(document, as, be.clearMenus);
J.on(document, fo, be.clearMenus);
J.on(document, as, Ie, function(t) {
    t.preventDefault(),
    be.getOrCreateInstance(this).toggle()
});
xr(be);
function Do(t) {
    return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t
}
var Io = {
    exports: {}
};
(function(t) {
    (function(e, n) {
        var r = n(e, e.document, Date);
        e.lazySizes = r,
        t.exports && (t.exports = r)
    }
    )(typeof window < "u" ? window : {}, function(n, r, s) {
        var o, i;
        if (function() {
            var _, y = {
                lazyClass: "lazyload",
                loadedClass: "lazyloaded",
                loadingClass: "lazyloading",
                preloadClass: "lazypreload",
                errorClass: "lazyerror",
                autosizesClass: "lazyautosizes",
                fastLoadedClass: "ls-is-cached",
                iframeLoadMode: 0,
                srcAttr: "data-src",
                srcsetAttr: "data-srcset",
                sizesAttr: "data-sizes",
                minSize: 40,
                customMedia: {},
                init: !0,
                expFactor: 1.5,
                hFac: .8,
                loadMode: 2,
                loadHidden: !0,
                ricTimeout: 0,
                throttleDelay: 125
            };
            i = n.lazySizesConfig || n.lazysizesConfig || {};
            for (_ in y)
                _ in i || (i[_] = y[_])
        }(),
        !r || !r.getElementsByClassName)
            return {
                init: function() {},
                cfg: i,
                noSupport: !0
            };
        var a = r.documentElement
          , l = n.HTMLPictureElement
          , u = "addEventListener"
          , c = "getAttribute"
          , p = n[u].bind(n)
          , g = n.setTimeout
          , b = n.requestAnimationFrame || g
          , d = n.requestIdleCallback
          , m = /^picture$/i
          , h = ["load", "error", "lazyincluded", "_lazyloaded"]
          , w = {}
          , D = Array.prototype.forEach
          , A = function(_, y) {
            return w[y] || (w[y] = new RegExp("(\\s|^)" + y + "(\\s|$)")),
            w[y].test(_[c]("class") || "") && w[y]
        }
          , E = function(_, y) {
            A(_, y) || _.setAttribute("class", (_[c]("class") || "").trim() + " " + y)
        }
          , S = function(_, y) {
            var O;
            (O = A(_, y)) && _.setAttribute("class", (_[c]("class") || "").replace(O, " "))
        }
          , L = function(_, y, O) {
            var P = O ? u : "removeEventListener";
            O && L(_, y),
            h.forEach(function(I) {
                _[P](I, y)
            })
        }
          , x = function(_, y, O, P, I) {
            var R = r.createEvent("Event");
            return O || (O = {}),
            O.instance = o,
            R.initEvent(y, !P, !I),
            R.detail = O,
            _.dispatchEvent(R),
            R
        }
          , z = function(_, y) {
            var O;
            !l && (O = n.picturefill || i.pf) ? (y && y.src && !_[c]("srcset") && _.setAttribute("srcset", y.src),
            O({
                reevaluate: !0,
                elements: [_]
            })) : y && y.src && (_.src = y.src)
        }
          , M = function(_, y) {
            return (getComputedStyle(_, null) || {})[y]
        }
          , H = function(_, y, O) {
            for (O = O || _.offsetWidth; O < i.minSize && y && !_._lazysizesWidth; )
                O = y.offsetWidth,
                y = y.parentNode;
            return O
        }
          , U = function() {
            var _, y, O = [], P = [], I = O, R = function() {
                var N = I;
                for (I = O.length ? P : O,
                _ = !0,
                y = !1; N.length; )
                    N.shift()();
                _ = !1
            }, k = function(N, F) {
                _ && !F ? N.apply(this, arguments) : (I.push(N),
                y || (y = !0,
                (r.hidden ? g : b)(R)))
            };
            return k._lsFlush = R,
            k
        }()
          , V = function(_, y) {
            return y ? function() {
                U(_)
            }
            : function() {
                var O = this
                  , P = arguments;
                U(function() {
                    _.apply(O, P)
                })
            }
        }
          , q = function(_) {
            var y, O = 0, P = i.throttleDelay, I = i.ricTimeout, R = function() {
                y = !1,
                O = s.now(),
                _()
            }, k = d && I > 49 ? function() {
                d(R, {
                    timeout: I
                }),
                I !== i.ricTimeout && (I = i.ricTimeout)
            }
            : V(function() {
                g(R)
            }, !0);
            return function(N) {
                var F;
                (N = N === !0) && (I = 33),
                !y && (y = !0,
                F = P - (s.now() - O),
                F < 0 && (F = 0),
                N || F < 9 ? k() : g(k, F))
            }
        }
          , Y = function(_) {
            var y, O, P = 99, I = function() {
                y = null,
                _()
            }, R = function() {
                var k = s.now() - O;
                k < P ? g(R, P - k) : (d || I)(I)
            };
            return function() {
                O = s.now(),
                y || (y = g(R, P))
            }
        }
          , ae = function() {
            var _, y, O, P, I, R, k, N, F, X, G, he, Kt = /^img$/i, rt = /^iframe$/i, Jt = "onscroll"in n && !/(gle|ing)bot/.test(navigator.userAgent), gt = 0, Re = 0, ce = 0, Ee = -1, st = function(v) {
                ce--,
                (!v || ce < 0 || !v.target) && (ce = 0)
            }, vt = function(v) {
                return he == null && (he = M(r.body, "visibility") == "hidden"),
                he || !(M(v.parentNode, "visibility") == "hidden" && M(v, "visibility") == "hidden")
            }, Yt = function(v, C) {
                var j, Z = v, ee = vt(v);
                for (N -= C,
                G += C,
                F -= C,
                X += C; ee && (Z = Z.offsetParent) && Z != r.body && Z != a; )
                    ee = (M(Z, "opacity") || 1) > 0,
                    ee && M(Z, "overflow") != "visible" && (j = Z.getBoundingClientRect(),
                    ee = X > j.left && F < j.right && G > j.top - 1 && N < j.bottom + 1);
                return ee
            }, ge = function() {
                var v, C, j, Z, ee, ne, we, Ae, Te, Se, Ne, Ue, de = o.elements;
                if ((P = i.loadMode) && ce < 8 && (v = de.length)) {
                    for (C = 0,
                    Ee++; C < v; C++)
                        if (!(!de[C] || de[C]._lazyRace)) {
                            if (!Jt || o.prematureUnveil && o.prematureUnveil(de[C])) {
                                Ce(de[C]);
                                continue
                            }
                            if ((!(Ae = de[C][c]("data-expand")) || !(ne = Ae * 1)) && (ne = Re),
                            Se || (Se = !i.expand || i.expand < 1 ? a.clientHeight > 500 && a.clientWidth > 500 ? 500 : 370 : i.expand,
                            o._defEx = Se,
                            Ne = Se * i.expFactor,
                            Ue = i.hFac,
                            he = null,
                            Re < Ne && ce < 1 && Ee > 2 && P > 2 && !r.hidden ? (Re = Ne,
                            Ee = 0) : P > 1 && Ee > 1 && ce < 6 ? Re = Se : Re = gt),
                            Te !== ne && (R = innerWidth + ne * Ue,
                            k = innerHeight + ne,
                            we = ne * -1,
                            Te = ne),
                            j = de[C].getBoundingClientRect(),
                            (G = j.bottom) >= we && (N = j.top) <= k && (X = j.right) >= we * Ue && (F = j.left) <= R && (G || X || F || N) && (i.loadHidden || vt(de[C])) && (y && ce < 3 && !Ae && (P < 3 || Ee < 4) || Yt(de[C], ne))) {
                                if (Ce(de[C]),
                                ee = !0,
                                ce > 9)
                                    break
                            } else
                                !ee && y && !Z && ce < 4 && Ee < 4 && P > 2 && (_[0] || i.preloadAfterLoad) && (_[0] || !Ae && (G || X || F || N || de[C][c](i.sizesAttr) != "auto")) && (Z = _[0] || de[C])
                        }
                    Z && !ee && Ce(Z)
                }
            }, Q = q(ge), it = function(v) {
                var C = v.target;
                if (C._lazyCache) {
                    delete C._lazyCache;
                    return
                }
                st(v),
                E(C, i.loadedClass),
                S(C, i.loadingClass),
                L(C, He),
                x(C, "lazyloaded")
            }, yt = V(it), He = function(v) {
                yt({
                    target: v.target
                })
            }, bt = function(v, C) {
                var j = v.getAttribute("data-load-mode") || i.iframeLoadMode;
                j == 0 ? v.contentWindow.location.replace(C) : j == 1 && (v.src = C)
            }, _t = function(v) {
                var C, j = v[c](i.srcsetAttr);
                (C = i.customMedia[v[c]("data-media") || v[c]("media")]) && v.setAttribute("media", C),
                j && v.setAttribute("srcset", j)
            }, Et = V(function(v, C, j, Z, ee) {
                var ne, we, Ae, Te, Se, Ne;
                (Se = x(v, "lazybeforeunveil", C)).defaultPrevented || (Z && (j ? E(v, i.autosizesClass) : v.setAttribute("sizes", Z)),
                we = v[c](i.srcsetAttr),
                ne = v[c](i.srcAttr),
                ee && (Ae = v.parentNode,
                Te = Ae && m.test(Ae.nodeName || "")),
                Ne = C.firesLoad || "src"in v && (we || ne || Te),
                Se = {
                    target: v
                },
                E(v, i.loadingClass),
                Ne && (clearTimeout(O),
                O = g(st, 2500),
                L(v, He, !0)),
                Te && D.call(Ae.getElementsByTagName("source"), _t),
                we ? v.setAttribute("srcset", we) : ne && !Te && (rt.test(v.nodeName) ? bt(v, ne) : v.src = ne),
                ee && (we || Te) && z(v, {
                    src: ne
                })),
                v._lazyRace && delete v._lazyRace,
                S(v, i.lazyClass),
                U(function() {
                    var Ue = v.complete && v.naturalWidth > 1;
                    (!Ne || Ue) && (Ue && E(v, i.fastLoadedClass),
                    it(Se),
                    v._lazyCache = !0,
                    g(function() {
                        "_lazyCache"in v && delete v._lazyCache
                    }, 9)),
                    v.loading == "lazy" && ce--
                }, !0)
            }), Ce = function(v) {
                if (!v._lazyRace) {
                    var C, j = Kt.test(v.nodeName), Z = j && (v[c](i.sizesAttr) || v[c]("sizes")), ee = Z == "auto";
                    (ee || !y) && j && (v[c]("src") || v.srcset) && !v.complete && !A(v, i.errorClass) && A(v, i.lazyClass) || (C = x(v, "lazyunveilread").detail,
                    ee && B.updateElem(v, !0, v.offsetWidth),
                    v._lazyRace = !0,
                    ce++,
                    Et(v, C, ee, Z, j))
                }
            }, Ps = Y(function() {
                i.loadMode = 3,
                Q()
            }), jn = function() {
                i.loadMode == 3 && (i.loadMode = 2),
                Ps()
            }, wt = function() {
                if (!y) {
                    if (s.now() - I < 999) {
                        g(wt, 999);
                        return
                    }
                    y = !0,
                    i.loadMode = 3,
                    Q(),
                    p("scroll", jn, !0)
                }
            };
            return {
                _: function() {
                    I = s.now(),
                    o.elements = r.getElementsByClassName(i.lazyClass),
                    _ = r.getElementsByClassName(i.lazyClass + " " + i.preloadClass),
                    p("scroll", Q, !0),
                    p("resize", Q, !0),
                    p("pageshow", function(v) {
                        if (v.persisted) {
                            var C = r.querySelectorAll("." + i.loadingClass);
                            C.length && C.forEach && b(function() {
                                C.forEach(function(j) {
                                    j.complete && Ce(j)
                                })
                            })
                        }
                    }),
                    n.MutationObserver ? new MutationObserver(Q).observe(a, {
                        childList: !0,
                        subtree: !0,
                        attributes: !0
                    }) : (a[u]("DOMNodeInserted", Q, !0),
                    a[u]("DOMAttrModified", Q, !0),
                    setInterval(Q, 999)),
                    p("hashchange", Q, !0),
                    ["focus", "mouseover", "click", "load", "transitionend", "animationend"].forEach(function(v) {
                        r[u](v, Q, !0)
                    }),
                    /d$|^c/.test(r.readyState) ? wt() : (p("load", wt),
                    r[u]("DOMContentLoaded", Q),
                    g(wt, 2e4)),
                    o.elements.length ? (ge(),
                    U._lsFlush()) : Q()
                },
                checkElems: Q,
                unveil: Ce,
                _aLSL: jn
            }
        }()
          , B = function() {
            var _, y = V(function(R, k, N, F) {
                var X, G, he;
                if (R._lazysizesWidth = F,
                F += "px",
                R.setAttribute("sizes", F),
                m.test(k.nodeName || ""))
                    for (X = k.getElementsByTagName("source"),
                    G = 0,
                    he = X.length; G < he; G++)
                        X[G].setAttribute("sizes", F);
                N.detail.dataAttr || z(R, N.detail)
            }), O = function(R, k, N) {
                var F, X = R.parentNode;
                X && (N = H(R, X, N),
                F = x(R, "lazybeforesizes", {
                    width: N,
                    dataAttr: !!k
                }),
                F.defaultPrevented || (N = F.detail.width,
                N && N !== R._lazysizesWidth && y(R, X, F, N)))
            }, P = function() {
                var R, k = _.length;
                if (k)
                    for (R = 0; R < k; R++)
                        O(_[R])
            }, I = Y(P);
            return {
                _: function() {
                    _ = r.getElementsByClassName(i.autosizesClass),
                    p("resize", I)
                },
                checkElems: I,
                updateElem: O
            }
        }()
          , W = function() {
            !W.i && r.getElementsByClassName && (W.i = !0,
            B._(),
            ae._())
        };
        return g(function() {
            i.init && W()
        }),
        o = {
            cfg: i,
            autoSizer: B,
            loader: ae,
            init: W,
            uP: z,
            aC: E,
            rC: S,
            hC: A,
            fire: x,
            gW: H,
            rAF: U
        },
        o
    })
}
)(Io);
function ls(t, e) {
    return function() {
        return t.apply(e, arguments)
    }
}
const {toString: Po} = Object.prototype
  , {getPrototypeOf: Fn} = Object
  , {iterator: Ht, toStringTag: us} = Symbol
  , Ut = (t => e => {
    const n = Po.call(e);
    return t[n] || (t[n] = n.slice(8, -1).toLowerCase())
}
)(Object.create(null))
  , me = t => (t = t.toLowerCase(),
e => Ut(e) === t)
  , qt = t => e => typeof e === t
  , {isArray: tt} = Array
  , Qe = qt("undefined");
function dt(t) {
    return t !== null && !Qe(t) && t.constructor !== null && !Qe(t.constructor) && ie(t.constructor.isBuffer) && t.constructor.isBuffer(t)
}
const fs = me("ArrayBuffer");
function ko(t) {
    let e;
    return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? e = ArrayBuffer.isView(t) : e = t && t.buffer && fs(t.buffer),
    e
}
const Mo = qt("string")
  , ie = qt("function")
  , ds = qt("number")
  , pt = t => t !== null && typeof t == "object"
  , Fo = t => t === !0 || t === !1
  , Dt = t => {
    if (Ut(t) !== "object")
        return !1;
    const e = Fn(t);
    return (e === null || e === Object.prototype || Object.getPrototypeOf(e) === null) && !(us in t) && !(Ht in t)
}
  , Bo = t => {
    if (!pt(t) || dt(t))
        return !1;
    try {
        return Object.keys(t).length === 0 && Object.getPrototypeOf(t) === Object.prototype
    } catch {
        return !1
    }
}
  , $o = me("Date")
  , jo = me("File")
  , zo = me("Blob")
  , Ho = me("FileList")
  , Uo = t => pt(t) && ie(t.pipe)
  , qo = t => {
    let e;
    return t && (typeof FormData == "function" && t instanceof FormData || ie(t.append) && ((e = Ut(t)) === "formdata" || e === "object" && ie(t.toString) && t.toString() === "[object FormData]"))
}
  , Vo = me("URLSearchParams")
  , [Wo,Ko,Jo,Yo] = ["ReadableStream", "Request", "Response", "Headers"].map(me)
  , Xo = t => t.trim ? t.trim() : t.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function ht(t, e, {allOwnKeys: n=!1}={}) {
    if (t === null || typeof t > "u")
        return;
    let r, s;
    if (typeof t != "object" && (t = [t]),
    tt(t))
        for (r = 0,
        s = t.length; r < s; r++)
            e.call(null, t[r], r, t);
    else {
        if (dt(t))
            return;
        const o = n ? Object.getOwnPropertyNames(t) : Object.keys(t)
          , i = o.length;
        let a;
        for (r = 0; r < i; r++)
            a = o[r],
            e.call(null, t[a], a, t)
    }
}
function ps(t, e) {
    if (dt(t))
        return null;
    e = e.toLowerCase();
    const n = Object.keys(t);
    let r = n.length, s;
    for (; r-- > 0; )
        if (s = n[r],
        e === s.toLowerCase())
            return s;
    return null
}
const Pe = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global
  , hs = t => !Qe(t) && t !== Pe;
function yn() {
    const {caseless: t, skipUndefined: e} = hs(this) && this || {}
      , n = {}
      , r = (s, o) => {
        const i = t && ps(n, o) || o;
        Dt(n[i]) && Dt(s) ? n[i] = yn(n[i], s) : Dt(s) ? n[i] = yn({}, s) : tt(s) ? n[i] = s.slice() : (!e || !Qe(s)) && (n[i] = s)
    }
    ;
    for (let s = 0, o = arguments.length; s < o; s++)
        arguments[s] && ht(arguments[s], r);
    return n
}
const Go = (t, e, n, {allOwnKeys: r}={}) => (ht(e, (s, o) => {
    n && ie(s) ? t[o] = ls(s, n) : t[o] = s
}
, {
    allOwnKeys: r
}),
t)
  , Qo = t => (t.charCodeAt(0) === 65279 && (t = t.slice(1)),
t)
  , Zo = (t, e, n, r) => {
    t.prototype = Object.create(e.prototype, r),
    t.prototype.constructor = t,
    Object.defineProperty(t, "super", {
        value: e.prototype
    }),
    n && Object.assign(t.prototype, n)
}
  , ea = (t, e, n, r) => {
    let s, o, i;
    const a = {};
    if (e = e || {},
    t == null)
        return e;
    do {
        for (s = Object.getOwnPropertyNames(t),
        o = s.length; o-- > 0; )
            i = s[o],
            (!r || r(i, t, e)) && !a[i] && (e[i] = t[i],
            a[i] = !0);
        t = n !== !1 && Fn(t)
    } while (t && (!n || n(t, e)) && t !== Object.prototype);
    return e
}
  , ta = (t, e, n) => {
    t = String(t),
    (n === void 0 || n > t.length) && (n = t.length),
    n -= e.length;
    const r = t.indexOf(e, n);
    return r !== -1 && r === n
}
  , na = t => {
    if (!t)
        return null;
    if (tt(t))
        return t;
    let e = t.length;
    if (!ds(e))
        return null;
    const n = new Array(e);
    for (; e-- > 0; )
        n[e] = t[e];
    return n
}
  , ra = (t => e => t && e instanceof t)(typeof Uint8Array < "u" && Fn(Uint8Array))
  , sa = (t, e) => {
    const r = (t && t[Ht]).call(t);
    let s;
    for (; (s = r.next()) && !s.done; ) {
        const o = s.value;
        e.call(t, o[0], o[1])
    }
}
  , ia = (t, e) => {
    let n;
    const r = [];
    for (; (n = t.exec(e)) !== null; )
        r.push(n);
    return r
}
  , oa = me("HTMLFormElement")
  , aa = t => t.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function(n, r, s) {
    return r.toUpperCase() + s
})
  , rr = ( ({hasOwnProperty: t}) => (e, n) => t.call(e, n))(Object.prototype)
  , ca = me("RegExp")
  , ms = (t, e) => {
    const n = Object.getOwnPropertyDescriptors(t)
      , r = {};
    ht(n, (s, o) => {
        let i;
        (i = e(s, o, t)) !== !1 && (r[o] = i || s)
    }
    ),
    Object.defineProperties(t, r)
}
  , la = t => {
    ms(t, (e, n) => {
        if (ie(t) && ["arguments", "caller", "callee"].indexOf(n) !== -1)
            return !1;
        const r = t[n];
        if (ie(r)) {
            if (e.enumerable = !1,
            "writable"in e) {
                e.writable = !1;
                return
            }
            e.set || (e.set = () => {
                throw Error("Can not rewrite read-only method '" + n + "'")
            }
            )
        }
    }
    )
}
  , ua = (t, e) => {
    const n = {}
      , r = s => {
        s.forEach(o => {
            n[o] = !0
        }
        )
    }
    ;
    return tt(t) ? r(t) : r(String(t).split(e)),
    n
}
  , fa = () => {}
  , da = (t, e) => t != null && Number.isFinite(t = +t) ? t : e;
function pa(t) {
    return !!(t && ie(t.append) && t[us] === "FormData" && t[Ht])
}
const ha = t => {
    const e = new Array(10)
      , n = (r, s) => {
        if (pt(r)) {
            if (e.indexOf(r) >= 0)
                return;
            if (dt(r))
                return r;
            if (!("toJSON"in r)) {
                e[s] = r;
                const o = tt(r) ? [] : {};
                return ht(r, (i, a) => {
                    const l = n(i, s + 1);
                    !Qe(l) && (o[a] = l)
                }
                ),
                e[s] = void 0,
                o
            }
        }
        return r
    }
    ;
    return n(t, 0)
}
  , ma = me("AsyncFunction")
  , ga = t => t && (pt(t) || ie(t)) && ie(t.then) && ie(t.catch)
  , gs = ( (t, e) => t ? setImmediate : e ? ( (n, r) => (Pe.addEventListener("message", ({source: s, data: o}) => {
    s === Pe && o === n && r.length && r.shift()()
}
, !1),
s => {
    r.push(s),
    Pe.postMessage(n, "*")
}
))(`axios@${Math.random()}`, []) : n => setTimeout(n))(typeof setImmediate == "function", ie(Pe.postMessage))
  , va = typeof queueMicrotask < "u" ? queueMicrotask.bind(Pe) : typeof process < "u" && process.nextTick || gs
  , ya = t => t != null && ie(t[Ht])
  , f = {
    isArray: tt,
    isArrayBuffer: fs,
    isBuffer: dt,
    isFormData: qo,
    isArrayBufferView: ko,
    isString: Mo,
    isNumber: ds,
    isBoolean: Fo,
    isObject: pt,
    isPlainObject: Dt,
    isEmptyObject: Bo,
    isReadableStream: Wo,
    isRequest: Ko,
    isResponse: Jo,
    isHeaders: Yo,
    isUndefined: Qe,
    isDate: $o,
    isFile: jo,
    isBlob: zo,
    isRegExp: ca,
    isFunction: ie,
    isStream: Uo,
    isURLSearchParams: Vo,
    isTypedArray: ra,
    isFileList: Ho,
    forEach: ht,
    merge: yn,
    extend: Go,
    trim: Xo,
    stripBOM: Qo,
    inherits: Zo,
    toFlatObject: ea,
    kindOf: Ut,
    kindOfTest: me,
    endsWith: ta,
    toArray: na,
    forEachEntry: sa,
    matchAll: ia,
    isHTMLForm: oa,
    hasOwnProperty: rr,
    hasOwnProp: rr,
    reduceDescriptors: ms,
    freezeMethods: la,
    toObjectSet: ua,
    toCamelCase: aa,
    noop: fa,
    toFiniteNumber: da,
    findKey: ps,
    global: Pe,
    isContextDefined: hs,
    isSpecCompliantForm: pa,
    toJSONObject: ha,
    isAsyncFn: ma,
    isThenable: ga,
    setImmediate: gs,
    asap: va,
    isIterable: ya
};
function T(t, e, n, r, s) {
    Error.call(this),
    Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack,
    this.message = t,
    this.name = "AxiosError",
    e && (this.code = e),
    n && (this.config = n),
    r && (this.request = r),
    s && (this.response = s,
    this.status = s.status ? s.status : null)
}
f.inherits(T, Error, {
    toJSON: function() {
        return {
            message: this.message,
            name: this.name,
            description: this.description,
            number: this.number,
            fileName: this.fileName,
            lineNumber: this.lineNumber,
            columnNumber: this.columnNumber,
            stack: this.stack,
            config: f.toJSONObject(this.config),
            code: this.code,
            status: this.status
        }
    }
});
const vs = T.prototype
  , ys = {};
["ERR_BAD_OPTION_VALUE", "ERR_BAD_OPTION", "ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK", "ERR_FR_TOO_MANY_REDIRECTS", "ERR_DEPRECATED", "ERR_BAD_RESPONSE", "ERR_BAD_REQUEST", "ERR_CANCELED", "ERR_NOT_SUPPORT", "ERR_INVALID_URL"].forEach(t => {
    ys[t] = {
        value: t
    }
}
);
Object.defineProperties(T, ys);
Object.defineProperty(vs, "isAxiosError", {
    value: !0
});
T.from = (t, e, n, r, s, o) => {
    const i = Object.create(vs);
    f.toFlatObject(t, i, function(c) {
        return c !== Error.prototype
    }, u => u !== "isAxiosError");
    const a = t && t.message ? t.message : "Error"
      , l = e == null && t ? t.code : e;
    return T.call(i, a, l, n, r, s),
    t && i.cause == null && Object.defineProperty(i, "cause", {
        value: t,
        configurable: !0
    }),
    i.name = t && t.name || "Error",
    o && Object.assign(i, o),
    i
}
;
const ba = null;
function bn(t) {
    return f.isPlainObject(t) || f.isArray(t)
}
function bs(t) {
    return f.endsWith(t, "[]") ? t.slice(0, -2) : t
}
function sr(t, e, n) {
    return t ? t.concat(e).map(function(s, o) {
        return s = bs(s),
        !n && o ? "[" + s + "]" : s
    }).join(n ? "." : "") : e
}
function _a(t) {
    return f.isArray(t) && !t.some(bn)
}
const Ea = f.toFlatObject(f, {}, null, function(e) {
    return /^is[A-Z]/.test(e)
});
function Vt(t, e, n) {
    if (!f.isObject(t))
        throw new TypeError("target must be an object");
    e = e || new FormData,
    n = f.toFlatObject(n, {
        metaTokens: !0,
        dots: !1,
        indexes: !1
    }, !1, function(m, h) {
        return !f.isUndefined(h[m])
    });
    const r = n.metaTokens
      , s = n.visitor || c
      , o = n.dots
      , i = n.indexes
      , l = (n.Blob || typeof Blob < "u" && Blob) && f.isSpecCompliantForm(e);
    if (!f.isFunction(s))
        throw new TypeError("visitor must be a function");
    function u(d) {
        if (d === null)
            return "";
        if (f.isDate(d))
            return d.toISOString();
        if (f.isBoolean(d))
            return d.toString();
        if (!l && f.isBlob(d))
            throw new T("Blob is not supported. Use a Buffer instead.");
        return f.isArrayBuffer(d) || f.isTypedArray(d) ? l && typeof Blob == "function" ? new Blob([d]) : Buffer.from(d) : d
    }
    function c(d, m, h) {
        let w = d;
        if (d && !h && typeof d == "object") {
            if (f.endsWith(m, "{}"))
                m = r ? m : m.slice(0, -2),
                d = JSON.stringify(d);
            else if (f.isArray(d) && _a(d) || (f.isFileList(d) || f.endsWith(m, "[]")) && (w = f.toArray(d)))
                return m = bs(m),
                w.forEach(function(A, E) {
                    !(f.isUndefined(A) || A === null) && e.append(i === !0 ? sr([m], E, o) : i === null ? m : m + "[]", u(A))
                }),
                !1
        }
        return bn(d) ? !0 : (e.append(sr(h, m, o), u(d)),
        !1)
    }
    const p = []
      , g = Object.assign(Ea, {
        defaultVisitor: c,
        convertValue: u,
        isVisitable: bn
    });
    function b(d, m) {
        if (!f.isUndefined(d)) {
            if (p.indexOf(d) !== -1)
                throw Error("Circular reference detected in " + m.join("."));
            p.push(d),
            f.forEach(d, function(w, D) {
                (!(f.isUndefined(w) || w === null) && s.call(e, w, f.isString(D) ? D.trim() : D, m, g)) === !0 && b(w, m ? m.concat(D) : [D])
            }),
            p.pop()
        }
    }
    if (!f.isObject(t))
        throw new TypeError("data must be an object");
    return b(t),
    e
}
function ir(t) {
    const e = {
        "!": "%21",
        "'": "%27",
        "(": "%28",
        ")": "%29",
        "~": "%7E",
        "%20": "+",
        "%00": "\0"
    };
    return encodeURIComponent(t).replace(/[!'()~]|%20|%00/g, function(r) {
        return e[r]
    })
}
function Bn(t, e) {
    this._pairs = [],
    t && Vt(t, this, e)
}
const _s = Bn.prototype;
_s.append = function(e, n) {
    this._pairs.push([e, n])
}
;
_s.toString = function(e) {
    const n = e ? function(r) {
        return e.call(this, r, ir)
    }
    : ir;
    return this._pairs.map(function(s) {
        return n(s[0]) + "=" + n(s[1])
    }, "").join("&")
}
;
function wa(t) {
    return encodeURIComponent(t).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+")
}
function Es(t, e, n) {
    if (!e)
        return t;
    const r = n && n.encode || wa;
    f.isFunction(n) && (n = {
        serialize: n
    });
    const s = n && n.serialize;
    let o;
    if (s ? o = s(e, n) : o = f.isURLSearchParams(e) ? e.toString() : new Bn(e,n).toString(r),
    o) {
        const i = t.indexOf("#");
        i !== -1 && (t = t.slice(0, i)),
        t += (t.indexOf("?") === -1 ? "?" : "&") + o
    }
    return t
}
class or {
    constructor() {
        this.handlers = []
    }
    use(e, n, r) {
        return this.handlers.push({
            fulfilled: e,
            rejected: n,
            synchronous: r ? r.synchronous : !1,
            runWhen: r ? r.runWhen : null
        }),
        this.handlers.length - 1
    }
    eject(e) {
        this.handlers[e] && (this.handlers[e] = null)
    }
    clear() {
        this.handlers && (this.handlers = [])
    }
    forEach(e) {
        f.forEach(this.handlers, function(r) {
            r !== null && e(r)
        })
    }
}
const ws = {
    silentJSONParsing: !0,
    forcedJSONParsing: !0,
    clarifyTimeoutError: !1
}
  , Aa = typeof URLSearchParams < "u" ? URLSearchParams : Bn
  , Sa = typeof FormData < "u" ? FormData : null
  , Oa = typeof Blob < "u" ? Blob : null
  , Ca = {
    isBrowser: !0,
    classes: {
        URLSearchParams: Aa,
        FormData: Sa,
        Blob: Oa
    },
    protocols: ["http", "https", "file", "blob", "url", "data"]
}
  , $n = typeof window < "u" && typeof document < "u"
  , _n = typeof navigator == "object" && navigator || void 0
  , Ta = $n && (!_n || ["ReactNative", "NativeScript", "NS"].indexOf(_n.product) < 0)
  , xa = typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope && typeof self.importScripts == "function"
  , La = $n && window.location.href || "http://localhost"
  , Ra = Object.freeze(Object.defineProperty({
    __proto__: null,
    hasBrowserEnv: $n,
    hasStandardBrowserEnv: Ta,
    hasStandardBrowserWebWorkerEnv: xa,
    navigator: _n,
    origin: La
}, Symbol.toStringTag, {
    value: "Module"
}))
  , te = {
    ...Ra,
    ...Ca
};
function Na(t, e) {
    return Vt(t, new te.classes.URLSearchParams, {
        visitor: function(n, r, s, o) {
            return te.isNode && f.isBuffer(n) ? (this.append(r, n.toString("base64")),
            !1) : o.defaultVisitor.apply(this, arguments)
        },
        ...e
    })
}
function Da(t) {
    return f.matchAll(/\w+|\[(\w*)]/g, t).map(e => e[0] === "[]" ? "" : e[1] || e[0])
}
function Ia(t) {
    const e = {}
      , n = Object.keys(t);
    let r;
    const s = n.length;
    let o;
    for (r = 0; r < s; r++)
        o = n[r],
        e[o] = t[o];
    return e
}
function As(t) {
    function e(n, r, s, o) {
        let i = n[o++];
        if (i === "__proto__")
            return !0;
        const a = Number.isFinite(+i)
          , l = o >= n.length;
        return i = !i && f.isArray(s) ? s.length : i,
        l ? (f.hasOwnProp(s, i) ? s[i] = [s[i], r] : s[i] = r,
        !a) : ((!s[i] || !f.isObject(s[i])) && (s[i] = []),
        e(n, r, s[i], o) && f.isArray(s[i]) && (s[i] = Ia(s[i])),
        !a)
    }
    if (f.isFormData(t) && f.isFunction(t.entries)) {
        const n = {};
        return f.forEachEntry(t, (r, s) => {
            e(Da(r), s, n, 0)
        }
        ),
        n
    }
    return null
}
function Pa(t, e, n) {
    if (f.isString(t))
        try {
            return (e || JSON.parse)(t),
            f.trim(t)
        } catch (r) {
            if (r.name !== "SyntaxError")
                throw r
        }
    return (n || JSON.stringify)(t)
}
const mt = {
    transitional: ws,
    adapter: ["xhr", "http", "fetch"],
    transformRequest: [function(e, n) {
        const r = n.getContentType() || ""
          , s = r.indexOf("application/json") > -1
          , o = f.isObject(e);
        if (o && f.isHTMLForm(e) && (e = new FormData(e)),
        f.isFormData(e))
            return s ? JSON.stringify(As(e)) : e;
        if (f.isArrayBuffer(e) || f.isBuffer(e) || f.isStream(e) || f.isFile(e) || f.isBlob(e) || f.isReadableStream(e))
            return e;
        if (f.isArrayBufferView(e))
            return e.buffer;
        if (f.isURLSearchParams(e))
            return n.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1),
            e.toString();
        let a;
        if (o) {
            if (r.indexOf("application/x-www-form-urlencoded") > -1)
                return Na(e, this.formSerializer).toString();
            if ((a = f.isFileList(e)) || r.indexOf("multipart/form-data") > -1) {
                const l = this.env && this.env.FormData;
                return Vt(a ? {
                    "files[]": e
                } : e, l && new l, this.formSerializer)
            }
        }
        return o || s ? (n.setContentType("application/json", !1),
        Pa(e)) : e
    }
    ],
    transformResponse: [function(e) {
        const n = this.transitional || mt.transitional
          , r = n && n.forcedJSONParsing
          , s = this.responseType === "json";
        if (f.isResponse(e) || f.isReadableStream(e))
            return e;
        if (e && f.isString(e) && (r && !this.responseType || s)) {
            const i = !(n && n.silentJSONParsing) && s;
            try {
                return JSON.parse(e, this.parseReviver)
            } catch (a) {
                if (i)
                    throw a.name === "SyntaxError" ? T.from(a, T.ERR_BAD_RESPONSE, this, null, this.response) : a
            }
        }
        return e
    }
    ],
    timeout: 0,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    maxContentLength: -1,
    maxBodyLength: -1,
    env: {
        FormData: te.classes.FormData,
        Blob: te.classes.Blob
    },
    validateStatus: function(e) {
        return e >= 200 && e < 300
    },
    headers: {
        common: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": void 0
        }
    }
};
f.forEach(["delete", "get", "head", "post", "put", "patch"], t => {
    mt.headers[t] = {}
}
);
const ka = f.toObjectSet(["age", "authorization", "content-length", "content-type", "etag", "expires", "from", "host", "if-modified-since", "if-unmodified-since", "last-modified", "location", "max-forwards", "proxy-authorization", "referer", "retry-after", "user-agent"])
  , Ma = t => {
    const e = {};
    let n, r, s;
    return t && t.split(`
`).forEach(function(i) {
        s = i.indexOf(":"),
        n = i.substring(0, s).trim().toLowerCase(),
        r = i.substring(s + 1).trim(),
        !(!n || e[n] && ka[n]) && (n === "set-cookie" ? e[n] ? e[n].push(r) : e[n] = [r] : e[n] = e[n] ? e[n] + ", " + r : r)
    }),
    e
}
  , ar = Symbol("internals");
function ot(t) {
    return t && String(t).trim().toLowerCase()
}
function It(t) {
    return t === !1 || t == null ? t : f.isArray(t) ? t.map(It) : String(t)
}
function Fa(t) {
    const e = Object.create(null)
      , n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
    let r;
    for (; r = n.exec(t); )
        e[r[1]] = r[2];
    return e
}
const Ba = t => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(t.trim());
function nn(t, e, n, r, s) {
    if (f.isFunction(r))
        return r.call(this, e, n);
    if (s && (e = n),
    !!f.isString(e)) {
        if (f.isString(r))
            return e.indexOf(r) !== -1;
        if (f.isRegExp(r))
            return r.test(e)
    }
}
function $a(t) {
    return t.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (e, n, r) => n.toUpperCase() + r)
}
function ja(t, e) {
    const n = f.toCamelCase(" " + e);
    ["get", "set", "has"].forEach(r => {
        Object.defineProperty(t, r + n, {
            value: function(s, o, i) {
                return this[r].call(this, e, s, o, i)
            },
            configurable: !0
        })
    }
    )
}
let oe = class {
    constructor(e) {
        e && this.set(e)
    }
    set(e, n, r) {
        const s = this;
        function o(a, l, u) {
            const c = ot(l);
            if (!c)
                throw new Error("header name must be a non-empty string");
            const p = f.findKey(s, c);
            (!p || s[p] === void 0 || u === !0 || u === void 0 && s[p] !== !1) && (s[p || l] = It(a))
        }
        const i = (a, l) => f.forEach(a, (u, c) => o(u, c, l));
        if (f.isPlainObject(e) || e instanceof this.constructor)
            i(e, n);
        else if (f.isString(e) && (e = e.trim()) && !Ba(e))
            i(Ma(e), n);
        else if (f.isObject(e) && f.isIterable(e)) {
            let a = {}, l, u;
            for (const c of e) {
                if (!f.isArray(c))
                    throw TypeError("Object iterator must return a key-value pair");
                a[u = c[0]] = (l = a[u]) ? f.isArray(l) ? [...l, c[1]] : [l, c[1]] : c[1]
            }
            i(a, n)
        } else
            e != null && o(n, e, r);
        return this
    }
    get(e, n) {
        if (e = ot(e),
        e) {
            const r = f.findKey(this, e);
            if (r) {
                const s = this[r];
                if (!n)
                    return s;
                if (n === !0)
                    return Fa(s);
                if (f.isFunction(n))
                    return n.call(this, s, r);
                if (f.isRegExp(n))
                    return n.exec(s);
                throw new TypeError("parser must be boolean|regexp|function")
            }
        }
    }
    has(e, n) {
        if (e = ot(e),
        e) {
            const r = f.findKey(this, e);
            return !!(r && this[r] !== void 0 && (!n || nn(this, this[r], r, n)))
        }
        return !1
    }
    delete(e, n) {
        const r = this;
        let s = !1;
        function o(i) {
            if (i = ot(i),
            i) {
                const a = f.findKey(r, i);
                a && (!n || nn(r, r[a], a, n)) && (delete r[a],
                s = !0)
            }
        }
        return f.isArray(e) ? e.forEach(o) : o(e),
        s
    }
    clear(e) {
        const n = Object.keys(this);
        let r = n.length
          , s = !1;
        for (; r--; ) {
            const o = n[r];
            (!e || nn(this, this[o], o, e, !0)) && (delete this[o],
            s = !0)
        }
        return s
    }
    normalize(e) {
        const n = this
          , r = {};
        return f.forEach(this, (s, o) => {
            const i = f.findKey(r, o);
            if (i) {
                n[i] = It(s),
                delete n[o];
                return
            }
            const a = e ? $a(o) : String(o).trim();
            a !== o && delete n[o],
            n[a] = It(s),
            r[a] = !0
        }
        ),
        this
    }
    concat(...e) {
        return this.constructor.concat(this, ...e)
    }
    toJSON(e) {
        const n = Object.create(null);
        return f.forEach(this, (r, s) => {
            r != null && r !== !1 && (n[s] = e && f.isArray(r) ? r.join(", ") : r)
        }
        ),
        n
    }
    [Symbol.iterator]() {
        return Object.entries(this.toJSON())[Symbol.iterator]()
    }
    toString() {
        return Object.entries(this.toJSON()).map( ([e,n]) => e + ": " + n).join(`
`)
    }
    getSetCookie() {
        return this.get("set-cookie") || []
    }
    get[Symbol.toStringTag]() {
        return "AxiosHeaders"
    }
    static from(e) {
        return e instanceof this ? e : new this(e)
    }
    static concat(e, ...n) {
        const r = new this(e);
        return n.forEach(s => r.set(s)),
        r
    }
    static accessor(e) {
        const r = (this[ar] = this[ar] = {
            accessors: {}
        }).accessors
          , s = this.prototype;
        function o(i) {
            const a = ot(i);
            r[a] || (ja(s, i),
            r[a] = !0)
        }
        return f.isArray(e) ? e.forEach(o) : o(e),
        this
    }
}
;
oe.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
f.reduceDescriptors(oe.prototype, ({value: t}, e) => {
    let n = e[0].toUpperCase() + e.slice(1);
    return {
        get: () => t,
        set(r) {
            this[n] = r
        }
    }
}
);
f.freezeMethods(oe);
function rn(t, e) {
    const n = this || mt
      , r = e || n
      , s = oe.from(r.headers);
    let o = r.data;
    return f.forEach(t, function(a) {
        o = a.call(n, o, s.normalize(), e ? e.status : void 0)
    }),
    s.normalize(),
    o
}
function Ss(t) {
    return !!(t && t.__CANCEL__)
}
function nt(t, e, n) {
    T.call(this, t ?? "canceled", T.ERR_CANCELED, e, n),
    this.name = "CanceledError"
}
f.inherits(nt, T, {
    __CANCEL__: !0
});
function Os(t, e, n) {
    const r = n.config.validateStatus;
    !n.status || !r || r(n.status) ? t(n) : e(new T("Request failed with status code " + n.status,[T.ERR_BAD_REQUEST, T.ERR_BAD_RESPONSE][Math.floor(n.status / 100) - 4],n.config,n.request,n))
}
function za(t) {
    const e = /^([-+\w]{1,25})(:?\/\/|:)/.exec(t);
    return e && e[1] || ""
}
function Ha(t, e) {
    t = t || 10;
    const n = new Array(t)
      , r = new Array(t);
    let s = 0, o = 0, i;
    return e = e !== void 0 ? e : 1e3,
    function(l) {
        const u = Date.now()
          , c = r[o];
        i || (i = u),
        n[s] = l,
        r[s] = u;
        let p = o
          , g = 0;
        for (; p !== s; )
            g += n[p++],
            p = p % t;
        if (s = (s + 1) % t,
        s === o && (o = (o + 1) % t),
        u - i < e)
            return;
        const b = c && u - c;
        return b ? Math.round(g * 1e3 / b) : void 0
    }
}
function Ua(t, e) {
    let n = 0, r = 1e3 / e, s, o;
    const i = (u, c=Date.now()) => {
        n = c,
        s = null,
        o && (clearTimeout(o),
        o = null),
        t(...u)
    }
    ;
    return [ (...u) => {
        const c = Date.now()
          , p = c - n;
        p >= r ? i(u, c) : (s = u,
        o || (o = setTimeout( () => {
            o = null,
            i(s)
        }
        , r - p)))
    }
    , () => s && i(s)]
}
const Bt = (t, e, n=3) => {
    let r = 0;
    const s = Ha(50, 250);
    return Ua(o => {
        const i = o.loaded
          , a = o.lengthComputable ? o.total : void 0
          , l = i - r
          , u = s(l)
          , c = i <= a;
        r = i;
        const p = {
            loaded: i,
            total: a,
            progress: a ? i / a : void 0,
            bytes: l,
            rate: u || void 0,
            estimated: u && a && c ? (a - i) / u : void 0,
            event: o,
            lengthComputable: a != null,
            [e ? "download" : "upload"]: !0
        };
        t(p)
    }
    , n)
}
  , cr = (t, e) => {
    const n = t != null;
    return [r => e[0]({
        lengthComputable: n,
        total: t,
        loaded: r
    }), e[1]]
}
  , lr = t => (...e) => f.asap( () => t(...e))
  , qa = te.hasStandardBrowserEnv ? ( (t, e) => n => (n = new URL(n,te.origin),
t.protocol === n.protocol && t.host === n.host && (e || t.port === n.port)))(new URL(te.origin), te.navigator && /(msie|trident)/i.test(te.navigator.userAgent)) : () => !0
  , Va = te.hasStandardBrowserEnv ? {
    write(t, e, n, r, s, o) {
        const i = [t + "=" + encodeURIComponent(e)];
        f.isNumber(n) && i.push("expires=" + new Date(n).toGMTString()),
        f.isString(r) && i.push("path=" + r),
        f.isString(s) && i.push("domain=" + s),
        o === !0 && i.push("secure"),
        document.cookie = i.join("; ")
    },
    read(t) {
        const e = document.cookie.match(new RegExp("(^|;\\s*)(" + t + ")=([^;]*)"));
        return e ? decodeURIComponent(e[3]) : null
    },
    remove(t) {
        this.write(t, "", Date.now() - 864e5)
    }
} : {
    write() {},
    read() {
        return null
    },
    remove() {}
};
function Wa(t) {
    return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(t)
}
function Ka(t, e) {
    return e ? t.replace(/\/?\/$/, "") + "/" + e.replace(/^\/+/, "") : t
}
function Cs(t, e, n) {
    let r = !Wa(e);
    return t && (r || n == !1) ? Ka(t, e) : e
}
const ur = t => t instanceof oe ? {
    ...t
} : t;
function je(t, e) {
    e = e || {};
    const n = {};
    function r(u, c, p, g) {
        return f.isPlainObject(u) && f.isPlainObject(c) ? f.merge.call({
            caseless: g
        }, u, c) : f.isPlainObject(c) ? f.merge({}, c) : f.isArray(c) ? c.slice() : c
    }
    function s(u, c, p, g) {
        if (f.isUndefined(c)) {
            if (!f.isUndefined(u))
                return r(void 0, u, p, g)
        } else
            return r(u, c, p, g)
    }
    function o(u, c) {
        if (!f.isUndefined(c))
            return r(void 0, c)
    }
    function i(u, c) {
        if (f.isUndefined(c)) {
            if (!f.isUndefined(u))
                return r(void 0, u)
        } else
            return r(void 0, c)
    }
    function a(u, c, p) {
        if (p in e)
            return r(u, c);
        if (p in t)
            return r(void 0, u)
    }
    const l = {
        url: o,
        method: o,
        data: o,
        baseURL: i,
        transformRequest: i,
        transformResponse: i,
        paramsSerializer: i,
        timeout: i,
        timeoutMessage: i,
        withCredentials: i,
        withXSRFToken: i,
        adapter: i,
        responseType: i,
        xsrfCookieName: i,
        xsrfHeaderName: i,
        onUploadProgress: i,
        onDownloadProgress: i,
        decompress: i,
        maxContentLength: i,
        maxBodyLength: i,
        beforeRedirect: i,
        transport: i,
        httpAgent: i,
        httpsAgent: i,
        cancelToken: i,
        socketPath: i,
        responseEncoding: i,
        validateStatus: a,
        headers: (u, c, p) => s(ur(u), ur(c), p, !0)
    };
    return f.forEach(Object.keys({
        ...t,
        ...e
    }), function(c) {
        const p = l[c] || s
          , g = p(t[c], e[c], c);
        f.isUndefined(g) && p !== a || (n[c] = g)
    }),
    n
}
const Ts = t => {
    const e = je({}, t);
    let {data: n, withXSRFToken: r, xsrfHeaderName: s, xsrfCookieName: o, headers: i, auth: a} = e;
    if (e.headers = i = oe.from(i),
    e.url = Es(Cs(e.baseURL, e.url, e.allowAbsoluteUrls), t.params, t.paramsSerializer),
    a && i.set("Authorization", "Basic " + btoa((a.username || "") + ":" + (a.password ? unescape(encodeURIComponent(a.password)) : ""))),
    f.isFormData(n)) {
        if (te.hasStandardBrowserEnv || te.hasStandardBrowserWebWorkerEnv)
            i.setContentType(void 0);
        else if (f.isFunction(n.getHeaders)) {
            const l = n.getHeaders()
              , u = ["content-type", "content-length"];
            Object.entries(l).forEach( ([c,p]) => {
                u.includes(c.toLowerCase()) && i.set(c, p)
            }
            )
        }
    }
    if (te.hasStandardBrowserEnv && (r && f.isFunction(r) && (r = r(e)),
    r || r !== !1 && qa(e.url))) {
        const l = s && o && Va.read(o);
        l && i.set(s, l)
    }
    return e
}
  , Ja = typeof XMLHttpRequest < "u"
  , Ya = Ja && function(t) {
    return new Promise(function(n, r) {
        const s = Ts(t);
        let o = s.data;
        const i = oe.from(s.headers).normalize();
        let {responseType: a, onUploadProgress: l, onDownloadProgress: u} = s, c, p, g, b, d;
        function m() {
            b && b(),
            d && d(),
            s.cancelToken && s.cancelToken.unsubscribe(c),
            s.signal && s.signal.removeEventListener("abort", c)
        }
        let h = new XMLHttpRequest;
        h.open(s.method.toUpperCase(), s.url, !0),
        h.timeout = s.timeout;
        function w() {
            if (!h)
                return;
            const A = oe.from("getAllResponseHeaders"in h && h.getAllResponseHeaders())
              , S = {
                data: !a || a === "text" || a === "json" ? h.responseText : h.response,
                status: h.status,
                statusText: h.statusText,
                headers: A,
                config: t,
                request: h
            };
            Os(function(x) {
                n(x),
                m()
            }, function(x) {
                r(x),
                m()
            }, S),
            h = null
        }
        "onloadend"in h ? h.onloadend = w : h.onreadystatechange = function() {
            !h || h.readyState !== 4 || h.status === 0 && !(h.responseURL && h.responseURL.indexOf("file:") === 0) || setTimeout(w)
        }
        ,
        h.onabort = function() {
            h && (r(new T("Request aborted",T.ECONNABORTED,t,h)),
            h = null)
        }
        ,
        h.onerror = function(E) {
            const S = E && E.message ? E.message : "Network Error"
              , L = new T(S,T.ERR_NETWORK,t,h);
            L.event = E || null,
            r(L),
            h = null
        }
        ,
        h.ontimeout = function() {
            let E = s.timeout ? "timeout of " + s.timeout + "ms exceeded" : "timeout exceeded";
            const S = s.transitional || ws;
            s.timeoutErrorMessage && (E = s.timeoutErrorMessage),
            r(new T(E,S.clarifyTimeoutError ? T.ETIMEDOUT : T.ECONNABORTED,t,h)),
            h = null
        }
        ,
        o === void 0 && i.setContentType(null),
        "setRequestHeader"in h && f.forEach(i.toJSON(), function(E, S) {
            h.setRequestHeader(S, E)
        }),
        f.isUndefined(s.withCredentials) || (h.withCredentials = !!s.withCredentials),
        a && a !== "json" && (h.responseType = s.responseType),
        u && ([g,d] = Bt(u, !0),
        h.addEventListener("progress", g)),
        l && h.upload && ([p,b] = Bt(l),
        h.upload.addEventListener("progress", p),
        h.upload.addEventListener("loadend", b)),
        (s.cancelToken || s.signal) && (c = A => {
            h && (r(!A || A.type ? new nt(null,t,h) : A),
            h.abort(),
            h = null)
        }
        ,
        s.cancelToken && s.cancelToken.subscribe(c),
        s.signal && (s.signal.aborted ? c() : s.signal.addEventListener("abort", c)));
        const D = za(s.url);
        if (D && te.protocols.indexOf(D) === -1) {
            r(new T("Unsupported protocol " + D + ":",T.ERR_BAD_REQUEST,t));
            return
        }
        h.send(o || null)
    }
    )
}
  , Xa = (t, e) => {
    const {length: n} = t = t ? t.filter(Boolean) : [];
    if (e || n) {
        let r = new AbortController, s;
        const o = function(u) {
            if (!s) {
                s = !0,
                a();
                const c = u instanceof Error ? u : this.reason;
                r.abort(c instanceof T ? c : new nt(c instanceof Error ? c.message : c))
            }
        };
        let i = e && setTimeout( () => {
            i = null,
            o(new T(`timeout ${e} of ms exceeded`,T.ETIMEDOUT))
        }
        , e);
        const a = () => {
            t && (i && clearTimeout(i),
            i = null,
            t.forEach(u => {
                u.unsubscribe ? u.unsubscribe(o) : u.removeEventListener("abort", o)
            }
            ),
            t = null)
        }
        ;
        t.forEach(u => u.addEventListener("abort", o));
        const {signal: l} = r;
        return l.unsubscribe = () => f.asap(a),
        l
    }
}
  , Ga = function*(t, e) {
    let n = t.byteLength;
    if (n < e) {
        yield t;
        return
    }
    let r = 0, s;
    for (; r < n; )
        s = r + e,
        yield t.slice(r, s),
        r = s
}
  , Qa = async function*(t, e) {
    for await(const n of Za(t))
        yield*Ga(n, e)
}
  , Za = async function*(t) {
    if (t[Symbol.asyncIterator]) {
        yield*t;
        return
    }
    const e = t.getReader();
    try {
        for (; ; ) {
            const {done: n, value: r} = await e.read();
            if (n)
                break;
            yield r
        }
    } finally {
        await e.cancel()
    }
}
  , fr = (t, e, n, r) => {
    const s = Qa(t, e);
    let o = 0, i, a = l => {
        i || (i = !0,
        r && r(l))
    }
    ;
    return new ReadableStream({
        async pull(l) {
            try {
                const {done: u, value: c} = await s.next();
                if (u) {
                    a(),
                    l.close();
                    return
                }
                let p = c.byteLength;
                if (n) {
                    let g = o += p;
                    n(g)
                }
                l.enqueue(new Uint8Array(c))
            } catch (u) {
                throw a(u),
                u
            }
        },
        cancel(l) {
            return a(l),
            s.return()
        }
    },{
        highWaterMark: 2
    })
}
  , dr = 64 * 1024
  , {isFunction: Ot} = f
  , ec = ( ({Request: t, Response: e}) => ({
    Request: t,
    Response: e
}))(f.global)
  , {ReadableStream: pr, TextEncoder: hr} = f.global
  , mr = (t, ...e) => {
    try {
        return !!t(...e)
    } catch {
        return !1
    }
}
  , tc = t => {
    t = f.merge.call({
        skipUndefined: !0
    }, ec, t);
    const {fetch: e, Request: n, Response: r} = t
      , s = e ? Ot(e) : typeof fetch == "function"
      , o = Ot(n)
      , i = Ot(r);
    if (!s)
        return !1;
    const a = s && Ot(pr)
      , l = s && (typeof hr == "function" ? (d => m => d.encode(m))(new hr) : async d => new Uint8Array(await new n(d).arrayBuffer()))
      , u = o && a && mr( () => {
        let d = !1;
        const m = new n(te.origin,{
            body: new pr,
            method: "POST",
            get duplex() {
                return d = !0,
                "half"
            }
        }).headers.has("Content-Type");
        return d && !m
    }
    )
      , c = i && a && mr( () => f.isReadableStream(new r("").body))
      , p = {
        stream: c && (d => d.body)
    };
    s && ["text", "arrayBuffer", "blob", "formData", "stream"].forEach(d => {
        !p[d] && (p[d] = (m, h) => {
            let w = m && m[d];
            if (w)
                return w.call(m);
            throw new T(`Response type '${d}' is not supported`,T.ERR_NOT_SUPPORT,h)
        }
        )
    }
    );
    const g = async d => {
        if (d == null)
            return 0;
        if (f.isBlob(d))
            return d.size;
        if (f.isSpecCompliantForm(d))
            return (await new n(te.origin,{
                method: "POST",
                body: d
            }).arrayBuffer()).byteLength;
        if (f.isArrayBufferView(d) || f.isArrayBuffer(d))
            return d.byteLength;
        if (f.isURLSearchParams(d) && (d = d + ""),
        f.isString(d))
            return (await l(d)).byteLength
    }
      , b = async (d, m) => {
        const h = f.toFiniteNumber(d.getContentLength());
        return h ?? g(m)
    }
    ;
    return async d => {
        let {url: m, method: h, data: w, signal: D, cancelToken: A, timeout: E, onDownloadProgress: S, onUploadProgress: L, responseType: x, headers: z, withCredentials: M="same-origin", fetchOptions: H} = Ts(d)
          , U = e || fetch;
        x = x ? (x + "").toLowerCase() : "text";
        let V = Xa([D, A && A.toAbortSignal()], E)
          , q = null;
        const Y = V && V.unsubscribe && ( () => {
            V.unsubscribe()
        }
        );
        let ae;
        try {
            if (L && u && h !== "get" && h !== "head" && (ae = await b(z, w)) !== 0) {
                let P = new n(m,{
                    method: "POST",
                    body: w,
                    duplex: "half"
                }), I;
                if (f.isFormData(w) && (I = P.headers.get("content-type")) && z.setContentType(I),
                P.body) {
                    const [R,k] = cr(ae, Bt(lr(L)));
                    w = fr(P.body, dr, R, k)
                }
            }
            f.isString(M) || (M = M ? "include" : "omit");
            const B = o && "credentials"in n.prototype
              , W = {
                ...H,
                signal: V,
                method: h.toUpperCase(),
                headers: z.normalize().toJSON(),
                body: w,
                duplex: "half",
                credentials: B ? M : void 0
            };
            q = o && new n(m,W);
            let _ = await (o ? U(q, H) : U(m, W));
            const y = c && (x === "stream" || x === "response");
            if (c && (S || y && Y)) {
                const P = {};
                ["status", "statusText", "headers"].forEach(N => {
                    P[N] = _[N]
                }
                );
                const I = f.toFiniteNumber(_.headers.get("content-length"))
                  , [R,k] = S && cr(I, Bt(lr(S), !0)) || [];
                _ = new r(fr(_.body, dr, R, () => {
                    k && k(),
                    Y && Y()
                }
                ),P)
            }
            x = x || "text";
            let O = await p[f.findKey(p, x) || "text"](_, d);
            return !y && Y && Y(),
            await new Promise( (P, I) => {
                Os(P, I, {
                    data: O,
                    headers: oe.from(_.headers),
                    status: _.status,
                    statusText: _.statusText,
                    config: d,
                    request: q
                })
            }
            )
        } catch (B) {
            throw Y && Y(),
            B && B.name === "TypeError" && /Load failed|fetch/i.test(B.message) ? Object.assign(new T("Network Error",T.ERR_NETWORK,d,q), {
                cause: B.cause || B
            }) : T.from(B, B && B.code, d, q)
        }
    }
}
  , nc = new Map
  , xs = t => {
    let e = t ? t.env : {};
    const {fetch: n, Request: r, Response: s} = e
      , o = [r, s, n];
    let i = o.length, a = i, l, u, c = nc;
    for (; a--; )
        l = o[a],
        u = c.get(l),
        u === void 0 && c.set(l, u = a ? new Map : tc(e)),
        c = u;
    return u
}
;
xs();
const En = {
    http: ba,
    xhr: Ya,
    fetch: {
        get: xs
    }
};
f.forEach(En, (t, e) => {
    if (t) {
        try {
            Object.defineProperty(t, "name", {
                value: e
            })
        } catch {}
        Object.defineProperty(t, "adapterName", {
            value: e
        })
    }
}
);
const gr = t => `- ${t}`
  , rc = t => f.isFunction(t) || t === null || t === !1
  , Ls = {
    getAdapter: (t, e) => {
        t = f.isArray(t) ? t : [t];
        const {length: n} = t;
        let r, s;
        const o = {};
        for (let i = 0; i < n; i++) {
            r = t[i];
            let a;
            if (s = r,
            !rc(r) && (s = En[(a = String(r)).toLowerCase()],
            s === void 0))
                throw new T(`Unknown adapter '${a}'`);
            if (s && (f.isFunction(s) || (s = s.get(e))))
                break;
            o[a || "#" + i] = s
        }
        if (!s) {
            const i = Object.entries(o).map( ([l,u]) => `adapter ${l} ` + (u === !1 ? "is not supported by the environment" : "is not available in the build"));
            let a = n ? i.length > 1 ? `since :
` + i.map(gr).join(`
`) : " " + gr(i[0]) : "as no adapter specified";
            throw new T("There is no suitable adapter to dispatch the request " + a,"ERR_NOT_SUPPORT")
        }
        return s
    }
    ,
    adapters: En
};
function sn(t) {
    if (t.cancelToken && t.cancelToken.throwIfRequested(),
    t.signal && t.signal.aborted)
        throw new nt(null,t)
}
function vr(t) {
    return sn(t),
    t.headers = oe.from(t.headers),
    t.data = rn.call(t, t.transformRequest),
    ["post", "put", "patch"].indexOf(t.method) !== -1 && t.headers.setContentType("application/x-www-form-urlencoded", !1),
    Ls.getAdapter(t.adapter || mt.adapter, t)(t).then(function(r) {
        return sn(t),
        r.data = rn.call(t, t.transformResponse, r),
        r.headers = oe.from(r.headers),
        r
    }, function(r) {
        return Ss(r) || (sn(t),
        r && r.response && (r.response.data = rn.call(t, t.transformResponse, r.response),
        r.response.headers = oe.from(r.response.headers))),
        Promise.reject(r)
    })
}
const Rs = "1.12.2"
  , Wt = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach( (t, e) => {
    Wt[t] = function(r) {
        return typeof r === t || "a" + (e < 1 ? "n " : " ") + t
    }
}
);
const yr = {};
Wt.transitional = function(e, n, r) {
    function s(o, i) {
        return "[Axios v" + Rs + "] Transitional option '" + o + "'" + i + (r ? ". " + r : "")
    }
    return (o, i, a) => {
        if (e === !1)
            throw new T(s(i, " has been removed" + (n ? " in " + n : "")),T.ERR_DEPRECATED);
        return n && !yr[i] && (yr[i] = !0,
        console.warn(s(i, " has been deprecated since v" + n + " and will be removed in the near future"))),
        e ? e(o, i, a) : !0
    }
}
;
Wt.spelling = function(e) {
    return (n, r) => (console.warn(`${r} is likely a misspelling of ${e}`),
    !0)
}
;
function sc(t, e, n) {
    if (typeof t != "object")
        throw new T("options must be an object",T.ERR_BAD_OPTION_VALUE);
    const r = Object.keys(t);
    let s = r.length;
    for (; s-- > 0; ) {
        const o = r[s]
          , i = e[o];
        if (i) {
            const a = t[o]
              , l = a === void 0 || i(a, o, t);
            if (l !== !0)
                throw new T("option " + o + " must be " + l,T.ERR_BAD_OPTION_VALUE);
            continue
        }
        if (n !== !0)
            throw new T("Unknown option " + o,T.ERR_BAD_OPTION)
    }
}
const Pt = {
    assertOptions: sc,
    validators: Wt
}
  , ve = Pt.validators;
let Fe = class {
    constructor(e) {
        this.defaults = e || {},
        this.interceptors = {
            request: new or,
            response: new or
        }
    }
    async request(e, n) {
        try {
            return await this._request(e, n)
        } catch (r) {
            if (r instanceof Error) {
                let s = {};
                Error.captureStackTrace ? Error.captureStackTrace(s) : s = new Error;
                const o = s.stack ? s.stack.replace(/^.+\n/, "") : "";
                try {
                    r.stack ? o && !String(r.stack).endsWith(o.replace(/^.+\n.+\n/, "")) && (r.stack += `
` + o) : r.stack = o
                } catch {}
            }
            throw r
        }
    }
    _request(e, n) {
        typeof e == "string" ? (n = n || {},
        n.url = e) : n = e || {},
        n = je(this.defaults, n);
        const {transitional: r, paramsSerializer: s, headers: o} = n;
        r !== void 0 && Pt.assertOptions(r, {
            silentJSONParsing: ve.transitional(ve.boolean),
            forcedJSONParsing: ve.transitional(ve.boolean),
            clarifyTimeoutError: ve.transitional(ve.boolean)
        }, !1),
        s != null && (f.isFunction(s) ? n.paramsSerializer = {
            serialize: s
        } : Pt.assertOptions(s, {
            encode: ve.function,
            serialize: ve.function
        }, !0)),
        n.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls !== void 0 ? n.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls : n.allowAbsoluteUrls = !0),
        Pt.assertOptions(n, {
            baseUrl: ve.spelling("baseURL"),
            withXsrfToken: ve.spelling("withXSRFToken")
        }, !0),
        n.method = (n.method || this.defaults.method || "get").toLowerCase();
        let i = o && f.merge(o.common, o[n.method]);
        o && f.forEach(["delete", "get", "head", "post", "put", "patch", "common"], d => {
            delete o[d]
        }
        ),
        n.headers = oe.concat(i, o);
        const a = [];
        let l = !0;
        this.interceptors.request.forEach(function(m) {
            typeof m.runWhen == "function" && m.runWhen(n) === !1 || (l = l && m.synchronous,
            a.unshift(m.fulfilled, m.rejected))
        });
        const u = [];
        this.interceptors.response.forEach(function(m) {
            u.push(m.fulfilled, m.rejected)
        });
        let c, p = 0, g;
        if (!l) {
            const d = [vr.bind(this), void 0];
            for (d.unshift(...a),
            d.push(...u),
            g = d.length,
            c = Promise.resolve(n); p < g; )
                c = c.then(d[p++], d[p++]);
            return c
        }
        g = a.length;
        let b = n;
        for (; p < g; ) {
            const d = a[p++]
              , m = a[p++];
            try {
                b = d(b)
            } catch (h) {
                m.call(this, h);
                break
            }
        }
        try {
            c = vr.call(this, b)
        } catch (d) {
            return Promise.reject(d)
        }
        for (p = 0,
        g = u.length; p < g; )
            c = c.then(u[p++], u[p++]);
        return c
    }
    getUri(e) {
        e = je(this.defaults, e);
        const n = Cs(e.baseURL, e.url, e.allowAbsoluteUrls);
        return Es(n, e.params, e.paramsSerializer)
    }
}
;
f.forEach(["delete", "get", "head", "options"], function(e) {
    Fe.prototype[e] = function(n, r) {
        return this.request(je(r || {}, {
            method: e,
            url: n,
            data: (r || {}).data
        }))
    }
});
f.forEach(["post", "put", "patch"], function(e) {
    function n(r) {
        return function(o, i, a) {
            return this.request(je(a || {}, {
                method: e,
                headers: r ? {
                    "Content-Type": "multipart/form-data"
                } : {},
                url: o,
                data: i
            }))
        }
    }
    Fe.prototype[e] = n(),
    Fe.prototype[e + "Form"] = n(!0)
});
let ic = class Ns {
    constructor(e) {
        if (typeof e != "function")
            throw new TypeError("executor must be a function.");
        let n;
        this.promise = new Promise(function(o) {
            n = o
        }
        );
        const r = this;
        this.promise.then(s => {
            if (!r._listeners)
                return;
            let o = r._listeners.length;
            for (; o-- > 0; )
                r._listeners[o](s);
            r._listeners = null
        }
        ),
        this.promise.then = s => {
            let o;
            const i = new Promise(a => {
                r.subscribe(a),
                o = a
            }
            ).then(s);
            return i.cancel = function() {
                r.unsubscribe(o)
            }
            ,
            i
        }
        ,
        e(function(o, i, a) {
            r.reason || (r.reason = new nt(o,i,a),
            n(r.reason))
        })
    }
    throwIfRequested() {
        if (this.reason)
            throw this.reason
    }
    subscribe(e) {
        if (this.reason) {
            e(this.reason);
            return
        }
        this._listeners ? this._listeners.push(e) : this._listeners = [e]
    }
    unsubscribe(e) {
        if (!this._listeners)
            return;
        const n = this._listeners.indexOf(e);
        n !== -1 && this._listeners.splice(n, 1)
    }
    toAbortSignal() {
        const e = new AbortController
          , n = r => {
            e.abort(r)
        }
        ;
        return this.subscribe(n),
        e.signal.unsubscribe = () => this.unsubscribe(n),
        e.signal
    }
    static source() {
        let e;
        return {
            token: new Ns(function(s) {
                e = s
            }
            ),
            cancel: e
        }
    }
}
;
function oc(t) {
    return function(n) {
        return t.apply(null, n)
    }
}
function ac(t) {
    return f.isObject(t) && t.isAxiosError === !0
}
const wn = {
    Continue: 100,
    SwitchingProtocols: 101,
    Processing: 102,
    EarlyHints: 103,
    Ok: 200,
    Created: 201,
    Accepted: 202,
    NonAuthoritativeInformation: 203,
    NoContent: 204,
    ResetContent: 205,
    PartialContent: 206,
    MultiStatus: 207,
    AlreadyReported: 208,
    ImUsed: 226,
    MultipleChoices: 300,
    MovedPermanently: 301,
    Found: 302,
    SeeOther: 303,
    NotModified: 304,
    UseProxy: 305,
    Unused: 306,
    TemporaryRedirect: 307,
    PermanentRedirect: 308,
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAllowed: 405,
    NotAcceptable: 406,
    ProxyAuthenticationRequired: 407,
    RequestTimeout: 408,
    Conflict: 409,
    Gone: 410,
    LengthRequired: 411,
    PreconditionFailed: 412,
    PayloadTooLarge: 413,
    UriTooLong: 414,
    UnsupportedMediaType: 415,
    RangeNotSatisfiable: 416,
    ExpectationFailed: 417,
    ImATeapot: 418,
    MisdirectedRequest: 421,
    UnprocessableEntity: 422,
    Locked: 423,
    FailedDependency: 424,
    TooEarly: 425,
    UpgradeRequired: 426,
    PreconditionRequired: 428,
    TooManyRequests: 429,
    RequestHeaderFieldsTooLarge: 431,
    UnavailableForLegalReasons: 451,
    InternalServerError: 500,
    NotImplemented: 501,
    BadGateway: 502,
    ServiceUnavailable: 503,
    GatewayTimeout: 504,
    HttpVersionNotSupported: 505,
    VariantAlsoNegotiates: 506,
    InsufficientStorage: 507,
    LoopDetected: 508,
    NotExtended: 510,
    NetworkAuthenticationRequired: 511
};
Object.entries(wn).forEach( ([t,e]) => {
    wn[e] = t
}
);
function Ds(t) {
    const e = new Fe(t)
      , n = ls(Fe.prototype.request, e);
    return f.extend(n, Fe.prototype, e, {
        allOwnKeys: !0
    }),
    f.extend(n, e, null, {
        allOwnKeys: !0
    }),
    n.create = function(s) {
        return Ds(je(t, s))
    }
    ,
    n
}
const $ = Ds(mt);
$.Axios = Fe;
$.CanceledError = nt;
$.CancelToken = ic;
$.isCancel = Ss;
$.VERSION = Rs;
$.toFormData = Vt;
$.AxiosError = T;
$.Cancel = $.CanceledError;
$.all = function(e) {
    return Promise.all(e)
}
;
$.spread = oc;
$.isAxiosError = ac;
$.mergeConfig = je;
$.AxiosHeaders = oe;
$.formToJSON = t => As(f.isHTMLForm(t) ? new FormData(t) : t);
$.getAdapter = Ls.getAdapter;
$.HttpStatusCode = wn;
$.default = $;
const {Axios: Cc, AxiosError: Tc, CanceledError: xc, isCancel: Lc, CancelToken: Rc, VERSION: Nc, all: Dc, Cancel: Ic, isAxiosError: Pc, spread: kc, toFormData: Mc, AxiosHeaders: Fc, HttpStatusCode: Bc, formToJSON: $c, getAdapter: jc, mergeConfig: zc} = $;
window.axios = $;
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
/**
 * Bootstrap 5 autocomplete
 * https://github.com/lekoala/bootstrap5-autocomplete
 * @license MIT
 */
const br = {
    showAllSuggestions: !1,
    suggestionsThreshold: 1,
    maximumItems: 0,
    autoselectFirst: !0,
    ignoreEnter: !1,
    tabSelect: !1,
    updateOnSelect: !1,
    highlightTyped: !1,
    highlightClass: "",
    fullWidth: !1,
    fixed: !1,
    fuzzy: !1,
    startsWith: !1,
    fillIn: !1,
    preventBrowserAutocomplete: !1,
    itemClass: "",
    activeClasses: ["bg-primary", "text-white"],
    labelField: "label",
    valueField: "value",
    searchFields: ["label"],
    queryParam: "query",
    items: [],
    source: null,
    hiddenInput: !1,
    hiddenValue: "",
    clearControl: "",
    datalist: "",
    server: "",
    serverMethod: "GET",
    serverParams: {},
    serverDataKey: "data",
    fetchOptions: {},
    liveServer: !1,
    noCache: !0,
    debounceTime: 300,
    notFoundMessage: "",
    onRenderItem: (t, e, n) => e,
    onSelectItem: (t, e) => {}
    ,
    onClearItem: (t, e) => {}
    ,
    onServerResponse: (t, e) => t.json(),
    onServerError: (t, e, n) => {
        t.name === "AbortError" || e.aborted || console.error(t)
    }
    ,
    onChange: (t, e) => {}
    ,
    onBeforeFetch: t => {}
    ,
    onAfterFetch: t => {}
}
  , _r = "is-loading"
  , Er = "is-active"
  , Ct = "show"
  , Tt = "next"
  , on = "prev"
  , xt = new WeakMap;
let wr = 0
  , an = 0;
function cc(t, e=300) {
    let n;
    return (...r) => {
        clearTimeout(n),
        n = setTimeout( () => {
            t.apply(this, r)
        }
        , e)
    }
}
function lc(t) {
    return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}
function cn(t) {
    return t ? lc(t.toString()).toLowerCase() : ""
}
function uc(t, e) {
    if (t.indexOf(e) >= 0)
        return !0;
    let n = 0;
    for (let r = 0; r < e.length; r++) {
        const s = e[r];
        if (s !== " " && (n = t.indexOf(s, n) + 1,
        n <= 0))
            return !1
    }
    return !0
}
function Ar(t, e) {
    return t.parentNode.insertBefore(e, t.nextSibling)
}
function fc(t) {
    const e = document.createElement("textarea");
    return e.innerHTML = t,
    e.value
}
function ln(t, e) {
    for (const [n,r] of Object.entries(e))
        t.setAttribute(n, r)
}
function dc(t) {
    t.ariaLabel = t.innerText,
    t.innerHTML = t.innerText.split("").map(e => e + "&zwj;").join("")
}
function pc(t, e="window") {
    return t.split(".").reduce( (n, r) => n[r], e)
}
class hc {
    constructor(e, n={}) {
        zn(this, "handleEvent", e => {
            ["scroll", "resize"].includes(e.type) ? (this._timer && window.cancelAnimationFrame(this._timer),
            this._timer = window.requestAnimationFrame( () => {
                this[`on${e.type}`](e)
            }
            )) : this[`on${e.type}`](e)
        }
        );
        if (!(e instanceof HTMLElement)) {
            console.error("Invalid element", e);
            return
        }
        xt.set(e, this),
        wr++,
        an++,
        this._searchInput = e,
        this._configure(n),
        this._isMouse = !1,
        this._preventInput = !1,
        this._keyboardNavigation = !1,
        this._searchFunc = cc( () => {
            this._loadFromServer(!0)
        }
        , this._config.debounceTime),
        this._configureSearchInput(),
        this._configureDropElement(),
        this._config.fixed && (document.addEventListener("scroll", this, !0),
        window.addEventListener("resize", this));
        const r = this._getClearControl();
        r && r.addEventListener("click", this),
        ["focus", "change", "blur", "input", "beforeinput", "keydown"].forEach(s => {
            this._searchInput.addEventListener(s, this)
        }
        ),
        ["mousemove", "mouseenter", "mouseleave"].forEach(s => {
            this._dropElement.addEventListener(s, this)
        }
        ),
        this._fetchData()
    }
    static init(e="input.autocomplete", n={}) {
        document.querySelectorAll(e).forEach(s => {
            this.getOrCreateInstance(s, n)
        }
        )
    }
    static getInstance(e) {
        return xt.has(e) ? xt.get(e) : null
    }
    static getOrCreateInstance(e, n={}) {
        return this.getInstance(e) || new this(e,n)
    }
    dispose() {
        an--,
        ["focus", "change", "blur", "input", "beforeinput", "keydown"].forEach(n => {
            this._searchInput.removeEventListener(n, this)
        }
        ),
        ["mousemove", "mouseenter", "mouseleave"].forEach(n => {
            this._dropElement.removeEventListener(n, this)
        }
        );
        const e = this._getClearControl();
        e && e.removeEventListener("click", this),
        this._config.fixed && an <= 0 && (document.removeEventListener("scroll", this, !0),
        window.removeEventListener("resize", this)),
        this._dropElement.parentElement.removeChild(this._dropElement),
        xt.delete(this._searchInput)
    }
    _getClearControl() {
        if (this._config.clearControl)
            return document.querySelector(this._config.clearControl)
    }
    _configure(e={}) {
        this._config = Object.assign({}, br);
        const n = {
            ...e,
            ...this._searchInput.dataset
        }
          , r = s => ["true", "false", "1", "0", !0, !1].includes(s) && !!JSON.parse(s);
        for (const [s,o] of Object.entries(br)) {
            if (n[s] === void 0)
                continue;
            const i = n[s];
            switch (typeof o) {
            case "number":
                this._config[s] = parseInt(i);
                break;
            case "boolean":
                this._config[s] = r(i);
                break;
            case "string":
                this._config[s] = i.toString();
                break;
            case "object":
                if (Array.isArray(o))
                    if (typeof i == "string") {
                        const a = i.includes("|") ? "|" : ",";
                        this._config[s] = i.split(a)
                    } else
                        this._config[s] = i;
                else
                    this._config[s] = typeof i == "string" ? JSON.parse(i) : i;
                break;
            case "function":
                this._config[s] = typeof i == "string" ? window[i] : i;
                break;
            default:
                this._config[s] = i;
                break
            }
        }
    }
    _configureSearchInput() {
        if (this._searchInput.autocomplete = "off",
        this._searchInput.spellcheck = !1,
        ln(this._searchInput, {
            "aria-autocomplete": "list",
            "aria-haspopup": "menu",
            "aria-expanded": "false",
            role: "combobox"
        }),
        this._searchInput.id && this._config.preventBrowserAutocomplete) {
            const e = document.querySelector(`[for="${this._searchInput.id}"]`);
            e && dc(e)
        }
        this._hiddenInput = null,
        this._config.hiddenInput && (this._hiddenInput = document.createElement("input"),
        this._hiddenInput.type = "hidden",
        this._hiddenInput.value = this._config.hiddenValue,
        this._hiddenInput.name = this._searchInput.name,
        this._searchInput.name = "_" + this._searchInput.name,
        Ar(this._searchInput, this._hiddenInput))
    }
    _configureDropElement() {
        this._dropElement = document.createElement("ul"),
        this._dropElement.id = "ac-menu-" + wr,
        this._dropElement.classList.add("dropdown-menu", "autocomplete-menu", "p-0"),
        this._dropElement.style.maxHeight = "280px",
        this._config.fullWidth || (this._dropElement.style.maxWidth = "360px"),
        this._config.fixed && (this._dropElement.style.position = "fixed"),
        this._dropElement.style.overflowY = "auto",
        this._dropElement.style.overscrollBehavior = "contain",
        this._dropElement.style.textAlign = "unset",
        Ar(this._searchInput, this._dropElement),
        this._searchInput.setAttribute("aria-controls", this._dropElement.id)
    }
    onclick(e) {
        e.target instanceof Element && e.target.matches(this._config.clearControl) && this.clear()
    }
    onbeforeinput(e) {
        this._preventInput || this._hiddenInput && this._hiddenInput.value && (this._config.onClearItem(this._searchInput.value, this),
        this._hiddenInput.value = null)
    }
    oninput(e) {
        this._preventInput || this.showOrSearch()
    }
    onchange(e) {
        const n = this._searchInput.value
          , r = this._items.find(s => s.label === n);
        this._config.onChange(r, this)
    }
    onblur(e) {
        const n = e.relatedTarget;
        if (this._isMouse && n instanceof HTMLElement && (n.classList.contains("modal") || n.classList.contains("autocomplete-menu"))) {
            this._searchInput.focus();
            return
        }
        setTimeout( () => {
            this.hideSuggestions()
        }
        , 100)
    }
    onfocus(e) {
        this.showOrSearch()
    }
    onkeydown(e) {
        switch (e.keyCode || e.key) {
        case 13:
        case "Enter":
            if (this.isDropdownVisible()) {
                const r = this.getSelection();
                r && r.click(),
                (r || !this._config.ignoreEnter) && e.preventDefault()
            }
            break;
        case 9:
        case "Tab":
            if (this.isDropdownVisible() && this._config.tabSelect) {
                const r = this.getSelection();
                r && (r.click(),
                e.preventDefault())
            }
            break;
        case 38:
        case "ArrowUp":
            e.preventDefault(),
            this._keyboardNavigation = !0,
            this._moveSelection(on);
            break;
        case 40:
        case "ArrowDown":
            e.preventDefault(),
            this._keyboardNavigation = !0,
            this.isDropdownVisible() ? this._moveSelection(Tt) : this.showOrSearch(!1);
            break;
        case 27:
        case "Escape":
            this.isDropdownVisible() && (this._searchInput.focus(),
            this.hideSuggestions());
            break
        }
    }
    onmouseenter(e) {
        this._isMouse = !0
    }
    onmousemove(e) {
        this._isMouse = !0,
        this._keyboardNavigation = !1
    }
    onmouseleave(e) {
        this._isMouse = !1,
        this.removeSelection()
    }
    onscroll(e) {
        this._positionMenu()
    }
    onresize(e) {
        this._positionMenu()
    }
    getConfig(e=null) {
        return e !== null ? this._config[e] : this._config
    }
    setConfig(e, n) {
        this._config[e] = n
    }
    setData(e) {
        this._items = [],
        this._addItems(e)
    }
    enable() {
        this._searchInput.setAttribute("disabled", "")
    }
    disable() {
        this._searchInput.removeAttribute("disabled")
    }
    isDisabled() {
        return this._searchInput.hasAttribute("disabled") || this._searchInput.disabled || this._searchInput.hasAttribute("readonly")
    }
    isDropdownVisible() {
        return this._dropElement.classList.contains(Ct)
    }
    clear() {
        const e = this._searchInput.value;
        this._searchInput.value = "",
        this._hiddenInput && (this._hiddenInput.value = ""),
        this._config.onClearItem(e, this)
    }
    getSelection() {
        return this._dropElement.querySelector("a." + Er)
    }
    removeSelection() {
        const e = this.getSelection();
        e && e.classList.remove(...this._activeClasses())
    }
    _activeClasses() {
        return [...this._config.activeClasses, Er]
    }
    _isItemEnabled(e) {
        if (e.style.display === "none")
            return !1;
        const n = e.firstElementChild;
        return n.tagName === "A" && !n.classList.contains("disabled")
    }
    _moveSelection(e=Tt, n=null) {
        const r = this.getSelection();
        if (r) {
            const s = e === Tt ? "nextSibling" : "previousSibling";
            n = r.parentNode;
            do
                n = n[s];
            while (n && !this._isItemEnabled(n));
            n ? (r.classList.remove(...this._activeClasses()),
            e === on ? n.parentNode.scrollTop = n.offsetTop - n.parentNode.offsetTop : n.offsetTop > n.parentNode.offsetHeight - n.offsetHeight && (n.parentNode.scrollTop += n.offsetHeight)) : r && (n = r.parentElement)
        } else {
            if (e === on)
                return n;
            if (!n)
                for (n = this._dropElement.firstChild; n && !this._isItemEnabled(n); )
                    n = n.nextSibling
        }
        if (n) {
            const s = n.querySelector("a");
            s.classList.add(...this._activeClasses()),
            this._searchInput.setAttribute("aria-activedescendant", s.id),
            this._config.updateOnSelect && (this._searchInput.value = s.dataset.label)
        } else
            this._searchInput.setAttribute("aria-activedescendant", "");
        return n
    }
    _shouldShow() {
        return this.isDisabled() ? !1 : this._searchInput.value.length >= this._config.suggestionsThreshold
    }
    showOrSearch(e=!0) {
        if (e && !this._shouldShow()) {
            this.hideSuggestions();
            return
        }
        this._config.liveServer ? this._searchFunc() : this._config.source ? this._config.source(this._searchInput.value, n => {
            this.setData(n),
            this._showSuggestions()
        }
        ) : this._showSuggestions()
    }
    _createGroup(e) {
        const n = this._createLi()
          , r = document.createElement("span");
        return n.append(r),
        r.classList.add("dropdown-header", "text-truncate"),
        r.innerHTML = e,
        n
    }
    _createItem(e, n) {
        let r = n.label;
        if (this._config.highlightTyped) {
            const i = cn(r).indexOf(e);
            i !== -1 && (r = r.substring(0, i) + `<mark class="${this._config.highlightClass}">${r.substring(i, i + e.length)}</mark>` + r.substring(i + e.length, r.length))
        }
        r = this._config.onRenderItem(n, r, this);
        const s = this._createLi()
          , o = document.createElement("a");
        if (s.append(o),
        o.id = this._dropElement.id + "-" + this._dropElement.children.length,
        o.classList.add("dropdown-item", "text-truncate"),
        this._config.itemClass && o.classList.add(...this._config.itemClass.split(" ")),
        o.setAttribute("data-value", n.value),
        o.setAttribute("data-label", n.label),
        o.setAttribute("tabindex", "-1"),
        o.setAttribute("role", "menuitem"),
        o.setAttribute("href", "#"),
        o.innerHTML = r,
        n.data)
            for (const [i,a] of Object.entries(n.data))
                o.dataset[i] = a;
        if (this._config.fillIn) {
            const i = document.createElement("button");
            i.type = "button",
            i.classList.add("btn", "btn-link", "border-0"),
            i.innerHTML = `<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M2 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H3.707l10.147 10.146a.5.5 0 0 1-.708.708L3 3.707V8.5a.5.5 0 0 1-1 0z"/>
      </svg>`,
            s.append(i),
            s.classList.add("d-flex", "justify-content-between"),
            i.addEventListener("click", a => {
                this._searchInput.value = n.label,
                this._searchInput.focus()
            }
            )
        }
        return o.addEventListener("mouseenter", i => {
            if (this._keyboardNavigation || !this._isMouse)
                return;
            this.removeSelection();
            const a = s.querySelector("a");
            a.classList.add(...this._activeClasses()),
            this._searchInput.setAttribute("aria-activedescendant", a.id)
        }
        ),
        o.addEventListener("mousedown", i => {
            i.preventDefault()
        }
        ),
        o.addEventListener("click", i => {
            i.preventDefault(),
            this._preventInput = !0,
            this._searchInput.value = fc(n.label),
            this._hiddenInput && (this._hiddenInput.value = n.value),
            this._config.onSelectItem(n, this),
            this.hideSuggestions(),
            this._preventInput = !1
        }
        ),
        s
    }
    _getActiveElement(e=document) {
        const n = e.activeElement;
        return n ? n.shadowRoot ? this._getActiveElement(n.shadowRoot) : n : null
    }
    _showSuggestions() {
        if (this._getActiveElement() !== this._searchInput)
            return;
        const e = cn(this._searchInput.value);
        this._dropElement.innerHTML = "";
        let n = 0
          , r = null;
        const s = [];
        for (const o of this._items) {
            const i = this._config.showAllSuggestions || e.length === 0;
            let a = e.length === 0 && this._config.suggestionsThreshold === 0;
            e.length > 0 && this._config.searchFields.forEach(u => {
                const c = cn(o[u]);
                let p = !1;
                if (this._config.fuzzy)
                    p = uc(c, e);
                else {
                    const g = c.indexOf(e);
                    p = this._config.startsWith ? g === 0 : g >= 0
                }
                p && (a = !0)
            }
            );
            const l = a || e.length === 0;
            if (i || a) {
                if (n++,
                o.group && !s.includes(o.group)) {
                    const c = this._createGroup(o.group);
                    this._dropElement.appendChild(c),
                    s.push(o.group)
                }
                const u = this._createItem(e, o);
                if (!r && l && (r = u),
                this._dropElement.appendChild(u),
                this._config.maximumItems > 0 && n >= this._config.maximumItems)
                    break
            }
        }
        if (r && this._config.autoselectFirst && (this.removeSelection(),
        this._moveSelection(Tt, r)),
        n === 0)
            if (this._config.notFoundMessage) {
                const o = this._createLi();
                o.innerHTML = `<span class="dropdown-item">${this._config.notFoundMessage}</span>`,
                this._dropElement.appendChild(o),
                this._showDropdown()
            } else
                this.hideSuggestions();
        else
            this._showDropdown()
    }
    _createLi() {
        const e = document.createElement("li");
        return e.setAttribute("role", "presentation"),
        e
    }
    _showDropdown() {
        this._dropElement.classList.add(Ct),
        this._dropElement.setAttribute("role", "menu"),
        ln(this._searchInput, {
            "aria-expanded": "true"
        }),
        this._positionMenu()
    }
    toggleSuggestions(e=!0) {
        this._dropElement.classList.contains(Ct) ? this.hideSuggestions() : this.showOrSearch(e)
    }
    hideSuggestions() {
        this._dropElement.classList.remove(Ct),
        ln(this._searchInput, {
            "aria-expanded": "false"
        }),
        this.removeSelection()
    }
    getInput() {
        return this._searchInput
    }
    getDropMenu() {
        return this._dropElement
    }
    _positionMenu() {
        const e = this._searchInput.getBoundingClientRect()
          , n = this._searchInput.dir === "rtl" || this._searchInput.dir === "" && document.dir === "rtl"
          , r = this._config.fullWidth
          , s = this._config.fixed;
        let o = null
          , i = null;
        s && (o = e.x,
        i = e.y + e.height,
        n && !r && (o -= this._dropElement.offsetWidth - e.width)),
        this._dropElement.style.transform = "unset",
        r && (this._dropElement.style.width = this._searchInput.offsetWidth + "px"),
        o !== null && (this._dropElement.style.left = o + "px"),
        i !== null && (this._dropElement.style.top = i + "px");
        const a = this._dropElement.getBoundingClientRect()
          , l = window.innerHeight;
        if (a.y + a.height > l) {
            const u = r ? e.height + 4 : e.height;
            this._dropElement.style.transform = "translateY(calc(-100.1% - " + u + "px))"
        }
    }
    _fetchData() {
        this._items = [],
        this._addItems(this._config.items);
        const e = this._config.datalist;
        if (e) {
            const n = document.querySelector(`#${e}`);
            if (n) {
                const r = Array.from(n.children).map(s => {
                    const o = s.getAttribute("value") ?? s.innerHTML.toLowerCase()
                      , i = s.innerHTML;
                    return {
                        value: o,
                        label: i
                    }
                }
                );
                this._addItems(r)
            } else
                console.error(`Datalist not found ${e}`)
        }
        this._setHiddenVal(),
        this._config.server && !this._config.liveServer && this._loadFromServer()
    }
    _setHiddenVal() {
        if (this._config.hiddenInput && !this._config.hiddenValue)
            for (const e of this._items)
                e.label == this._searchInput.value && (this._hiddenInput.value = e.value)
    }
    _normalizeData(e) {
        if (Array.isArray(e))
            return e;
        let n = [];
        for (const [r,s] of Object.entries(e))
            n.push({
                value: r,
                label: s
            });
        return n
    }
    _addItems(e) {
        e = this._normalizeData(e);
        for (const n of e) {
            if (n.group && n.items) {
                n.items.forEach(o => o.group = n.group),
                this._addItems(n.items);
                continue
            }
            const r = typeof n == "string" ? n : n.label
              , s = typeof n != "object" ? {} : n;
            s.label = n[this._config.labelField] ?? r,
            s.value = n[this._config.valueField] ?? r,
            s.label && this._items.push(s)
        }
    }
    _loadFromServer(e=!1) {
        this._abortController && this._abortController.abort(),
        this._abortController = new AbortController,
        this._config.onBeforeFetch(this);
        let n = this._searchInput.dataset.serverParams || {};
        typeof n == "string" && (n = JSON.parse(n));
        const r = Object.assign({}, this._config.serverParams, n);
        r[this._config.queryParam] = this._searchInput.value,
        this._config.noCache && (r.t = Date.now()),
        r.related && (Array.isArray(r.related) ? r.related : [r.related]).forEach(l => {
            const u = document.getElementById(l);
            if (u instanceof HTMLInputElement) {
                const c = u.value
                  , p = u.getAttribute("name");
                p && (r[p] = c)
            }
        }
        );
        const s = new URLSearchParams(r);
        let o = this._config.server
          , i = Object.assign(this._config.fetchOptions, {
            method: this._config.serverMethod || "GET",
            signal: this._abortController.signal
        });
        i.method === "POST" ? i.body = s : (o.indexOf("?") == -1 ? o += "?" : o += "&",
        o += s.toString()),
        this._searchInput.classList.add(_r),
        fetch(o, i).then(a => this._config.onServerResponse(a, this)).then(a => {
            const l = pc(this._config.serverDataKey, a) || a;
            this.setData(l),
            this._setHiddenVal(),
            this._abortController = null,
            e && this._showSuggestions()
        }
        ).catch(a => {
            this._config.onServerError(a, this._abortController.signal, this)
        }
        ).finally(a => {
            this._searchInput.classList.remove(_r),
            this._config.onAfterFetch(this)
        }
        )
    }
}
var mc = 1;
function Sr(t) {
    var e = [];
    for (var n in t)
        e.push(encodeURIComponent(n) + "=" + encodeURIComponent(t[n]));
    return e.join("&")
}
var gc = function(e) {
    return new Promise(function(n, r) {
        var s = document.createElement("script")
          , o = e.url;
        if (e.params) {
            var i = Sr(e.params);
            i && (o += (o.indexOf("?") >= 0 ? "&" : "?") + i)
        }
        s.async = !0;
        function a() {
            s && (s.onload = s.onreadystatechange = s.onerror = null,
            s.parentNode && s.parentNode.removeChild(s),
            s = null)
        }
        var l = "axiosJsonpCallback" + mc++
          , u = window[l]
          , c = !1;
        window[l] = function(g) {
            if (window[l] = u,
            !c) {
                var b = {
                    data: g,
                    status: 200
                };
                n(b)
            }
        }
        ;
        var p = {
            _: new Date().getTime()
        };
        p[e.callbackParamName || "callback"] = l,
        o += (o.indexOf("?") >= 0 ? "&" : "?") + Sr(p),
        s.onload = s.onreadystatechange = function() {
            (!s.readyState || /loaded|complete/.test(s.readyState)) && a()
        }
        ,
        s.onerror = function() {
            a(),
            r(new Error("Network Error"))
        }
        ,
        e.cancelToken && e.cancelToken.promise.then(function(g) {
            s && (c = !0,
            r(g))
        }),
        s.src = o,
        document.head.appendChild(s)
    }
    )
};
const vc = Do(gc)
  , De = {
    suggest: async t => {
        const e = "https://suggestqueries.google.com/complete/search?hl=en&ds=yt&client=youtube&q=" + encodeURIComponent(t);
        return (await $({
            url: e,
            adapter: vc
        })).data[1].map(function(r) {
            return r[0]
        })
    }
    ,
    track: t => {
        $.post("/api/track", {
            payload: t
        })
    }
    ,
    video: {
        formats: (t, e, n) => {
            $.post("/api/video/formats", {
                payload: t
            }).then(e).catch(n)
        }
        ,
        initiateDownload: (t, e) => {
            $.post("/api/video/download/initiate").then(t).catch(e)
        }
        ,
        download: (t, e, n) => {
            $.post("/api/video/download", {
                payload: t
            }).then(e).catch(n)
        }
        ,
        play: (t, e, n) => {
            $.post("/api/video/play", {
                payload: t
            }).then(e).catch(n)
        }
    }
};
hc.init('#search-form input[type="search"]', {
    source: async (t, e) => {
        const n = await De.suggest(t);
        e(n)
    }
    ,
    onSelectItem: () => {
        document.getElementById("search-form").submit()
    }
    ,
    autoselectFirst: !1,
    ignoreEnter: !0
});
window.Api = De;
window.App = {
    history: {
        back: t => {
            t && t.preventDefault(),
            history.go(-1)
        }
    },
    play: (t, e) => {
        t.setAttribute("disabled", !0);
        let n = t.getAttribute("clicked");
        n || t.setAttribute("clicked", !0);
        const r = window.open();
        De.video.play(e, s => {
            var a, l;
            t.removeAttribute("disabled");
            const o = (a = s.data) == null ? void 0 : a.link
              , i = (l = s.data) == null ? void 0 : l.ads;
            i && !n && (r.location = i),
            n ? t.dataset.url ? r.location = t.dataset.url : r.location = o : i || r.close()
        }
        , () => {
            t.removeAttribute("disabled")
        }
        )
    }
    ,
    loadDownload: (t, e) => {
        let n = 0;
        const r = t.querySelector("#video-progress-bar")
          , s = setInterval( () => {
            const a = Math.floor(Math.random() * 5) * 10 + 10;
            n += a,
            n > 100 && (n = 100),
            r.style.width = n + "%",
            n == 100 && (clearInterval(s),
            t.style.display = "none",
            e.style.display = "inline-block")
        }
        , 500)
    }
    ,
    initiateDownload: (t, e, n) => {
        t.setAttribute("disabled", !0);
        let r;
        r = window.open(),
        De.video.initiateDownload(s => {
            var i;
            t.removeAttribute("disabled");
            const o = (i = s.data) == null ? void 0 : i.ads;
            o && r && (r.location = o),
            !o && r && r.close(),
            e()
        }
        , () => {
            t.removeAttribute("disabled"),
            n()
        }
        )
    }
    ,
    download: (t, e) => {
        t.setAttribute("disabled", !0);
        let n;
        n = window.open(),
        De.video.download(e, r => {
            var i, a;
            const s = (i = r.data) == null ? void 0 : i.link
              , o = (a = r.data) == null ? void 0 : a.ads;
            s && App.forceDownload(s).then(l => {
                t.removeAttribute("disabled")
            }
            ),
            o && n && (n.location = o),
            !o && n && n.close()
        }
        , () => {
            t.removeAttribute("disabled")
        }
        )
    }
    ,
    forceDownload: t => new Promise( (e, n) => {
        const r = "d-frame";
        let s = document.getElementById(r);
        s || (s = document.createElement("iframe"),
        s.setAttribute("id", r),
        document.body.appendChild(s)),
        s.width = 0,
        s.height = 0,
        s.style.overflow = "hidden",
        s.src && (s.src = ""),
        setTimeout( () => {
            s.src = t
        }
        , 500),
        setTimeout( () => {
            e(s)
        }
        , 5e3)
    }
    ),
    video: t => {
        let e = 0;
        const n = 300
          , r = document.getElementById("video-processing");
        function s(i) {
            const a = document.getElementById("video-formats-wrapper");
            i.data.html && a && (a.innerHTML = i.data.html);
            const l = String(i.data.status).toLocaleLowerCase();
            !i.data.processed && e < n && l === "ok" && setTimeout( () => {
                e++,
                De.video.formats(t, s, o)
            }
            , 5e3),
            (i.data.processed || l === "error") && r && (r.style.display = "none")
        }
        function o(i) {
            r && (r.style.display = "none")
        }
        De.video.formats(t, s, o)
    }
};
const Lt = document.getElementById("go-to-top");
Lt && (Lt.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    })
}
),
window.addEventListener("scroll", () => {
    window.scrollY > 300 ? Lt.style.display = "block" : Lt.style.display = "none"
}
));
const yc = document.getElementById("toggle-theme-mode")
  , bc = window.matchMedia("(prefers-color-scheme: dark)").matches
  , _c = localStorage.getItem("theme")
  , Ec = _c || (bc ? "dark" : "light")
  , wc = document.getElementById("toggle-theme-mode");
Is(Ec);
function Is(t) {
    document.documentElement.setAttribute("data-bs-theme", t),
    wc.className = t === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon",
    localStorage.setItem("theme", t)
}
yc.addEventListener("click", () => {
    const t = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    Is(t)
}
);

