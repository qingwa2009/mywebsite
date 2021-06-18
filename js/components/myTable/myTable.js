"use strict";
import { round } from "../../myUtil.js";
import MyTableData from "../../myTableData.js";
import MyMenu from "../myMenu/myMenu.js";
/**@type{MyMenu} */
const myMenu = top.App ? top.App.myMenu : document.createElement(MyMenu.TAG);
myMenu.init();

/**求和 */
const sum = (arr) => arr.reduce((s, a) => s + (parseFloat(a) || 0), 0);

export default class MyTable extends HTMLElement {
    static TAG = "my-table";
    static SPLITTER_WIDTH = 8;
    static CLASS_DRAGLINDICATOR = "column-drag-left";
    static CLASS_DRAGRINDICATOR = "column-drag-right";
    /**可以给thead里面的td设置排序方式 */
    static ATTR_SORT_BY = "sortby";
    static ATTR_SORT_BY_NUM = "num";
    static ATTR_SORT_BY_ALPHA = "alpha";
    static ATTR_SORT_BY_ZH = "zh";
    static ATTR_ROW_HEIGHT = "rowheight";

    static SORT_FUNC_MAP = {
        [MyTable.ATTR_SORT_BY_ALPHA]: MyTable.FuncSortByAlpha,
        [MyTable.ATTR_SORT_BY_NUM]: MyTable.FuncSortByNum,
        [MyTable.ATTR_SORT_BY_ZH]: MyTable.FuncSortByZh,
    };
    static ATTR_SELECTED = "selected";
    static DEFAULT_ROW_HEIGHT = 24;

    constructor() {
        super();
        this.table = this.getElementsByTagName("table")[0] || document.createElement("table");
        this.thead = this.table.getElementsByTagName("thead")[0] || document.createElement("thead");
        this.headRow = this.thead.getElementsByTagName("tr")[0] || document.createElement("tr");
        this.tbody = this.table.getElementsByTagName("tbody")[0] || document.createElement("tbody");
        this.tbodyPlaceholder = document.createElement("div");

        this.table.id = "table";
        this.thead.id = "thead";
        this.headRow.id = "headrow";
        this.tbody.id = "tbody";
        this.tbodyPlaceholder.id = "tbodyplaceholder";

        this.thead.appendChild(this.headRow);
        this.table.appendChild(this.thead);
        this.tbody.appendChild(this.tbodyPlaceholder);
        this.table.appendChild(this.tbody);

        this.attachShadow({ mode: "open" });
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = new URL("myTable.css", import.meta.url);
        const style = document.createElement("style");

        this.shadowRoot.appendChild(link);
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this.table);

        /**@type{CSSStyleSheet} */
        this.colStylesheet = style.sheet;
        /**@type{CSSStyleRule[]} */
        this._colStyles = [];
        /**@type{HTMLTableCellElement} */
        this.lastClickCell = null;
        /**@type{HTMLTableRowElement} */
        this._lastSelected = null;

        /**@type{((rs:HTMLTableRowElement[])=>{})[]} */
        this._selectionChangeEvents = [];

        /**@type{HTMLTableRowElement[]} */
        this.rows = [];

        this._initHeadRow();
        this._initTableRows();

        this.headRow.addEventListener("mousedown", this._onHeadRowMouseDown.bind(this));
        this.headRow.addEventListener("dblclick", this._onHeadRowDbClick.bind(this));
        this.headRow.addEventListener("dragstart", this._onHeadRowDragStart.bind(this));
        this.headRow.addEventListener("click", this._onHeadRowClick.bind(this));

        this.tbody.addEventListener("mousedown", this._onTbodyMouseDown.bind(this));
        //用于初始化右键菜单，仅调用一次
        this.addEventListener("contextmenu", MyTable._onTableContextMenu, { once: true, capture: true });
        myMenu.bindElementMenu(this.headRow, MyTable.HeadRow_MenuItems, MyMenu.TYPES.CONTEXTMENU, MyTable._ContextMenuFilter);

        this.tbody.addEventListener("scroll", this._handleScroll.bind(this));
        if (ResizeObserver) {
            new ResizeObserver(this._handleResize.bind(this)).observe(this);
        } else {
            window.addEventListener("resize", this._handleResize.bind(this));
        }

        this.tbody.addEventListener("dblclick", this._handleDbClick.bind(this));


        this._preScrollTop = 0;

        this._rowHeight = -1;
        const rh = this.getAttribute(MyTable.ATTR_ROW_HEIGHT);
        this.setRowHeight(rh ? rh : MyTable.DEFAULT_ROW_HEIGHT, false);

        this._handleScroll();

        this._updatePlaceholderSize();
        this._updateRowsPosition();
        this._updateRowsVisibility();
    }

    _initHeadRow() {
        const cs = this.headRow.cells;
        const n = cs.length;
        for (let i = 0; i < n; i++) {
            const c = cs[i];
            if (!(c.nextSibling instanceof HTMLTableCellElement) && c.nextSibling) c.nextSibling.remove(); //移除空白的textnode
            const currWidth = getComputedStyle(c).width;
            const ind = this.colStylesheet.insertRule(`#table td:nth-of-type(${i + 1}){min-width:${currWidth};}`);
            this._colStyles.push(this.colStylesheet.cssRules[ind]);
            c.setAttribute("draggable", true);
        }
        this.loadSetting();
    }

    _initTableRows() {
        const rs = this.tbody.rows;
        const m = rs.length;
        for (let j = 0; j < m; j++) {
            const r = rs[j];
            const cs = r.cells;
            const n = cs.length;
            for (let i = 0; i < n; i++) {
                const c = cs[i];
                if (!(c.nextSibling instanceof HTMLTableCellElement) && c.nextSibling) c.nextSibling.remove(); //移除空白的textnode             
            }
            this.rows.push(r);
        }
    }

    _handleScroll() {
        this.headRow.style.left = `${-this.tbody.scrollLeft}px`;
        if (this._preScrollTop !== this.tbody.scrollTop) {
            this._preScrollTop = this.tbody.scrollTop;
            this._updateRowsVisibility();
            if (this.rows.length > 0 && this._preScrollTop + this.tbody.clientHeight >= this.tbody.scrollHeight) {
                this._raiseScrollBottomEvent();
            }
        }
    }

    /**
     * 添加滚动到末尾事件
     * @param {()=>{}} callback 
     */
    addScrollBottomEvent(callback) {
        if (!this._scrollBottomEvents) this._scrollBottomEvents = [];
        this._scrollBottomEvents.push(callback);
    }
    removeScrollBottomEvent(callback) {
        const i = this._scrollBottomEvents.indexOf(callback);
        if (i > -1) this._scrollBottomEvents.splice(i, 1);
    }

    _raiseScrollBottomEvent() {
        if (!this._scrollBottomEvents) return;
        for (let i = 0; i < this._scrollBottomEvents.length; i++) {
            this._scrollBottomEvents[i]();
        }
    }

    _handleDbClick(/**@type{MouseEvent} */e) {
        let tr = e.target;
        if (tr instanceof HTMLTableCellElement) tr = tr.parentElement;
        if (!(tr instanceof HTMLTableRowElement)) return;
        this._raiseDbClickRowEvent(tr);
    }

    /**
     * 添加双击行事件
     * @param {(tr:HTMLTableRowElement)=>{}} callback 
     */
    addDbClickRowEvent(callback) {
        if (!this._dbclickEvents) this._dbclickEvents = [];
        this._dbclickEvents.push(callback);
    }
    removeDbClickRowEvent(callback) {
        const i = this._dbclickEvents.indexOf(callback);
        if (i > -1) this._dbclickEvents.splice(i, 1);
    }

    _raiseDbClickRowEvent(/**@type{HTMLTableRowElement} */tr) {
        for (const cb of this._dbclickEvents) {
            cb(tr);
        }
    }

    _handleResize() {
        this._updatePlaceholderSize();
        this._updateRowsVisibility();
    }

    /**
     * @param {number} i 
     * @returns {number}
     */
    getColumnWidth(i) {
        // return this.getCellWidth(this.headRow.cells[i]);
        return parseInt(this._colStyles[i].style.minWidth);
    }

    /**
     * @param {HTMLTableCellElement} cell 
     * @returns {number}
     */
    getCellWidth(cell) {
        // return parseInt(window.getComputedStyle(cell).width);
        return this.getColumnWidth(cell.cellIndex);
    }

    /**
     * @param {number} i 
     * @param {number} width px
     * @param {boolean} update 是否立即更新滚动条，默认true
     */
    setColumnWidth(i, width, update = true) {
        const s = this._colStyles[i];
        if (s) {
            s.style.minWidth = `${width}px`;
            s.style.maxWidth = "";
        }
        if (update)
            this._updatePlaceholderSize();
    }

    /**
     * 获取所有行，包含标题行
     * @returns {HTMLTableRowElement[]}
     */
    getAllRows() {
        return [this.headRow, ...this.rows];
    }
    /**
     * @param {number} i 
     */
    setColumnAutoWidth(i) {
        // const s = this._colStyles[i];
        // if (s) {
        //     s.style.minWidth = `fit-content`;
        //     s.style.maxWidth = "unset";
        // }
        if (!MyTable._ctx) MyTable._ctx = document.createElement("canvas").getContext("2d");
        var rs = this.getAllRows();
        let ctx = MyTable._ctx;
        const st = getComputedStyle(rs[0].cells[i]);
        const add = parseInt(st.paddingLeft) + parseInt(st.paddingRight) + parseInt(st.borderLeft) + parseInt(st.borderRight);
        ctx.font = st.font;
        var width = 0;
        for (var j = 0; j < rs.length; j++) {
            var w = ctx.measureText(rs[j].cells[i].textContent).width + add;
            if (width < w) width = w;
        }
        ctx = null;
        width = Math.ceil(width);
        this.setColumnWidth(i, width);
    }

    /**     
     * @param {HTMLTableCellElement} td  
     */
    getColumnIndex(td) {
        return td.cellIndex;
    }


    /**
     * 获取所有列标题索引
     * @returns {Object<string, number>}
     */
    getAllColumnIndex() {
        const obj = {};
        const cs = this.headRow.cells;
        const n = cs.length;
        for (let i = 0; i < n; i++) {
            obj[cs[i].textContent] = i;
        }
        return obj;
    }

    /**
     * @param {string} columnName 
     */
    getColumnIndexByName(columnName) {
        const cs = this.headRow.cells;
        const n = cs.length;
        for (let i = 0; i < n; i++) {
            const c = cs[i];
            if (c.textContent === columnName) {
                return i;
            }
        }
        return -1;
    }



    /**
     * 获取单元格值
     * @param {string} columnName 列名
     * @param {HTMLTableRowElement} row 
     * @returns {string|undefined} 返回string，不存在返回undefined
     */
    getCellValue(columnName, row) {
        const i = this.getColumnIndexByName(columnName);
        if (i === -1) return undefined;
        return row.cells[i].textContent;
    }

    /**
     * 设置单元格值
     * @param {string} columnName 列名
     * @param {HTMLTableRowElement} row 
     * @param {string} value
     * @returns {boolean}
     */
    setCellValue(columnName, row, value) {
        const i = this.getColumnIndexByName(columnName);
        if (i === -1) return false;
        row.cells[i].textContent = value;
        return true;
    }

    /**
     * 判断表格是否矩形     
     */
    _isTableInvalid() {
        const n = this.headRow.cells.length;
        var rs = this.rows;
        for (var i = 0; i < rs.length; i++) {
            if (rs[i].cells.length !== n) return true;
        }
        return false;
    }

    /*-----------------------------标题改变宽度-------------------------------------------*/
    _onHeadRowMouseDown(/**@type{MouseEvent} */e) {
        if (e.button !== 0) return;
        const td = e.target;
        if (!(td instanceof HTMLTableCellElement)) return;
        const tr = e.currentTarget;

        const rect = td.getBoundingClientRect();
        if (rect.right - e.clientX <= MyTable.SPLITTER_WIDTH + 1) {
            this._handleSplitter(td, e);
            e.preventDefault();
        } else {
            this._headClicked = true;
        }
    }

    _onHeadRowClick(/**@type{MouseEvent} */e) {
        if (this._headClicked) {
            const td = e.target;
            if (!(td instanceof HTMLTableCellElement)) return;
            this.sort(td);
        }
        this._headClicked = false;
    }

    _onHeadRowDbClick(/**@type{MouseEvent} */e) {
        this._headClicked = false;

        var td = e.target;
        if (!(td instanceof HTMLTableCellElement)) return;
        const rect = td.getBoundingClientRect();
        if (rect.right - e.clientX > MyTable.SPLITTER_WIDTH + 1) return;
        this._handleSplitterDbLClick(td);
    }

    _handleSplitter(td, e) {
        var startx = e.clientX;
        var handlers = {
            mousemove: onMouseMove.bind(this),
            mouseup: onMouseUp.bind(this)
        }
        for (const et in handlers) {
            document.addEventListener(et, handlers[et], true);
        }

        function onMouseMove(e) {
            if (!e.buttons) {
                onMouseUp(e);
                return false;
            }

            if (startx === e.clientX) return;
            var nx = (2 * e.clientX - startx) - td.getBoundingClientRect().left;
            startx = e.clientX;
            if (nx > 0) {
                this.setColumnWidth(this.getColumnIndex(td), nx);
            }
            e.preventDefault();
            return false;
        }

        function onMouseUp(e) {
            for (const et in handlers) {
                document.removeEventListener(et, handlers[et], true);
            }
            handlers = null;
        }
    }
    _handleSplitterDbLClick(td) {
        this.setColumnAutoWidth(this.getColumnIndex(td));
    }

    /*-----------------------------------标题拖放----------------------------------------*/
    _onHeadRowDragStart(e) {
        this._headClicked = false;

        var td = e.target;
        if (!(td instanceof HTMLTableCellElement)) return;

        // console.log("dragStart:", e);
        e.dataTransfer.dropEffect = "move";
        var handlers = {
            dragenter: onDragEnter.bind(this),
            dragover: onDragOver.bind(this),
            dragleave: onDragLeave.bind(this),
            drop: onDrop.bind(this),
            dragend: onDragEnd.bind(this)
        }
        this.headRow.addEventListener("dragenter", handlers["dragenter"], true);
        this.headRow.addEventListener("drop", handlers["drop"], true);
        this.headRow.addEventListener("dragend", handlers["dragend"], true);
        var enterElement = null;
        var dragIndicator = "";
        function onDragEnter(e) {
            var tt = e.target;
            if (tt === td || tt.tagName !== td.tagName || !tt.draggable || tt.parentElement !== td.parentElement) return;
            // console.log("dragEnter", e.target.textContent);
            removeDragIndicator(enterElement, dragIndicator);
            enterElement = tt;
            this.headRow.addEventListener("dragover", handlers["dragover"], true);
            this.headRow.addEventListener("dragleave", handlers["dragleave"], true);
        }

        function onDragOver(e) {
            // console.log("dragOver", e.target.textContent);
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const newIndicator = getDragIndicator(enterElement, e);
            if (dragIndicator !== newIndicator) {
                removeDragIndicator(enterElement, dragIndicator);
                dragIndicator = newIndicator;
            }
            addDragIndicator(enterElement, dragIndicator);
        }
        function onDragLeave(e) {
            if (enterElement !== e.target) return;
            removeDragIndicator(enterElement, dragIndicator);
            enterElement = null;
            // console.log("dragLeave", e.target.textContent);
            this.headRow.removeEventListener("dragover", handlers["dragover"], true);
            this.headRow.removeEventListener("dragleave", handlers["dragleave"], true);
        }
        function onDrop(e) {
            if (enterElement === null || dragIndicator === "") return;
            // console.log("drop ", enterElement.textContent, dragIndicator);
            moveToNewPlace.call(this, td, enterElement, dragIndicator);
        }
        function onDragEnd(e) {
            if (enterElement !== null) {
                enterElement.classList.remove(MyTable.CLASS_DRAGLINDICATOR);
                enterElement.classList.remove(MyTable.CLASS_DRAGRINDICATOR);
                enterElement = null;
                dragIndicator = "";
            }
            // console.log("dragEnd");
            for (var et in handlers) {
                this.headRow.removeEventListener(et, handlers[et], true);
            }
            handlers = null;
        }

        function addDragIndicator(em, indicator) {
            if (em !== null) {
                em.classList.add(indicator);
            }
        }
        function removeDragIndicator(em, indicator) {
            if (em !== null && indicator !== "") {
                em.classList.remove(indicator);
            }
        }

        function getDragIndicator(em, e) {
            const rect = em.getBoundingClientRect();
            return ((e.clientX - rect.left) / rect.width) < 0.5 ? MyTable.CLASS_DRAGLINDICATOR : MyTable.CLASS_DRAGRINDICATOR;
        }

        function moveToNewPlace(em, emDest, dragIndicator) {
            const i = em.cellIndex;
            const j = i < emDest.cellIndex ? -1 : 0;
            const k = (dragIndicator === MyTable.CLASS_DRAGLINDICATOR ? 0 : 1) + emDest.cellIndex;
            if (i === k + j) return;
            var p = em.parentElement;
            if (p !== emDest.parentElement) return;

            if (this._isTableInvalid()) {
                if (!confirm("表格部分行数据长度不一致！！！\n是否继续？")) return;
            }

            var rs = this.getAllRows();
            for (var n = 0; n < rs.length; n++) {
                var cs = rs[n].cells;
                p = cs[i].parentElement;
                p.insertBefore(cs[i], cs[k]);
            }

            let min = i, max = k + j;
            if (i > k) {
                min = k + j;
                max = i;
            }

            const c0 = this._colStyles.splice(0, min);
            const c1 = this._colStyles.splice(0, max - min + 1);

            if (min === i) {
                c1.push(c1.shift());
            } else {
                c1.unshift(c1.pop());
            }

            for (let l = 0; l < c1.length; l++) {
                c1[l].selectorText = `td:nth-of-type(${l + min + 1})`;
            }

            this._colStyles.unshift(...c1);
            this._colStyles.unshift(...c0);
        }
    }

    /*-----------------------------------排序----------------------------------------*/
    /**
     * 设置排序时使用的排序函数，filterFunc回调函数必须返回一个排序函数，如果返回null或者undefined终止排序\
     * 排序函数(a,b)=>return -1 || 0 || 1
     * 可以返回getDefaultSortFunc获取的默认排序函数
     * @param {(td: HTMLTableCellElement)=>{func:(a:string, b:string)=>{num:number}}} filterFunc 
     */
    setSortFilter(filterFunc) {
        this._sortFilter = filterFunc;
    }

    /**
     * 如果指定sortFunc 将按sortFunc进行排序，\
     * 否则如果设置了setSortFilter，则按filterFunc返回的函数排序，如果返回null或者undefined终止排序\
     * 否则如果列设置了sortby属性，则按该属性进行排序，否则按文字排序。\
     * 如果对同一列先后两次执行同一个排序函数，则第二次是逆转排序
     * @param {HTMLTableCellElement} td 要排序的列，必须是thead里面的td
     * @param {(a:string, b:string)=>{num:number}} sortFunc 
     */
    sort(td, sortFunc = undefined) {
        if (!sortFunc) {
            if (this._sortFilter) {
                sortFunc = this._sortFilter(td);
                if (!sortFunc) return;
            } else {
                sortFunc = this.getDefaultSortFunc(td);
            }
        }

        if (this._sortedColumn === td && this._sortedFunc === sortFunc) {
            this.rows.reverse();
            console.log("_reverseRow");
        } else {
            const col = td.cellIndex;
            this.rows.sort((a, b) => {
                return sortFunc(a.cells[col].textContent, b.cells[col].textContent);
            });

            this._sortedColumn = td;
            this._sortedFunc = sortFunc;
            console.log("sortby", sortFunc.name);
        }

        this._updateRowsPosition();
        this._updateRowsVisibility();
    }

    /**
     * 获取默认排序
     * @param {HTMLTableCellElement} td 
     */
    getDefaultSortFunc(td) {
        const sortby = td.getAttribute(MyTable.ATTR_SORT_BY);
        const func = MyTable.SORT_FUNC_MAP[sortby];
        return func ? func : MyTable.FuncSortByAlpha;
    }

    _unMarkSorted() {
        this._sortedColumn = null;
        this._sortedFunc = null;
    }


    /**     
     * @param {string} a 
     * @param {string} b 
     */
    static FuncSortByNum(a, b) {
        a = a.trim();
        if (a === "") return -1;
        b = b.trim();
        if (b === "") return 1;

        var ac = a.charCodeAt(0), bc = b.charCodeAt(0);
        if ((ac != 46 && ac < 48) || ac > 57) a = a.substr(1);
        if ((bc != 46 && bc < 48) || bc > 57) b = b.substr(1);

        return parseFloat(a) - parseFloat(b);
    }
    /**     
     * @param {string} a 
     * @param {string} b 
     */
    static FuncSortByAlpha(a, b) {
        return a.localeCompare(b);
    }
    /**     
     * @param {string} a 
     * @param {string} b 
     */
    static FuncSortByZh(a, b) {
        return a.localeCompare(b, "zh");
    }

    /*--------------------------选择行---------------------------------------------------*/
    _onTbodyMouseDown(/**@type{MouseEvent} */e) {
        if (e.button !== 0 && e.button !== 2) return;
        const td = e.target;
        if (!(td instanceof HTMLTableCellElement)) return;
        const tr = td.parentElement;
        this.lastClickCell = td;
        this._handleSelection(e, tr, td);
    }
    _handleSelection(/**@type{MouseEvent} */e, /**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td) {
        if (this.hasAttribute("disabled")) return;

        const i = e.ctrlKey + e.shiftKey * 2;
        if (e.button === 0) {
            switch (i) {
                case 0:/**/
                    this._selectOne(tr);
                    this._lastSelected = tr;
                    //                 e.preventDefault();
                    break;
                case 1:/*ctrl*/
                    this._selectWithCtrl(tr);
                    this._lastSelected = tr;
                    //                 e.preventDefault();
                    break;
                case 2:/*shift*/
                    this._selectWithShift(tr);
                    //                 e.preventDefault();
                    break;
                case 3:/*ctrl+shift*/
                    this._selectWithCtrlShift(tr);
                    this._lastSelected = tr;
                    //                 e.preventDefault();
                    break;
            }
        } else if (e.button === 2) {
            if (i === 0) {
                this._selectWithRightClick(tr);
                this._lastSelected = tr;
            }
        }
    }

    _selectOne(/**@type{HTMLTableRowElement} */tr) {
        const rs = this.getSelectedRows();
        if (rs.length === 1 && rs[0] === tr) return;
        this.clearSelection(rs);
        this.addSelection(tr);
        this._raiseSelectionChangedEvent([tr]);
    }

    _selectWithCtrl(/**@type{HTMLTableRowElement} */tr) {
        if (this.isRowSelected(tr)) {
            this.clearSelection([tr]);
        } else {
            this.addSelection(tr);
        }
        const rs = this.getSelectedRows();
        this._raiseSelectionChangedEvent(rs);
    }

    _selectWithShift(/**@type{HTMLTableRowElement} */tr) {
        const tr0 = this._lastSelected || this.rows[0];
        const rs0 = this.getSelectedRows();
        this.clearSelection();
        this.addSelectionRange(tr0, tr);
        const rs1 = this.getSelectedRows();
        if (rs0.length !== rs1.length) {
            this._raiseSelectionChangedEvent(rs1);
            return;
        }
        for (let i = 0; i < rs0.length; i++) {
            if (rs0[i] !== rs1[i]) {
                this._raiseSelectionChangedEvent(rs1);
                return;
            }
        }
    }
    _selectWithCtrlShift(/**@type{HTMLTableRowElement} */tr) {
        const tr0 = this._lastSelected || this.rows[0];
        const rs0 = this.getSelectedRows();
        // this.clearSelection();
        this.addSelectionRange(tr0, tr);
        const rs1 = this.getSelectedRows();
        if (rs0.length !== rs1.length) {
            this._raiseSelectionChangedEvent(rs1);
            return;
        }
        for (let i = 0; i < rs0.length; i++) {
            if (rs0[i] !== rs1[i]) {
                this._raiseSelectionChangedEvent(rs1);
                return;
            }
        }
    }

    _selectWithRightClick(/**@type{HTMLTableRowElement} */tr) {
        if (!this.isRowSelected(tr)) {
            this.clearSelection();
            this.addSelection(tr);
            this._raiseSelectionChangedEvent([tr]);
            return;
        }
    }

    /**     
     * @param {HTMLTableRowElement} tr 
     */
    isRowSelected(tr) {
        return tr.hasAttribute(MyTable.ATTR_SELECTED);
    }

    getSelectedRows() {
        const trs = this.rows;
        const rs = [];
        const n = trs.length;
        for (let i = 0; i < n; i++) {
            const tr = trs[i];
            if (this.isRowSelected(tr)) rs.push(tr);
        }
        return rs;
    }
    /**
     * (注：该调用不会触发selectionChanged事件)
     * @param {HTMLTableRowElement[]} trs 赋值时，仅清除trs里面的选择
     */
    clearSelection(trs = undefined) {
        trs = trs || this.rows;
        const n = trs.length;
        for (let i = 0; i < n; i++) {
            const tr = trs[i];
            tr.removeAttribute(MyTable.ATTR_SELECTED);
        }
    }
    /**     
     * (注：该调用不会触发selectionChanged事件)
     * @param {HTMLTableRowElement} tr 
     */
    addSelection(tr) {
        tr.setAttribute(MyTable.ATTR_SELECTED, "");
        return tr;
    }

    /**     
     * 选中指定行，并触发selectionChanged事件
     * @param {HTMLTableRowElement} tr 
     * @param {boolean} clearSelect 是否清空原有的选中项
     */
    performSelectRow(tr, clearSelect) {
        if (clearSelect) {
            this.clearSelection();
        }
        this.addSelection(tr);
        this._raiseSelectionChangedEvent(this.getSelectedRows());
    }



    /**     
     * @param {HTMLTableRowElement} tr 
     */
    getRowIndex(tr) {
        return this.rows.indexOf(tr);
    }

    /**     
     * (注：该调用不会触发selectionChanged事件)
     * @param {HTMLTableRowElement} trFrom 
     * @param {HTMLTableRowElement} trTo       
     */
    addSelectionRange(trFrom, trTo) {
        if (trFrom === trTo) {
            this.addSelection(trFrom);
        }

        let i = this.getRowIndex(trFrom);
        let j = this.getRowIndex(trTo);

        const k = i < j ? 1 : -1;
        const trs = this.rows;
        for (; i !== j; i += k) {
            this.addSelection(trs[i]);
        }
        this.addSelection(trTo);
    }

    _raiseSelectionChangedEvent(/**@type{HTMLTableRowElement[]} */selectedRows) {
        const n = this._selectionChangeEvents.length;
        for (let i = 0; i < n; i++) {
            this._selectionChangeEvents[i](selectedRows);
        }
    }

    /**
     * @param {(rs:HTMLTableRowElement[])=>{}} callback 
     */
    addSelectionChangedEvent(callback) {
        if (this._selectionChangeEvents.includes(callback)) return;
        this._selectionChangeEvents.push(callback);
    }

    removeSelectionChangedEvent(callback) {
        const i = this._selectionChangeEvents.indexOf(callback);
        if (i > -1) this._selectionChangeEvents.splice(i, 1);
    }

    /*--------------------------右键菜单-----------------------------------------------*/
    //用于初始化右键菜单，仅调用一次
    static _onTableContextMenu(/**@type{MouseEvent} */e) {
        const mytable = e.currentTarget;
        let menuItems = MyTable.TBody_MenuItems;
        console.log("loading table menu...");
        if (mytable._extendMenuItems) {
            if (mytable._extendMenuPos === MyTable.TBody_MenuItems.length) {
                menuItems = [...MyTable.TBody_MenuItems, ...mytable._extendMenuItems];
            } else {
                menuItems = [];
                for (let i = 0; i < MyTable.TBody_MenuItems.length; i++) {
                    if (i === mytable._extendMenuPos) {
                        for (let j = 0; j < mytable._extendMenuItems.length; j++) {
                            menuItems.push(mytable._extendMenuItems[j]);
                        }
                    }
                    menuItems.push(MyTable.TBody_MenuItems[i]);
                }
            }
            mytable._extendMenuItems = null
            mytable._extendMenuPos = -1;
            console.log("loading table extend menu...");
        }
        //绑定真正的右键菜单
        myMenu.bindElementMenu(mytable.tbody, menuItems, MyMenu.TYPES.CONTEXTMENU, MyTable._ContextMenuFilter);
        e.preventDefault();
    }

    /**
     * 扩展菜单
     * @param {[]} menuItems 
     * @param {number} position 负数表示倒数
     */
    extendMenuItems(menuItems, position = -1) {
        this._extendMenuItems = menuItems;
        if (position < 0) {
            position = MyTable.TBody_MenuItems.length + position + 1;
        }
        if (position < 0)
            position = 0;
        else if (position > MyTable.TBody_MenuItems.length)
            position = MyTable.TBody_MenuItems.length;
        this._extendMenuPos = position;
    }

    static HeadRow_MenuItems = [
        { title: "自动调整列宽", func: MyTable._headRowAutoWidth, disabled: false },
        "",
        { title: "按字母排序", func: MyTable._headRowSortByAlpha, disabled: false },
        { title: "按数字排序", func: MyTable._headRowSortByNum, disabled: false },
        { title: "按拼音排序", func: MyTable._headRowSortByZh, disabled: false },
        "",
        { title: "保存列表设置", func: MyTable._headRowSaveSetting, disabled: false },
    ];
    static _ContextMenuFilter(/**@type{MouseEvent} */e) {
        const td = e.target;
        if (!(td instanceof HTMLTableCellElement)) return false;
        return true;
    }
    static _headRowAutoWidth(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        mytable.setColumnAutoWidth(td.cellIndex);
    }
    static _headRowSortByAlpha(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        mytable.sort(td, MyTable.FuncSortByAlpha);
    }
    static _headRowSortByNum(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        mytable.sort(td, MyTable.FuncSortByNum);
    }
    static _headRowSortByZh(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        mytable.sort(td, MyTable.FuncSortByZh);
    }
    static _headRowSaveSetting(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        mytable.saveSetting();
    }

    saveSetting() {
        if (!this.title) {
            const msg = "my-table没有定义title，不能保存设置！";
            console.error(msg);
            alert(msg);
            return;
        }
        const cs = this.headRow.cells;
        const n = cs.length;
        const setting = { title: this.title, data: [] };
        for (let i = 0; i < n; i++) {
            const c = cs[i];
            setting.data.push({ col: c.textContent, width: this.getCellWidth(c) });
        }
        if (top.App) {
            top.App.saveTableSetting(setting);
        } else {
            this._saveSettingInLocal(setting);
        }
    }

    _createColumn(name) {
        const em = document.createElement("td");
        em.textContent = name;
        em.setAttribute("draggable", true);
        return em;
    }

    loadSetting() {
        /**@type{{title:string, data:{col:string, width:number}[]}} */
        let setting;
        if (top.App) {
            setting = top.App.getTableSetting(this.title);
        } else {
            setting = this._getSettingFromLocal(this.title);
        }
        if (!setting) return;

        const data = setting.data;
        this._reloadTitles(data);
    }

    /**
     * @param {{col:string, width:number}[]} data 
     */
    _reloadTitles(data) {
        const cells = this.headRow.cells;
        const map = new Map();
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            map.set(cell.textContent, cell)
        }

        if (!this._tempDoc) this._tempDoc = document.createDocumentFragment();

        for (let i = 0; i < data.length; i++) {
            const dt = data[i];
            let em = map.get(dt.col);
            if (!em) {
                em = this._createColumn(dt.col);
            } else {
                map.delete(dt.col);
            }

            this._tempDoc.append(em);

            let style = this._colStyles[i];
            if (!style) {
                style = this.insertStyleRule(`td:nth-of-type(${i + 1}){}`);
                this._colStyles.push(style);
            }
            this.setColumnWidth(i, dt.width, false);
        }
        map.forEach(v => v.remove());
        this.headRow.appendChild(this._tempDoc);

        this._updatePlaceholderSize();
    }


    static LOCAL_SETTING_NAME = "tableSettings"
    /**
	 * @param {{title:string, data:{col:string, width:number}[]}} setting 
	 */
    _saveSettingInLocal(setting) {
        let settings = localStorage.getItem(MyTable.LOCAL_SETTING_NAME);
        if (!settings || typeof settings !== "object") {
            settings = {}
        }
        settings[this.title] = setting;
        localStorage.setItem(MyTable.LOCAL_SETTING_NAME, JSON.stringify(settings));
        console.log("table setting saved in localStorage!", setting);
    }

    _getSettingFromLocal(title) {
        let settings = localStorage.getItem(MyTable.LOCAL_SETTING_NAME);
        if (!settings) return undefined;
        settings = JSON.parse(settings);
        const setting = settings[title];
        if (setting) console.log("table setting loaded from localStorage!", setting);
        return setting;
    }

    static TBody_MenuItems = [
        { title: "复制单元格内容", func: MyTable._copyCell, disabled: false },
        { title: "复制选中行内容", func: MyTable._copySelectedRows, disabled: false },
        { title: "复制选中行列内容", func: MyTable._copySelectedColumn, disabled: false },
        { title: "复制整个表格", func: MyTable._copyTable, disabled: false },
        "",
        { title: "所在列求和", func: MyTable._sumColumn, disabled: false },
        { title: "选中行所在列求和", func: MyTable._sumSelectedColumn, disabled: false },
    ];
    static _copyCell(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        const ps = td.style.userSelect;
        td.style.userSelect = "auto";
        const sel = window.getSelection();
        sel.empty();
        sel.selectAllChildren(td);
        document.execCommand("copy");
        sel.empty();
        td.style.userSelect = ps;
    }
    static _copySelectedRows(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        const rs = mytable.getSelectedRows();
        if (rs.length < 1) return;
        const trs = [];
        for (let i = 0; i < rs.length; i++) {
            trs[i] = `<tr>${rs[i].innerHTML}</tr>`;
        }
        MyTable._copy(trs.join(""));
    }
    static _copySelectedColumn(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        const rs = mytable.getSelectedRows();
        if (rs.length < 1) return;
        const trs = [];
        const n = td.cellIndex;
        for (let i = 0; i < rs.length; i++) {
            trs[i] = `<tr>${rs[i].cells[n].outerHTML}</tr>`;
        }
        MyTable._copy(trs.join(""));
    }

    static _copyTable(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        const rs = mytable.getAllRows();
        const trs = [];
        for (let i = 0; i < rs.length; i++) {
            trs[i] = `<tr>${rs[i].innerHTML}</tr>`;
        }
        MyTable._copy(trs.join(""));
    }

    static _copy(rsStr) {
        const sel = window.getSelection();
        sel.empty();
        if (!MyTable._temptb) {
            MyTable._temptb = document.createElement("table")
            MyTable._temptb.style.position = "fixed";
            MyTable._temptb.innerHTML = "<tbody></tbody>";
            MyTable._temptb.tBodies[0].style.cssText = `
                display:block;
                width:1px;
                height:1px;
                overflow:hidden;
                user-select: auto;
            `;
        }
        MyTable._temptb.tBodies[0].innerHTML = rsStr;
        document.body.appendChild(MyTable._temptb);
        sel.selectAllChildren(MyTable._temptb);
        document.execCommand("copy");
        sel.empty();
        MyTable._temptb.remove();
        MyTable._temptb.tBodies[0].innerHTML = "";
    }

    static _sumColumn(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        const column = td.cellIndex;
        const rs = mytable.rows;
        MyTable._calcShowSumResult(rs, column, mytable, "整列");
    }

    static _sumSelectedColumn(/**@type{HTMLTableRowElement} */tr, /**@type{HTMLTableCellElement} */td, obj) {
        /**@type{MyTable} */
        const mytable = tr.getRootNode().host;
        const column = td.cellIndex;
        const rs = mytable.getSelectedRows();
        MyTable._calcShowSumResult(rs, column, mytable, `选中${rs.length}行`);
    }

    static _calcShowSumResult(/**@type{HTMLTableRowElement[]} */rs, /**@type{number} */column, /**@type{MyTable} */mytable, msg) {
        const result = MyTable._sum(rs, column);
        if (result === false) alert("只能求和数字列！");
        else alert(`'${mytable.headRow.cells[column].textContent}'${msg}求和结果：${result}`);
    }

    static _sum(rs, column) {
        var arr = [];
        var a;
        for (var i = 0; i < rs.length; i++) {
            a = rs[i].cells[column].textContent;
            if (isNaN(a)) {
                return false;
            }
            arr[i] = a;
        }
        return round(sum(arr), 4);
    }

    /*--------------------------加载数据-----------------------------------------------*/
    /**
     * 加载表格数据
     * @param {MyTableData} mtd 
     * @param {boolean} clear 是否清除原有数据，默认true
     * @param {(tr:HTMLTableRowElement, dt:Object<string, HTMLTableCellElement>)} callback 每添加一行就调用一次
     * @throws new TypeError("新添加的数据title与原有的数据不匹配！") | new TypeError("Its not MyTableData!")
     */
    setTableData(mtd, clear = true, callback = undefined) {
        if (!(mtd instanceof MyTableData)) {
            MyTableData.decorate(mtd);
        }
        if (clear) {
            this.clearTable();
            if (!this.isColumnHeadsMatch(mtd.title)) {
                const data = [];
                const has = {};
                let cs = this.headRow.cells;
                let n = cs.length;
                for (let i = 0; i < n; i++) {
                    const c = cs[i];
                    const t = c.textContent;
                    if (mtd.title.includes(t)) {
                        data.push({ col: t, width: this.getCellWidth(c) });
                        has[t] = true;
                    }
                }

                n = mtd.title.length;
                for (let i = 0; i < n; i++) {
                    const t = mtd.title[i];
                    if (!has[t]) {
                        data.push({ col: t, width: -1 });
                    }
                }

                this._reloadTitles(data);
            }
        } else {
            if (!this.isColumnHeadsMatch(mtd.title))
                throw new TypeError("新添加的数据与原有的数据长度不匹配！");
        }

        let cs = this.headRow.cells;
        let n = cs.length;

        for (const dt of mtd.iterator(false)) {
            const tr = document.createElement("tr");

            for (let i = 0; i < n; i++) {
                const t = cs[i].textContent;
                const em = document.createElement("td");
                em.textContent = dt[t];
                em.title = em.textContent;
                dt[t] = em;
                tr.appendChild(em);
            }
            if (callback) callback(tr, dt);

            this.rows.push(tr);
        }

        this._updateRowsPosition();
        this._updatePlaceholderSize();
        this._updateRowsVisibility();

    }

    /**
     * 检测原有的列标题是否与给定的title匹配
     * @param {string[]} title 
     */
    isColumnHeadsMatch(title) {
        const cs = this.headRow.cells;
        const n = cs.length;
        if (n !== title.length)
            return false;

        for (let i = 0; i < n; i++) {
            const c = cs[i];
            if (!title.includes(c.textContent)) return false
        }

        return true;
    }

    /**
     * @param {string} rule 
     * @returns {CSSStyleRule}
     */
    insertStyleRule(rule) {
        const ind = this.colStylesheet.insertRule(rule);
        return this.colStylesheet.cssRules[ind];
    }

    /**
     * @param {number} height px
     * @param {boolean} update 是否立即更新滚动条、行位置及行可见性，默认true
     */
    setRowHeight(height, update = true) {
        if (this._rowHeight === height) return;

        this._rowHeight = height;

        if (!this._rowHeightRule) {
            this._rowHeightRule = this.insertStyleRule(`#tbody tr{height:${height}px;}`);
            this._rowTdTextLineHeight = this.insertStyleRule(`#tbody td{line-height:${height}px;}`);
        } else {
            this._rowHeightRule.style.height = `${height}px`;
            this._rowTdTextLineHeight.style.lineHeight = `${height}px`;

        }

        if (update) {
            this._updatePlaceholderSize();
            this._updateRowsPosition();
            this._updateRowsVisibility();
        }
    }

    getHeadRowWidth() {
        const n = this.headRow.cells.length;
        let w = 0;
        for (let i = 0; i < n; i++) {
            w += this.getColumnWidth(i);
        }
        return w;
    }

    /**更新滚动条 */
    _updatePlaceholderSize() {
        if (!this._placeHolderRule) {
            this._placeHolderRule = this.insertStyleRule(`#tbodyplaceholder{}`);
        }
        this._placeHolderRule.style.width = `${this.getHeadRowWidth()}px`;
        const rs = this.rows;
        if (rs.length > 0) {
            this._placeHolderRule.style.height = `${this._rowHeight * rs.length + 1}px`;
        } else {
            this._placeHolderRule.style.height = getComputedStyle(this.tbody)["height"];
        }
    }

    _updateRowsPosition() {
        const rs = this.rows;
        const n = rs.length;
        if (n < 1) return;
        const h = this._rowHeight;
        for (let i = 0; i < n; i++) {
            rs[i].style.top = `${h * i}px`;
        }
    }

    _updateRowsVisibility() {
        this._clearTbody();

        const rs = this.rows;
        const n = rs.length;
        if (n < 1) return;

        const si = Math.floor(this.tbody.scrollTop / this._rowHeight);
        const ei = Math.min(n, Math.ceil((this.tbody.scrollTop + this.tbody.clientHeight) / this._rowHeight));

        for (let i = si; i < ei; i++) {
            this.tbody.appendChild(rs[i]);
        }
    }

    _clearTbody() {
        this.tbody.innerHTML = "";
        this.tbody.appendChild(this.tbodyPlaceholder);
    }

    clearTable() {
        this.lastClickCell = null;
        this._lastSelected = null;
        this._unMarkSorted();
        this.rows = [];

        this._clearTbody();

        this._updatePlaceholderSize();
    }

    /**
     * 更新行，仅使用mtd的第一条数据更新tr
     * @param {HTMLTableRowElement} tr
     * @param {MyTableData} mtd 
     * @return {boolean}
     */
    updateRow(tr, mtd) {
        if (this.getRowIndex(tr) < 0) return false;
        if (mtd.data.length < 1) return false;


        const dt = mtd.data[0];
        const n = mtd.title.length;
        const dic = this.getAllColumnIndex();

        for (let i = 0; i < n; i++) {
            const title = mtd.title[i];
            const value = dt[i];
            tr.cells[dic[title]].textContent = value;
        }
        return true;
    }

    /**     
     * 移除行，如果不存在，返回false，否则返回true；\
     * 如果行被选中，则会触发选中改变事件
     * @param {HTMLTableRowElement} tr 
     * @returns {boolean}
     */
    removeRow(tr) {
        const ind = this.getRowIndex(tr);
        if (ind < 0) return false;
        this.rows.splice(ind, 1);

        this._updatePlaceholderSize();
        this._updateRowsPosition();
        this._updateRowsVisibility();

        if (this.isRowSelected(tr)) {
            this._raiseSelectionChangedEvent(this.getSelectedRows());
        }
    }

}

customElements.define(MyTable.TAG, MyTable);
