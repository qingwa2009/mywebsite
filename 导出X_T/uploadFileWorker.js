'use strict';
onmessage = function (oEvent) {
	var dt = oEvent.data;
	var f = dt.file;
	var url = dt.url;
	var filename = dt.filename;
	var xhr = new XMLHttpRequest();

	xhr.open("POST", url, true);
	xhr.setRequestHeader("File-Name", encodeURI(filename));
	xhr.upload.onprogress = (e) => {
		if (e.lengthComputable) {
			let pc = e.loaded / e.total * 100;
			console.log(`已上传：${pc}`);
			postMessage({ "value": pc, "EOF": false, "filename": filename });
		}
	}
	xhr.upload.onload = (e) => {
		// 		console.log(xhr);
		// 		postMessage({"value":100,"EOF":true});
		console.log(`上传已完成`);
	}
	xhr.upload.onerror = (e) => {
		console.log("上传失败：", e);
	}
	xhr.onload = () => {
		if (xhr.status == 200) {
			postMessage({ "value": 100, "EOF": true, "filename": filename });
		} else {
			postMessage({ "value": 0, "error": "服务器：\n" + xhr.responseText, "filename": filename });
		}
	}
	xhr.onerror = () => {
		postMessage({ "value": 0, "error": "请求错误！无法连接到服务器！", "filename": filename });
	}
	xhr.send(f);
}
