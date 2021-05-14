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
export function round(s, i) {
    var s = "" + s;
    var re = new RegExp("^(\\d*\\.\\d{" + i + "})(\\d)");
    var ns = s.replace(re, (m, p0, p1, o, ss) => p1 >= 5 ? p0 + 8 : p0 + 2);
    return parseFloat(ns).toFixed(i);
}