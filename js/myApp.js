// "use strict";
// window.getParent = (em, htmlEm) => {
// 	var p = em;
// 	while (1) {
// 		p = p.parentElement;
// 		if (p == null) {
// 			return null;
// 		} else if (p instanceof htmlEm) {
// 			return p;
// 		}
// 	}
// }

// window.split2 = (s, pe) => {
// 	var n = pe.length;
// 	var i = s.indexOf(pe);
// 	var ss = [];
// 	if (i !== -1) {
// 		ss.push(s.substring(0, i));
// 		ss.push(s.substring(n + i));
// 	} else {
// 		ss.push(s);
// 	}
// 	return ss;
// }

// /*----------------------------------菜单------------------------------*/
// const MyMenu = (function () {
// 	function f() { }
// 	f.decorate = function (span) {
// 		span.__proto__ = f.prototype;
// 		span.decorate();
// 	}
// 	return f;
// })();
// MyMenu.prototype = (function () {
// 	const IDS = {
// 		MYMENU: "myMenu"
// 	};
// 	const CLASSES = {
// 		MYMENU: "my-menu",
// 		HASSUBMENU: "has-submenu"
// 	};
// 	const TYPES = {
// 		CONTEXTMENU: 0,
// 		SUBMENU: 1,
// 		MENU: 2
// 	};
// 	var _submenu = null
// 		, _menuItems = null
// 		, _menuItemsMap = {};
// 	var _listener = null
// 		, _target = null
// 		, _context = null;
// 	//子菜单ID计数
// 	var _submenuIdCounter;

// 	function decorate() {
// 		this.id = IDS.MYMENU;
// 		this.classList.add(CLASSES.MYMENU);
// 		this.style.display = "none";
// 		this.oncontextmenu = e => e.preventDefault();
// 		this.onmouseover = _onMouseOver.bind(this);
// 		this.onclick = _onClick.bind(this);

// 		_submenu = _submenu || document.createElement("span");
// 		_submenu.classList.add(CLASSES.MYMENU);
// 	}

// 	/**
// 	 * menuItems=[{id,title,func,disabled},"",[title,{id,title.func,disabled},"",...],...]  
// 	 * 子菜单第一个元素为标题名称  
// 	 * func(context,target), func的this={id,title,func,disabled}  
// 	 * func尽量不要使用箭头函数
// 	 * @param {*} context 
// 	 * @param {*} menuItems 
// 	 */
// 	function loadMenuItems(context, menuItems) {
// 		if (_menuItems !== menuItems) {
// 			_menuItems = menuItems;
// 			_createMenuItems(this, menuItems)
// 			console.log("loadMenuItems");
// 		}
// 		_context = context;
// 	}

// 	function _createMenuItems(span, ts) {
// 		_submenuIdCounter = 0;
// 		var its = [];
// 		var it;
// 		for (var i = 0; i < ts.length; i++) {
// 			it = ts[i];
// 			switch (it.constructor.name) {
// 				case "Object":
// 					_addMenuItem(its, it);
// 					break;
// 				case "Array":
// 					_addMenuHasSubMenu(its, it)
// 					break;
// 				default:
// 					_addMenuSplitter(its);
// 			}
// 		}
// 		span.innerHTML = its.join("");
// 		console.log("_createMenuItems");
// 	}

// 	function _addMenuItem(its, it) {
// 		if (it.disabled) {
// 			its.push("<button cmd=" + it.id + " disabled>" + it.title + "</button>");
// 		} else {
// 			its.push("<button cmd=" + it.id + ">" + it.title + "</button>");
// 			_menuItemsMap[it.id] = it;
// 		}
// 	}

// 	function _addMenuSplitter(its) {
// 		its.push("<hr>");
// 	}

// 	function _addMenuHasSubMenu(its, it) {
// 		_submenuIdCounter--;
// 		its.push("<button class=" + CLASSES.HASSUBMENU + " cmd=" + _submenuIdCounter + ">" + it[0] + "</button>");
// 		_menuItemsMap[_submenuIdCounter] = it;
// 	}

// 	function _createSubMenuItems(span, cmdId) {
// 		var subits = [];
// 		var its = _menuItemsMap[cmdId];
// 		var it;
// 		for (var j = 1; j < its.length; j++) {
// 			it = its[j];
// 			switch (it.constructor.name) {
// 				case "Object":
// 					_addMenuItem(subits, it);
// 					break;
// 				default:
// 					_addMenuSplitter(subits);
// 			}
// 		}
// 		span.innerHTML = subits.join("");
// 		console.log("_createSubMenuItems");
// 	}


// 	function _onMouseOver(e) {
// 		var t = e.target;
// 		if (t.classList.contains(CLASSES.HASSUBMENU)) {
// 			if (_submenu.cmdId !== t.getAttribute("cmd"))
// 				_showSubmenu.call(this, e, t);
// 		} else {
// 			//this.hideSubmenu();
// 		}
// 	}

// 	function _onClick(e) {
// 		var t = e.target;
// 		var target = _target;
// 		if (!(t instanceof HTMLButtonElement))
// 			return;
// 		var it = _menuItemsMap[t.getAttribute("cmd")];
// 		if (it !== undefined && it.constructor.name === "Object") {
// 			it.func(_context, target, it);
// 			this.hide();
// 		}
// 	}

// 	function getElementRectInDoc(em, doc) {
// 		const r0 = em.getBoundingClientRect();
// 		const rect = { x: r0.x, y: r0.y, width: r0.width, height: r0.height };

// 		function _getElementRect(emDoc) {
// 			if (emDoc === doc) return;
// 			const fem = emDoc.defaultView.frameElement;
// 			const r1 = fem.getBoundingClientRect();
// 			rect.x += r1.x;
// 			rect.y += r1.y;
// 			_getElementRect(fem.ownerDocument);
// 		}
// 		_getElementRect(em.ownerDocument);
// 		return rect;
// 	}

// 	function _display(span, e, target, type) {
// 		target = target || e.target;
// 		span.style.display = "block";

// 		const docSpan = span.ownerDocument;
// 		const rect = getElementRectInDoc(target, docSpan);
// 		const rt = target.getBoundingClientRect();

// 		switch (type) {
// 			case TYPES.SUBMENU:
// 				break;
// 			case TYPES.MENU:
// 				rect.y += rt.height + 5;
// 				break;
// 			default:
// 				rect.x += e.offsetX;
// 				rect.y += e.offsetY;
// 		}

// 		const rdoc = docSpan.documentElement.getBoundingClientRect();
// 		const maxX = rdoc.right;
// 		const maxY = rdoc.bottom;
// 		const rSpan = span.getBoundingClientRect();
// 		const right = rect.x + rSpan.width;
// 		const bottom = rect.y + rSpan.height;

// 		if (type !== TYPES.SUBMENU) {
// 			if (right >= maxX) {
// 				rect.x += maxX - right - 5;
// 			}
// 			if (bottom >= maxY) {
// 				rect.y += maxY - bottom - 5;
// 			}
// 		} else {
// 			if (rect.x + rect.width + rSpan.width >= maxX) {
// 				rect.x = -rSpan.width;
// 			} else {
// 				rect.x = rt.width - 3;
// 			}
// 			if (rect.y + rSpan.height >= maxY) {
// 				rect.y = rect.height - rSpan.height;
// 			} else {
// 				rect.y = 0;
// 			}
// 		}

// 		span.style.top = `${rect.y}px`;
// 		span.style.left = `${rect.x}px`;
// 		console.log("displayMenu");
// 	}

// 	function show(e, target, type) {
// 		_target = target || e.target;
// 		_display(this, e, target, type);
// 		window.removeEventListener("mousedown", _listener);
// 		window.removeEventListener("resize", _listener);
// 		_listener = _handleClose.bind(this);
// 		window.addEventListener("mousedown", _listener);
// 		window.addEventListener("resize", _listener);
// 	}

// 	function hide() {
// 		if (this.style.display !== "none") {
// 			this.style.display = "none";
// 			window.removeEventListener("mousedown", _listener);
// 			window.removeEventListener("resize", _listener);
// 			_listener = null;
// 			_target = null;
// 			_hideSubmenu();
// 		}
// 	}

// 	function _handleClose(e) {
// 		var t = e.target;
// 		if (e.type === "mousedown") {
// 			var p = (t instanceof MyMenu) ? t : getParent(t, MyMenu);
// 			if (p)
// 				return;
// 		}
// 		this.hide();
// 	}

// 	function _showSubmenu(e, target) {
// 		var cmdId = target.getAttribute("cmd");
// 		_createSubMenuItems(_submenu, cmdId);
// 		target.appendChild(_submenu);
// 		_display(_submenu, e, target, TYPES.SUBMENU);
// 		_submenu.cmdId = cmdId;
// 	}
// 	function _hideSubmenu() {
// 		_submenu.style.display = "none";
// 		_submenu.cmdId = -1;
// 	}

// 	return {
// 		constructor: MyMenu,
// 		__proto__: HTMLSpanElement.prototype,
// 		decorate: decorate,
// 		loadMenuItems: loadMenuItems,
// 		show: show,
// 		hide: hide,
// 		CLASSES: CLASSES,
// 		IDS: IDS,
// 		TYPES: TYPES
// 	};
// })();
// /*------------------------------------------------------------------------*/

// window.myApp = (() => {
// 	var myTabPage = null;
// 	var btnExecuteInfo = null;
// 	var btnStatisticInfo = null;
// 	var btnUserInfo = null;
// 	var myMenu = null;

// 	const sysMenu = [];
// 	const sysMenuEnum = { "修改密码": 1, "刷新权限": 2, "重新加载下拉列表": 3 };
// 	const funcSysmenu = function () {
// 		switch (this.id) {
// 			case sysMenuEnum.修改密码:
// 				alert("还没写");
// 				break;
// 			case sysMenuEnum.刷新权限:
// 				alert("还没写");
// 				break;
// 			case sysMenuEnum.重新加载下拉列表:
// 				alert("还没写");
// 				break;
// 		}
// 	};
// 	Object.keys(sysMenuEnum).map(t => {
// 		sysMenu.push({ id: sysMenuEnum[t], title: t, func: funcSysmenu, disabled: false })
// 	});

// 	/**
// 	 * 异步发送请求
// 	 * @param {string} method 
// 	 * @param {string} cmd 
// 	 * @param {*} data 
// 	 */
// 	function myHttpRequest(method, cmd, data) {
// 		return new Promise((resolve, reject) => {
// 			const req = new XMLHttpRequest();
// 			req.open(method, cmd, true);
// 			req.onload = () => {
// 				if (req.status == 200) {
// 					resolve(req);
// 				} else {
// 					alert(`请求未完成：${req.status} ${req.statusText}\n${req.responseText}`);
// 					reject(req);
// 				}
// 			}
// 			req.onerror = () => {
// 				reject(new Error("请求错误！无法连接到服务器！"));
// 			}

// 			if (data) {
// 				req.send(data);
// 			} else {
// 				req.send();
// 			}
// 		});
// 	}

// 	/**
// 	 * 替换htmlDoc里面的src与href
// 	 * @param {string} htmlDoc 
// 	 */
// 	function _replaceLink(htmlDoc) {
// 		// return htmlDoc.replace(/\b(src|href)\s*?=\s*?(["'])(.+?)\2/gi, "$1=\"$3?User-Id=" + userId + "\"");
// 		return htmlDoc;
// 	}

// 	/**
// 	 * 替换主题
// 	 * @param {string} htmlDoc 
// 	 */
// 	function _replaceHtmlDarkColor(htmlDoc) {
// 		return htmlDoc.replace(/<html\b/, '<html class="dark-color"');
// 	}

// 	function _iframeReqSuccess(req, iframe) {
// 		var htmlDoc = req.responseText;
// 		htmlDoc = _replaceLink(htmlDoc);
// 		if (document.documentElement.classList.contains("dark-color")) {
// 			htmlDoc = _replaceHtmlDarkColor(htmlDoc);
// 		}
// 		return new Promise((s, f) => {
// 			iframe.addEventListener("load", e => s(e));
// 			iframe.srcdoc = htmlDoc;
// 		});
// 	}

// 	/**
// 	 * 手动加载iframe
// 	 * @param {HTMLIFrameElement} iframe 
// 	 */
// 	function iframeRequest(iframe) {
// 		var path = iframe.srcdoc;
// 		return myHttpRequest("GET", path).then(req => {
// 			return _iframeReqSuccess(req, iframe);
// 		});
// 	}

// 	/**
// 	 * 打开新的tab窗口
// 	 * @param {string} name 
// 	 * @param {string} path 
// 	 * @param {string} data 
// 	 */
// 	function openNewPage(name, path, data) {
// 		var iframe = myTabPage.addTab(name, path, true);
// 		if (iframe !== null) {
// 			let id = myTabPage.getTabId(iframe);
// 			myTabPage.setAnimate(id);
// 			iframeRequest(iframe).then(function (event) {
// 				myTabPage.resetAnimate(id);
// 				if (data) {
// 					iframe.contentWindow.myPage.setPageByStr(data);
// 				}
// 			}, function (error) {
// 				myTabPage.resetAnimate(id);
// 				console.error(error);
// 			});
// 		} else {
// 			alert("窗口过多！请关闭部分窗口！");
// 		}
// 	}

// 	//关闭Tab窗口触发事件
// 	function _handleMyTabPageClose(t, tid) { }

// 	//更换主题触发事件
// 	function _onSwitchColor(e) {
// 		var htmls = [document.documentElement];
// 		function getFrames(wd) {
// 			var fs = wd.frames;
// 			for (var i = 0; i < fs.length; i++) {
// 				var f = fs[i];
// 				htmls.push(f.document.documentElement);
// 				getFrames(f.window);
// 			}
// 		}
// 		var fs = myTabPage.shadowRoot.querySelectorAll("iframe");
// 		for (var i = 0; i < fs.length; i++) {
// 			htmls.push(fs[i].contentDocument.documentElement);
// 			getFrames(fs[i].contentWindow);
// 		}
// 		if (e.target.checked) {
// 			htmls.forEach(a => a.classList.add("dark-color"));
// 		} else {
// 			htmls.forEach(a => a.classList.remove("dark-color"));
// 		}
// 	}

// 	//window加载结束触发事件
// 	function _onLoad(e) { }

// 	//控件加载结束触发事件
// 	function _onDomLoaded(e) {
// 		myMenu = document.createElement("span");
// 		MyMenu.decorate(myMenu);
// 		document.body.appendChild(myMenu);

// 		myTabPage = document.getElementById("myTabPage");
// 		myTabPage.addCloseListener(_handleMyTabPageClose);
// 		myTabPage.myMenu = myMenu;

// 		btnExecuteInfo = document.getElementById("executeInfo");
// 		btnStatisticInfo = document.getElementById("statisticInfo");

// 		btnUserInfo = document.getElementById("userInfo");
// 		btnUserInfo.addEventListener("click", e => {
// 			myMenu.loadMenuItems(btnUserInfo, sysMenu);
// 			myMenu.show(e, btnUserInfo, myMenu.TYPES.MENU);
// 		}, true);

// 		document.getElementById("switchColor").onchange = _onSwitchColor;
// 	}
// 	window.addEventListener('DOMContentLoaded', _onDomLoaded);
// 	window.addEventListener("load", _onLoad);

// 	return {
// 		openNewPage: openNewPage,
// 	};
// })();
