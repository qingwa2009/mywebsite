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

/**
 * 创建websocket，根据win所用的http或者https协议自动创建ws或者wss协议的websocket
 * @param {window} win 
 * @param {string} url 
 * @param {string} protocol 
 */
export function createWebSocket(win, url, protocol) {
    return new win.WebSocket(`ws${win.location.origin.substr(4)}${url}`, protocol);
}

export class MyTableData {
    /**用于分页查找，加载下一页 */
    ID = "";
    count = 0;
    /**对于分页查询可以用来显示查询到的总记录数，默认值-1 */
    totalCount = -1;
    EOF = true;
    title = [];
    type = [];
    data = [];
    error = "";
    toString() {
        return JSON.stringify(this);
    }

    static decorate(mtd) {
        Object.setPrototypeOf(mtd, MyTableData.prototype);
    }

    createTitleIndex() {
        if (this.titleIndex) return;
        const titleIndex = {};
        for (let i = 0; i < this.title.length; i++) {
            titleIndex[this.title[i]] = i;
        }
        Object.defineProperty(this, "titleIndex", { value: titleIndex });
    }

    /**
     * 调用前请确保已经调用createTitleIndex创建了索引
     * @param {number} row 
     * @param {string} title 
     */
    getData(row, title) {
        return this.data[row][this.titleIndex[title]];
    }

    /**
     * 枚举data里面的每一条数据，如果data的长度与title的长度不一致将报错
     * @param {boolean} cloneObject false时枚举返回同一个对象，true每次枚举返回新对象，默认false
     * @throws new TypeError("data length does not match title length!")
     */
    *iterator(cloneObject = false) {
        const n = this.data.length;
        const m = this.title.length;
        if (cloneObject) {
            for (let i = 0; i < n; i++) {
                const obj = {};
                const dt = this.data[i];
                if (dt.length !== m) throw new TypeError("data length does not match title length!");
                for (let j = 0; j < m; j++) {
                    obj[this.title[j]] = dt[j];
                }
                yield obj;
            }
        } else {
            const obj = {};
            for (let i = 0; i < n; i++) {
                const dt = this.data[i];
                if (dt.length !== m) throw new TypeError("data length does not match title length!");
                for (let j = 0; j < m; j++) {
                    obj[this.title[j]] = dt[j];
                }
                yield obj;
            }
        }
    }
}