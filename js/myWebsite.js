"use strict"
import { getParent, defineProperty } from './myUtil.js';
import { MyTabPage } from './myTab.js';
import MyMenu from './myMenu.js';

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

defineProperty(window, 'App', (() => {
	const THEME_CLS_DARK = "dark-color";
	const THEME_CLS_LIGHT = "light-color";

	const CMDLIST = {};
	const userSetting = {};
	const menus = {};
	const cmds = {};
	/**@type{MyMenu} */
	let myMenu = null;

	const sysMenu = [
		{ title: "修改密码", func: (currentTarget, target, obj) => alert("还没写"), disabled: false },
		{ title: "刷新权限", func: refreshPermission, disabled: false },
		{ title: "重新加载下拉列表", func: clearSelectLists, disabled: false },
	];

	const tabMenu = [
		{ title: "重新加载", func: funcTabmenuReload, disabled: false },
		"",
		{ title: "添加收藏", func: funcTabmenuFavor, disabled: false },
		"",
		{ title: "关闭其他", func: funcTabmenuCloseOther, disabled: false },
		{ title: "关闭所有", func: funcTabmenuCloseAll, disabled: false }
	];
	function funcTabmenuFilter(e) {
		/**@type{HTMLElement} */
		const target = e.target;
		return (target.classList.contains(MyTabPage.CLASSES.TITLE) && target.id.endsWith(MyTabPage.IDSURFIX.TITLE));
	}
	function funcTabmenuReload(currentTarget, target, obj) {
		/**@type{MyTabPage} */
		const tpem = currentTarget.host;
		const id = tpem.getTabId(target);
		const page = tpem.getTabPageElement(id);
		page.src = page.src;
		tpem.setAnimate(id);
	}
	function funcTabmenuFavor(currentTarget, target, obj) {
		/**@type{MyTabPage} */
		const tpem = currentTarget.host;
		alert("还没写!");
	}

	function funcTabmenuCloseOther(currentTarget, target, obj) {
		/**@type{MyTabPage} */
		const tpem = currentTarget.host;
		const id = tpem.getTabId(target);
		tpem.removeAllTabExcept(id);
	}

	function funcTabmenuCloseAll(currentTarget, target, obj) {
		/**@type{MyTabPage} */
		const tpem = currentTarget.host;
		tpem.removeAllTab();
	}

	var userId = "";
	var replaceLinkPattern = /\b(src|href)\s*?=\s*?(["'])(.+?)\2/gi;
	var isValidFilePath = /\.[^\//\?\*<>\|]+$/;
	/**@type {MyTabPage} */
	var myTabPage = null;
	var wsc = null;
	//WebSocket
	var btnExecuteInfo = null
		, btnStatisticInfo = null
		, btnUserInfo = null;


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

	function _menuFunc(currentTarget, target, obj) {
		openNewPage(obj.title, obj.url);
	}

	function _setPLMMenu(ms) {
		const menubar = document.getElementById("menuBar");

		for (let i = 0; i < ms.length; i++) {
			const msi = ms[i];
			const btn = document.createElement("button");
			btn.textContent = msi.title;
			if (msi.disabled) btn.disabled = true;

			if (typeof msi.url === "string") {
				btn.addEventListener("click", (e) => { _menuFunc(btn, btn, msi) });
			} else {
				const menuItems = msi.url;
				for (let j = 0; j < menuItems.length; j++) {
					const msii = menuItems[j];
					switch (msii.constructor.name) {
						case "Object":
							msii.func = _menuFunc;
							break;
						case "Array":
							for (let k = 0; k < msii.length; k++) {
								if (typeof msii[k] === "object") msii[k].func = _menuFunc;
							}
							break;
						default:
							break;
					}
				}
				myMenu.bindElementMenu(btn, menuItems, MyMenu.TYPES.MENU);
			}
			menubar.appendChild(btn);
		}
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
	// //Recordset转tableData
	// function parseRecordsetStr2TableData(s) {
	// 	var rsd = JSON.parse(s);
	// 	var tableData = new MyTableData();
	// 	//     tableData.title={};
	// 	//     tableData.data={};
	// 	tableData.EOF = rsd.EOF;
	// 	tableData.totalCount = rsd.totalCount;
	// 	tableData.GUID = rsd.GUID;
	// 	tableData.PK = rsd.PK;
	// 	const pki = rsd.title.indexOf(rsd.PK);
	// 	if (pki === -1)
	// 		throw new Error("Recordset数据缺少主键！");
	// 	for (var i = 0; i < rsd.title.length; i++) {
	// 		tableData.title[rsd.title[i]] = rsd.type[i];
	// 	}
	// 	for (var i = 0; i < rsd.data.length; i++) {
	// 		var d = {};
	// 		for (var j = 0; j < rsd.title.length; j++) {
	// 			d[rsd.title[j]] = rsd.data[i][j];
	// 		}
	// 		let k = rsd.data[i][pki];
	// 		if (tableData.data.hasOwnProperty(k))
	// 			throw new Error("Recordset数据含有重复的主键！");
	// 		tableData.data[k] = d;
	// 		tableData.order.add(k);
	// 	}
	// 	console.log(tableData);
	// 	return tableData;
	// }

	// /**
	//  * 替换htmlDoc里面的src与href
	//  * @param {string} htmlDoc 
	//  */
	// function _replaceLink(htmlDoc) {
	// 	return htmlDoc.replace(replaceLinkPattern, "$1=\"$3?User-Id=" + userId + "\"");
	// }
	// /**
	//  * 替换主题
	//  * @param {string} htmlDoc 
	//  */
	// function _replaceHtmlDarkColor(htmlDoc) {
	// 	return htmlDoc.replace(/<html\b/, `<html class="${THEME_CLS_DARK}"`);
	// }

	// function _iframeReqSuccess(req, iframe) {
	// 	var htmlDoc = req.responseText;
	// 	htmlDoc = _replaceLink(htmlDoc);
	// 	if (document.documentElement.classList.contains(THEME_CLS_DARK)) {
	// 		htmlDoc = _replaceHtmlDarkColor(htmlDoc);
	// 	}
	// 	return new Promise((s, f) => {
	// 		iframe.addEventListener("load", e => s(e));
	// 		iframe.srcdoc = htmlDoc;
	// 	}
	// 	);
	// }
	// /**
	//  * 手动加载iframe，iframe.srcdoc必须已经赋值要加载的url
	//  * @param {HTMLIFrameElement} iframe 
	//  */
	// function iframeRequest(iframe) {
	// 	var path = iframe.srcdoc;
	// 	return myHttpRequest("GET", path).then(req => {
	// 		return _iframeReqSuccess(req, iframe);
	// 	});
	// }

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
		// var iframe = myTabPage.createNewTab(name, path, true);
		var iframe = myTabPage.createNewTab(name);
		if (iframe !== null) {
			iframe.src = path;
			let id = myTabPage.getTabId(iframe);
			myTabPage.setAnimate(id);
			// iframeRequest(iframe).then(function (event) {
			// 	myTabPage.resetAnimate(id);
			// 	if (data) {
			// 		iframe.contentWindow.myPage.setPageByStr(data);
			// 	}
			// 	_handleNewPageLoaded(iframe, name, path, data);
			// }, function (error) {
			// 	myTabPage.resetAnimate(id);
			// 	console.error(error);
			// });

			iframe.addEventListener('load', e => {
				if (document.documentElement.classList.contains(THEME_CLS_DARK)) {
					iframe.contentDocument.documentElement.classList.add(THEME_CLS_DARK);
				}
				myTabPage.resetAnimate(id);
				_handleNewPageLoaded(iframe, name, path, data);
			});
		} else {
			alert("窗口过多！请关闭部分窗口！");
		}
	}

	function _handleNewPageLoaded(iframe, name, path, data) {
		// 		console.log("_handleNewPageLoaded:", iframe, name, path, data);
		myMenu.bindWindow(iframe.contentWindow);
		if (iframe.contentDocument.title) {
			myTabPage.renameTab(iframe.contentWindow, iframe.contentDocument.title);
		}
	}

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
			localStorage.setItem("theme", THEME_CLS_DARK);
		} else {
			htmls.forEach(a => a.classList.remove(THEME_CLS_DARK));
			localStorage.setItem("theme", THEME_CLS_LIGHT);
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

	function createWebSocket(win, url, protocol) {
		return new win.WebSocket(`ws${location.origin.substr(4)}${url}`, protocol);
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
		let tid = myTabPage.getTabIdByWin(win);
		if (winTables.hasOwnProperty(tid))
			return;
		winTables[guid] = tid;
	}
	//
	function unregisterRecordset(guid) {
		delete winTables[guid];
	}

	//关闭Tab窗口事件
	function _handleMyTabPageClose(t, tid) {
		console.log(t, tid);
		// var tids;
		// switch (t) {
		// 	case MyTabPage.CLOSETYPE.ALL:
		// 		tids = Object.keys(winTables);
		// 		break;
		// 	case MyTabPage.CLOSETYPE.OTHERS:
		// 		tids = Object.keys(winTables).filter(a => winTables[a] !== tid);
		// 		break;
		// 	default:
		// 		tids = Object.keys(winTables).filter(a => winTables[a] === tid);
		// 		break;
		// }
		// if (!tids || tids.length === 0)
		// 	return;
		// tids.forEach(a => unregisterRecordset(a));
		// const dic = {};
		// dic.GUID = tids;

		// const s = JSON.stringify(dic);
		// //释放recordset资源
		// myHttpRequest("POST", App.CMDLIST.cmdReleaseRs, s).then(function (req) {
		// 	console.log("release recordset successed!", tids);
		// }, function (req) {
		// 	console.log("release recordset failed!", tids);
		// });
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
		myMenu = document.createElement(MyMenu.TAG);
		myMenu.init();

		myTabPage = document.getElementById("myTabPage");
		myTabPage.addCloseListener(_handleMyTabPageClose);

		btnExecuteInfo = document.getElementById("executeInfo");
		btnStatisticInfo = document.getElementById("statisticInfo");
		btnUserInfo = document.getElementById("userInfo");

		myMenu.bindElementMenu(btnUserInfo, sysMenu, MyMenu.TYPES.MENU);
		myMenu.bindElementMenu(myTabPage.shadowRoot, tabMenu, MyMenu.TYPES.CONTEXTMENU, funcTabmenuFilter);
		// btnUserInfo.addEventListener("click",
		// 	e => {
		// 		myMenu.loadMenuItems(btnUserInfo, sysMenu);
		// 		myMenu.show(e, btnUserInfo, myMenu.TYPES.MENU);
		// 	}, true
		// );

		let btnTheme = document.getElementById("switchColor");
		let theme = localStorage.getItem("theme");
		switch (theme) {
			case THEME_CLS_DARK:
				document.documentElement.classList.add(THEME_CLS_DARK);
				btnTheme.checked = true;
				break;
			default:
				break;
		}
		btnTheme.onchange = _onSwitchColor;
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
		get myMenu() {
			return myMenu;
		},
		get myTabPage() {
			return myTabPage
		},
		myHttpRequest: myHttpRequest,
		openNewPage: openNewPage,
		// iframeRequest: iframeRequest,
		CMDLIST: CMDLIST,
		// parseRecordsetStr2TableData: parseRecordsetStr2TableData,
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
)());
