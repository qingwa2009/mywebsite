"use strict"
import { getParent, defineProperty } from './myUtil.js';
import MyTableData from '../components/myTable/MyTableData.js';
import MyTab from '../components/myTab/myTab.js';
import MyMenu from '../components/myMenu/myMenu.js';


defineProperty(window, 'App', (() => {
	const THEME_CLS_DARK = "dark-color";
	const THEME_CLS_LIGHT = "light-color";

	const userSettings = {};
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
		return (target.classList.contains(MyTab.CLASSES.TITLE) && target.id.endsWith(MyTab.IDSURFIX.TITLE));
	}
	function funcTabmenuReload(currentTarget, target, obj) {
		/**@type{MyTab} */
		const tpem = currentTarget.host;
		const id = tpem.getTabId(target);
		const page = tpem.getTabPageElement(id);
		page.src = page.src;
		tpem.setAnimate(id);
	}
	function funcTabmenuFavor(currentTarget, target, obj) {
		/**@type{MyTab} */
		const tpem = currentTarget.host;
		alert("还没写!");
	}

	function funcTabmenuCloseOther(currentTarget, target, obj) {
		/**@type{MyTab} */
		const tpem = currentTarget.host;
		const id = tpem.getTabId(target);
		tpem.removeAllTabExcept(id);
	}

	function funcTabmenuCloseAll(currentTarget, target, obj) {
		/**@type{MyTab} */
		const tpem = currentTarget.host;
		tpem.removeAllTab();
	}

	var userId = "";
	var replaceLinkPattern = /\b(src|href)\s*?=\s*?(["'])(.+?)\2/gi;
	var isValidFilePath = /\.[^\//\?\*<>\|]+$/;
	/**@type {MyTab} */
	var myTab = null;
	var btnExecuteInfo = null
		, btnStatisticInfo = null
		, btnUserInfo = null;


	/**
	 * 异步发送请求，如果响应的状态码不是200就弹出错误提示框
	 * @param {string} method 
	 * @param {string} url 
	 * @param {string} data 
	 * @return {Promise<XMLHttpRequest>}
	 */
	function myHttpRequest(method, url, data) {
		return new Promise((resolve, reject) => {
			const req = new XMLHttpRequest();
			req.open(method, url, true);
			if (userId !== "")
				req.setRequestHeader("User-Id", userId);

			req.onload = () => {
				if (req.status == 200) {
					resolve(req);
				} else {
					alert(`请求未完成：${req.status} ${req.statusText}\n${req.responseText}`);
					reject(new Error(`${req.status}: ${req.responseText}`));
				}
			}
			req.onerror = () => {
				alert("请求错误！无法连接到服务器！");
				reject(new Error("请求错误！无法连接到服务器！"));
			}

			if (data) {
				req.send(data);
			} else {
				req.send();
			}
		});
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
	const url_usersetting = "/usersetting";
	function loadUserSetting() {
		_setPLMMenu(window.websiteMenu);

		myHttpRequest("GET", url_usersetting).then(req => {
			const mtd = JSON.parse(req.responseText);
			console.log(mtd);
			if (mtd.error) {
				showExecuteInfo("用户设置加载失败！", 1);
				console.error("get user setting failed: ", mtd.error);
				return;
			}
			_parseUserSettings(mtd);
		}, error => {
			showExecuteInfo("用户设置加载失败！", 1);
			console.error("get user setting failed: ", error);
		})
	}

	/**
	 * @param {{title:string, data:{col:string, width:number}[]}} setting 
	 */
	function saveTableSetting(setting) {
		if (setting.data.length < 1) return;

		userSettings[setting.title] = setting;
		const mtd = new MyTableData();
		mtd.title = Object.keys(setting.data[0]);
		for (let i = 0; i < setting.data.length; i++) {
			const dt = setting.data[i];
			const arr = [];
			for (let j = 0; j < mtd.title.length; j++) {
				const t = mtd.title[j];
				arr.push(dt[t]);
			}
			mtd.data.push(arr);
		}
		mtd.count = mtd.data.length;
		mtd.list = setting.title;

		myHttpRequest("POST", url_usersetting, mtd.toString()).then(
			req => {
				showExecuteInfo("设置保存成功！", 0);
				console.log("setting saved: ", mtd);
			}, error => {
				showExecuteInfo("设置保存失败！", 1);
				console.error("setting save failed: ", error);
			}
		);
	}

	/**
	 * @param {string} title
	 * @returns {{title:string, data:{col:string, width:number}[]}} setting 
	 */
	function getTableSetting(title) {
		return userSettings[title];
	}

	function _parseUserSettings(/**@type{MyTableData} */mtd) {
		MyTableData.decorate(mtd);
		mtd.createTitleIndex();

		const data = mtd.data;
		const n = data.length;
		for (let i = 0; i < n; i++) {
			const dt = data[i];
			const title = dt[mtd.titleIndex["list"]];
			let setting = userSettings[title];
			if (!setting) {
				setting = { title, data: [] }
				userSettings[title] = setting;
			}
			const col = dt[mtd.titleIndex["col"]];
			const width = dt[mtd.titleIndex["width"]];
			setting.data.push({ col, width });
		}
		console.log(userSettings);
	}

	/*-------------------------------设置菜单栏---------------------------------*/
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

	function _menuFunc(currentTarget, target, obj) {
		openNewPage(obj.title, obj.url);
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
		// var iframe = myTab.createNewTab(name, path, true);
		var iframe = myTab.createNewTab(name);
		if (iframe !== null) {
			iframe.src = path;
			let id = myTab.getTabId(iframe);
			myTab.setAnimate(id);

			iframe.addEventListener('load', e => {
				if (document.documentElement.classList.contains(THEME_CLS_DARK)) {
					iframe.contentDocument.documentElement.classList.add(THEME_CLS_DARK);
				}
				myTab.resetAnimate(id);
				_handleNewPageLoaded(iframe, name, path, data);
			});
		} else {
			alert("窗口过多！请关闭部分窗口！");
		}
	}

	function _handleNewPageLoaded(iframe, name, path, data) {
		myMenu.bindWindow(iframe.contentWindow);
		if (iframe.contentDocument.title) {
			myTab.renameTab(iframe.contentWindow, iframe.contentDocument.title);
		}
	}

	//关闭Tab窗口事件
	function _handleMyTabPageClose(t, tid) {
		console.log("tab closed!", t, tid);
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
		var fs = myTab.shadowRoot.querySelectorAll("iframe");
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
	 * 显示在中间有动画效果的信息
	 * @param {string} s 提示信息
	 * @param {undefined | 0 | 1} t 信息类型，undefined 默认不闪烁，0闪提示，1闪警告
	 * @param {Window} win 传入了这个值将绑定对应的win，在显示时，自动切换显示绑定的值
	 */
	function showExecuteInfo(s, t, win = undefined) {
		btnExecuteInfo.textContent = s;
		btnExecuteInfo.classList.remove("animate-shiningW");
		btnExecuteInfo.classList.remove("animate-shiningI");
		if (win) win._executeInfo = s;

		if (t !== undefined) {
			window.requestAnimationFrame(function (time) {
				window.requestAnimationFrame(function (time) {
					if (t)
						btnExecuteInfo.classList.add("animate-shiningW");
					else
						btnExecuteInfo.classList.add("animate-shiningI");
				});
			});
		}
	}

	/**
	 * 显示在左边固定长度的信息
	 * @param {string} s 
	 * @param {Window} win 传入了这个值将绑定对应的win，在显示时，自动切换显示绑定的值
	 */
	function showStatisticInfo(s, win = undefined) {
		btnStatisticInfo.textContent = s;
		if (win) win._statisticInfo = s;
	}

	//切换tab更新显示的信息
	function _onShowingTab(tid) {
		const win = myTab.getTabWin(tid);
		if (!win) {
			showExecuteInfo("", undefined);
			showStatisticInfo("");
			return;
		}
		showExecuteInfo(win._executeInfo ? win._executeInfo : "", undefined);
		showStatisticInfo(win._statisticInfo ? win._statisticInfo : "");
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
		loadUserSetting();
	}
	function onDomLoaded(e) {
		myMenu = document.createElement(MyMenu.TAG);
		myMenu.init();

		myTab = document.getElementById("myTab");
		myTab.addCloseEvent(_handleMyTabPageClose);
		myTab.addTabSwitchEvent(_onShowingTab);


		btnExecuteInfo = document.getElementById("executeInfo");
		btnStatisticInfo = document.getElementById("statisticInfo");
		btnUserInfo = document.getElementById("userInfo");

		myMenu.bindElementMenu(btnUserInfo, sysMenu, MyMenu.TYPES.MENU);
		myMenu.bindElementMenu(myTab.shadowRoot, tabMenu, MyMenu.TYPES.CONTEXTMENU, funcTabmenuFilter);

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
		get userId() {
			return userId
		},
		get cmds() {
			return cmds
		},
		saveTableSetting,
		getTableSetting,
		get myMenu() {
			return myMenu;
		},
		get myTab() {
			return myTab
		},
		myHttpRequest: myHttpRequest,
		openNewPage: openNewPage,
		showExecuteInfo,
		showStatisticInfo,
		storeSelectList,
		loadSelectList,
		clearSelectLists,
	}
}
)());
