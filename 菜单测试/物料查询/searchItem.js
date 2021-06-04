"use strict";
import MyDbFieldComps from "../../js/myDbFieldComps.js";
import MyMemu from "../../js/components/myMenu/myMenu.js";
import MyTable from "../../js/components/myTable/myTable.js"
import MyTableData from "../../js/myTableData.js"
import { getElementByKeys } from "../../js/myUtil.js";

window.addEventListener('DOMContentLoaded', () => {
	const App = top.window.App;
	/**@type{MyMemu} */
	const myMenu = App.myMenu;
	const origin = top.location.origin;				// http://127.0.0.1
	const host = top.location.host;					// 127.0.0.1
	const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1
	const cmdSelectItems = "/myplm/selectItems?offset=";


	const ems = {
		/**@type{HTMLElement} */
		btnSearch: 0,
		/**@type{MyTable} */
		tbSelectItems: 0,
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

		ems.tbSelectItems.clearTable();

		_offset = 0;
		_orderby = null;
		_order = null;

		search(true);
	});

	ems.tbSelectItems.setSortFilter((td) => {
		if (_isSearching) return null;

		if (_EOF) return ems.tbSelectItems.getDefaultSortFunc(td);

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

	ems.tbSelectItems.addScrollBottomEvent(() => {
		if (_isSearching) return;
		if (_EOF) return;
		search(false);
	});

	ems.tbSelectItems.addSelectionChangedEvent((rs) => {
		App.showExecuteInfo(`选中${rs.length}条记录`, undefined, window);
	});

	ems.tbSelectItems.addDbClickRowEvent((tr) => {
		ems.tbSelectItems.get
		console.log(tr, ems.tbSelectItems.getCellValue("物料编号", tr));
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

		const criteria = MyDbFieldComps.createCriteria(ems.fields);

		if (_orderby) {
			criteria.addOrderBy(_orderby, _order);
		}

		if (clear) ems.tbSelectItems.clearTable();

		const st = new Date().getTime();
		App.myHttpRequest("post", cmdSelectItems + _offset, criteria.toString()).then((/**@type{XMLHttpRequest} */req) => {
			/**@type{MyTableData} */
			const mtd = JSON.parse(req.responseText);
			MyTableData.decorate(mtd);
			if (mtd.error) throw new Error(mtd.error);

			ems.tbSelectItems.setTableData(mtd, clear, eachAddRow);
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

		ct.textContent = new Date(ct.textContent + "Z").toLocaleString();
		ut.textContent = new Date(ut.textContent + "Z").toLocaleString();
	}

});
