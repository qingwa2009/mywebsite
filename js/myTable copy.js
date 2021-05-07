"use strict";

const getParent = (em, htmlEm) => {
    var p = em;
    while (1) {
        p = p.parentElement;
        if (p == null) {
            return null;
        } else if (p instanceof htmlEm) {
            return p;
        }
    }
}
const trim = (s) => s.replace(/(^\s*|\s*$)/g, "");
const sum = (arr) => arr.reduce((s, a) => s + (parseFloat(a) || 0), 0);
// const round=(n,i)=>{var u=Math.pow(10,i);return Math.round(n*u)/u;};
const round = (s, i) => {
    var s = "" + s;
    var re = new RegExp("^(\\d*\\.\\d{" + i + "})(\\d)");
    var ns = s.replace(re, (m, p0, p1, o, ss) => p1 >= 5 ? p0 + 8 : p0 + 2);
    return parseFloat(ns).toFixed(i);
}

function isTableInvalid(tb) {
    "use strict"
    if (tb.tHead.rows.length !== 1 || tb.tBodies.length > 1) return true;
    if (tb.tBodies.length === 0) return false;
    const n = tb.tHead.rows[0].cells.length;
    var rs = tb.tBodies[0].rows;
    for (var i = 0; i < rs.length; i++) {
        if (rs[i].cells.length !== n) return true;
    }
    return false;
}

function createMyStyleSheet() {
    var style = document.createElement("style");
    document.head.appendChild(style);
    return style.sheet;
}


class MyTable extends HTMLTableElement {
    static TAG = "my-table";
    constructor() {
        super();
    }
}

customElements.define(MyTable.TAG, MyTable, { extends: "table" });

/*------------------------------------MyTableManager---------------------------------------*/
var myTableMag = (function MyTableManager() {
    "use strict"
    const CLASSES = {
        TABLE: "my-table",
        TABLEDIV: "my-table-div",
        TABLEHEAD: "my-table-head",
        TABLEMENU: "my-table-menu",
        TABLESUBMENU: "my-table-submenu",
        DRAGLINDICATOR: "column-drag-left",
        DRAGRINDICATOR: "column-drag-right",
        SELECTED: "row-selected",
        HASSUBMENU: "has-submenu"
    }
    const IDS = {
        MYMENU: "myMenu"
    }
    const PROPS = {
        SCROLLLEFT: "--scroll-left",
        SCROLLTOP: "--scroll-top",
        FROZENCOLOR: "--frozen-color",
        OUTLINECOLOR: "--border-color",
        DRAGCOLOR: "--drag-color",
        SELECTEDCOLOR: "--selected-color",
        PRESELECTCOLOR: "--preselect-color"
    }
    const ATTRS = {
        COLUMNFIX: "data-column-fixed",
        SELECTEDROWS: "data-sel-rows",
        SORTED: "my-table-sorted",
        SORTONSERVER: "sort-on-server"
    }

    const MENUITEMS = {
        COPYCELL: "复制单元格",
        COPYROW: "复制行",
        COPYCOLUMN: "复制列",
        COPYONSERVER: "复制多项",
        PASTEONSERVER: "粘贴多项",
        REFRESH: "刷新BOM",
        SUMSELECTED: "选中行所在列求和",
        SUMALL: "列求和",
        SETFIXED: "冻结列",
        UNFIXED: "取消冻结",
        SAVESETTING: "保存列表设置"
    }

    const EVENTS = {
        MYTABLEMAGLOAD: "myTableMagLoad",
        //         MYTABLELOAD:"myTableLoad"
    }
    const _listener = {}
    var colorOutline = "#C0C0C0",
        colorFrozen = "#f1f1f1",
        colorDrag = "#2196F3",
        colorSelected = "#03A9F4",
        colorPreselect = "#aabbcc3a",
        myTableDivIdSuffix = "Div",
        splitterWidth = 5,
        scrollDelay = 150;

    var readyState = false;
    var mySh = null;
    var myTables = {};/*{table.id:myTable}*/
    var clickedHead = null;
    var myPLM = top.myPLM || null;
    var myMenu = myPLM !== null ? myPLM.myMenu : null;
    var temptb = null;
    /*----------------------------------MyTable----------------------------------------*/
    /*(table,包含table的div，冻结列)*/
    var MyTable = (function () {
        function f() { };
        f.decorate = function (table, div) {
            Object.setPrototypeOf(table, f.prototype);
            table.decorate(div);
        }
        return f;
    })();
    MyTable.prototype = (function () {
        var _headMenuItems = null;
        var _commMenuItems = null;
        var _captionHTML = `
            <caption style="position: absolute;height: 1em;width: 100%;">
                <button class="next-page" title="加载更多" 
                    style="width: 100%;height: 100%;
                    margin: 0;padding: 0;
                    border: 0;
                    border-top: 1em double var(--border-color);
                    border-left: 1em solid transparent;
                    border-right: 1em solid transparent;">
                </button>
            </caption>
        `;
        function decorate(div) {
            this._GUID = myPLM.createTableGUID();
            this.div = div;
            /*[cssRule(首行),cssRule(冻结列),cssRule(左上角)]*/
            this.stRules = [];
            this.sm = new SelectionManager(this);
            this._sortedColumn = -1;
            this._sortedFunc = null;
            this.menuItems = [];
            this.selectionChangeListeners = [];
            this._tableData = null;
            this.caption = this.createCaption();
            this.caption.outerHTML = _captionHTML;
            this.appendChild(this.caption);
            this.caption.style.display = "none";
            this.serverSortFunc = null;//服务器排序
            _init.call(this);
            //             this.dispatchEvent(new Event(EVENTS.MYTABLELOAD));
        }
        // --------------------------------------------------------------------        
        function _init() {
            _initTableStyle.call(this);
            _setFirstRowStyle.call(this);

            this.div.onscroll = _handleScroll.bind(this.div);
            this.div._counter = null;
            this.div._lastTop = 0;
            this.div._lastLeft = 0;
            this.div._scrollTimeoutCall = _scrollTimeoutCall.bind(this.div);

            var func = _menuFunc;
            _headMenuItems = _headMenuItems || [
                { id: 1, title: "自动调整列宽", func: func, disabled: false },
                { id: 2, title: "冻结列", func: func, disabled: false },
                { id: 3, title: "取消冻结", func: func, disabled: false },
                "",
                { id: 4, title: "隐藏列", func: func, disabled: false },
                { id: 5, title: "取消隐藏", func: func, disabled: false },
                "",
                { id: 6, title: "按字母排序", func: func, disabled: false },
                { id: 7, title: "按数字排序", func: func, disabled: false },
                "",
                { id: 8, title: "保存列表设置", func: func, disabled: false }
            ];
            //通用菜单命令
            _commMenuItems = _commMenuItems || [
                "复制单元格内容",
                ["复制选中的", "行内容", "列内容"],
                "复制整列内容",
                "复制整个表格",
                "",
                "选中行所在列求和",
                "所在列求和",
                ["子菜单", "it1", "it2", "", "it3", "it4", "it5"],
                "",
                "保存列表设置",
                func
            ];
            this.extendMenuItems(_commMenuItems, 0);
            this.oncontextmenu = _onContextMenu.bind(this);
        }
        function _initTableStyle() {
            var id = this.id;
            this.div.classList.add(CLASSES.TABLEDIV);
            this.div.id = id + myTableDivIdSuffix;
            this.div.style.setProperty(PROPS.SCROLLLEFT, "0px");
            this.div.style.setProperty(PROPS.SCROLLTOP, "0px");

            if (this.tHead == null) {
                this.tHead = document.createElement("thead");
                this.tHead.appendChild(document.createElement("tr"));
            }
            if (this.tBodies.length === 0) {
                this.appendChild(document.createElement("tbody"));
            }
            this.tHead.rows[0].classList.add(CLASSES.TABLEHEAD);
            this.setAttribute("cellspacing", 0);
            this.setAttribute("border", 0);


            var columnFix = this.getAttribute(ATTRS.COLUMNFIX) || 0;

            // this.stRules[0] = mySh.cssRules[mySh.insertRule(
            //     `#${id} .${CLASSES.TABLEHEAD} td{
            //     z-index:1;
            //     position:relative;
            //     top:var(${PROPS.SCROLLTOP});
            //     /*position:sticky;*/
            //     /*top:0;*/
            // }`, 0)];//标题行固定
            // this.stRules[1] = mySh.cssRules[mySh.insertRule(
            //     `#${id} td:nth-child(-n+${columnFix}){
            //     z-index:1;
            //     position:relative;
            //     left:var(${PROPS.SCROLLLEFT});
            //     background-color:${colorFrozen};
            //     background-color:var(--frozon-color);
            // }`, 0)];//冻结列
            // this.stRules[2] = mySh.cssRules[mySh.insertRule(
            //     `#${id} .${CLASSES.TABLEHEAD} td:nth-child(-n+${columnFix}){
            //     z-index:2;
            //     /*position:relative;*/
            //     /*top:var(${PROPS.SCROLLTOP});*/
            // }`, 0)];//冻结左上角
        }

        function _setFirstRowStyle() {
            if (myPLM && myPLM.userSetting.hasOwnProperty(this.id)) {
                _setTitles.call(this, myPLM.userSetting[this.id]);
            }
            var r = this.tHead.rows[0];
            var tds = r.cells;
            for (var j = 0, n = tds.length; j < n; j++) {
                tds[j].setAttribute("draggable", "true");
            }
        }

        /*设置标题栏*/
        function _setTitles(titleArr) {
            if (titleArr.length === 0) return;
            var tr = this.tHead.rows[0];
            tr.innerHTML = "";
            for (var i = 0; i < titleArr.length; i++) {
                var td = document.createElement("td")
                var t = titleArr[i];
                td.textContent = t[0];
                var v = t[1];
                if (v !== "") {
                    td.style.width = v;
                    td.style.minWidth = v;
                    td.style.maxWidth = v;
                }
                tr.appendChild(td);
            }
        }
        // --------------------------------------------------------------------
        /*扩展菜单
         *(["item0",
         *  "item1",
         *  "",
         *  ["子菜单",subitem0],
         *  "",
         *  "item2",
         *  callbackFunc(context,target,name)],
         *  插入的位置)
         */
        function extendMenuItems(menuItems, index) {
            var startId = _getMenuItemsMaxId(this.menuItems) + 1;
            var index = index > this.menuItems.length ? this.menuItems.length : index;
            var func = menuItems[menuItems.length - 1];
            for (var i = 0; i < menuItems.length - 1; i++) {
                var it = menuItems[i];
                if (it === "") {
                    this.menuItems.splice(index, 0, "");
                } else if (it instanceof Array) {
                    var its = [it[0]];
                    for (var j = 1; j < it.length; j++) {
                        if (it[j] === "") {
                            its[j] = "";
                        } else {
                            its[j] = { id: startId, title: it[j], func: func, disabled: false };
                            startId++;
                        }
                    }
                    this.menuItems.splice(index, 0, its);
                } else {
                    this.menuItems.splice(index, 0, { id: startId, title: it, func: func, disabled: false });
                    startId++;
                }
                index++;
            }
        }
        //获取菜单最大ID
        function _getMenuItemsMaxId(menuArr) {
            var maxId = 0;
            for (var i = 0; i < menuArr.length; i++) {
                var it = menuArr[i];
                switch (it.constructor.name) {
                    case "Object":
                        if (it.id > maxId) maxId = it.id;
                        break;
                    case "Array":
                        maxId = _getMenuItemsMaxId(it);
                        break;
                }
            }
            return maxId;
        }

        function _menuFunc(context, td) {
            console.log(context, td, this);
            var i = td.cellIndex;
            switch (this.title) {
                case "自动调整列宽":
                    setColumnAutoWidth.call(context, i);
                    break;
                case "冻结列":
                    setColumnFix.call(context, i + 1);
                    break;
                case "取消冻结":
                    setColumnFix.call(context, 0);
                    break;
                case "按字母排序":
                    sort.call(context, i, _sortbyZh);
                    break;
                case "按数字排序":
                    sort.call(context, i, _sortbyNum);
                    break;
                case "复制单元格内容":
                    _copyCell(context, td);
                    break;
                case "行内容":
                    _copyRows(context, td);
                    break;
                case "列内容":
                    _copyColumns(context, td);
                    break;
                case "复制整列内容":
                    _copyColumn(context, td);
                    break;
                case "复制整个表格":
                    _copyAll(context);
                    break;
                case "复制多项":
                    break;
                case "粘贴多项":
                    break;
                case "刷新BOM":
                    break;
                case "选中行所在列求和":
                    _sumSelected(context, i);
                    break;
                case "所在列求和":
                    _sumAll(context, i);
                    break;
                case "保存列表设置":
                    _saveListSetting(context);
                    break;
            }
        }
        function _copyCell(self, td) {
            var ps = td.style.userSelect;
            td.style.userSelect = "auto";
            var sel = window.getSelection();
            sel.selectAllChildren(td);
            document.execCommand("copy");
            sel.empty();
            td.style.userSelect = ps;
        }
        function _copyRows(self, td) {
            if (self.sm.selection.size === 0) return;
            var rs = Array.from(self.sm.selection);
            var trs = [];
            for (var i = 0; i < rs.length; i++) {
                trs[i] = `<tr>${rs[i].innerHTML}</tr>`;
            }
            _copy(trs.join(""));
        }
        function _copyColumns(self, td) {
            if (self.sm.selection.size === 0) return;
            var rs = Array.from(self.sm.selection);
            var trs = [];
            var n = td.cellIndex;
            for (var i = 0; i < rs.length; i++) {
                trs[i] = `<tr>${rs[i].cells[n].outerHTML}</tr>`;
            }
            _copy(trs.join(""));
        }
        function _copyColumn(self, td) {
            var rs = self.rows
            var trs = [];
            var n = td.cellIndex;
            for (var i = 0; i < rs.length; i++) {
                trs[i] = `<tr>${rs[i].cells[n].outerHTML}</tr>`;
            }
            _copy(trs.join(""));
        }
        function _copyAll(self) {
            var rs = self.rows
            var trs = [];
            for (var i = 0; i < rs.length; i++) {
                trs[i] = `<tr>${rs[i].innerHTML}</tr>`;
            }
            _copy(trs.join(""));
        }
        function _copy(rsStr) {
            var sel = window.getSelection();
            sel.empty();
            if (!temptb) {
                temptb = document.createElement("table")
                temptb.style.position = "fixed";
                temptb.innerHTML = "<tbody></tbody>";
                temptb.tBodies[0].style.cssText = `
                    display:block;
                    width:1px;
                    height:1px;
                    overflow:hidden;
                    user-select: auto;
                `;
            }
            temptb.tBodies[0].innerHTML = rsStr;
            document.body.appendChild(temptb);
            sel.selectAllChildren(temptb);
            document.execCommand("copy");
            sel.empty();
            temptb.remove();
            temptb.tBodies[0].innerHTML = "";
        }
        function _saveListSetting(context) {
            if (context instanceof MyTable) {
                var arr = [];
                var cells = context.tHead.rows[0].cells;
                for (var i = 0; i < cells.length; i++) {
                    var d = [];
                    d[0] = cells[i].textContent;
                    d[1] = cells[i].style.width;
                    arr.push(d);
                }
                myPLM.saveUserSetting(context.id, arr);
            }
        }
        function _sumSelected(self, column) {
            var n = self.sumSelected(column);
            if (n !== false) {
                alert(`选中<${self.tHead.rows[0].cells[column].textContent}>${self.sm.selection.size}项求和：\n${n}`);
            }
        }
        function _sumAll(self, column) {
            var n = self.sumAll(column);
            if (n !== false) {
                alert(`<${self.tHead.rows[0].cells[column].textContent}>列求和：\n${n}`);
            }
        }
        function sumSelected(column) {
            var rs = Array.from(this.sm.selection);
            return sumRows(rs, column);
        }
        function sumAll(column) {
            var rs = this.tBodies[0].rows;
            return sumRows(rs, column);
        }
        function sumRows(rs, column) {
            var arr = [];
            var a;
            for (var i = 0; i < rs.length; i++) {
                a = rs[i].cells[column].textContent;
                if (isNaN(a)) {
                    return false;
                }
                arr[i] = a;
            }
            return parseFloat(round(sum(arr), 4));
        }
        function _onContextMenu(e) {
            e.preventDefault();
            var t = e.target;
            if (!(t instanceof HTMLTableCellElement)) return;
            //             myMenu=myMenu||top.myPLM.myMenu;
            if (t.parentElement.classList.contains(CLASSES.TABLEHEAD)) {
                myMenu.loadMenuItems(this, _headMenuItems);
            } else {
                myMenu.loadMenuItems(this, this.menuItems);
            }
            myMenu.show(e);
        }
        // --------------------------------------------------------------------
        function _scrollTimeoutCall() {
            var div = this;
            if (div._lastTop === div.scrollTop && div._lastLeft === div.scrollLeft) {
                div.style.setProperty(PROPS.SCROLLLEFT, div.scrollLeft + "px");
                div.style.setProperty(PROPS.SCROLLTOP, div.scrollTop + "px");

                //                 var t=div.scrollTop + "px";
                //                 var l=div.scrollLeft + "px";
                //                 var tb=div.firstElementChild;
                //                 var rs=tb.rows;
                //                 var cs=rs[0].cells;
                //                 Array.prototype.forEach.call(cs,a=>a.style.setProperty("top",t));
                //                 var n=tb.dataset.columnFixed;
                //                 Array.prototype.forEach.call(rs,r=>{
                //                     var cs=r.cells;
                //                     for (var i=0;i<n;i++){
                //                         cs[i].style.setProperty("left",l);
                //                     }
                //                 });

                clearInterval(div._counter);
                div._counter = null;
                //                 console.log("scroll end!");
            } else {
                div._lastTop = div.scrollTop;
                div._lastLeft = div.scrollLeft;
            }
        }
        function _handleScroll(e) {
            var div = this;
            if (div._counter === null) div._counter = setInterval(div._scrollTimeoutCall, scrollDelay);
            if (div._lastLeft !== div.scrollLeft) div.style.setProperty(PROPS.SCROLLLEFT, "0px");
            if (div._lastTop !== div.scrollTop) div.style.setProperty(PROPS.SCROLLTOP, "0px");
            //             console.log(this.id + "滚动:" + this.scrollTop + "," + this.scrollLeft);
            //             this.style.setProperty(PROPS.SCROLLLEFT,this.scrollLeft + "px");
            //             this.style.setProperty(PROPS.SCROLLTOP,this.scrollTop + "px");
        }
        /*设置冻结列*/
        function setColumnFix(i) {
            this.setAttribute(ATTRS.COLUMNFIX, i);
            this.stRules[1].selectorText = "#" + this.id + " td:nth-child(-n+" + i + ")";
            this.stRules[2].selectorText = "#" + this.id + " ." + CLASSES.TABLEHEAD + " td:nth-child(-n+" + i + ")"
        }

        // --------------------------------------------------------------------
        /*tableData={
            title:{标题:类型,...},
            data:{
              pk:{标题:值,...},
              pk:{标题:值,...},...
            },
            EOF:boolean,
            totalCount:long,
            GUID:string,
            PK:string,
            order:Set()
        }*/
        //添加数据
        function _addTableData(tableData, isNew = false) {
            if (!(tableData instanceof top.MyTableData)) {
                throw new Error("tableData must be MyTableData！");
            }

            var ks = [...tableData.order]//Object.keys(tableData.data);
            if (isNew) {
                this._tableData = tableData;
            } else {
                if (ks.some(a => this._tableData.data.hasOwnProperty(a))) {
                    alert("添加的数据与原数据有重复！");
                    throw new Error("添加的数据与原数据有重复！");
                }
                ks.forEach(k => {
                    this._tableData.data[k] = tableData.data[k];
                });
                updateTableDataTotalCount(this._tableData);
                this._tableData.EOF = tableData.EOF;
            }
            if (!this._tableData.EOF) {
                myPLM.registerRecordset(this._GUID, window);
                this.caption.style.display = "";
            } else {
                this.caption.style.display = "none";
                myPLM.unregisterRecordset(this._GUID);
            }

            var css = Array.prototype.map.call(this.tHead.rows[0].cells, a => a.textContent);
            var rn = ks.length;
            var cn = css.length;
            if (rn * cn === 0) return;

            var doc = document.createDocumentFragment();
            var rs = ks.map(a => {
                var r = document.createElement("tr");
                r.PK = a;
                doc.appendChild(r);
                return r;
            });
            for (var i = 0; i < cn; i++) {
                var t = css[i];
                for (var j = 0; j < rn; j++) {
                    var td = document.createElement("td");
                    var s = tableData.data[ks[j]][t];
                    td.textContent = s;
                    rs[j].appendChild(td);
                }
            }
            //             rs.forEach(a=>doc.appendChild(a));

            this.tBodies[0].appendChild(doc);
            return rs;
        }

        function updateTableDataTotalCount(tableData) {
            tableData.totalCount = Object.keys(tableData.data).length;
        }

        function rowAdd(tableData) {
            if (this._tableData === null) {
                return this.setTableData(tableData);
            }
            _unMarkSorted.call(this);
            return _addTableData.call(this, tableData, false);
        }

        function rowEdit(newData) {
            const tableData = this._tableData;
            if (!(newData instanceof top.MyTableData)) {
                throw new Error("tableData must be MyTableData！");
            }
            if (tableData.PK !== newData.PK)
                throw new Error("更新数据主键不匹配！");
            const dts = Object.keys(newData.data);
            if (!dts.every(a => tableData.data.hasOwnProperty(a)))
                throw new Error("原始数据与更新的数据不匹配！");

            for (var k in newData.data) {
                tableData.data[k] = newData.data[k];
            }

            const rs = this.tBodies[0].rows;
            const rn = rs.length;
            const cid = {};
            const nrs = [];
            for (var i = 0; i < rn; i++) {
                let r = rs[i];
                let pk = r.PK
                if (newData.data.hasOwnProperty(pk)) {
                    let cs = r.cells;
                    var dt = newData.data[pk];
                    for (var k in dt) {
                        if (!cid.hasOwnProperty(k)) {
                            cid[k] = this.getColumnIndex(k);
                        }
                        var ki = cid[k];
                        if (ki > -1) {
                            cs[ki].textContent = dt[k];
                        }
                    }
                    nrs.push(r);
                }
            }

            _unMarkSorted.call(this);
            return nrs;
        }

        function rowRemove(pks) {
            var dic = {};

            pks.forEach(a => dic[a] = 0);
            const n0 = pks.length;
            const rs = [...this.tBodies[0].rows];
            const n = rs.length;
            var c = 0
            for (let i = 0; i < rs.length; i++) {
                let r = rs[i];
                if (dic.hasOwnProperty(r.PK)) {
                    r.remove();
                    c++;
                }
                if (c === n0) break;
            }

            pks.forEach(a => {
                delete this._tableData.data[a];
            });
            updateTableDataTotalCount(this._tableData);
            this.sm.clear();
            //             this.sm.updatedSelectedRows();
        }
        //按filterDic过滤显示的数据行
        //noInclud=true表示不显示filterDic里面的行
        //noInclud=false表示仅显示filterDic里面的行
        function setFilter(filterDic, noInclud = true) {
            const rs = [...(this.tBodies[0].rows)];
            if (noInclud) {
                rs.forEach(a => {
                    if (filterDic.hasOwnProperty(a.PK)) {
                        a.remove();
                    }
                });
            } else {
                rs.forEach(a => {
                    if (!filterDic.hasOwnProperty(a.PK)) {
                        a.remove();
                    }
                });
            }
        }

        //过滤原始table，而不是在过滤了之后又过滤
        function setFilterInOrigin(filterDic, noInclud = true) {
            throw new Error("setFilterInOrigin还没写，赶紧写！");
        }

        function resetFilter() {
            this.clear();
            _unMarkSorted.call(this);
            _addTableData.call(this, this._tableData, true);
        }

        /*清空表格数据*/
        function clear() {
            this.tBodies[0].innerHTML = "";
            this.sm.clear();
        }

        function setTableData(tableData) {
            this.clear();
            _unMarkSorted.call(this);
            _formatTableHead.call(this, tableData);

            return _addTableData.call(this, tableData, true);
        }

        function _formatTableHead(tableData) {
            //删除没用的标题
            var cs = this.tHead.rows[0].cells;
            var css = [];
            var delCs = [];
            var hasTitle = Object.keys(tableData.title);//tableData.title.slice();

            for (var i = 0; i < cs.length; i++) {
                var s = cs[i].textContent;
                var j = hasTitle.indexOf(s);
                if (j > -1) {
                    hasTitle[j] = 0;
                    css.push(s);
                } else {
                    delCs.push(cs[i]);
                }
            }

            delCs.forEach(a => a.remove());
            //添加没有的标题
            var r0 = this.tHead.rows[0];
            var ts;
            for (var j = 0; j < hasTitle.length; j++) {
                ts = hasTitle[j]
                if (ts !== 0) {
                    var td = document.createElement("td");
                    td.setAttribute("draggable", true)
                    td.textContent = ts;
                    css.push(ts);
                    r0.appendChild(td);
                }
            }
        }


        // --------------------------------------------------------------------
        function getColumnIndex(title) {
            var cs = this.tHead.rows[0].cells;
            for (var i = 0; i < cs.length; i++) {
                if (cs[i].textContent === title) {
                    return i;
                }
            }
            return -1;
        }

        function getTableDataWithPK(pk) {
            if (!this._tableData) return;
            return this._tableData.data[pk];
        }

        function getTableRowWithPK(pk) {
            const rs = this.tBodies[0].rows;
            const n = rs.length;
            for (let i = 0; i < n; i++) {
                if (rs[i].PK === pk)
                    return rs[i];
            }
            return null;
        }

        function getTableRowsWithPKs(pks) {
            var dic = {};
            pks.forEach(a => dic[a] = 0);
            const n0 = pks.length;
            var arr = [];
            const rs = this.tBodies[0].rows;
            const n = rs.length;
            for (let i = 0; i < n; i++) {
                if (dic.hasOwnProperty(rs[i].PK)) {
                    arr.push(rs[i]);
                } else {
                    arr.push(null);
                }
                if (arr.length === n0) break;
            }
            return arr;
        }

        function hasSelection() {
            if (this.sm.selection.size > 0) return true;
        }

        function getSelectionsPKs() {
            return Array.from(this.sm.selection).map(a => a.PK)
        }
        // --------------------------------------------------------------------        
        /*获取自动排序函数*/
        function getAutoSortFunc(rs, column) {
            var ns = 0, as = 0, rs2 = rs.length * 0.5;

            for (var i = 0; i < rs.length; i++) {
                var s = trim(rs[i].cells[column].textContent);
                if (s === "") {
                    rs2 -= 0.5;
                    continue;
                }
                if (/(\d{4}-\d{2}-\d{2}|(2[0-3]|[0-1]\d):[0-5]\d|星期[一二三四五六日])/.test(s)) return this._sortbyZh;

                var ac = s.charAt(0);
                if (ac === "Φ" || ac === "∅" || ac === "φ") {
                    ns++
                    continue;
                }
                isNaN(parseFloat(s)) ? as++ : ns++
                if (as > rs2) return _sortbyZh;
                if (ns > rs2) return _sortbyNum;
            }
            return as > ns ? _sortbyZh : _sortbyNum;
        }

        function getSortFunc(column) {
            var t = this._tableData.title[this.tHead.rows[0].cells[column].textContent];
            if (t !== undefined && top.DatabaseType2JSDataType[t] === top.JSDataTypeEnum.Number) {
                return _sortbyNum;
            } else {
                return _sortbyZh
            }
        }

        function _markSorted(column, sortFunc) {
            this._sortedColumn = column;
            this._sortedFunc = sortFunc;
        }
        function _unMarkSorted() {
            this._sortedColumn = -1;
            this._sortedFunc = null;
        }
        /*排序*/
        function sort(column, sortFunc) {
            var tbd = this.tBodies[0];
            if (!tbd) return;
            var rs = tbd.rows;
            if (this._sortedColumn === column && this._sortedFunc === sortFunc) {
                _reverseRow(rs);
                console.log("_reverseRow");
            } else {
                var func = sortFunc || this.getSortFunc(column)//this.getAutoSortFunc(rs,column);
                console.log(func.name);
                var sortArr = [];
                for (var i = 0; i < rs.length; i++) {
                    sortArr[i] = [rs[i].cells[column].textContent, rs[i]]
                }
                sortArr.sort(func);
                for (var i = 0; i < rs.length; i++) {
                    tbd.appendChild(sortArr[i][1]);
                }
                _markSorted.call(this, column, sortFunc);
            }
        }
        function _reverseRow(rs) {
            var p = rs[0].parentElement;
            for (var i = rs.length - 1; i >= 0; i--) {
                p.appendChild(rs[i]);
            }
        }
        function _sortbyNum(a, b) {
            a = trim(a[0]);
            if (a === "") return -1;
            b = trim(b[0]);
            if (b === "") return 1;
            var ac = a.charAt(0), bc = b.charAt(0);
            var st = (ac === "Φ" || ac === "∅" || ac === "φ") + (bc === "Φ" || bc === "∅" || bc === "φ") * 2;
            switch (st) {
                case 0:
                case 3:
                    var aa = parseFloat(a.replace(/[^0-9.-]/g, ' ')) || 0;
                    var bb = parseFloat(b.replace(/[^0-9.-]/g, ' ')) || 0;
                    return aa - bb;
                case 1:
                    return 1;
                case 2:
                    return -1;
            }
        }
        function _sortbyAlpha(a, b) {
            if (a[0] == b[0]) return 0;
            if (a[0] < b[0]) return -1;
            return 1;
        }
        function _sortbyZh(a, b) {
            return a[0].localeCompare(b[0], "zh")
        }
        // --------------------------------------------------------------------
        /*设置自动列宽*/
        function setColumnAutoWidth(column) {
            var rs = this.rows;
            var ctx = document.createElement("canvas").getContext("2d");
            ctx.font = getComputedStyle(rs[0].cells[column]).font;
            var width = 0;
            for (var i = 0; i < rs.length; i++) {
                var w = ctx.measureText(rs[i].cells[column].textContent).width;
                if (width < w) width = w;
            }
            ctx = null;
            width = Math.ceil(width);
            var td = rs[0].cells[column];
            this.setColumnWidth(td, width + 15);
        }
        /*设置列宽*/
        function setColumnWidth(td, width) {
            var ws = width + "px"
            td.style.width = ws;
            td.style.minWidth = ws;
            td.style.maxWidth = ws;
        }

        // --------------------------------------------------------------------        
        function addSelectionChangeListener(func) {
            if (this.selectionChangeListeners.includes(func))
                throw new Error("该table已经存在相同的事件处理函数了")
            this.selectionChangeListeners.push(func);
        }
        function removeSelectionChangeListener(func) {
            if (this.selectionChangeListeners.includes(func)) {
                let i = this.selectionChangeListeners.indexOf(func);
                this.selectionChangeListeners.splice(i, 1);
            }
        }
        function raiseSelectionChange() {
            let n = this.selectionChangeListeners.length;
            for (let i = 0; i < n; i++) {
                this.selectionChangeListeners[i].call(this);
            }
        }

        // --------------------------------------------------------------------      
        return {
            constructor: MyTable,
            __proto__: HTMLTableElement.prototype,
            decorate: decorate,
            extendMenuItems: extendMenuItems,
            setColumnWidth: setColumnWidth,
            setColumnAutoWidth: setColumnAutoWidth,
            sort: sort,
            sumRows: sumRows,
            sumAll: sumAll,
            sumSelected: sumSelected,
            getAutoSortFunc: getAutoSortFunc,
            getSortFunc: getSortFunc,
            rowAdd: rowAdd,
            rowEdit: rowEdit,
            rowRemove: rowRemove,
            setColumnFix: setColumnFix,
            setTableData: setTableData,
            get tableData() { return this._tableData; },
            get GUID() { return this._GUID },
            clear: clear,
            getColumnIndex: getColumnIndex,
            getTableDataWithPK: getTableDataWithPK,
            getTableRowWithPK: getTableRowWithPK,
            getTableRowsWithPKs: getTableRowsWithPKs,
            getSelectionsPKs: getSelectionsPKs,
            hasSelection: hasSelection,
            addSelectionChangeListener: addSelectionChangeListener,
            removeSelectionChangeListener: removeSelectionChangeListener,
            raiseSelectionChange: raiseSelectionChange,
            setFilter: setFilter,
            resetFilter: resetFilter
        }
    })()

    /*-------------------------------------选择管理器--------------------------------*/
    function SelectionManager(myTable) {
        if (!(myTable instanceof MyTable))
            throw new Error(myTable.id + ": is not instance of MyTable");
        this.myTable = myTable;
        this.selection = new Set();
    }
    SelectionManager.prototype = {
        add: function (tr) {
            if (!this.isTrInMyTBody(tr)) return;
            tr.classList.add(CLASSES.SELECTED);
            this.selection.add(tr);
        },
        remove: function (tr) {
            tr.classList.remove(CLASSES.SELECTED);
            this.selection.delete(tr);
        },
        toggle: function (tr) {
            if (this.selection.has(tr)) {
                this.remove(tr);
                return;
            }
            this.add(tr);
        },
        selFrom: function (tr0, tr1, clearFirst) {
            var p = tr0.parentElement;
            if (!(p === tr1.parentElement && this.isTrInMyTBody(tr0))) return;
            var i = tr0.sectionRowIndex, j = tr1.sectionRowIndex;
            var ii = i > j ? -1 : 1;
            j = j * ii;
            var rs = this.myTable.tBodies[0].rows;
            if (clearFirst) this.clear();
            for (var k = i * ii; k <= j; k++) {
                var tr = rs[k * ii];
                tr.classList.add(CLASSES.SELECTED);
                this.selection.add(tr);
            }
        },
        clear: function () {
            this.selection.forEach(function (v) {
                v.classList.remove(CLASSES.SELECTED);
            });
            this.selection.clear();
            this.updatedSelectedRows();
        },
        updatedSelectedRows: function () {
            this.myTable.setAttribute(ATTRS.SELECTEDROWS, this.selection.size || "");
        },
        isTrInMyTBody: function (tr) {
            var tbd = tr.parentElement;
            return tbd.nodeName.toUpperCase() === "TBODY" && tbd.parentElement === this.myTable;
        },
        getSelectionAtPos: function (i) {
            var ei = i + 1;
            if (ei === 0) {
                return [...this.selection].slice(i)[0];
            } else {
                return [...this.selection].slice(i, ei)[0];
            }

        },
        selLastSelection: function () {
            if (this.selection.size === 0) return;
            var em = this.getSelectionAtPos(-1);
            this.clear();
            this.add(em);
            this.updatedSelectedRows();
            return em;
        },
        setSelection: function (rs) {
            this.clear();
            if (!rs.every(a => this.isTrInMyTBody(a))) return;
            var n = rs.length;
            for (var i = 0; i < n; i++) {
                let tr = rs[i];
                tr.classList.add(CLASSES.SELECTED);
                this.selection.add(tr);
            }
            this.updatedSelectedRows();
        }
    }



    /*-------------------------------------------------------------------------------*/
    function addMyTable(table) {
        if (!table.classList.contains(CLASSES.TABLE)) return null;
        var tbdiv = table.parentElement;
        if (!(tbdiv instanceof HTMLDivElement)) return null;
        MyTable.decorate(table, tbdiv);
        myTables[table.id] = table;
        return table;
    }

    /*-------------------------------------------------------------------------------*/
    function onMouseDown(e) {
        //         console.log(document.URL);
        if (myMenu !== null) myMenu.hide();
        if (e.button !== 0 && e.button !== 2) return;
        var t = e.target;
        if (!(t instanceof HTMLTableCellElement)) return;
        var p = getParent(t, HTMLTableElement);
        if (!(p instanceof MyTable)) return;
        window.getSelection().empty();
        var myTable = p;
        var tr = getParent(t, HTMLTableRowElement);
        if (tr.classList.contains(CLASSES.TABLEHEAD)) {
            /*点击标题行*/
            if (e.button === 0) {
                const rect = t.getBoundingClientRect();
                if (rect.right - e.clientX <= splitterWidth + 1) {
                    handleSplitter.call(t, e);
                    e.preventDefault();
                } else {
                    clickedHead = t;
                }
            }
        } else {
            /*点击其他行*/
            handleSelection(e, myTable, tr);
            e.preventDefault();
        }
    }

    function onMouseUp(e) {
        if (e.button) return;
        if (clickedHead && e.srcElement instanceof HTMLTableCellElement) {
            handleHeadClick();
            e.preventDefault();
        }
    }

    function onDblClick(e) {
        //         console.log(e);
        var t = e.target;
        if (!(t instanceof HTMLTableCellElement && t.hasAttribute("draggable"))) return;
        var p = getParent(t, HTMLTableRowElement);
        if (p == null || !p.classList.contains(CLASSES.TABLEHEAD)) return;
        const rect = t.getBoundingClientRect();
        if (rect.right - e.clientX > splitterWidth + 1) return;
        handleSplitterDbLClick(t);
    }
    /*标题行单击排序*/
    function handleHeadClick() {
        var myTable = getParent(clickedHead, HTMLTableElement);
        if (!(myTable instanceof MyTable)) return;
        if (!myTable.tableData) return;
        if (myTable.tableData.EOF) {
            /*本地排序*/
            myTable.sort(clickedHead.cellIndex);
        } else {
            /*服务器排序*/
            if (myTable.serverSortFunc) {
                let orderBy = clickedHead.textContent;
                myTable.serverSortFunc(orderBy);
            }
        }
        clickedHead = null;
    }
    /*标题行分割线双击自动调整列宽*/
    function handleSplitterDbLClick(td) {
        var myTable = getParent(td, HTMLTableElement);
        if (!(myTable instanceof MyTable)) return;
        myTable.setColumnAutoWidth(td.cellIndex);
    }

    /*--------------------------选择行---------------------------------------------------*/
    function handleSelection(e, myTable, tr) {
        if (myTable.hasAttribute("disabled")) return;

        const i = e.ctrlKey + e.shiftKey * 2;
        const presm = [...myTable.sm.selection];
        if (e.button === 0) {
            switch (i) {
                case 0:/**/
                    myTable.sm.clear();
                    myTable.sm.add(tr);
                    //                 e.preventDefault();
                    break;
                case 1:/*ctrl*/
                    myTable.sm.toggle(tr);
                    //                 e.preventDefault();
                    break;
                case 2:/*shift*/
                    var tr0 = Array.from(myTable.sm.selection)[0] || tr.parentElement.rows[0];
                    myTable.sm.selFrom(tr0, tr, true);
                    //                 e.preventDefault();
                    break;
                case 3:/*ctrl+shift*/
                    var rs = Array.from(myTable.sm.selection)
                    var tr0 = rs[rs.length - 1] || tr.parentElement.rows[0];
                    myTable.sm.selFrom(tr0, tr, false);
                    //                 e.preventDefault();
                    break;
            }
        } else if (e.button === 2) {
            if (i === 0) {
                var p = getParent(e.target, HTMLTableRowElement);
                if (p && myTable.sm.selection.has(p)) return;
                myTable.sm.clear();
                myTable.sm.add(tr);
            }
        }

        if (myTable.selectionChangeListeners.length > 0) {
            let cursm = [...myTable.sm.selection];
            let n = cursm.length;
            if (presm.length !== n) {
                myTable.raiseSelectionChange();
            } else {
                for (let i = 0; i < n; i++) {
                    if (cursm[i] !== presm[i]) {
                        myTable.raiseSelectionChange();
                        break;
                    }
                }
            }
        }

        myTable.sm.updatedSelectedRows();
        Promise.resolve().then(() => {
            var n = e.target.cellIndex;
            var title = myTable.tHead.rows[0].cells[n].textContent;
            var sss;
            if (myTable.sm.selection.size > 1) {
                sss = myTable.sm.selection.size, myTable.sumSelected(n);
                console.log(title, sss);
                myPLM.showStatisticInfo("选中的∑'" + title + "' = " + sss);
            } else {
                sss = myTable.sumAll(n);
                console.log(title, sss);
                myPLM.showStatisticInfo("∑'" + title + "' = " + sss);
            }
        });
    }

    /*-----------------------------标题改变宽度-------------------------------------------*/
    function handleSplitter(e) {
        var startx = e.clientX;//this.getBoundingClientRect().left;
        var handlers = {
            mousemove: onMouseMove.bind(this),
            mouseup: onMouseUp.bind(this)
        }
        for (var et in handlers) {
            document.addEventListener(et, handlers[et], true);
        }

        function onMouseMove(e) {
            if (!e.buttons) {
                onMouseUp(e);
                return false;
            }
            //console.log(e.clientX,startx);
            if (startx === e.clientX) return;
            var nx = (2 * e.clientX - startx) - this.getBoundingClientRect().left;//e.clientX - p.getBoundingClientRect().left;
            startx = e.clientX;
            if (nx > 0) {
                nx = nx + "px";
                this.style.width = nx;
                this.style.minWidth = nx;
                this.style.maxWidth = nx;
            }
            e.preventDefault();
            return false;
        }
        function onMouseUp(e) {
            for (var et in handlers) {
                document.removeEventListener(et, handlers[et], true);
            }
            handlers = null;
        }
    }

    /*-----------------------------------标题拖放----------------------------------------*/
    function onDragStart(e) {
        var t = e.target;
        if (!(t instanceof HTMLTableCellElement && t.hasAttribute("draggable"))) return;
        var p = getParent(t, HTMLTableRowElement);
        if (p == null || !p.classList.contains(CLASSES.TABLEHEAD)) return;

        console.log("dragStart:", e);
        e.dataTransfer.dropEffect = "move";
        var handlers = {
            dragenter: onDragEnter.bind(t),
            dragover: onDragOver.bind(t),
            dragleave: onDragLeave.bind(t),
            drop: onDrop.bind(t),
            dragend: onDragEnd.bind(t)
        }
        document.addEventListener("dragenter", handlers["dragenter"], true);
        document.addEventListener("drop", handlers["drop"], true);
        document.addEventListener("dragend", handlers["dragend"], true);
        var enterElement = null;
        var dragIndicator = "";
        function onDragEnter(e) {
            var tt = e.target;
            if (tt === this || tt.tagName !== this.tagName || !tt.draggable || tt.parentElement !== this.parentElement) return;
            console.log("dragEnter", e.target.textContent);
            removeDragIndicator(enterElement, dragIndicator);
            enterElement = tt;
            document.addEventListener("dragover", handlers["dragover"], true);
            document.addEventListener("dragleave", handlers["dragleave"], true);
        }

        function onDragOver(e) {
            console.log("dragOver", e.target.textContent);
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
            console.log("dragLeave", e.target.textContent);
            document.removeEventListener("dragover", handlers["dragover"], true);
            document.removeEventListener("dragleave", handlers["dragleave"], true);
        }
        function onDrop(e) {
            if (enterElement === null || dragIndicator === "") return;
            console.log("drop ", enterElement.textContent, dragIndicator);
            moveToNewPlace(this, enterElement, dragIndicator);
        }
        function onDragEnd(e) {
            if (enterElement !== null) {
                enterElement.classList.remove(CLASSES.DRAGLINDICATOR);
                enterElement.classList.remove(CLASSES.DRAGRINDICATOR);
                enterElement = null;
                dragIndicator = "";
            }
            console.log("dragEnd");
            for (var et in handlers) {
                document.removeEventListener(et, handlers[et], true);
            }
            handlers = null;
            clickedHead = null;
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
            return ((e.clientX - rect.left) / rect.width) < 0.5 ? CLASSES.DRAGLINDICATOR : CLASSES.DRAGRINDICATOR;
        }

        function moveToNewPlace(em, emDest, dragIndicator) {
            const i = em.cellIndex;
            const j = i < emDest.cellIndex ? -1 : 0;
            const k = (dragIndicator === CLASSES.DRAGLINDICATOR ? 0 : 1) + emDest.cellIndex;
            if (em.cellIndex === k + j) return;
            var p = em.parentElement;
            if (p !== emDest.parentElement) return;

            var tb = getParent(p, HTMLTableElement);
            if (isTableInvalid(tb)) {
                if (!confirm("表格数据不全！！！\n是否继续？")) return;
            }
            var rs = tb.rows;
            for (var n = 0; n < rs.length; n++) {
                var cs = rs[n].cells;
                p = cs[i].parentElement;
                p.insertBefore(cs[i], cs[k]);
            }
        }
    }
    /*-----------------------------------初始化------------------------------------------*/
    var init = function () {
        // var COMMONSTYLE = [
        //     `.${CLASSES.TABLEDIV}{
        //         /*包含table的div样式*/
        //         position:relative;
        //         overflow:auto;
        //         border:1px solid ${colorOutline};
        //         border:1px solid var(--border-color);
        //     }`,

        //     `.${CLASSES.TABLE}{
        //         /*自定义颜色属性*/
        //         table-layout:fixed;
        //         width:auto;
        //         position:absolute;
        //         top:0;
        //         left:0;
        //     }`,
        //     `.${CLASSES.TABLE}:before{
        //         /*选中行数*/
        //         content:attr(${ATTRS.SELECTEDROWS});
        //         display:block;
        //         position:absolute;
        //         background-color: var(--selected-color);
        //         color:white;
        //         padding:.2em .2em;
        //         top:var(--scroll-top,0);
        //         left:var(--scroll-left,0);
        //         z-index:10;
        //         box-sizing: border-box;
        //         font-weight:bold;
        //         font-family: serif;
        //         border-radius:1em;
        //         box-shadow: 1px 1px 3px grey;
        //     }`,
        //     `.${CLASSES.TABLE} td{
        //         /*单元格样式*/
        //         cursor: default;
        //         overflow:hidden;text-overflow:ellipsis;
        //         border-right:1px solid ${colorOutline};
        //         border-bottom:1px solid {$colorOutline}";
        //         border-right:1px solid var(--border-color);
        //         border-bottom:1px solid var(--border-color);
        //         padding:.2em .5em;
        //     }`,
        //     `.${CLASSES.TABLE} tbody td:nth-last-child(n+2){
        //         /*最后一列宽度不可压缩*/
        //         max-width:10px;
        //     }`,
        //     `.${CLASSES.TABLE} tbody tr:hover{
        //         background:var(--preselect-color);
        //     }`,
        //     `.${CLASSES.TABLEHEAD} td{
        //         /*标题样式*/
        //         background-image:-webkit-linear-gradient(#FAFAFA00 20%,#C8C8C8AA);
        //         background-image:linear-gradient(rgba(250,250,250,0) 20%,rgba(200,200,200,0.67));
        //         background-color:var(--thead-color);
        //     }`,
        //     `.${CLASSES.TABLEHEAD} td:hover{
        //         /*标题悬浮样式*/
        //         background-image:-webkit-linear-gradient(#03A9F420 10%,#FAFAFAFF 35%,#FAFAFAFF 38%,#03A9F470 40%,#03A9F450);
        //         background-color:var(--frozon-color);
        //     }`,
        //     `.${CLASSES.TABLEHEAD} td:active{
        //         /*标题点击样式*/
        //         background:var(--selected-color) !important;
        //     }`,
        //     `.${CLASSES.TABLEHEAD} td:hover:after{
        //         /*分割线样式*/
        //         content:\"\";
        //         cursor:e-resize !important;
        //         display: block;
        //         width: ${splitterWidth}px;
        //         position:absolute;
        //         top:0;
        //         bottom:0;
        //         right:0;
        //         /*background-color: var(--drag-color);*/
        //         box-sizing: border-box;
        //     }`,
        //     `.${CLASSES.DRAGLINDICATOR}:before,.${CLASSES.DRAGRINDICATOR}:after{
        //         /*拖放光标样式*/
        //         content:\"\";
        //         display: block;
        //         width: 12px;
        //         position:absolute;
        //         top:0;
        //         bottom:0;
        //         background-color: ${colorDrag};
        //         border: 3px solid ${colorDrag};
        //         background-color: var(--drag-color);
        //         border: 3px solid var(--drag-color);
        //         border-left-color: transparent;
        //         border-right-color: transparent;
        //         background-clip: padding-box;
        //         box-sizing: border-box;
        //     }`,
        //     `.${CLASSES.DRAGLINDICATOR}:before{
        //         /*左拖放光标*/
        //         left:0;
        //         transform:translateX(-50%);
        //     }`,
        //     `.${CLASSES.DRAGRINDICATOR}:after{
        //         /*右拖放光标*/
        //         right:0;
        //         transform:translateX(50%);
        //     }`,
        //     `.${CLASSES.SELECTED} td{
        //         background-color:var(--selected-color) !important;
        //         color:white;
        //     }`
        // ];

        myPLM = myPLM || top.myPLM;
        if (myPLM) myMenu = myMenu || myPLM.myMenu;

        // mySh = createMyStyleSheet();
        // for (var i = 0; i < COMMONSTYLE.length; i++) {
        //     mySh.insertRule(COMMONSTYLE[i], 0);
        // }

        var tbs = document.getElementsByClassName(CLASSES.TABLE);
        for (var i = 0; i < tbs.length; i++) {
            var tb = tbs[i];
            addMyTable(tb);
        }

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("dragstart", onDragStart);
        document.addEventListener("dblclick", onDblClick);

        _dispatchEvent(EVENTS.MYTABLEMAGLOAD);
        readyState = true;
    }

    function _dispatchEvent(et) {
        var fs = _listener[et];
        if (!fs) return;
        for (var i = 0; i < fs.length; i++) {
            fs[i]();
        }
        return true;
        //         console.log(e);
    }
    function addListener(et, func) {
        if (!_listener[et]) _listener[et] = [];
        _listener[et].push(func);
        if (et === EVENTS.MYTABLEMAGLOAD && readyState) {
            func();
        }
    }

    function removeListener(et, func) {
        var fs = _listener[et]
        if (!fs) return;
        var i = fs.indexOf(func);
        if (i >= 0) {
            fs.splice(i, 1);
            return true;
        }
    }
    window.addEventListener("DOMContentLoaded", init);
    return {
        MyTable: MyTable,
        myTables: myTables,
        addMyTable: addMyTable,
        EVENTS: EVENTS,
        addListener: addListener,
        removeListener: removeListener,
        listener: _listener
    };
})();



// window.addEventListener('DOMContentLoaded', (init)=>buildTable(bom));


