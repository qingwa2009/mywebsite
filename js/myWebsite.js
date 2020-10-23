"use strict"
window.CommonFunc=(()=>{
	function getParent(em, htmlEm){
		var p = em;
		while (1) {
			p = p.parentElement;
			if (p == null) {
				return null;
			} else if (p instanceof htmlEm) {
				return p;
			}
		}
	}

	function split2(s, pe){
		var n = pe.length;
		var i = s.indexOf(pe);
		var ss = [];
		if (i !== -1) {
			ss.push(s.substring(0, i));
			ss.push(s.substring(n + i));
		} else {
			ss.push(s);
		}
		return ss;
	}

	return {
		getParent:getParent,
		split2:split2,
	};
})();

window.MyTableData = function () {
	Object.defineProperty(this, "title", {
		value: {}
	});
	Object.defineProperty(this, "data", {
		value: {}
	});
	this.EOF = true;
	this.totalCount = 0;
	this.GUID = 0;
	this.PK = "";
	this.order = new Set();
};

window.App = (() => {
	const THEME_CLS_DARK="dark-color";
	const THEME_CLS_LIGHT="light-color";

	const CMDLIST = {};
	const userSetting = {};
	const menus = {};
	const cmds = {};
	const myMenu = document.createElement("span");
	
	const sysMenuEnum = {
		"修改密码": 1,
		"刷新权限": 2,
		"重新加载下拉列表": 3
	};
	const funcSysmenu = function () {
		switch (this.id) {
			case sysMenuEnum.修改密码:
				alert("还没写");
				break;
			case sysMenuEnum.刷新权限:
				refreshPermission();
				break;
			case sysMenuEnum.重新加载下拉列表:
				clearSelectLists();
				break;
		}
	};
	const sysMenu = [];
	Object.keys(sysMenuEnum).map(t => {
		sysMenu.push({
			id: sysMenuEnum[t],
			title: t,
			func: funcSysmenu,
			disabled: false
		})
	}
	);

	var userId = "";
	var replaceLinkPattern = /\b(src|href)\s*?=\s*?(["'])(.+?)\2/gi;
	var isValidFilePath = /\.[^\//\?\*<>\|]+$/;
	var myTabPage = null;
	var wsc = null;
	//WebSocket
	var btnExecuteInfo = null
		, btnStatisticInfo = null
		, btnUserInfo = null;
	/*----------------------------------菜单------------------------------*/
	const MyMenu = (function () {
		function f() { }
		f.decorate = function (span) {
			span.__proto__ = f.prototype;
			span.decorate();
		}
		return f;
	})();
	MyMenu.prototype = (function () {
		const IDS = {
			MYMENU: "myMenu"
		};
		const CLASSES = {
			MYMENU: "my-menu",
			HASSUBMENU: "has-submenu"
		};
		const TYPES = {
			CONTEXTMENU: 0,
			SUBMENU: 1,
			MENU: 2
		};
		var _submenu = null
			, _menuItems = null
			, _menuItemsMap = {};
		var _listener = null
			, _target = null
			, _context = null;
		//子菜单ID计数
		var _submenuIdCounter;

		function decorate() {
			this.id = IDS.MYMENU;
			this.classList.add(CLASSES.MYMENU);
			this.style.display = "none";
			this.oncontextmenu = e => e.preventDefault();
			this.onmouseover = _onMouseOver.bind(this);
			this.onclick = _onClick.bind(this);

			_submenu = _submenu || document.createElement("span");
			_submenu.classList.add(CLASSES.MYMENU);
		}
		/**
		 * menuItems=[{id,title,func,disabled},"",[title,{id,title.func,disabled},"",...],...]  
		 * 子菜单第一个元素为标题名称  
		 * func(context,target), func的this={id,title,func,disabled}  
		 * func尽量不要使用箭头函数
		 * @param {*} context 
		 * @param {*} menuItems 
		 */
		function loadMenuItems(context, menuItems) {
			if (_menuItems !== menuItems) {
				_menuItems = menuItems;
				_createMenuItems(this, menuItems)
				console.log("loadMenuItems");
			}
			_context = context;
		}

		function _createMenuItems(span, ts) {
			_submenuIdCounter = 0;
			var its = [];
			var it;
			for (var i = 0; i < ts.length; i++) {
				it = ts[i];
				switch (it.constructor.name) {
					case "Object":
						_addMenuItem(its, it);
						break;
					case "Array":
						_addMenuHasSubMenu(its, it)
						break;
					default:
						_addMenuSplitter(its);
				}
			}
			span.innerHTML = its.join("");
			console.log("_createMenuItems");
		}

		function _addMenuItem(its, it) {
			if (it.disabled) {
				its.push("<button cmd=" + it.id + " disabled>" + it.title + "</button>");
			} else {
				its.push("<button cmd=" + it.id + ">" + it.title + "</button>");
				_menuItemsMap[it.id] = it;
			}
		}

		function _addMenuSplitter(its) {
			its.push("<hr>");
		}

		function _addMenuHasSubMenu(its, it) {
			_submenuIdCounter--;
			its.push("<button class=" + CLASSES.HASSUBMENU + " cmd=" + _submenuIdCounter + ">" + it[0] + "</button>");
			_menuItemsMap[_submenuIdCounter] = it;
		}

		function _createSubMenuItems(span, cmdId) {
			var subits = [];
			var its = _menuItemsMap[cmdId];
			var it;
			for (var j = 1; j < its.length; j++) {
				it = its[j];
				switch (it.constructor.name) {
					case "Object":
						_addMenuItem(subits, it);
						break;
					default:
						_addMenuSplitter(subits);
				}
			}
			span.innerHTML = subits.join("");
			console.log("_createSubMenuItems");
		}

		function _onMouseOver(e) {
			var t = e.target;
			if (t.classList.contains(CLASSES.HASSUBMENU)) {
				if (_submenu.cmdId !== t.getAttribute("cmd"))
					_showSubmenu.call(this, e, t);
			} else {//this.hideSubmenu();
			}
		}

		function _onClick(e) {
			var t = e.target;
			var target = _target;
			if (!(t instanceof HTMLButtonElement))
				return;
			var it = _menuItemsMap[t.getAttribute("cmd")];
			if (it !== undefined && it.constructor.name === "Object") {
				it.func(_context, target, it);
				this.hide();
			}
		}

		function getElementRectInDoc(em, doc) {
			const r0 = em.getBoundingClientRect();
			const rect = {
				x: r0.x,
				y: r0.y,
				width: r0.width,
				height: r0.height
			};

			function _getElementRect(emDoc) {
				if (emDoc === doc)
					return;
				const fem = emDoc.defaultView.frameElement;
				const r1 = fem.getBoundingClientRect();
				rect.x += r1.x;
				rect.y += r1.y;
				_getElementRect(fem.ownerDocument);
			}
			_getElementRect(em.ownerDocument);
			return rect;
		}

		function _display(span, e, target, type) {
			target = target || e.target;
			span.style.display = "block";

			const docSpan = span.ownerDocument;
			const rect = getElementRectInDoc(target, docSpan);
			const rt = target.getBoundingClientRect();

			switch (type) {
				case TYPES.SUBMENU:
					break;
				case TYPES.MENU:
					rect.y += rt.height + 5;
					break;
				default:
					rect.x += e.offsetX;
					rect.y += e.offsetY;
			}

			const rdoc = docSpan.documentElement.getBoundingClientRect();
			const maxX = rdoc.right;
			const maxY = rdoc.bottom;
			const rSpan = span.getBoundingClientRect();
			const right = rect.x + rSpan.width;
			const bottom = rect.y + rSpan.height;

			if (type !== TYPES.SUBMENU) {
				if (right >= maxX) {
					rect.x += maxX - right - 5;
				}
				if (bottom >= maxY) {
					rect.y += maxY - bottom - 5;
				}
			} else {
				if (rect.x + rect.width + rSpan.width >= maxX) {
					rect.x = -rSpan.width;
				} else {
					rect.x = rt.width - 3;
				}
				if (rect.y + rSpan.height >= maxY) {
					rect.y = rect.height - rSpan.height;
				} else {
					rect.y = 0;
				}
			}

			span.style.top = `${rect.y}px`;
			span.style.left = `${rect.x}px`;
			console.log("displayMenu");
		}

		function show(e, target, type) {
			_target = target || e.target;
			_display(this, e, target, type);
			
			window.removeEventListener("mousedown", _listener);
			window.removeEventListener("resize", _listener);
			_listener = _handleClose.bind(this);
			window.addEventListener("mousedown", _listener);
			window.addEventListener("resize", _listener);
		}

		function hide() {
			if (this.style.display !== "none") {
				this.style.display = "none";
				window.removeEventListener("mousedown", _listener);
				window.removeEventListener("resize", _listener);
				_listener = null;
				_target = null;
				_hideSubmenu();
			}
		}

		function _handleClose(e) {
			var t = e.target;
			if (e.type === "mousedown") {
				var p = (t instanceof MyMenu) ? t : CommonFunc.getParent(t, MyMenu);
				if (p)
					return;
			}
			this.hide();
		}

		function _showSubmenu(e, target) {
			var cmdId = target.getAttribute("cmd");
			_createSubMenuItems(_submenu, cmdId);
			target.appendChild(_submenu);
			_display(_submenu, e, target, TYPES.SUBMENU);
			_submenu.cmdId = cmdId;
		}

		function _hideSubmenu() {
			_submenu.style.display = "none";
			_submenu.cmdId = -1;
		}
		
		//绑定窗口单击和调整大小时关闭菜单
		function bindWindow(w){
			if(w===window)return;		
			w.addEventListener("mousedown", this.hide.bind(this));
			w.addEventListener("resize", this.hide.bind(this));
		}

		return {
			constructor: MyMenu,
			__proto__: HTMLSpanElement.prototype,
			decorate: decorate,
			loadMenuItems: loadMenuItems,
			show: show,
			hide: hide,
			bindWindow:bindWindow,//绑定窗口单击和调整大小时关闭菜单
			CLASSES: CLASSES,
			IDS: IDS,
			TYPES: TYPES
		};
	})();

	/**
	 * 异步发送请求
	 * @param {string} method 
	 * @param {string} cmd 
	 * @param {*} data 
	 */
	function myHttpRequest(method, cmd, data) {
		return new Promise((resolve, reject) => {
			const req = new XMLHttpRequest();
			req.open(method, cmd, true);
			if (userId !== "")
				req.setRequestHeader("User-Id", userId);
			req.onload = () => {
				if (req.status == 200) {
					resolve(req);
				} else {
					alert(`请求未完成：${req.status} ${req.statusText}\n${req.responseText}`);
					reject(req);
				}
			}
			req.onerror = () => {
				reject(new Error("请求错误！无法连接到服务器！"));
			}

			if (data) {
				req.send(data);
			} else {
				req.send();
			}

		}
		);
	}

	/*-------------------------------删除User-Id---------------------------------*/
	function deleteCookie() {
		myHttpRequest("POST", CMDLIST.cmdDeleteCookie).then(function (req) {
			console.log(req.getAllResponseHeaders());
			userId = req.getResponseHeader("User-Id");
		}, function (error) {
			console.error("POST /cmd-deleteCookie failed:", error);
		})
	}
	/*-------------------------------加载用户设置---------------------------------*/
	function loadUserSetting() {
		// 		myHttpRequest("GET", CMDLIST.cmdUserSetting).then(function(req) {
		// 			var userSettingStr = req.responseText;
		// 			var userSettingDic = JSON.parse(userSettingStr);
		// 			_parseUserSetting(userSettingDic["setting"]);
		// 			_parseCmds(userSettingDic["cmd"]);
		// 			_setPLMMenu(userSettingDic["menu"]);
		// 			btnUserInfo.textContent = userSettingDic["user"];
		// 			console.log("userSetting：", userSetting);
		// 		}, function(error) {
		// 			console.error("GET /cmd-userSetting failed:", error);
		// 		});
		
		_setPLMMenu(window.websiteMenu);
	}

	function _parseUserSetting(listSettings) {
		for (var k in listSettings) {
			userSetting[k] = listSettings[k];
		}
	}

	function _parseCmds(listCmds) {
		listCmds.forEach(a => cmds[`/cmd-${a}`] = 1);
	}

	function _funcPlmMenu(context, target) {
		console.log(context, target, this);
		var path = `${this.folder}${this.file}.html`;
		openNewPage(this.title, path);		
	}

	function _setPLMMenu(ms) {
		let htmls = [];
		const root = [];
		let ID=0;

		for (let i = 0; i < ms.length; i++) {
			_create(ms[i], root, "");
			let t;
			if (root[i] instanceof Array) {
				t = root[i].shift();
			} else {
				t = root[i]["title"];
			}
			menus[t] = root[i];
			htmls.push(`<button id="${t}">${t}</button>`);
		}

		function _create(obj, col, folder) {
			let nobj = null;
			let title = obj["title"];
			let file = obj["file"]||title;			//file:undefined时将用title的名称作为文件名
			if (file instanceof Array) {
				nobj = [];				
				nobj.push(title);					//第一个元素作为目录名
				let fd=obj["folder"]||title;		//folder:undefined时将用title的名称作为文件夹名
				for (let i = 0; i < file.length; i++) {
					_create(file[i], nobj, `${folder}${fd}/`);
				}
			} else {				
				nobj = {
					id: ID,
					title: title,
					file: file,
					folder: folder,
					func: _funcPlmMenu,
					disabled: !(obj["enable"]||false)
				};	
				ID++;			
			}
			col.push(nobj);
		}

		console.log(ms);
		console.log(menus);

		const div = document.getElementById("menuBar");
		div.innerHTML = htmls.join("");
		div.addEventListener('click', (e) => {
			let target = e.target;
			let dt = menus[target.id];
			if (dt) {
				if (dt instanceof Array) {
					myMenu.loadMenuItems(div, dt);
					myMenu.show(e, target, myMenu.TYPES.MENU);
				} else {
					dt.func(e.currentTarget, target);
				}
			}
		}
		);
	}

	/*-------------------------------刷新权限---------------------------------*/
	function refreshPermission() {
		myHttpRequest("GET", CMDLIST.cmdRefreshMySelfPermission).then(function (req) {
			showExecuteInfo("权限刷新完成!", 0);
			loadUserSetting();
		}, function (error) {
			showExecuteInfo("权限刷新失败!", 1);
			console.error(error);
		});
	}
	/*-----------------------------------------------------------------------*/
	//Recordset转tableData
	function parseRecordsetStr2TableData(s) {
		var rsd = JSON.parse(s);
		var tableData = new MyTableData();
		//     tableData.title={};
		//     tableData.data={};
		tableData.EOF = rsd.EOF;
		tableData.totalCount = rsd.totalCount;
		tableData.GUID = rsd.GUID;
		tableData.PK = rsd.PK;
		const pki = rsd.title.indexOf(rsd.PK);
		if (pki === -1)
			throw new Error("Recordset数据缺少主键！");
		for (var i = 0; i < rsd.title.length; i++) {
			tableData.title[rsd.title[i]] = rsd.type[i];
		}
		for (var i = 0; i < rsd.data.length; i++) {
			var d = {};
			for (var j = 0; j < rsd.title.length; j++) {
				d[rsd.title[j]] = rsd.data[i][j];
			}
			let k = rsd.data[i][pki];
			if (tableData.data.hasOwnProperty(k))
				throw new Error("Recordset数据含有重复的主键！");
			tableData.data[k] = d;
			tableData.order.add(k);
		}
		console.log(tableData);
		return tableData;
	}

	

	/**
	 * 替换htmlDoc里面的src与href
	 * @param {string} htmlDoc 
	 */
	function _replaceLink(htmlDoc) {
		return htmlDoc.replace(replaceLinkPattern, "$1=\"$3?User-Id=" + userId + "\"");
	}
	/**
	 * 替换主题
	 * @param {string} htmlDoc 
	 */
	function _replaceHtmlDarkColor(htmlDoc) {
		return htmlDoc.replace(/<html\b/, `<html class="${THEME_CLS_DARK}"`);
	}

	function _iframeReqSuccess(req, iframe) {
		var htmlDoc = req.responseText;
		htmlDoc = _replaceLink(htmlDoc);
		if (document.documentElement.classList.contains(THEME_CLS_DARK)) {
			htmlDoc = _replaceHtmlDarkColor(htmlDoc);
		}
		return new Promise((s, f) => {
			iframe.addEventListener("load", e => s(e));
			iframe.srcdoc = htmlDoc;
		}
		);
	}
	/**
	 * 手动加载iframe
	 * @param {HTMLIFrameElement} iframe 
	 */
	function iframeRequest(iframe) {
		var path = iframe.srcdoc;
		return myHttpRequest("GET", path).then(req => {
			return _iframeReqSuccess(req, iframe);
		});
	}

	/**
	 * 打开新的tab窗口
	 * @param {string} name 
	 * @param {string} path 
	 * @param {string} data 
	 */
	function openNewPage(name, path, data) {
		// 		if (userId === "") {
		// 			alert("用户登录状态丢失，请重新登录！");
		// 			return;
		// 		}
		var iframe = myTabPage.addTab(name, path, true);
		if (iframe !== null) {
			let id = myTabPage.getTabId(iframe);
			myTabPage.setAnimate(id);
			iframeRequest(iframe).then(function (event) {
				myTabPage.resetAnimate(id);
				if (data) {
					iframe.contentWindow.myPage.setPageByStr(data);
				}
				_handleNewPageLoaded(iframe,name,path,data);
			}, function (error) {
				myTabPage.resetAnimate(id);
				console.error(error);
			});
			
		} else {
			alert("窗口过多！请关闭部分窗口！");
		}
	}

	function _handleNewPageLoaded(iframe, name, path, data) {
// 		console.log("_handleNewPageLoaded:", iframe, name, path, data);
		myMenu.bindWindow(iframe.contentWindow);
		if(iframe.contentDocument.title){
			myTabPage.renameTab(iframe.contentWindow, iframe.contentDocument.title);
		}
	}
	//关闭Tab窗口触发事件
	function _handleMyTabPageClose(t, tid) { }

	//更换主题触发事件
	function _onSwitchColor(e) {
		var htmls = [document.documentElement];
		function getFrames(wd) {
			var fs = wd.frames;
			for (var i = 0; i < fs.length; i++) {
				var f = fs[i];
				htmls.push(f.document.documentElement);
				getFrames(f.window);
			}
		}
		var fs = myTabPage.shadowRoot.querySelectorAll("iframe");
		for (var i = 0; i < fs.length; i++) {
			htmls.push(fs[i].contentDocument.documentElement);
			getFrames(fs[i].contentWindow);
		}
		if (e.target.checked) {
			htmls.forEach(a => a.classList.add(THEME_CLS_DARK));
			localStorage.setItem("theme",THEME_CLS_DARK);
		} else {
			htmls.forEach(a => a.classList.remove(THEME_CLS_DARK));
			localStorage.setItem("theme",THEME_CLS_LIGHT);
		}
	}

	//-----------------------------

	/**
	 * @param {string} s 提示信息
	 * @param {number} t 信息类型，undefined 默认不闪烁，0闪提示，1闪警告
	 */
	function showExecuteInfo(s, t) {
		btnExecuteInfo.textContent = s;
		btnExecuteInfo.classList.remove("animate-shiningW");
		btnExecuteInfo.classList.remove("animate-shiningI");
		if (t === undefined)
			return;
		window.requestAnimationFrame(function (time) {
			window.requestAnimationFrame(function (time) {
				if (t)
					btnExecuteInfo.classList.add("animate-shiningW");
				else
					btnExecuteInfo.classList.add("animate-shiningI");
			});
		});

	}
	//重播动画
	function replayAnim(em, newClassName, oldClassName) {
		em.classList.remove(oldClassName);
		window.requestAnimationFrame(function (time) {
			window.requestAnimationFrame(function (time) {
				em.classList.add(newClassName);
			});
		});
	}

	function showStatisticInfo(s) {
		btnStatisticInfo.textContent = s;
	}

	function createWebSocket(win, protocol){
		return new win.WebSocket(`ws://${location.host}/websocket`, protocol);
	}

	/*-------------------释放占有recordset资源相关-----------------------*/
	//创建table的GUID
	var tableGUID = 0;
	function createTableGUID() {
		++tableGUID;
		return tableGUID;
	}
	const winTables = {};
	//记录table占有的Recordset
	function registerRecordset(guid, win) {
		let tid = myTabPage.getTabId(win.frameElement);
		if (winTables.hasOwnProperty(tid))
			return;
		winTables[guid] = tid;
	}
	//
	function unregisterRecordset(guid) {
		delete winTables[guid];
	}

	//关闭Tab窗口事件
	function handleMyTabPageClose(t, tid) {
		var tids;
		switch (t) {
			case myTabPage.CLOSETYPE.ALL:
				tids = Object.keys(winTables);
				break;
			case myTabPage.CLOSETYPE.OTHERS:
				tids = Object.keys(winTables).filter(a => winTables[a] !== tid);
				break;
			default:
				tids = Object.keys(winTables).filter(a => winTables[a] === tid);
				break;
		}
		if (!tids || tids.length === 0)
			return;
		tids.forEach(a => unregisterRecordset(a));
		const dic = {};
		dic.GUID = tids;

		const s = JSON.stringify(dic);
		//释放recordset资源
		myHttpRequest("POST", App.CMDLIST.cmdReleaseRs, s).then(function (req) {
			console.log("release recordset successed!", tids);
		}, function (req) {
			console.log("release recordset failed!", tids);
		});
	}
	/*--------------------------select元素相关----------------------------*/
	const _selectLists = {};
	//保存select元素的列表
	function storeSelectList(cmd, arr) {
		_selectLists[cmd] = arr;
	}
	//加载select元素的列表
	function loadSelectList(cmd) {
		return _selectLists[cmd]
	}
	//清空select元素的列表
	function clearSelectLists() {
		for (let k in _selectLists) {
			delete _selectLists[k];
		}
	}
	/*------------------------------------------------------*/
	function onLoad(e) {
		//     wsc=new WebSocket("ws://"+location.host+CMDLIST.cmdWebSocket);
		//     wsc.onerror=(e)=>{
		//       if (wsc.readyState!==1){
		//         console.error("websocket连接建立失败：",e);
		//         alert("授权请求失败，请重新登录！\n（如果重复提示失败，请关闭窗口后重试！）");
		//       }
		//     };
		//     deleteCookie();
		loadUserSetting();
	}
	function onDomLoaded(e) {
		MyMenu.decorate(myMenu);
		document.body.appendChild(myMenu);

		myTabPage = document.getElementById("myTabPage");
		myTabPage.addCloseListener(_handleMyTabPageClose);
		myTabPage.myMenu = myMenu;

		btnExecuteInfo = document.getElementById("executeInfo");
		btnStatisticInfo = document.getElementById("statisticInfo");
		btnUserInfo = document.getElementById("userInfo");

		btnUserInfo.addEventListener("click",
			e => {
				myMenu.loadMenuItems(btnUserInfo, sysMenu);
				myMenu.show(e, btnUserInfo, myMenu.TYPES.MENU);
			}, true
		);

		let btnTheme=document.getElementById("switchColor");
		let theme = localStorage.getItem("theme");		
		switch(theme){
			case THEME_CLS_DARK:
				document.documentElement.classList.add(THEME_CLS_DARK);
				btnTheme.checked=true;
				break;
			default:
				break;
		}		
		btnTheme.onchange = _onSwitchColor;		

		myTabPage.addCloseListener(handleMyTabPageClose);
	}
	window.addEventListener('DOMContentLoaded', onDomLoaded);
	window.addEventListener("load", onLoad);

	return {
		get wsc() {
			return wsc
		},
		get userId() {
			return userId
		},
		get cmds() {
			return cmds
		},
		userSetting: userSetting,
		myMenu: myMenu,
		get myTabPage() {
			return myTabPage
		},
		myHttpRequest: myHttpRequest,
		openNewPage: openNewPage,
		iframeRequest: iframeRequest,
		CMDLIST: CMDLIST,
		parseRecordsetStr2TableData: parseRecordsetStr2TableData,
		showExecuteInfo: showExecuteInfo,
		showStatisticInfo: showStatisticInfo,
		replayAnim: replayAnim,
		createTableGUID: createTableGUID,
		registerRecordset: registerRecordset,
		unregisterRecordset: unregisterRecordset,
		storeSelectList: storeSelectList,
		loadSelectList: loadSelectList,
		clearSelectLists: clearSelectLists,
		createWebSocket: createWebSocket,
	}
}
)();
