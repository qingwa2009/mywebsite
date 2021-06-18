"use strict"
import { getParent, defineProperty } from './myUtil.js';
import MyTableData from './myTableData.js';
import MyTab from './components/myTab/myTab.js';
import MyMenu from './components/myMenu/myMenu.js';


defineProperty(window, 'App', (() => {
	const THEME_CLS_DARK = "dark-color";
	const THEME_CLS_LIGHT = "light-color";

	const userSettings = {};
	/**@type{MyMenu} */
	let myMenu = null;
	/**@type{IDBDatabase} */
	let myplmDb = null;

	const sysMenu = [
		{ title: "修改密码", func: (currentTarget, target, obj) => alert("还没写"), disabled: false },
		{ title: "刷新权限", func: refreshPermission, disabled: false },
		{ title: "重新加载下拉列表", func: (currentTarget, target, obj) => alert("还没写"), disabled: false },
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
	 * @param {boolean} alertWhenError 默认true
	 * @param {"" | "arraybuffer" | "blob" | "document" | "json" | "text"} responseType 默认 ""\
	 * 设置了除"","text"的时候如果响应的是文本信息将无法获取该信息
	 * @return {Promise<XMLHttpRequest>}
	 */
	function myHttpRequest(method, url, data, alertWhenError = true, responseType = "") {
		return new Promise((resolve, reject) => {
			const req = new XMLHttpRequest();
			req.open(method, url, true);
			if (userId !== "")
				req.setRequestHeader("User-Id", userId);

			req.onload = () => {
				if (req.status == 200) {
					resolve(req);
				} else {
					const respText = responseType === "" || responseType === "text" ? req.response : "详细错误信息请查看开发者工具Network->Response！";

					if (alertWhenError) alert(`请求未完成：${req.status} ${req.statusText}\n${respText}`);
					const err = new Error(`${req.status}: ${respText}`);
					err.reqStatusCode = req.status;
					reject(err);
				}
			}
			req.onerror = () => {
				if (alertWhenError) alert("请求错误！无法连接到服务器！");
				reject(new Error("请求错误！无法连接到服务器！"));
			}

			req.responseType = responseType;

			if (data) req.send(data);
			else req.send();

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

		if (win) {
			win._executeInfo = s;
			const tid = myTab.getTabIdByWin(win)
			if (tid && !myTab.isTabVisible(tid)) {
				myTab.setAlert(tid);
				return;
			}
		}

		btnExecuteInfo.textContent = s;
		btnExecuteInfo.classList.remove("animate-shiningW");
		btnExecuteInfo.classList.remove("animate-shiningI");

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
		if (win) {
			win._statisticInfo = s;
			const tid = myTab.getTabIdByWin(win)
			if (tid && !myTab.isTabVisible(tid)) {
				myTab.setAlert(tid);
				return;
			}
		}

		btnStatisticInfo.textContent = s;
	}

	//切换tab更新显示的信息
	function _onShowingTab(tid) {
		myTab.resetAlert(tid);
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
	/**@type{Map<string, Promise<MyTableDatal>>} */
	const _selectLists = new Map();
	/**
	 * 获取下拉列表
	 * @param {string} url 
	 * @returns {Promise<MyTableData>}
	 */
	function getSelectList(url) {
		if (url instanceof URL) url = url.toString();
		let p = _selectLists.get(url);
		if (p) return p;

		p = myHttpRequest("get", url, undefined, false, "json").then(req => {
			const mtd = req.response;
			if (mtd.error) throw mtd.error;
			return mtd;
		}).catch(error => {
			console.error(error);
			_selectLists.delete(url);
			throw error;
		});

		_selectLists.set(url, p);
		return p;
	}
	/*------------------------IndexdeDB---------------------------*/
	const DB_VERSION = 1;
	const DB_NAME = "myplm";
	const DB_STORE_ITEMIMGS = "itemimgs";
	function openDb() {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = (e) => {
			/**@type{IDBDatabase} */
			const db = e.target.result;
			db.createObjectStore(DB_STORE_ITEMIMGS);
		}
		return new Promise((res, rej) => {
			req.onsuccess = (e) => {
				res(e.target.result);
			}
			req.onerror = (e) => {
				rej(e.target.error);
			}
		});
	}

	/**
	 * @param {string} name
	 * @param {Blob|""} blob 
	 * @param {Date} lastFetchTime 
	 */
	function putItemImgIntoDb(name, blob, lastFetchTime) {
		const tran = myplmDb.transaction(DB_STORE_ITEMIMGS, "readwrite");
		const store = tran.objectStore(DB_STORE_ITEMIMGS);
		const req = store.put([blob, lastFetchTime], name);

		req.onsuccess = (e) => { };
		req.onerror = e => {
			console.log("put into db failed: ", e.target.error);
		};
	}

	/**
	 * @param {string} name 
	 * @returns {Promise<[Blob | "", Date]>}
	 * 有就返回值，没有就报错
	 */
	function getItemImgFromDb(name) {
		if (!myplmDb) return Promise.reject(new TypeError("myplmDb is null!"));
		const tran = myplmDb.transaction(DB_STORE_ITEMIMGS);
		const store = tran.objectStore(DB_STORE_ITEMIMGS);
		const req = store.get(name);
		return new Promise((res, rej) => {
			req.onsuccess = (e) => res(e.target.result);
			req.onerror = (e) => rej(e.target.error);
		});
	}

	/*------------------------物料图片---------------------------*/
	/**
	 * {Map<string, Promise<[URL, Date]>>}
	 */
	const itemImgsMap = new Map();

	/**
	 * 根据lastUpdateTime判断加载本地图片还是服务器图片，\
	 * 本地db保存的图片以最后一次读取服务器图片的时间为基准，\
	 * 如果lastUpdateTime比db的时间要新，就加载服务器图片，\
	 * 并更新本地db图片和时间
	 * @param {string} name 
	 * @param {Date} lastUpdateTime 必须是本地时间 如果是无效的时间将使用最小时间作为判定依据
	 * @returns {Promise<URL|"">}
	 */
	function getItemImg(name, lastUpdateTime) {
		if (!name) return Promise.resolve("");

		lastUpdateTime = new Date(lastUpdateTime);
		if (lastUpdateTime.getTime() === NaN) {
			lastUpdateTime = new Date(0);
		}

		if (!itemImgsMap.has(name)) {
			itemImgsMap.set(name,
				getItemImgFromDb(name).then(([blob, lastFetchTime]) => {
					if (lastFetchTime >= lastUpdateTime) {
						return [blob ? URL.createObjectURL(blob) : blob, lastFetchTime];
					} else {
						throw "";
					}
				}).catch(error => {
					const lastFetchTime = new Date();
					return getItemImgFromServer(name).then(blob => {
						putItemImgIntoDb(name, blob, lastFetchTime);
						return [blob ? URL.createObjectURL(blob) : blob, lastFetchTime];
					}, err => {
						itemImgsMap.delete(name);
					});
				})
			);
		}

		if (itemImgsMap.has(name)) {
			return itemImgsMap.get(name).then(([url, lastFetchTime]) => {
				if (lastFetchTime >= lastUpdateTime) return url;
				itemImgsMap.delete(name);
				return getItemImg(name, lastUpdateTime);
			});
		} else {
			return Promise.resolve("");
		}

	}

	/**
	 * 从服务器加载图片，如果文件不存在则返回""，其他错误将抛出错误
	 * @param {string} name 
	 * @returns {Promise<Blob|"">}
	 * @throws {Error}	  
	 */
	function getItemImgFromServer(name) {
		return myHttpRequest("get", `/myplm/item/img?img=${name}`, undefined, false, "blob").then(xhr => {
			return xhr.response;
		}, error => {
			if (error.reqStatusCode === 404) return ""
			throw error;
		});
	}

	/*----------------------------------------------------------*/
	function onLoad(e) {
		loadUserSetting();
	}

	async function onDomLoaded(e) {
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

		try {
			myplmDb = await openDb();
		} catch (error) {
			console.error(error);
		}

		document.addEventListener("keydown", e => {
			if (e.keyCode === 116) e.preventDefault();
		})
	}

	window.addEventListener('DOMContentLoaded', onDomLoaded);
	window.addEventListener("load", onLoad);

	return {
		get userId() {
			return userId
		},
		get myMenu() {
			return myMenu;
		},
		get myTab() {
			return myTab
		},
		saveTableSetting,
		getTableSetting,
		/**异步发送请求，如果响应的状态码不是200就弹出错误提示框*/
		myHttpRequest,
		/**打开新的tab窗口*/
		openNewPage,
		/**显示在中间有动画效果的信息*/
		showExecuteInfo,
		/**显示在左边固定长度的信息*/
		showStatisticInfo,
		/**获取下拉列表*/
		getSelectList,
		/**获取物料图片*/
		getItemImg,
	}
}
)());
