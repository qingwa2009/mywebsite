"use strict";
class MyTabPage extends HTMLElement {
  constructor() {
    super();
    this.container = document.createElement("div");
    this.container.id = "container";
    this._createFreeTabIds();
    this._closeListeners = [];

    var shadow = this.attachShadow({ mode: "open" });
    ["css/myTab.css", "css/animate.css"].forEach(a => {
      var link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("type", "text/css");
      link.setAttribute("href", a);
      shadow.appendChild(link);
    });

    shadow.appendChild(this.container);

    shadow.addEventListener("click", this.handleClick.bind(this), true);
    shadow.addEventListener("contextmenu", this.handleContextMenu.bind(this), true);
    console.log("MyTabPage.constructed!");
  }

  _createFreeTabIds() {
    this.freeTabIds = Array(50).fill("").map((_, i) => "tab" + i).reverse();
  }

  addTab(name, src, isSrcDoc = true) {
    var id = this.freeTabIds.pop();
    if (id === undefined) {
      return null;
    }

    var tab = document.createElement("input");
    var title = document.createElement("label");
    var cls = document.createElement("button");
    var page = document.createElement("iframe");

    tab.setAttribute("id", id);
    title.setAttribute("id", id + this.IDSURFIX.TITLE);
    cls.setAttribute("id", id + this.IDSURFIX.CLS);
    page.setAttribute("id", id + this.IDSURFIX.PAGE);

    tab.classList.add(this.CLASSES.TAB);
    title.classList.add(this.CLASSES.TITLE);
    cls.classList.add(this.CLASSES.CLS);
    page.classList.add(this.CLASSES.PAGE);

    tab.setAttribute("type", "radio");
    tab.setAttribute("name", "tab");
    tab.setAttribute("checked", true);

    title.setAttribute("for", id);
    title.setAttribute("title", name);
    title.textContent = name;

    cls.textContent = "✖";

    if (isSrcDoc) {
      page.srcdoc = src;
    } else {
      page.src = src;
    }

    title.appendChild(cls);
    this.container.appendChild(tab);
    this.container.appendChild(title);
    this.container.appendChild(page);
    return page;
  }

  getTabId(element) {
    var id = element.id;
    var i = id.indexOf("_");
    return i === -1 ? id : id.substring(0, i);
  }

  getTabOtherElement(element, idSurfix) {
    var id = this.getTabId(element);
    if (id === -1) return null;
    id = id + idSurfix;
    return this.shadowRoot.getElementById(id);
  }

  removeTab(id) {
    var tab = this.shadowRoot.getElementById(id);
    var title = this.shadowRoot.getElementById(id + this.IDSURFIX.TITLE);
    var page = this.shadowRoot.getElementById(id + this.IDSURFIX.PAGE);
    if (tab.checked) {
      var np = page.nextElementSibling;
      if (np === null) {
        np = tab.previousElementSibling;
        if (np !== null) {
          np = this.shadowRoot.getElementById(this.getTabId(np));
        }
      }
      if (np !== null) {
        np.checked = true;
      }
    }



    this.container.removeChild(page);
    this.container.removeChild(title);
    this.container.removeChild(tab);
    const t = this.CLOSETYPE.ME
    this._closeListeners.forEach(a => a(t, id));
    this.freeTabIds.push(id);
  }

  renameTab(win, name) {
    var page = win.frameElement;
    if (page === null) return false;
    var title = this.getTabOtherElement(page, this.IDSURFIX.TITLE);
    if (title.firstChild.nodeType !== Node.TEXT_NODE) {
      title.insertBefore(doc.createTextNode(name), title.children[0]);
    } else {
      title.firstChild.textContent = name;
    }

    title.title = name;
    return true;
  }


  handleClick(e) {
    var target = e.target;
    if (!target.classList.contains(this.CLASSES.CLS)) return;
    this.removeTab(this.getTabId(target));
  }

  handleContextMenu(e) {
    var target = e.target;
    if (target.classList.contains(this.CLASSES.PAGE)) return;
    e.preventDefault();
    if (this.myMenu === null) {
      console.warn("myTabPage.myMenu is null!");
      return;
    }
    this.myMenu.loadMenuItems(this, this.menuItems);
    this.myMenu.show(e, target, this.myMenu.TYPES.CONTEXTMENU);
  }

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

  /**
   * 设置动画
   * @param {number} id tabId
   * @param {string} animName 
   */
  setAnimate(id, animName = "animate-progress") {
    var title = this.shadowRoot.getElementById(id + this.IDSURFIX.TITLE);
    if (!title) return;
    title.classList.add(animName);
  }
  /**
   * 移除动画
   * @param {number} id tabid
   * @param {*} animName 
   */
  resetAnimate(id, animName = "animate-progress") {
    var title = this.shadowRoot.getElementById(id + this.IDSURFIX.TITLE);
    if (!title) return;
    title.classList.remove(animName);
  }
}
MyTabPage.prototype.IDSURFIX = { TITLE: "_ttl", CLS: "_cls", PAGE: "_pge" };
MyTabPage.prototype.CLASSES = { TAB: "tab", TITLE: "title", CLS: "cls", PAGE: "page" };
MyTabPage.prototype.CLOSETYPE = { ALL: 0, ME: 2, OTHERS: 1 };
MyTabPage.prototype.myMenu = null;
MyTabPage.prototype.menuFunc = function (context, target) {
  console.log(context, target, this);
  var ctn = context.container;
  switch (this.title) {
    case "重新加载":
      break;
    case "添加收藏":
      break;
    case "关闭其他":
      var tab = ctn.querySelector("." + context.CLASSES.TAB + ":checked");
      if (tab !== null) {
        var id = tab.id;
        var title = context.shadowRoot.getElementById(id + context.IDSURFIX.TITLE);
        var page = context.shadowRoot.getElementById(id + context.IDSURFIX.PAGE);
        var cs = Array.from(ctn.childNodes);
        cs.splice(cs.indexOf(tab), 1);
        cs.splice(cs.indexOf(title), 1);
        cs.splice(cs.indexOf(page), 1);
        cs.map(a => a.remove());
        context._createFreeTabIds();
        context.freeTabIds.splice(context.freeTabIds.indexOf(id), 1);
        context._closeListeners.forEach(a => a(context.CLOSETYPE.OTHERS, id));
      }
      break;
    case "关闭所有":
      if (ctn.childElementCount > 0) {
        ctn.innerHTML = "";
        context._createFreeTabIds();
        context._closeListeners.forEach(a => a(context.CLOSETYPE.ALL));
      }
      break;
  }
}
MyTabPage.prototype.menuItems = [
  { id: 1, title: "重新加载", func: MyTabPage.prototype.menuFunc, disabled: false },
  "",
  { id: 2, title: "添加收藏", func: MyTabPage.prototype.menuFunc, disabled: false },
  "",
  { id: 3, title: "关闭其他", func: MyTabPage.prototype.menuFunc, disabled: false },
  { id: 4, title: "关闭所有", func: MyTabPage.prototype.menuFunc, disabled: false }
];


customElements.define("my-tab-page", MyTabPage);

