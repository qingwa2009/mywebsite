"use strict";
import MyDbFieldComps from "../../js/myDbFieldComps.js";
import MyDbCriteria from "../../js/myDbCriteria.js";
import { enumAllChildren } from "../../js/myUtil.js";
// import MyMemu from "../../js/components/myMenu/myMenu.js";
import MyTable from "../../js/components/myTable/myTable.js";
import MyTableData from "../../js/myTableData.js";
import MyInputFile from "../../js/components/myInputFile/myInputFile.js";
import { getElementsById } from "../../js/myUtil.js";

window.addEventListener('DOMContentLoaded', () => {
	const App = top.window.App;
	/**@type{MyMemu} */
	// const myMenu = App.myMenu;
	const origin = top.location.origin;				// http://127.0.0.1
	const host = top.location.host;					// 127.0.0.1
	const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1

	const cmdSearchItems = "/myplm/item/search?offset=";
	const cmdSelectItem = "/myplm/item/select";
	const cmdUpdateItem = "/myplm/item/update";
	const cmdInsertItem = "/myplm/item/insert";
	const cmdDeleteItem = "/myplm/item/delete";
	const cmdItemImg = "/myplm/item/img";
	const cmdItemDoc = "/myplm/item/doc";

	const states = {
		normal: 0,
		fetching: 1,
		search: 2,
		insert: 3,
		update: 4,
		delete: 5,
	}
	let currentState = undefined;
	/**@type{Object<string, any>} */
	let currentItem = null;
	/**@type{HTMLTableRowElement} */
	let currentRow = null;

	const {
		/**@type{MyDbFieldComps.MySelect} */
		t0,
		/**@type{MyDbFieldComps.MySelect} */
		t1,
		/**@type{MyDbFieldComps.MySelect} */
		t2,
		/**@type{MyDbFieldComps.MySelect} */
		TYPE_NO,
		/**@type{HTMLInputElement} */
		ITEM_NO,
		/**@type{HTMLInputElement} */
		RD_NO,
		/**@type{HTMLInputElement} */
		UPLOAD_IMG,
		/**@type{MyTable} */
		tbSearchItems,
		/**@type{MyTable} */
		tbItemDoc,
		/**@type{HTMLImageElement} */
		img,
		/**@type{HTMLDivElement} */
		imgView,
		/**@type{MyInputFile} */
		imgFile,
		/**@type{HTMLButtonElement} */
		btnSearch, btnAdd, btnUpdate, btnDel,
		btnCancel, btnConfirm,
		btnCopy, btnPaste, btnImportFromExcel,
	} = getElementsById(document);

	imgFile.addOnChangeListener(fs => {
		UPLOAD_IMG.value = fs.length > 0 ? fs[0].name : "";
	});

	t0.addEventListener("change", () => {
		const value = t0.value;
		if (!value) return;
		t1.fieldRowFilter = id => id.length === 2 && id.substr(0, 1) === value;
		t1.reloadList().then(() => {
			if (t1._value) t1.value = t1._value;
			t1._value = undefined;
		});
	});

	t1.addEventListener("change", () => {
		const value = t1.value;
		if (!value) return;
		t2.fieldRowFilter = id => id.length === 3 && id.substr(0, 2) === value;
		t2.reloadList().then(() => {
			if (t2._value) t2.value = t2._value;
			t2._value = undefined;
		});
	});

	t2.addEventListener("change", () => {
		const value = t2.value;
		if (!value) return;
		TYPE_NO.fieldRowFilter = id => id.length === 4 && id.substr(0, 3) === value;
		TYPE_NO.reloadList().then(() => {
			if (TYPE_NO._value) TYPE_NO.value = TYPE_NO._value;
			TYPE_NO._value = undefined;
		});
	});

	tbSearchItems.addSelectionChangedEvent(rs => {
		if (rs.length > 0) {
			const tr = rs[rs.length - 1];
			const itemno = tbSearchItems.getCellValue("物料编号", tr);
			currentRow = tr;
			loadItem(itemno);
		} else {
			currentRow = null;
			currentItem = null;
			setDisabled(btnUpdate, btnDel);
		}
	});

	btnCancel.addEventListener("click", () => {
		setStateNormal();
		if (currentItem) {
			setCurrentItem(currentItem);
		}
		// const rs = tbSearchItems.getSelectedRows();
		// if (rs.length > 0) {
		// 	tbSearchItems.performSelectRow(rs[rs.length - 1], true);
		// }
	});

	btnConfirm.addEventListener("click", () => {
		switch (currentState) {
			case states.search:
				searchItem();
				break;
			case states.update:
				updateItem();
				break;
			default:
				break;
		}
	});


	/**-----------search-------------- */
	btnSearch.addEventListener("click", () => {
		setStateSearch();
	});

	function setStateSearch() {
		currentState = states.search;

		setFormDisabled(false);
		setDisabled(btnSearch, btnAdd, btnUpdate, btnDel);
		setEnabled(btnCancel, btnConfirm);
		setDisabled(btnCopy, btnPaste, btnImportFromExcel);

		const ignoreEms = [t0, t1, t2, TYPE_NO];
		for (const em of enumAllChildren(document.forms[0])) {
			if ((em instanceof HTMLInputElement || em instanceof HTMLSelectElement) && (!ignoreEms.includes(em))) {
				if (em.setValue) em.setValue("");
			}
		}
	}

	let _isSearching = false;
	function searchItem() {
		if (_isSearching) return;
		_isSearching = true;

		setStateFetching();
		let clear = true;
		let _offset = 0;
		let _EOF = true;
		currentItem = null;
		currentRow = null;

		const ignoreEms = [];
		if (ITEM_NO.value.trim() || RD_NO.value.trim()) {
			ignoreEms.push(...[t0, t1, t2, TYPE_NO,]);
		} else {
			if (TYPE_NO.value) {
				ignoreEms.push(...[t0, t1, t2]);
			} else if (t2.value) {
				ignoreEms.push(...[t0, t1]);
			} else if (t1.value) {
				ignoreEms.push(t0);
			}
		}
		const criteria = MyDbFieldComps.createCriteria(document.forms[0], ignoreEms);

		tbSearchItems.clearTable();

		const st = new Date().getTime();
		return App.myHttpRequest("post", cmdSearchItems + _offset, criteria.toString(), true, "json").then((/**@type{XMLHttpRequest} */req) => {

			const mtd = MyTableData.decorate(req.response);
			if (mtd.error) throw new Error(mtd.error);

			tbSearchItems.setTableData(mtd, clear, eachAddRow);
			_EOF = mtd.EOF;
			_offset += mtd.data.length;

			const s = mtd.totalCount <= _offset ? "已完全加载" : `已加载${_offset}条记录`;
			App.showStatisticInfo(`共查到${mtd.totalCount}条记录，${s}，耗时${(new Date().getTime() - st) / 1000}s！`, window);
		}).catch(err => {
			alert(err.message);
		}).finally(() => {
			setStateNormal();
			_isSearching = false;
		});
	}

	/**
	 * 精确查找物料
	 * @param {string} itemno 
	 * @returns {Promise<MyTableData | void>}
	 */
	function searchByItemNo(itemno) {
		let _offset = 0;

		const criteria = new MyDbCriteria();
		criteria.addWhere("ITEM_NO", "=", itemno);

		return App.myHttpRequest("post", cmdSearchItems + _offset, criteria.toString(), false, "json").then((/**@type{XMLHttpRequest} */req) => {
			const mtd = MyTableData.decorate(req.response);
			if (mtd.error) throw new Error(mtd.error);
			return mtd;
		}).catch(err => {
			console.log(err);
		});
	}

	const colors = {
		"有效": "lightgreen",
		"失效": "pink",
		"待定": "yellow",
		"临时": "lightgray",
		"0": "pink",
		"1": "lightgreen",
	}

	function eachAddRow(/**@type{HTMLTableRowElement} */tr, /**@type{Object<string, HTMLTableCellElement>} */dt) {
		const colorCells = ["状态", "研发编号"];

		const st = dt["状态"].textContent;
		const bk = colors[st] ? colors[st] : "";

		for (const name of colorCells) {
			const cell = dt[name];
			cell.style.backgroundColor = bk;
			cell.style.color = "black";
		}

		const localTimeCells = ["创建时间", "更新时间"];
		for (const name of localTimeCells) {
			const cell = dt[name];
			const date = new Date(cell.textContent + "Z");
			cell.textContent = date.toLocaleString();
		}
	}


	/**-----------insert-------------- */
	btnAdd.addEventListener("click", () => {
		alert("还没写！");
	});

	/**-----------update-------------- */
	btnUpdate.addEventListener("click", () => {
		if (!currentItem || !currentRow) return;
		if (tbSearchItems.getSelectedRows().length < 1) return;

		setStateUpdate();
	});

	function setStateUpdate() {
		currentState = states.update;

		setFormDisabled(false);
		setDisabled(t0, t1, t2, TYPE_NO, ITEM_NO);
		setDisabled(btnSearch, btnAdd, btnUpdate, btnDel, tbSearchItems);
		setEnabled(btnCancel, btnConfirm);
		setDisabled(btnCopy, btnPaste, btnImportFromExcel);
	}

	function updateItem() {
		const obj = MyDbFieldComps.createJSON(document.forms[0]);
		const itemno = obj.ITEM_NO;
		if (itemno !== currentItem.ITEM_NO || obj.TYPE_NO !== currentItem.TYPE_NO) {
			alert("不能修改物料编号！");
			return;
		}
		delete obj.t0;
		delete obj.t1;
		delete obj.t2;

		let p = Promise.resolve();

		if (imgFile.files.length > 0) {
			const url = new URL(cmdItemImg, location);
			url.searchParams.append("itemno", itemno);
			url.searchParams.append("img", imgFile.files[0].name);
			p = App.myHttpRequest("post", url, imgFile.files[0], true);
		}

		p.then(() => {

			App.myHttpRequest("post", cmdUpdateItem, JSON.stringify(obj), true, "json").then(req => {
				setCurrentItem(req.response);
				searchByItemNo(itemno).then(mtd => {
					tbSearchItems.updateRow(currentRow, mtd, eachAddRow);
					setStateNormal();
				});
			}, error => {
				console.log(error);
			});
		}, error => {
			App.showExecuteInfo("图片上传失败！", 1);
		});
	}



	/**-----------delete-------------- */
	btnDel.addEventListener("click", () => {
		alert("还没写！");
	});

	function loadItem(itemno) {
		setStateFetching();

		const url = new URL(cmdSelectItem, location);
		url.searchParams.append("itemno", itemno);
		App.myHttpRequest("get", url, undefined, true, "json").then(req => {
			setCurrentItem(req.response);
		}).finally(() => {
			setStateNormal();
		});
	}

	function setCurrentItem(json) {
		currentItem = json;

		const evchange = new Event("change");
		t0.value = currentItem.TYPE_NO.substr(0, 1);
		t1._value = currentItem.TYPE_NO.substr(0, 2);
		t2._value = currentItem.TYPE_NO.substr(0, 3);
		TYPE_NO._value = currentItem.TYPE_NO;

		t0.dispatchEvent(evchange);
		t1.dispatchEvent(evchange);
		t2.dispatchEvent(evchange);

		imgFile.clear();

		const ks = Object.keys(currentItem);
		for (let i = 0; i < ks.length; i++) {
			const k = ks[i];
			const em = document.forms[0][k];
			if (!em) continue;
			try {
				em.setValue(currentItem[k]);
			} catch (error) {
				console.error(error);
			}
		}

		loadImg(currentItem.UPLOAD_IMG, new Date(currentItem.UPDATE_TIME + "Z"));
		loadItemDoc(json.ITEM_NO);
	}

	function loadImg(imgName, lastUpdateTime) {
		img.src = "";

		let s = imgName;
		if (s) s = s.trim().toUpperCase();
		if (s) {
			imgView.classList.add("loading");
			App.getItemImg(s, lastUpdateTime).then((blobUrl) => {
				imgView.classList.remove("loading");
				if (blobUrl) img.src = blobUrl;
			});
		}
	}

	function loadItemDoc(itemno) {
		const url = new URL(cmdItemDoc, location);
		url.searchParams.append("itemno", itemno);
		tbItemDoc.setLoadingAnim();
		App.myHttpRequest("get", url, undefined, false, "json").then((/**@type{XMLHttpRequest} */req) => {
			const mtd = MyTableData.decorate(req.response);
			if (mtd.error) throw new Error(mtd.error);
			tbItemDoc.setTableData(mtd, true, eachItemDocRow);
			tbItemDoc.removeLoadingAnim();
		}).catch(err => {
			alert("图档加载失败！");
			console.log(err);
			tbItemDoc.removeLoadingAnim();
		});
	}

	function eachItemDocRow(/**@type{HTMLTableRowElement} */tr, /**@type{Object<string, HTMLTableCellElement>} */dt) {
		const colorCells = ["状态"];

		const st = dt["状态"].textContent;
		const bk = colors[st] ? colors[st] : "";

		for (const name of colorCells) {
			const cell = dt[name];
			cell.style.backgroundColor = bk;
			cell.style.color = "black";
		}

		const localTimeCells = ["创建时间", "更新时间"];
		for (const name of localTimeCells) {
			const cell = dt[name];
			const date = new Date(cell.textContent + "Z");
			cell.textContent = date.toLocaleString();
		}
	}

	function setFormDisabled(b) {
		if (b)
			for (const em of enumAllChildren(document.forms[0])) {
				em.disabled = true;
			}
		else
			for (const em of enumAllChildren(document.forms[0])) {
				em.disabled = false;
			}
		UPLOAD_IMG.disabled = true;
	}

	function setEnabled(...ems) {
		for (const em of ems) {
			em.removeAttribute("disabled");
		}
	}

	function setDisabled(...ems) {
		for (const em of ems) {
			em.setAttribute("disabled", true);
		}
	}

	function setStateNormal() {
		currentState = states.normal;

		setFormDisabled(true);

		setEnabled(btnSearch, btnAdd, tbSearchItems);
		if (tbSearchItems.getSelectedRows().length > 0) {
			setEnabled(btnUpdate, btnDel);
		} else {
			setDisabled(btnUpdate, btnDel);
		}
		setDisabled(btnCancel, btnConfirm);
		setDisabled(btnCopy, btnPaste, btnImportFromExcel);
	}





	function setStateFetching() {
		currentState = states.fetching;

		setFormDisabled(true);
		setDisabled(btnSearch, btnAdd, btnUpdate, btnDel);
		setDisabled(btnCancel, btnConfirm);
		setDisabled(btnCopy, btnPaste, btnImportFromExcel);
	}



	setStateNormal();

	let itemno = new URLSearchParams(location.search).get("itemno");
	if (itemno) {
		ITEM_NO.value = itemno;
		searchItem().then(() => {
			const n = tbSearchItems.rows.length;
			if (n > 0) {
				const tr = tbSearchItems.rows[n - 1];
				tbSearchItems.performSelectRow(tr, true);
			}
		});
	}


});
