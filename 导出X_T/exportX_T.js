'use strict';
import { createWebSocket } from '../js/myUtil.js';
import MyMenu from "../components/myMenu/myMenu.js";

window.addEventListener('DOMContentLoaded', () => {
	const App = top.window.App;
	/**@type{MyMenu} */
	const myMenu = App.myMenu || document.createElement(MyMenu.TAG);
	myMenu.init();
	// 	const uploadURL = top.location.origin + "/upload";
	const downloadURL = top.location.origin + "/upload";
	const uploadURL = "/exportxb/upload";
	const _cmd = "/exportxb/filelist?type=";
	const wsurl = "/exportxb";
	const cmdExporting = _cmd + "exporting";
	const cmdExported = _cmd + "exported";
	const cmdDelete = _cmd + "delete";


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
		A.href = `${downloadURL}/${fn}`;
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
	function upload(file) {
		pg.value = 0;
		if (worker === undefined) {
			worker = new Worker("./uploadFileWorker.js");
			worker.onmessage = (e) => {
				console.log(e.data);
				pg.value = e.data.value.toFixed(0);
				// 				pg.dataset.percent = pg.value.toFixed(0) + "%";				
				if (e.data.error) {
					alert(e.data.error);
				} else if (e.data.EOF) {
					refresh();
				}
			}
		}
		worker.postMessage({
			"file": file,
			"url": uploadURL
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
		App.myHttpRequest("POST", cmdDelete, name, true).then(
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
			li.textContent = list[i];
			ol.appendChild(li);
		}
	}

	function loadExported(list) {
		let ol = emExported.getElementsByTagName("ol")[0];
		ol.innerHTML = "";
		for (let i = 0; i < list.length; i++) {
			let li = document.createElement("li");
			li.textContent = list[i];
			li.setAttribute("draggable", true);
			li.ondragstart = onDragStart;
			ol.appendChild(li);
		}
	}

	function onDragStart(e) {
		let url = getTransferDataURL(e.target.textContent);
		e.dataTransfer.setData("DownloadURL", url);
	}

	function getTransferDataURL(file) {
		return `application/file:${file}:${downloadURL}/${file}`;
	}




	let ws = null;

	function refresh() {
		reqFileList(cmdExporting);
		reqFileList(cmdExported);
		if (ws === null || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
			reconnectWebSocket();
		}
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
