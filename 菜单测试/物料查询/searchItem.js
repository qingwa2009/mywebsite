"use strict";
import MyDbFieldComps from "../../js/myDbFieldComps.js";
// import MyMemu from "../../js/components/myMenu/myMenu.js";
import MyTable from "../../js/components/myTable/myTable.js"
import MyTableData from "../../js/myTableData.js"
import { getElementsById } from "../../js/myUtil.js";

window.addEventListener('DOMContentLoaded', () => {
	const App = top.window.App;
	/**@type{MyMemu} */
	// const myMenu = App.myMenu;
	const origin = top.location.origin;				// http://127.0.0.1
	const host = top.location.host;					// 127.0.0.1
	const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1
	const cmdSearchItems = "/myplm/item/search?offset=";


	const {
		/**@type{HTMLElement} */
		btnSearch,
		/**@type{MyTable} */
		tbSearchItems,
		/**@type{HTMLElement} */
		fields,
		/**@type{MyDbFieldComps.MySelect} */
		t0,
		/**@type{MyDbFieldComps.MySelect} */
		t1,
		/**@type{MyDbFieldComps.MySelect} */
		t2,
		/**@type{MyDbFieldComps.MySelect} */
		t3,
		ITEM_NO,
		RD_NO,
		ENG_ITEM_NO,
	} = getElementsById(document);

	t0.addEventListener("change", () => {
		const value = t0.value;
		if (!value) return;
		t1.fieldRowFilter = id => id.length === 2 && id.substr(0, 1) === value;
		t1.reloadList();
		t2.value = "";
		t3.value = "";
	});

	t1.addEventListener("change", () => {
		const value = t1.value;
		if (!value) return;
		t2.fieldRowFilter = id => id.length === 3 && id.substr(0, 2) === value;
		t2.reloadList();
		t3.value = "";
	});

	t2.addEventListener("change", () => {
		const value = t2.value;
		if (!value) return;
		t3.fieldRowFilter = id => id.length === 4 && id.substr(0, 3) === value;
		t3.reloadList();
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

	btnSearch.addEventListener("click", ev => {
		ev.preventDefault();
		if (_isSearching) return;

		tbSearchItems.clearTable();

		_offset = 0;
		_orderby = null;
		_order = null;

		search(true);
	});

	tbSearchItems.setSortFilter((td) => {
		if (_isSearching) return null;

		if (_EOF) return tbSearchItems.getDefaultSortFunc(td);

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

	tbSearchItems.addScrollBottomEvent(() => {
		if (_isSearching) return;
		if (_EOF) return;
		search(false);
	});

	tbSearchItems.addSelectionChangedEvent((rs) => {
		App.showExecuteInfo(`选中${rs.length}条记录`, undefined, window);
	});

	tbSearchItems.addDbClickRowEvent((tr) => {
		const itemno = tbSearchItems.getCellValue("物料编号", tr)
		const url = new URL("../物料建档/index.html", location.href);
		url.searchParams.append("itemno", itemno);
		App.openNewPage("物料建档", url);
	})

	document.addEventListener("keydown", e => {
		if (e.keyCode !== 116) return;
		e.preventDefault();
		btnSearch.click();
	});

	function search(clear) {
		if (_isSearching) console.error("is searching when request to search!");

		_isSearching = true;

		btnSearch.disabled = true;

		const ignoreEms = [];
		if (ITEM_NO.value.trim() || RD_NO.value.trim()) {
			ignoreEms.push(...[t0, t1, t2, t3,]);
		} else {
			if (t3.value) {
				ignoreEms.push(...[t0, t1, t2]);
			} else if (t2.value) {
				ignoreEms.push(...[t0, t1]);
			} else if (t1.value) {
				ignoreEms.push(t0);
			}
		}
		const criteria = MyDbFieldComps.createCriteria(fields, ignoreEms);

		if (_orderby) {
			criteria.addOrderBy(_orderby, _order);
		}

		if (clear) tbSearchItems.clearTable();

		const st = new Date().getTime();
		App.myHttpRequest("post", cmdSearchItems + _offset, criteria.toString(), true, "json").then((/**@type{XMLHttpRequest} */req) => {
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
			btnSearch.disabled = "";
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
