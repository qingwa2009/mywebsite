"use strict";

export default class MyTabPage extends HTMLElement {
  static IDPREFIX = "tab";
  static IDSURFIX = { TITLE: "_ttl", CLS: "_cls", PAGE: "_pge" };
  static CLASSES = { TAB: "tab", TITLE: "title", CLS: "cls", PAGE: "page" };
  static CLOSETYPE = { ALL: 0, ME: 2, OTHERS: 1 };
  static MAX_TAB_PAGE = 50;

  constructor() {
    super();
    this.container = document.createElement("div");
    this.container.id = "container";
    this._createFreeTabIds();
    this._closeListeners = [];

    var shadow = this.attachShadow({ mode: "open" });
    var link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.setAttribute("href", "css/myTab.css");
    shadow.appendChild(link);
    shadow.appendChild(this.container);

    shadow.addEventListener("click", this._handleClick.bind(this), true);
    console.log("MyTabPage.constructed!");
  }

  _createFreeTabIds() {
    this.freeTabIds = Array(MyTabPage.MAX_TAB_PAGE).fill("").map((_, i) => MyTabPage.IDPREFIX + i);
  }

  /**
   * @param {string} name tabTitle
   * @returns {HTMLIFrameElement | null}
   * 返回iframe或者null
   */
  createNewTab(name) {
    var id = this.freeTabIds.shift();
    if (!id) return null;

    var tab = document.createElement("input");
    var title = document.createElement("label");
    var cls = document.createElement("button");
    var page = document.createElement("iframe");

    tab.isMyTabElement = true;
    title.isMyTabElement = true;
    cls.isMyTabElement = true;
    page.isMyTabElement = true;

    tab.setAttribute("id", id);
    title.setAttribute("id", id + MyTabPage.IDSURFIX.TITLE);
    cls.setAttribute("id", id + MyTabPage.IDSURFIX.CLS);
    page.setAttribute("id", id + MyTabPage.IDSURFIX.PAGE);

    tab.classList.add(MyTabPage.CLASSES.TAB);
    title.classList.add(MyTabPage.CLASSES.TITLE);
    cls.classList.add(MyTabPage.CLASSES.CLS);
    page.classList.add(MyTabPage.CLASSES.PAGE);

    tab.setAttribute("type", "radio");
    tab.setAttribute("name", "tab");
    tab.setAttribute("checked", true);

    title.setAttribute("for", id);
    title.setAttribute("title", name);
    title.textContent = name;

    cls.textContent = "✖";

    title.appendChild(cls);
    this.container.appendChild(tab);
    this.container.appendChild(title);
    this.container.appendChild(page);

    return page;
  }

  /**
   * @param {HTMLInputElement | HTMLLabelElement | HTMLButtonElement | HTMLIFrameElement} element 
   * @returns {string | undefined}
   * 返回tabid或者undefined;
   */
  getTabId(element) {
    if (!element.isMyTabElement) return undefined;
    var id = element.id;
    var i = id.indexOf("_");
    return i === -1 ? id : id.substring(0, i);
  }

  /**
   * @param {string} tid
   * @returns {string | undefined} 
   * 返回tabid或者undefined;
   */
  getPrevTabId(tid) {
    const tab = this.shadowRoot.getElementById(tid);
    if (!tab) return undefined;
    let em = tab.previousElementSibling;
    while (em) {
      const id = this.getTabId(em);
      if (id && id !== tid) return id;
      em = em.previousElementSibling;
    }
    return undefined;
  }

  /**
   * @param {string} tid
   * @returns {string | undefined} 
   * 返回tabid或者undefined;
   */
  getNextTabId(tid) {
    const tab = this.shadowRoot.getElementById(tid);
    if (!tab) return undefined;
    let em = tab.nextElementSibling;
    while (em) {
      const id = this.getTabId(em);
      if (id && id !== tid) return id;
      em = em.nextElementSibling;
    }
    return undefined;
  }

  /**
   * @param {window} win 
   * @returns {string | undefined}
   * 返回tabid或者undefined
   */
  getTabIdByWin(win) {
    return this.getTabId(win.frameElement);
  }

  /**
   * @param {string} tid 
   * @returns {HTMLLabelElement | null}
   */
  getTabTitleElement(tid) {
    const id = tid + MyTabPage.IDSURFIX.TITLE;
    return this.shadowRoot.getElementById(id);
  }

  /**
   * @param {string} tid 
   * @returns {HTMLIFrameElement | null}
   */
  getTabPageElement(tid) {
    const id = tid + MyTabPage.IDSURFIX.PAGE;
    return this.shadowRoot.getElementById(id);
  }

  /**
   * @param {string} tid 
   * @returns {HTMLButtonElement | null}
   */
  getTabCloseBtnElement(tid) {
    const id = tid + MyTabPage.IDSURFIX.CLS;
    return this.shadowRoot.getElementById(id);
  }

  getAllTabIds() {
    const ids = [];
    let em = this.container.firstElementChild;
    while (em) {
      if (em.isMyTabElement && em instanceof HTMLInputElement) {
        ids.push(em.id);
      }
      em = em.nextElementSibling
    }
    return ids;
  }

  /**
   * @param {string} tid
   * @returns {boolean} 
   */
  showTab(tid) {
    const tab = this.shadowRoot.getElementById(tid);
    if (!tab) return false;
    tab.checked = true;
  }

  /**
   * @param {string} tid 
   */
  removeTab(tid) {
    var tab = this.shadowRoot.getElementById(tid);
    if (!tab) return;

    var title = this.shadowRoot.getElementById(tid + MyTabPage.IDSURFIX.TITLE);
    var page = this.shadowRoot.getElementById(tid + MyTabPage.IDSURFIX.PAGE);
    if (tab.checked) {
      let id = this.getNextTabId(tid);
      if (!id) id = this.getPrevTabId(tid);
      if (id) this.showTab(id);
    }

    this.container.removeChild(page);
    this.container.removeChild(title);
    this.container.removeChild(tab);
    this.freeTabIds.push(tid);

    this._dispatchCloseEvent(MyTabPage.CLOSETYPE.ME, tid);
  }

  removeAllTab() {
    if (this.container.childElementCount > 0) {
      const ids = this.getAllTabIds();
      this.container.innerHTML = "";
      this._createFreeTabIds();
      this._dispatchCloseEvent(MyTabPage.CLOSETYPE.ALL, ids);
    }
  }

  /**
   * @param {string} tid 
   */
  removeAllTabExcept(tid) {
    this.showTab(tid);

    const ids = this.getAllTabIds();
    const rids = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id !== tid) {
        const tab = this.shadowRoot.getElementById(id);
        const title = this.shadowRoot.getElementById(id + MyTabPage.IDSURFIX.TITLE);
        const page = this.shadowRoot.getElementById(id + MyTabPage.IDSURFIX.PAGE);

        this.container.removeChild(page);
        this.container.removeChild(title);
        this.container.removeChild(tab);

        this.freeTabIds.push(id);
        rids.push(id);
      }
    }

    if (rids.length > 0) {
      this._dispatchCloseEvent(MyTabPage.CLOSETYPE.OTHERS, rids);
    }
  }

  /**
   * @param {window} win 
   * @param {string} name 
   */
  renameTab(win, name) {
    const tid = this.getTabIdByWin(win);
    if (!tid) return false;

    var title = this.getTabTitleElement(tid);
    if (!title) return false;

    if (title.firstChild.nodeType !== Node.TEXT_NODE) {
      title.insertBefore(doc.createTextNode(name), title.children[0]);
    } else {
      title.firstChild.textContent = name;
    }

    title.title = name;
    return true;
  }


  _handleClick(e) {
    var target = e.target;
    if (!target.classList.contains(MyTabPage.CLASSES.CLS)) return;
    this.removeTab(this.getTabId(target));
  }

  /**
   * @param {(t:number, tid:string | string[])=>{}} func 
   */
  addCloseListener(func) {
    if (!this._closeListeners.includes(func)) {
      this._closeListeners.push(func);
    }
  }

  removeCloseListener(func) {
    const i = this._closeListeners.indexOf(func);
    if (i > -1) {
      this._closeListeners.splice(i, 1);
    }
  }

  _dispatchCloseEvent(t, msg) {
    for (let i = 0; i < this._closeListeners.length; i++) {
      const func = this._closeListeners[i];
      func(t, msg);
    }
  }

  /**
   * 设置动画
   * @param {number} id tabId
   * @param {string} animName 
   */
  setAnimate(id, animName = "animate-progress") {
    var title = this.shadowRoot.getElementById(id + MyTabPage.IDSURFIX.TITLE);
    if (!title) return;
    title.classList.add(animName);
  }
  /**
   * 移除动画
   * @param {number} id tabid
   * @param {*} animName 
   */
  resetAnimate(id, animName = "animate-progress") {
    var title = this.shadowRoot.getElementById(id + MyTabPage.IDSURFIX.TITLE);
    if (!title) return;
    title.classList.remove(animName);
  }
}


customElements.define("my-tab-page", MyTabPage);

