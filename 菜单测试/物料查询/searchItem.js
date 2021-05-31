"use strict";
import MyMemu from "../../components/myMenu/myMenu.js";
import MyTable from "../../components/myTable/myTable.js"
import MyTableData from "../../components/myTable/MyTableData.js"
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
	};
	getElementByKeys(ems);

	const colors = {
		"有效": "lightgreen",
		"失效": "pink",
		"待定": "yellow",
	}

	let _offset = 0;
	let _EOF = true;
	ems.btnSearch.addEventListener("click", ev => {
		ev.preventDefault();

		ems.tbSelectItems.clearTable();
		_offset = 0;
		ems.btnSearch.disabled = true;
		loadTableData(true);
	});

	ems.tbSelectItems.addScrollBottomEvent(() => {
		if (_EOF) return;
		ems.btnSearch.disabled = true;
		loadTableData(false);
	});

	ems.tbSelectItems.addSelectionChangedEvent((rs) => {
		console.log(`选中${rs.length}条记录`);
	});

	function loadTableData(clear) {
		App.myHttpRequest("get", cmdSelectItems + _offset).then((/**@type{XMLHttpRequest} */req) => {
			/**@type{MyTableData} */
			const mtd = JSON.parse(req.responseText);
			MyTableData.decorate(mtd);
			if (mtd.error) throw new Error(mtd.error);

			ems.tbSelectItems.setTableData(mtd, clear, eachAddRow);
			_EOF = mtd.EOF;
			_offset += mtd.data.length;
			console.log(`共查到${mtd.totalCount}条记录，已加载${_offset}条记录！`);

		}).catch(err => {
			alert(err.message);
		}).finally(() => {
			ems.btnSearch.disabled = "";
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

		ct.textContent = new Date(parseInt(ct.textContent)).toLocaleString();
		ut.textContent = new Date(parseInt(ut.textContent)).toLocaleString();
	}

});
