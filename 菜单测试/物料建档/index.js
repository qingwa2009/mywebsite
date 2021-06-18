"use strict";
import MyDbFieldComps from "../../js/myDbFieldComps.js";
import MyDbCriteria from "../../js/myDbCriteria.js";
import { enumAllChildren } from "../../js/myUtil.js";
// import MyMemu from "../../js/components/myMenu/myMenu.js";
import MyTable from "../../js/components/myTable/myTable.js";
import MyTableData from "../../js/myTableData.js";
import MyInputFile from "../../js/components/myInputFile/myInputFile.js";
import { getElementByKeys } from "../../js/myUtil.js";

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

	const ems = {
		/**@type{MyDbFieldComps.MySelect} */
		t0: 0,
		/**@type{MyDbFieldComps.MySelect} */
		t1: 0,
		/**@type{MyDbFieldComps.MySelect} */
		t2: 0,
		/**@type{MyDbFieldComps.MySelect} */
		TYPE_NO: 0,
		/**@type{HTMLInputElement} */
		ITEM_NO: 0,
		/**@type{HTMLInputElement} */
		RD_NO: 0,
		/**@type{HTMLInputElement} */
		UPLOAD_IMG: 0,
		ITEM_NO: 0,
		/**@type{MyTable} */
		tbSearchItems: 0,
		/**@type{HTMLImageElement} */
		img: 0,
		/**@type{HTMLDivElement} */
		imgView: 0,
		/**@type{MyInputFile} */
		imgFile: 0,
		/**@type{HTMLButtonElement} */
		btnSearch: 0, btnAdd: 0, btnUpdate: 0, btnDel: 0,
		btnCancel: 0, btnConfirm: 0,
		btnCopy: 0, btnPaste: 0, btnImportFromExcel: 0,
	};
	getElementByKeys(ems);

	ems.imgFile.addOnChangeListener(fs => {
		ems.UPLOAD_IMG.value = fs.length > 0 ? fs[0].name : "";
	});

	ems.t0.addEventListener("change", () => {
		const value = ems.t0.value;
		if (!value) return;
		ems.t1.fieldRowFilter = id => id.length === 2 && id.substr(0, 1) === value;
		ems.t1.reloadList().then(() => {
			if (ems.t1._value) ems.t1.value = ems.t1._value;
			ems.t1._value = undefined;
		});
	});

	ems.t1.addEventListener("change", () => {
		const value = ems.t1._value;
		if (!value) return;
		ems.t2.fieldRowFilter = id => id.length === 3 && id.substr(0, 2) === value;
		ems.t2.reloadList().then(() => {
			if (ems.t2._value) ems.t2.value = ems.t2._value;
			ems.t2._value = undefined;
		});
	});

	ems.t2.addEventListener("change", () => {
		const value = ems.t2._value;
		if (!value) return;
		ems.TYPE_NO.fieldRowFilter = id => id.length === 4 && id.substr(0, 3) === value;
		ems.TYPE_NO.reloadList().then(() => {
			if (ems.TYPE_NO._value) ems.TYPE_NO.value = ems.TYPE_NO._value;
			ems.TYPE_NO._value = undefined;
		});
	});

	ems.tbSearchItems.addSelectionChangedEvent(rs => {
		if (rs.length > 0) {
			const tr = rs[rs.length - 1];
			const itemno = ems.tbSearchItems.getCellValue("物料编号", tr);
			currentRow = tr;
			loadItem(itemno);
		} else {
			currentRow = null;
			currentItem = null;
			setDisabled(ems.btnUpdate, ems.btnDel);
		}
	});

	ems.btnCancel.addEventListener("click", () => {
		setStateNormal();
		if (currentItem) {
			setCurrentItem(currentItem);
		}
		// const rs = ems.tbSearchItems.getSelectedRows();
		// if (rs.length > 0) {
		// 	ems.tbSearchItems.performSelectRow(rs[rs.length - 1], true);
		// }
	});

	ems.btnConfirm.addEventListener("click", () => {
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
	ems.btnSearch.addEventListener("click", () => {
		setStateSearch();
	});

	function setStateSearch() {
		currentState = states.search;

		setFormDisabled(false);
		setDisabled(ems.btnSearch, ems.btnAdd, ems.btnUpdate, ems.btnDel);
		setEnabled(ems.btnCancel, ems.btnConfirm);
		setDisabled(ems.btnCopy, ems.btnPaste, ems.btnImportFromExcel);

		const ignoreEms = [ems.t0, ems.t1, ems.t2, ems.TYPE_NO];
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
		if (ems.ITEM_NO.value.trim() || ems.RD_NO.value.trim()) {
			ignoreEms.push(...[ems.t0, ems.t1, ems.t2, ems.TYPE_NO,]);
		} else {
			if (ems.TYPE_NO.value) {
				ignoreEms.push(...[ems.t0, ems.t1, ems.t2]);
			} else if (ems.t2.value) {
				ignoreEms.push(...[ems.t0, ems.t1]);
			} else if (ems.t1.value) {
				ignoreEms.push(ems.t0);
			}
		}
		const criteria = MyDbFieldComps.createCriteria(document.forms[0], ignoreEms);

		ems.tbSearchItems.clearTable();

		const st = new Date().getTime();
		return App.myHttpRequest("post", cmdSearchItems + _offset, criteria.toString(), true, "json").then((/**@type{XMLHttpRequest} */req) => {

			const mtd = MyTableData.decorate(req.response);
			if (mtd.error) throw new Error(mtd.error);

			ems.tbSearchItems.setTableData(mtd, clear, eachAddRow);
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
	function searchItemNo(itemno) {
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
	}
	function eachAddRow(/**@type{HTMLTableRowElement} */tr, /**@type{Object<string, HTMLTableCellElement>} */dt) {
		const cell = dt["状态"];
		const cell2 = dt["研发编号"];
		const st = dt["状态"].textContent;
		const bk = colors[st] ? colors[st] : "";
		cell.style.backgroundColor = bk;
		cell2.style.backgroundColor = bk;
		cell.style.color = "black";
		cell2.style.color = "black";

		const ct = dt["创建时间"];
		const ut = dt["更新时间"];

		const createTime = new Date(ct.textContent + "Z");
		const lastUpdateTime = new Date(ut.textContent + "Z");
		ct.textContent = createTime.toLocaleString();
		ut.textContent = lastUpdateTime.toLocaleString();
	}


	/**-----------insert-------------- */
	ems.btnAdd.addEventListener("click", () => {
		alert("还没写！");
	});

	/**-----------update-------------- */
	ems.btnUpdate.addEventListener("click", () => {
		if (!currentItem || !currentRow) return;
		if (ems.tbSearchItems.getSelectedRows().length < 1) return;

		setStateUpdate();
	});

	function setStateUpdate() {
		currentState = states.update;

		setFormDisabled(false);
		setDisabled(ems.t0, ems.t1, ems.t2, ems.TYPE_NO, ems.ITEM_NO);
		setDisabled(ems.btnSearch, ems.btnAdd, ems.btnUpdate, ems.btnDel, ems.tbSearchItems);
		setEnabled(ems.btnCancel, ems.btnConfirm);
		setDisabled(ems.btnCopy, ems.btnPaste, ems.btnImportFromExcel);
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

		if (ems.imgFile.files.length > 0) {
			const url = new URL(cmdItemImg, location);
			url.searchParams.append("itemno", itemno);
			url.searchParams.append("img", ems.imgFile.files[0].name);
			p = App.myHttpRequest("post", url, ems.imgFile.files[0], true);
		}

		p.then(() => {

			App.myHttpRequest("post", cmdUpdateItem, JSON.stringify(obj), true, "json").then(req => {
				setCurrentItem(req.response);
				searchItemNo(itemno).then(mtd => {
					ems.tbSearchItems.updateRow(currentRow, mtd, eachAddRow);
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
	ems.btnDel.addEventListener("click", () => {
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
		ems.t0.value = currentItem.TYPE_NO.substr(0, 1);
		ems.t1._value = currentItem.TYPE_NO.substr(0, 2);
		ems.t2._value = currentItem.TYPE_NO.substr(0, 3);
		ems.TYPE_NO._value = currentItem.TYPE_NO;

		ems.t0.dispatchEvent(evchange);
		ems.t1.dispatchEvent(evchange);
		ems.t2.dispatchEvent(evchange);

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
	}

	function loadImg(imgName, lastUpdateTime) {
		ems.img.src = "";

		let s = imgName;
		if (s) s = s.trim().toUpperCase();
		if (s) {
			ems.imgView.classList.add("loading");
			App.getItemImg(s, lastUpdateTime).then((blobUrl) => {
				ems.imgView.classList.remove("loading");
				if (blobUrl) ems.img.src = blobUrl;
			});
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
		ems.UPLOAD_IMG.disabled = true;
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

		setEnabled(ems.btnSearch, ems.btnAdd, ems.tbSearchItems);
		if (ems.tbSearchItems.getSelectedRows().length > 0) {
			setEnabled(ems.btnUpdate, ems.btnDel);
		} else {
			setDisabled(ems.btnUpdate, ems.btnDel);
		}
		setDisabled(ems.btnCancel, ems.btnConfirm);
		setDisabled(ems.btnCopy, ems.btnPaste, ems.btnImportFromExcel);
	}





	function setStateFetching() {
		currentState = states.fetching;

		setFormDisabled(true);
		setDisabled(ems.btnSearch, ems.btnAdd, ems.btnUpdate, ems.btnDel);
		setDisabled(ems.btnCancel, ems.btnConfirm);
		setDisabled(ems.btnCopy, ems.btnPaste, ems.btnImportFromExcel);
	}



	setStateNormal();

	let itemno = new URLSearchParams(location.search).get("itemno");
	if (itemno) {
		ems.ITEM_NO.value = itemno;
		searchItem().then(() => {
			const n = ems.tbSearchItems.rows.length;
			if (n > 0) {
				const tr = ems.tbSearchItems.rows[n - 1];
				ems.tbSearchItems.performSelectRow(tr, true);
			}
		});
	}


});
