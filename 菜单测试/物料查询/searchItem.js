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
	const cmdSelectItems = "/myplm/selectItems";


	const ems = {
		/**@type{HTMLElement} */
		btnSearch: 0,
		/**@type{MyTable} */
		tbSelectItems: 0,
	};
	getElementByKeys(ems);
	ems.tbSelectItems.setRowHeight(100);
	const colors = {
		"有效": "lightgreen",
		"失效": "pink",
		"待定": "yellow",
	}
	ems.btnSearch.addEventListener("click", ev => {
		ev.preventDefault();
		ems.tbSelectItems.clearTable();
		App.myHttpRequest("get", cmdSelectItems).then((/**@type{XMLHttpRequest} */req) => {
			const mtd = JSON.parse(req.responseText);
			MyTableData.decorate(mtd);
			ems.tbSelectItems.setTableData(mtd, true, (tr, dt) => {
				const cell = dt["状态"];
				const cell2 = dt["研发编号"];
				const st = dt["状态"].textContent;
				const bk = colors[st] ? colors[st] : "";
				cell.style.backgroundColor = bk;
				cell2.style.backgroundColor = bk;
				cell.style.color = "black";
				cell2.style.color = "black";
			});
		}, err => {

		});
	})



});
