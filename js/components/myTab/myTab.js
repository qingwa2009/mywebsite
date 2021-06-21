"use strict";

export default class MyTab extends HTMLElement {

	constructor() {
		super();
		this.container = document.createElement("div");
		this.container.id = "container";
		this._createFreeTabIds();

		this._closeEvents = [];
		/**@type{()=>{}} */
		this._tabSwitchEvents = [];

		var shadow = this.attachShadow({ mode: "open" });
		var link = document.createElement("link");
		link.rel = "stylesheet";
		link.type = "text/css";
		link.href = new URL("myTab.css", import.meta.url);
		shadow.appendChild(link);
		shadow.appendChild(this.container);

		shadow.addEventListener("click", this._handleClick.bind(this), true);
		console.log("MyTab.constructed!");
	}

	_createFreeTabIds() {
		this.freeTabIds = Array(MyTab.MAX_TAB_PAGE).fill("").map((_, i) => MyTab.IDPREFIX + i);
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
		title.setAttribute("id", id + MyTab.IDSURFIX.TITLE);
		cls.setAttribute("id", id + MyTab.IDSURFIX.CLS);
		page.setAttribute("id", id + MyTab.IDSURFIX.PAGE);

		tab.classList.add(MyTab.CLASSES.TAB);
		title.classList.add(MyTab.CLASSES.TITLE);
		cls.classList.add(MyTab.CLASSES.CLS);
		page.classList.add(MyTab.CLASSES.PAGE);

		tab.setAttribute("type", "radio");
		tab.setAttribute("name", "tab");
		tab.setAttribute("checked", true);

		title.setAttribute("for", id);
		title.setAttribute("title", name);
		title.textContent = name;

		cls.textContent = "✖";

		title.appendChild(cls);
		tab.addEventListener("change", e => this._dispatchTabSwitchEvent(e.target.id));

		this.container.appendChild(tab);
		this.container.appendChild(title);
		this.container.appendChild(page);

		this._dispatchTabSwitchEvent(id);
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
		const tab = this.getTabElement(tid);
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
		const tab = this.getTabElement(tid);
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
	 * @returns {HTMLInputElement|null}*/
	getTabElement(tid) {
		return this.shadowRoot.getElementById(tid);
	}

	/**
	 * @param {string} tid 
	 * @returns {HTMLLabelElement | null}
	 */
	getTabTitleElement(tid) {
		const id = tid + MyTab.IDSURFIX.TITLE;
		return this.shadowRoot.getElementById(id);
	}

	/**
	 * @param {string} tid 
	 * @returns {HTMLIFrameElement | null}
	 */
	getTabPageElement(tid) {
		const id = tid + MyTab.IDSURFIX.PAGE;
		return this.shadowRoot.getElementById(id);
	}

	/**
	 * @param {string} tid 
	 * @returns {HTMLButtonElement | null}
	 */
	getTabCloseBtnElement(tid) {
		const id = tid + MyTab.IDSURFIX.CLS;
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
	 * @returns {Window|null}
	 */
	getTabWin(tid) {
		const page = this.getTabPageElement(tid);
		if (!page) return null;
		return page.contentWindow;
	}


	/**
	 * @param {string} tid 
	 */
	isTabVisible(tid) {
		const tab = this.getTabElement(tid);
		if (!tab) return false;
		return tab.checked;
	}

	/**
	 * @param {string} tid
	 * @returns {boolean} 
	 */
	showTab(tid) {
		const tab = this.getTabElement(tid);
		if (!tab) return false;
		if (tab.checked) return;
		tab.checked = true;
		this._dispatchTabSwitchEvent(tid);
	}

	/**
	 * @param {string} tid 
	 */
	removeTab(tid) {
		var tab = this.getTabElement(tid);
		if (!tab) return;

		var title = this.getTabTitleElement(tid);
		var page = this.getTabPageElement(tid);
		if (tab.checked) {
			let id = this.getNextTabId(tid);
			if (!id) id = this.getPrevTabId(tid);
			if (id) this.showTab(id);
		}

		this.container.removeChild(page);
		this.container.removeChild(title);
		this.container.removeChild(tab);
		this.freeTabIds.push(tid);

		this._dispatchCloseEvent(MyTab.CLOSETYPE.ME, tid);
		if (this.freeTabIds.length >= MyTab.MAX_TAB_PAGE) {
			this._dispatchTabSwitchEvent(undefined);
		}
	}

	removeAllTab() {
		if (this.container.childElementCount > 0) {
			const ids = this.getAllTabIds();
			this.container.innerHTML = "";
			this._createFreeTabIds();
			this._dispatchCloseEvent(MyTab.CLOSETYPE.ALL, ids);
			this._dispatchTabSwitchEvent(undefined);
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
				const tab = this.getTabElement(id);
				const title = this.getTabTitleElement(id);
				const page = this.getTabPageElement(id);

				this.container.removeChild(page);
				this.container.removeChild(title);
				this.container.removeChild(tab);

				this.freeTabIds.push(id);
				rids.push(id);
			}
		}

		if (rids.length > 0) {
			this._dispatchCloseEvent(MyTab.CLOSETYPE.OTHERS, rids);
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
		if (!target.classList.contains(MyTab.CLASSES.CLS)) return;
		this.removeTab(this.getTabId(target));
	}

	/**
	 * @param {(type:MyTab.CLOSETYPE, tid:string | string[])=>{}} callback 
	 */
	addCloseEvent(callback) {
		if (!this._closeEvents.includes(callback)) {
			this._closeEvents.push(callback);
		}
	}

	removeCloseEvent(callback) {
		const i = this._closeEvents.indexOf(callback);
		if (i > -1) {
			this._closeEvents.splice(i, 1);
		}
	}

	/**
	 * @param {MyTab.CLOSETYPE} type 
	 * @param {string|string[]} tid 
	 */
	_dispatchCloseEvent(type, tid) {
		for (let i = 0; i < this._closeEvents.length; i++) {
			this._closeEvents[i](type, tid);
		}
	}

	/**
	 * tid为undefined时表示所有tab页面都关闭了
	 * @param {(tid:string | undefined)=>{}} callback 
	 */
	addTabSwitchEvent(callback) {
		this._tabSwitchEvents.push(callback);
	}

	removeTabSwitchListener(callback) {
		const i = this._tabSwitchEvents.indexOf(callback);
		if (i > -1) {
			this._tabSwitchEvents.splice(i, 1);
		}
	}

	/**
	 * @param {string} tid 
	 */
	_dispatchTabSwitchEvent(tid) {
		for (let i = 0; i < this._tabSwitchEvents.length; i++) {
			this._tabSwitchEvents[i](tid);
		}
	}

	/**
	 * 设置动画
	 * @param {number} tid tabId
	 * @param {string} animName 
	 */
	setAnimate(tid, animName = "animate-progress") {
		var title = this.getTabTitleElement(tid);
		if (!title) return;
		title.classList.add(animName);
	}
	/**
	 * 移除动画
	 * @param {number} tid tabid
	 * @param {*} animName 
	 */
	resetAnimate(tid, animName = "animate-progress") {
		var title = this.getTabTitleElement(tid);
		if (!title) return;
		title.classList.remove(animName);
	}

	/**
	 * 设置tab标签高亮提示
	 * @param {string} tid 
	 */
	setAlert(tid) {
		const title = this.getTabTitleElement(tid);
		if (!title) return;
		title.classList.add(MyTab.CLASSES.alert);
	}
	/**
	 * 移除tab标签高亮提示
	 * @param {string} tid 
	 */
	resetAlert(tid) {
		const title = this.getTabTitleElement(tid);
		if (!title) return;
		title.classList.remove(MyTab.CLASSES.alert);
	}
}

MyTab.TAG = "my-tab";
MyTab.IDPREFIX = "tab";
MyTab.IDSURFIX = { TITLE: "_ttl", CLS: "_cls", PAGE: "_pge" };
MyTab.CLASSES = { TAB: "tab", TITLE: "title", CLS: "cls", PAGE: "page", alert: "alert" };
MyTab.CLOSETYPE = { ALL: 0, ME: 2, OTHERS: 1 };
MyTab.MAX_TAB_PAGE = 50;

customElements.define(MyTab.TAG, MyTab);

