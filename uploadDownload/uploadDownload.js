'use strict';

window.addEventListener('DOMContentLoaded', function () {
	const cmd = "/uploadDownload";
	const f = document.getElementById("upload");
	const pg = document.getElementById("pg");
	const list = document.getElementById("list");
	document.forms[0].onsubmit = handleOnSubmit;
	list.addEventListener("click", handleOnItemClick, true);




	async function handleOnSubmit(ev) {
		ev.preventDefault();
		if (f.files.length < 1) {
			alert("请先选择要上传的文件！");
			return;
		}

		try {
			await uploadFileAsync(f.files[0], location.origin + cmd, pg);
			alert("上传成功！");
			updateFileList();
			pg.value = 0;
			f.value = "";
		} catch (e) {
			alert(e);
		}
	}


	function uploadFileAsync(file, url, progress) {
		return new Promise(function (res, rej) {
			const xhr = new XMLHttpRequest();
			let speed = document.createAttribute("speed");
			let startTime = Date.now();
			let loadedbs = 0;
			xhr.open("POST", url, true);
			xhr.setRequestHeader("File-Name", encodeURI(file.name));
			xhr.upload.onprogress = function (e) {
				if (e.lengthComputable) {
					let pc = Math.round(e.loaded / e.total * 100);
					progress.value = pc;

					let dt = (Date.now() - startTime) / 1000;

					let bkm = "b";
					let dbs = e.loaded - loadedbs;

					let timeleft = Math.round((e.total - e.loaded) / dbs * dt);
					let t = `${timeleft % 60}s`;
					timeleft = Math.floor(timeleft / 60);
					if (timeleft > 0) {
						t = `${timeleft % 60}m${t}`;
					}
					timeleft = Math.floor(timeleft / 60);
					if (timeleft > 0) {
						t = `${timeleft}h${t}`;
					}

					let second = timeleft

					if (dbs > 1024) {
						dbs /= 1024;
						bkm = "Kb";
					}
					if (dbs > 1024) {
						dbs /= 1024;
						bkm = "Mb";
					}

					speed.value = `${Math.round(dbs / dt * 100) / 100}${bkm}/s 时间${t}`;
					progress.attributes.setNamedItem(speed);
					loadedbs = e.loaded;
					startTime = Date.now();
				}
			}
			// 			xhr.onloadstart=function(e){
			// 				console.log("onloadstart", xhr);
			// 			}
			// 			xhr.onabort=function(e){
			// 				console.log('onabort', xhr);
			// 			}
			// 			xhr.onloadend=function(e){
			// 				console.log('onloadend', xhr);
			// 			}
			// 			xhr.ontimeout=function(e){
			// 				console.log('ontimeout', xhr);
			// 			}
			xhr.upload.onload = function (e) {
				console.log(`上传成功！`);
				progress.value = 100;
				// 				res();
			}

			xhr.upload.onerror = function (e) {
				console.log("上传失败：", e);
				progress.value = 0;
				rej("上传失败: " + xhr.responseText);
			}

			xhr.onload = function () {
				if (xhr.status == 200) {
					progress.value = 100;
					res();
				} else {
					progress.value = 0;
					rej("服务器：\n" + xhr.responseText);
				}
			}
			xhr.onerror = function (e) {
				rej("请求错误！无法连接到服务器！");
			}
			xhr.send(file);
		}
		);

	}

	function getFileListAsync() {
		let url = location.origin + cmd;
		return new Promise(function (res, rej) {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.onload = function () {
				if (xhr.status == 200) {
					res(JSON.parse(xhr.responseText));
				} else {
					rej("请求错误！服务器：\n" + xhr.responseText);
				}
			}
			xhr.onerror = function () {
				rej("请求错误！无法连接到服务器！");
			}
			xhr.send();
		}
		);
	}

	function delFileAsync(filename) {
		let url = `${location.origin}${cmd}?del=${encodeURIComponent(filename)}`;
		return new Promise(function (res, rej) {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.onload = function () {
				if (xhr.status == 200) {
					res();
				} else {
					rej("请求错误！服务器：\n" + xhr.responseText);
				}
			}
			xhr.onerror = function () {
				rej("请求错误！无法连接到服务器！");
			}
			xhr.send();
		}
		);
	}

	function handleOnItemClick(e) {
		var target = e.target;
		var isDel = target.classList.contains("del");
		while (target) {
			if (target instanceof HTMLLIElement) break;
			else target = target.parentElement;
		}

		if (!target) return;
		let s = isDel ? "删除" : "下载";
		if (!confirm(`${s}“${target.dataset.filename}”?`)) return;
		if (isDel)
			delFile(target.dataset.filename);
		else
			downloadFile(target.dataset.filename);
	}

	var download = null;
	function downloadFile(filename) {
		if (download === null) {
			download = document.createElement("a");
			download.style.display = "none";
			document.body.appendChild(download);
		}

		download.download = filename;
		const fn = encodeURIComponent(filename);
		// 		download.href=`${cmd}/?file=${fn}`;		
		download.href = `${cmd}/${fn}?file=${fn}`;//兼容不支持download属性的浏览器	
		download.click();
	}

	async function delFile(filename) {
		try {
			await delFileAsync(filename);
			console.log(`${filename} deleted!`);
			let em = list.querySelector(`li[data-filename='${filename}']`);
			if (em) em.remove();
		} catch (e) {
			alert(e);
		}
	}

	async function updateFileList() {
		try {
			let fs = await getFileListAsync();

			const arr = [];
			for (let i = 0; i < fs.length; i++) {
				arr.push(`
				<li data-filename='${fs[i][0]}'>
					<label>${fs[i][0]}</label>
					<label>${fs[i][1]}</label>
					<label>${fs[i][2]}</label>
					<label class="del">❌</label>
				</li>`);
			}
			list.innerHTML = arr.join("");
		} catch (e) {
			alert(e);
		}
	}


	updateFileList();
}
);
