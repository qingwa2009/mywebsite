'use strict';
import { createWebSocket } from '../js/myUtil.js';
import MyMenu from "../js/components/myMenu/myMenu.js";

window.addEventListener('DOMContentLoaded', () => {
	const App = top.window.App;
	/**@type{MyMenu} */
	const myMenu = App.myMenu || document.createElement(MyMenu.TAG);
	myMenu.init();

	const wsurl = "/exportxb";
	const cmdExporting = "/exportxb/filelist?type=exporting";
	const cmdExported = "/exportxb/filelist?type=exported";
	const cmdDelete = "/exportxb/delete?file=";
	const cmdUpload = "/exportxb/upload?file="
	const cmdDownload = "/exportxb/download?file="

	const A = document.createElement("a");
	A.style.display = "none";
	document.body.appendChild(A);

	//---------------------右键菜单----------------------------
	const menu = [
		{ title: "下载", func: funcDownload, disabled: false },
		{ title: "删除", func: funcDelete, disabled: false },
	];

	myMenu.bindElementMenu(window, menu, 0, menuFilter, menuCloseCallback);

	function funcDownload(currentTarget, target, obj) {
		const filename = target.textContent;
		A.download = filename;
		const fn = encodeURI(filename);
		A.href = `${cmdDownload}${fn}`;
		A.click();
	}

	function funcDelete(currentTarget, target, obj) {
		if (confirm("删除：" + target.textContent + "？")) {
			reqDelFile(target.textContent);
		}
	}

	function menuFilter(/**@type{MouseEvent} */e) {
		const target = e.target;
		if (!(target instanceof HTMLLIElement)) return false;
		select(target);
		return true;
	}

	function menuCloseCallback(currentTarget, target) {
		unSelect(target);
	}


	//-------------------------------------------------------

	var emExporting = document.getElementById("exporting");
	var emExported = document.getElementById("exported");
	var emIsAssemblyPart = document.getElementById("isAssemblyPart");
	var emResultList = document.getElementById("resultList");
	document.getElementById("btnClearResult").addEventListener("click", () => {
		emResultList.innerHTML = "";
	});

	emExported.ondragover = function (e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "none";
	}

	emExporting.ondragover = function (e) {
		e.preventDefault();
		let types = e.dataTransfer.types;
		if (types.length > 0 && types[0].toUpperCase() === "FILES") {
			e.dataTransfer.dropEffect = "copy";
		} else {
			e.dataTransfer.dropEffect = "none";
		}

	}

	emExporting.ondrop = function (e) {
		e.preventDefault();
		for (let i = 0; i < e.dataTransfer.files.length; i++) {
			let f = e.dataTransfer.files[i];
			let ext = f.name.substr(f.name.lastIndexOf(".")).toUpperCase();
			if (ext !== ".SLDPRT" && ext !== ".SLDASM") {
				// 			App.showExecuteInfo("不是SolidWorks文件！", 1);
				alert(f.name + "\n不是SolidWorks文件！");
				continue;
			}
			upload(f);
		}

	}

	var worker = undefined;
	var pg = document.getElementById("pg");
	const uploadingFiles = new Map();
	function upload(file) {
		pg.value = 0;
		const fn = file.name.replace(/\s/ig, " ");//所有空白字符替换成空格，与后端保持一致
		if (worker === undefined) {
			worker = new Worker("./uploadFileWorker.js");
			worker.onmessage = (e) => {
				console.log(e.data);
				pg.value = Math.round(e.data.value);
				if (e.data.error) {
					addToResultList(e.data.filename, false);
					uploadingFiles.delete(e.data.filename);
					alert(e.data.error);
				} else if (e.data.EOF) {
					addToResultList(e.data.filename, true);
					refresh();
				}
			}
		}
		const fliename = emIsAssemblyPart.checked ? `AssemblyParts/${fn}` : fn;
		uploadingFiles.set(fliename, true);
		worker.postMessage({
			"file": file,
			"url": cmdUpload,
			"filename": fliename,
		});
	}

	function reqFileList(type) {
		App.myHttpRequest("GET", type, undefined).then(req => {
			// 			console.log(req);
			let list = JSON.parse(req.responseText);
			if (type === cmdExporting) {
				loadExporting(list);
			} else {
				loadExported(list);
			}
		}
		);
	}

	function reqDelFile(name) {
		App.myHttpRequest("GET", `${cmdDelete}${name}`, true).then(
			req => {
				refresh();
			}
		);
	}

	function loadExporting(list) {
		let ol = emExporting.getElementsByTagName("ol")[0];
		ol.innerHTML = "";
		for (let i = 0; i < list.length; i++) {
			let li = document.createElement("li");
			const fn = list[i];
			li.textContent = fn;
			if (uploadingFiles.has(fn)) {
				li.classList.add("myfile");
			}
			ol.appendChild(li);
		}
	}

	const notifyList = new Map();
	function loadExported(list) {
		let ol = emExported.getElementsByTagName("ol")[0];
		ol.innerHTML = "";
		for (let i = 0; i < list.length; i++) {
			let li = document.createElement("li");
			const fnn = list[i];
			li.textContent = fnn;
			li.setAttribute("draggable", true);
			li.ondragstart = onDragStart;
			let fn = fnn.substr(0, fnn.length - 4);
			if (uploadingFiles.has(fn)) {
				// uploadingFiles.delete(fn);
				li.classList.add("myfile");
				if (!notifyList.has(fn)) {
					notifyList.set(fn, true);
					showNotification(`导出完成！`, `${fnn}导出完成！\n(请拖到桌面下载，或者右键下载！下载完记得右键删除！)`);
				}
			}
			ol.appendChild(li);
		}
	}

	function showNotification(title, body) {
		if (!window.Notification) return;
		if (window.Notification.permission === "denied") return;

		if (window.Notification.permission === "granted") {
			new Notification(title, { body });
		} else {
			window.Notification.requestPermission().then((permission) => {
				if (permission === "granted") new Notification(title, { body });
			})
		}
	}

	function onDragStart(e) {
		let url = getTransferDataURL(e.target.textContent);
		e.dataTransfer.setData("DownloadURL", url);
	}

	function getTransferDataURL(file) {
		return `application/file:${file}:${top.location.origin}${cmdDownload}${file}`;
	}




	let ws = null;

	function refresh() {
		reqFileList(cmdExporting);
		reqFileList(cmdExported);
		if (ws === null || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
			reconnectWebSocket();
		}
	}

	function addToResultList(name, isSuccess) {
		const li = document.createElement("li");
		li.classList.add(isSuccess ? "infook" : "infofail");
		li.textContent = `${name} ${isSuccess ? "-->上传成功" : "-->上传失败"}`;
		emResultList.appendChild(li);
		li.scrollIntoView();
	}

	function reconnectWebSocket() {
		ws = createWebSocket(window, wsurl, "json");
		ws.onclose = e => {
			alert(`导出X_T实时更新列表连接已关闭：${e.reason}\n请关闭该页面后重新打开！`);
		}
		ws.onmessage = e => {
			console.log(e);
			refresh();
		}
	}

	function select(em) {
		em.attributes.setNamedItem(document.createAttribute("selected"));
	}

	function unSelect(em) {
		em.attributes.removeNamedItem("selected");
	}

	refresh();
	// 	setInterval(refresh, 3000);
}
);
