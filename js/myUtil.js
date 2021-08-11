"use strict";

export function defineProperty(obj, name, value, configurable = false, enumerable = false, writable = false) {
    Object.defineProperty(obj, name, { value, configurable, enumerable, writable });
}

/**
 * 获取指定类型父控件，会一直往上查找到指定类型的父控件为止，找不到返回null
 * @param {HTMLElement} em
 * @param {function} parentElementClass
 */
export function getParent(em, parentElementClass) {
    var p = em;
    while (1) {
        p = p.parentElement;
        if (p == null) {
            return null;
        } else if (p instanceof parentElementClass) {
            return p;
        }
    }
}

/**
 * 分割字符串，仅分割找到的第一处
 * @param {string} s 
 * @param {string} splitter 
 * @returns 匹配到就分成两段[s0,s1]，否则返回[s]
 */
export function split2(s, splitter) {
    const n = splitter.length;
    const i = s.indexOf(splitter);
    const ss = [];
    if (i !== -1) {
        ss.push(s.substring(0, i));
        ss.push(s.substring(n + i));
    } else {
        ss.push(s);
    }
    return ss;
}

/**
 * 获取子窗口相对浏览器窗口偏移
 * @param {window} win
 * @param {window} topWin 
 */
export function getTopViewPortOffset(win, topWin) {
    let offset = [0, 0];
    while (win != topWin) {
        let frame = win.frameElement;
        win = frame.ownerDocument.defaultView;
        if (frame) {
            const rect = frame.getBoundingClientRect();
            const st = win.getComputedStyle(frame);
            offset[0] += frame.clientLeft + rect.left + parseInt(st["paddingLeft"]);
            offset[1] += frame.clientTop + rect.top + parseInt(st["paddingTop"]);
        }
    }
    return offset;
}

/**四舍五入 */
/**
 * @param {number} s 
 * @param {number} i 
 */
export function round(s, i) {
    // var s = "" + s;
    // var re = new RegExp("^(\\d*\\.\\d{" + i + "})(\\d)");
    // var ns = s.replace(re, (m, p0, p1, o, ss) => p1 >= 5 ? p0 + 8 : p0 + 2);
    // return parseFloat(ns).toFixed(i);
    const n = Math.pow(10, i);
    return Math.round(s * n) / n;
}

/**
 * 创建websocket，根据win所用的http或者https协议自动创建ws或者wss协议的websocket
 * @param {window} win 
 * @param {string} url 
 * @param {string} protocol 
 */
export function createWebSocket(win, url, protocol) {
    return new win.WebSocket(`ws${win.location.origin.substr(4)}${url}`, protocol);
}

/**
 * 枚举所有子元素
 * @param {HTMLElement} parentEm 
 * @returns {IterableIterator<HTMLElement>}
 */
export function* enumAllChildren(parentEm) {
    let em = parentEm.firstElementChild;
    while (em) {
        yield em;
        yield* enumAllChildren(em);
        em = em.nextElementSibling;
    }
}

const getElementsByIdHandler = {
    /**
     * @param {Object<string, HTMLElement>} obj 
     * @param {string} prop 
     * @param {Proxy} proxy 
     */
    get: function (obj, prop, proxy) {
        if (prop in obj) {
            return obj[prop];
        }
        /**@type{Document} */
        const doc = obj.document;
        const em = doc.getElementById(prop);
        obj[prop] = em;
        return em;
    },

}
/**
 * const {id1, id2, id3, ...} = getElementsById(document);
 * @param {Document} doc 
 */
export function getElementsById(doc) {
    const obj = Object.create(null);
    Object.defineProperty(obj, "document", { value: doc });
    const proxy = new Proxy(obj, getElementsByIdHandler);
    return proxy;
}