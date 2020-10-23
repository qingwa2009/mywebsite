'use strict';

window.addEventListener('DOMContentLoaded', ()=>{
	

	const App = top.window.App;
	const CommonFunc=top.window.CommonFunc;
	const myMenu = App.myMenu;
	const uploadURL = top.location.origin + "/upload";
	const downloadURL = top.location.origin + "/upload";
	const _cmd = "/filelist?type=";
	const cmdExporting = _cmd + "exporting";
	const cmdExported = _cmd + "exported";
	const cmdDelete= _cmd + "delete";

	const menuEnum = {"删除": 1};
	const funcMenu = function (context, target) {
		switch (this.id) {
			case menuEnum.删除:
				if(confirm("删除："+target.textContent+"？")){
					reqDelFile(target.textContent);	
				}				
				break;			
		}
	};
	const menu = [];
	Object.keys(menuEnum).map(t => {
		menu.push({id: menuEnum[t],	title: t, func: funcMenu, disabled: false})
	});

	var emExporting = document.getElementById("exporting");
	var emExported = document.getElementById("exported");

	emExported.ondragover = function(e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "none";

	}

	emExporting.ondragover = function(e) {
		e.preventDefault();
		let types = e.dataTransfer.types;
		if (types.length > 0 && types[0].toUpperCase() === "FILES") {
			e.dataTransfer.dropEffect = "copy";
		} else {
			e.dataTransfer.dropEffect = "none";
		}

	}

	emExporting.ondrop = function(e) {
		e.preventDefault();
		for(let i=0; i<e.dataTransfer.files.length;i++){
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
			worker = new Worker("/js/uploadFileWorker.js");
			worker.onmessage = (e)=>{
				console.log(e.data);
				pg.value = e.data.value.toFixed(0);
// 				pg.dataset.percent = pg.value.toFixed(0) + "%";				
				if (e.data.error) {
					alert(e.data.error);
				}else if(e.data.EOF){
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
		App.myHttpRequest("GET", type, undefined, true).then(req=>{
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

	function reqDelFile(name){
		App.myHttpRequest("POST", cmdDelete, name, true).then(
			req=>{
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
			li.ondragstart=onDragStart;
			ol.appendChild(li);
		}
	}

	function onDragStart(e) {
		let url = getTransferDataURL(e.target.textContent);
		e.dataTransfer.setData("DownloadURL", url);			
	}

	function getTransferDataURL(file){
		return `application/file:${file}:${downloadURL}/${file}`;
	}

	function handleContextMenu(e){
		e.preventDefault();
		var target = e.target;
		if(!(target instanceof HTMLLIElement)) return;
		let context = CommonFunc.getParent(target, HTMLFieldSetElement);
		myMenu.loadMenuItems(context, menu);
		myMenu.show(e, target, myMenu.TYPES.CONTEXTMENU);

	}

	window.addEventListener("contextmenu", handleContextMenu, true);
	
	let ws=null;

	function refresh(){
		reqFileList(cmdExporting);
		reqFileList(cmdExported);
		if(ws===null || ws.readyState===WebSocket.CLOSED || ws.readyState===WebSocket.CLOSING){
			reconnectWebSocket();
		}
	}
	
	function reconnectWebSocket(){
		ws=App.createWebSocket(window, "filelist");
		ws.onclose=e=>{
			alert(`导出X_T实时更新列表连接已关闭：${e.reason}\n请关闭该页面后重新打开！`);						
		}
		ws.onmessage=e=>{
			console.log(e);
			refresh();		
		}
	}

	refresh();
// 	setInterval(refresh, 3000);
}
);
