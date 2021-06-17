"use strict";
import MyDbFieldComps from "../../js/myDbFieldComps.js";
// import MyMemu from "../../js/components/myMenu/myMenu.js";
import MyTable from "../../js/components/myTable/myTable.js"
import MyTableData from "../../js/myTableData.js"
import { getElementByKeys } from "../../js/myUtil.js";

window.addEventListener('DOMContentLoaded', () => {
	const App = top.window.App;
	/**@type{MyMemu} */
	// const myMenu = App.myMenu;
	const origin = top.location.origin;				// http://127.0.0.1
	const host = top.location.host;					// 127.0.0.1
	const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1
	const cmdSearchItems = "/myplm/item/search?offset=";


	const ems = {
		/**@type{HTMLElement} */
		btnSearch: 0,
		/**@type{MyTable} */
		tbSearchItems: 0,
		/**@type{HTMLElement} */
		fields: 0,
		/**@type{MyDbFieldComps.MySelect} */
		t0: 0,
		/**@type{MyDbFieldComps.MySelect} */
		t1: 0,
		/**@type{MyDbFieldComps.MySelect} */
		t2: 0,
		/**@type{MyDbFieldComps.MySelect} */
		t3: 0,
		ITEM_NO: 0,
		RD_NO: 0,
		ENG_ITEM_NO: 0,
	};
	getElementByKeys(ems);

	ems.t0.addEventListener("change", () => {
		const value = ems.t0.value;
		if (!value) return;
		ems.t1.fieldRowFilter = id => id.length === 2 && id.substr(0, 1) === value;
		ems.t1.reloadList();
		ems.t2.value = "";
		ems.t3.value = "";
	});

	ems.t1.addEventListener("change", () => {
		const value = ems.t1.value;
		if (!value) return;
		ems.t2.fieldRowFilter = id => id.length === 3 && id.substr(0, 2) === value;
		ems.t2.reloadList();
		ems.t3.value = "";
	});

	ems.t2.addEventListener("change", () => {
		const value = ems.t2.value;
		if (!value) return;
		ems.t3.fieldRowFilter = id => id.length === 4 && id.substr(0, 3) === value;
		ems.t3.reloadList();
	});


	const colors = {
		"有效": "lightgreen",
		"失效": "pink",
		"待定": "yellow",
	}

	let _offset = 0;
	let _EOF = true;
	let _orderby = null;
	let _order = null;
	let _isSearching = false;

	ems.btnSearch.addEventListener("click", ev => {
		ev.preventDefault();
		if (_isSearching) return;

		ems.tbSearchItems.clearTable();

		_offset = 0;
		_orderby = null;
		_order = null;

		search(true);
	});

	ems.tbSearchItems.setSortFilter((td) => {
		if (_isSearching) return null;

		if (_EOF) return ems.tbSearchItems.getDefaultSortFunc(td);

		if (_orderby === td.textContent) {
			_order = _order === "ASC" ? "DESC" : "ASC";
		} else {
			_orderby = td.textContent;
			_order = "ASC";
		}

		_offset = 0;

		search(true)
		return null;
	})

	ems.tbSearchItems.addScrollBottomEvent(() => {
		if (_isSearching) return;
		if (_EOF) return;
		search(false);
	});

	ems.tbSearchItems.addSelectionChangedEvent((rs) => {
		App.showExecuteInfo(`选中${rs.length}条记录`, undefined, window);
	});

	ems.tbSearchItems.addDbClickRowEvent((tr) => {
		const itemno = ems.tbSearchItems.getCellValue("物料编号", tr)
		const url = new URL("../物料建档/index.html", location.href);
		url.searchParams.append("itemno", itemno);
		App.openNewPage("物料建档", url);
	})

	document.addEventListener("keydown", e => {
		if (e.keyCode !== 116) return;
		e.preventDefault();
		ems.btnSearch.click();
	});

	function search(clear) {
		if (_isSearching) console.error("is searching when request to search!");

		_isSearching = true;

		ems.btnSearch.disabled = true;

		const ignoreEms = [];
		if (ems.ITEM_NO.value.trim() || ems.RD_NO.value.trim()) {
			ignoreEms.push(...[ems.t0, ems.t1, ems.t2, ems.t3,]);
		} else {
			if (ems.t3.value) {
				ignoreEms.push(...[ems.t0, ems.t1, ems.t2]);
			} else if (ems.t2.value) {
				ignoreEms.push(...[ems.t0, ems.t1]);
			} else if (ems.t1.value) {
				ignoreEms.push(ems.t0);
			}
		}
		const criteria = MyDbFieldComps.createCriteria(ems.fields, ignoreEms);

		if (_orderby) {
			criteria.addOrderBy(_orderby, _order);
		}

		if (clear) ems.tbSearchItems.clearTable();

		const st = new Date().getTime();
		App.myHttpRequest("post", cmdSearchItems + _offset, criteria.toString(), true, "json").then((/**@type{XMLHttpRequest} */req) => {
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
			ems.btnSearch.disabled = "";
			_isSearching = false;
		});
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

		const pt = dt["图片"];
		const img = document.createElement("img");
		img.width = 100;
		img.height = 100;
		pt.insertBefore(img, pt.firstChild);

		let s = pt.textContent;
		if (s) s = s.trim().toUpperCase();
		if (s) {
			pt.classList.add("loading");
			App.getItemImg(s, lastUpdateTime).then((blobUrl) => {
				pt.classList.remove("loading");
				if (blobUrl) img.src = blobUrl;
			});
		}
	}

});
