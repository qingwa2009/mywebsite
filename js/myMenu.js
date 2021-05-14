"use strict";
import { getParent, getTopViewPortOffset } from "./myUtil.js";
// 使用方法
// const myMenu = document.createElement(MyMenu.TAG)；
// myMenu.init();
// const menu = [
//     { title: "menuitem1", func: func, disabled: false },
//     { title: "menuitem2", func: func, disabled: false },
// ];
// myMenu.bindElementMenu(em, menu, MyMenu.TYPES.CONTEXTMENU, menuFilter, menuCloseCallback);
// function func(currentTarget, target, obj) {
// }
// function menuFilter(/**@type{MouseEvent} */e) {
//     const target = e.target;
//     if (!(target instanceof HTMLLIElement)) return false;
//     return true;
// }
// function menuCloseCallback(currentTarget, target) {
// }

/**
 * const myMenu = document.createElement(MyMenu.TAG);\
 * myMenu.init();
 */
export default class MyMenu extends HTMLElement {
    static TAG = "my-menu";
    static CLASS_MENU = "menu"
    static CLASS_SUB_MENU = "submenu"
    static CLASS_HASSUBMENU = "hassubmenu";

    static TYPES = {
        /**右键菜单 0*/
        CONTEXTMENU: 0,
        /**菜单栏下拉菜单 1*/
        MENU: 1,
    };

    constructor() {
        super();
    }

    init() {
        if (this._inited) return;
        this._inited = true;

        this.attachShadow({ mode: "open" });
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = "/css/myMenu.css"
        this.shadowRoot.appendChild(link);

        this._menu = document.createElement("span");
        this._menu.classList.add(MyMenu.CLASS_MENU);
        this.shadowRoot.appendChild(this._menu);

        this.style.display = "none";

        this._menu.addEventListener("contextmenu", e => e.preventDefault());
        this._menu.addEventListener("mouseover", this._onMouseOver.bind(this), true);
        this._menu.addEventListener("click", this._onClick.bind(this));

        this._submenu = document.createElement("span");
        this._submenu.classList.add(MyMenu.CLASS_SUB_MENU);

        this._menuItems = [];
        this._submenuItems = [];
        this._menuEvCurrentTarget = null;
        this._menuEvTarget = null;
        document.documentElement.appendChild(this);
    }


    _loadMenuItems(menuItems) {
        if (this._menuItems !== menuItems) {
            this._menuItems = menuItems;
            this._menu.innerHTML = "";
            this._createMenuItems(this._menu, menuItems, false)
            console.log("loadMenuItems: ", menuItems);
        }
    }

    _loadSubmenuItems(submenuItems) {
        if (this._submenuItems !== submenuItems) {
            this._submenuItems = submenuItems;
            this._submenu.innerHTML = "";
            this._createMenuItems(this._submenu, submenuItems, true);
            console.log("loadSubmenuItems: ", submenuItems);
            return true;
        }
        return false;
    }

    _createMenuItems(parentEm, mits, isSubmenu) {
        for (let i = isSubmenu ? 1 : 0; i < mits.length; i++) {
            const it = mits[i];
            switch (it.constructor.name) {
                case "Object":
                    parentEm.appendChild(this._createMenuItem(it, i, isSubmenu));
                    break;
                case "Array":
                    parentEm.appendChild(this._createHasSubmenuItem(it, i, isSubmenu));
                    break;
                default:
                    parentEm.appendChild(this._createSplitterItem());
                    break;
            }
        }
        console.log("_createMenuItems");
    }

    _createMenuItem(it, mid, isSubmenu) {
        const btn = document.createElement("button");
        btn.mid = mid;
        btn.isSubmenu = isSubmenu;
        btn.textContent = it.title;
        if (it.disabled) {
            btn.setAttribute("disabled", "");
        }
        return btn;
    }

    _createSplitterItem() {
        return document.createElement("hr");
    }

    _createHasSubmenuItem(it, mid, isSubmenu) {
        const btn = document.createElement("button");
        btn.mid = mid;
        btn.isSubmenu = isSubmenu;
        btn.textContent = it[0];
        btn.classList.add(MyMenu.CLASS_HASSUBMENU);
        return btn;
    }

    _onClick(e) {
        var t = e.target;
        if (!(t instanceof HTMLButtonElement))
            return;
        const mits = t.isSubmenu ? this._submenuItems : this._menuItems;
        var it = mits[t.mid];
        if (it !== undefined && it.constructor.name === "Object") {
            it.func(this._menuEvCurrentTarget, this._menuEvTarget, it);
            this.hide();
        }
    }

    _onMouseOver(e) {
        var t = e.target;
        if (t.classList.contains(MyMenu.CLASS_HASSUBMENU)) {
            const mid = t.mid;
            if (this._loadSubmenuItems(this._menuItems[mid]) || this._submenu.style.display === 'none') {
                this._showSubmenu(e, t);
            }
        } else {//this.hideSubmenu();

        }
    }

    /**     
     * @param {MouseEvent} e 
     * @param {boolean} isContextMenu 
     */
    _onEmMenu(e, isContextMenu) {
        e.preventDefault();
        const em = e.currentTarget;
        if (em.menuFilterFunc && (!em.menuFilterFunc(e))) return;
        this._setVar(em, e.target);
        this._loadMenuItems(em.menuItems);
        this._showMenu(e, isContextMenu);
    }

    /** @param {MouseEvent} e */
    _showMenu(e, isContextMenu = true) {
        this.style.display = "block";
        const rect = this.getBoundingClientRect();
        const topOffset = getTopViewPortOffset(e.target.ownerDocument.defaultView, window);
        let clientX = e.clientX + topOffset[0];
        let clientY = e.clientY + topOffset[1];

        let x;
        let y;
        if (isContextMenu) {
            x = clientX + window.pageXOffset;
            y = clientY + window.pageYOffset;
            const xx = document.documentElement.clientWidth - clientX - rect.width - 3;
            if (xx < 0) x += xx;
            const yy = document.documentElement.clientHeight - clientY - rect.height - 3;
            if (yy < 0 && clientY > rect.height) y += yy;
        } else {
            const rect1 = e.currentTarget.getBoundingClientRect();
            clientX = rect1.left + topOffset[0];
            clientY = rect1.top + topOffset[1];
            x = clientX + window.pageXOffset;
            y = clientY + window.pageYOffset + rect1.height;
            const xx = document.documentElement.clientWidth - clientX - rect.width - 3;
            if (xx < 0) x += xx;
            const yy = document.documentElement.clientHeight - clientY - rect.height - 3;
            if (yy < 0) y = y - rect.height - rect1.height;
        }

        this.style.left = `${x}px`;
        this.style.top = `${y}px`;

        window.removeEventListener("mousedown", this._listener);
        window.removeEventListener("mouseup", this._listener);
        window.removeEventListener("resize", this._listener);
        this._listener = this._handleClose.bind(this);
        window.addEventListener("mousedown", this._listener);
        window.addEventListener("mouseup", this._listener);
        window.addEventListener("resize", this._listener);
    }

    /**
     * @param {MouseEvent} e 
     * @param {HTMLElement} target 
     */
    _showSubmenu(e, target) {
        this._submenu.style.display = "block";
        target.appendChild(this._submenu);
        const inset = 5;
        const rect = this._submenu.getBoundingClientRect();
        const rect1 = target.getBoundingClientRect();
        let x = rect1.width - inset;
        let y = 0;
        const xx = document.documentElement.clientWidth - rect1.right - rect.width + inset;
        if (xx < 0 && rect1.left - 5 > rect.width) x = x - rect.width - rect1.width + inset;
        const yy = document.documentElement.clientHeight - rect1.top - rect.height;
        if (yy < 0 && rect1.top > rect.height) y = y - rect.height + rect1.height;

        this._submenu.style.left = `${x}px`;
        this._submenu.style.top = `${y}px`;
    }

    _handleClose(e) {
        var t = e.target;
        if (e.type === "mousedown" || e.type === "mouseup") {
            var p = (t instanceof MyMenu) ? t : getParent(t, MyMenu);
            if (p)
                return;
        }
        this.hide();
    }

    hide() {
        if (this.style.display !== "none") {
            this.style.display = "none";
            window.removeEventListener("mousedown", this._listener);
            window.removeEventListener("mouseup", this._listener);
            window.removeEventListener("resize", this._listener);
            if (this._menuEvCurrentTarget && this._menuEvCurrentTarget.menuCloseCallback)
                this._menuEvCurrentTarget.menuCloseCallback(this._menuEvCurrentTarget, this._menuEvTarget);
            this._hideSubmenu();
        }
        this._resetVar();
    }

    _setVar(currentTarget, target) {
        this._menuEvCurrentTarget = currentTarget;
        this._menuEvTarget = target;
    }

    _resetVar() {
        this._menuEvCurrentTarget = null;
        this._menuEvTarget = null;
    }

    _hideSubmenu() {
        this._submenu.style.display = "none";
    }



    /**
     * 给元素绑定菜单
     * @param {HTMLElement} em      
     * @param {[]} menuItems\
     * [\
     *  {title:string, func:(currentTarget, target, obj)=>{}, disabled:boolean},   //菜单按键\
     *  "" ,                                                                        //分隔符\
     *  [title:string,{title:string,func:(currentTarget, target, obj)=>{},disabled:boolean},"",...],  //子菜单,第一个元素为子菜单标题名称  
     *  ...
     * ]\
     * 回调函数中：\
     * currentTarget bindElementMenu时传入的第一个参数；\
     * target 实际触发的元素\
     * obj 本体
     * @param {MyMenu.TYPES} type MyMenu.TYPES
     * @param {(e:MouseEvent)=> boolean } filterFunc 在弹出菜单前会调用该函数，通过返回值决定是否弹出菜单
     * @param {(currentTarget:HTMLElement, target:HTMLElement)=>{}} closeCallback 菜单关闭时会调用该函数
     */
    bindElementMenu(em, menuItems, type, filterFunc = undefined, closeCallback = undefined) {
        em.menuItems = menuItems;
        em.menuType = type;
        em.menuFilterFunc = filterFunc;
        em.menuCloseCallback = closeCallback;

        switch (type) {
            case MyMenu.TYPES.CONTEXTMENU:
                em.addEventListener("contextmenu", e => this._onEmMenu(e, true));
                break;
            case MyMenu.TYPES.MENU:
                em.addEventListener("click", e => this._onEmMenu(e, false));
                break;
            default:
                break;
        }
    }

    /**绑定窗口单击和调整大小时关闭菜单 
     * @param {Window} w 
     */
    bindWindow(w) {
        if (w === window) return;
        const h = this.hide.bind(this);
        w.addEventListener("mousedown", h);
        w.addEventListener("mouseup", h);
        w.addEventListener("resize", h);
    }

}
customElements.define(MyMenu.TAG, MyMenu);