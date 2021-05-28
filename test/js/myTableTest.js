'use strict';
import MyTable from '../../components/myTable/myTable.js';

window.addEventListener("DOMContentLoaded", () => {
    const mymenu = document.getElementsByTagName("my-menu")[0];
    mymenu.classList.add("test");

    /**@type{MyTable} */
    const mytable = document.getElementsByTagName("my-table")[0];
    const extendMenuItems = [
        "",
        { title: "menu1", func: callback, disabled: false },
        "",
        [
            "submenu",
            { title: "menu2", func: callback, disabled: true },
            { title: "menu3", func: callback, disabled: false },
            "",
            { title: "menu4", func: callback, disabled: false },
        ],
        { title: "menu5", func: callback, disabled: false },
        [
            "submenu",
            { title: "menu6", func: callback, disabled: true },
            { title: "menu7", func: callback, disabled: false },
            "",
            { title: "menu8", func: callback, disabled: false },
        ],
        "",
    ];
    function callback(...args) {
        console.log(args);
    }
    mytable.extendMenuItems(extendMenuItems, -2);


    const mtd = {
        title: ["a", "数量", "b", "c"],
        data: [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 16],
        ],
        EOF: true,
    }

    document.getElementById("clear").onclick = () => {
        mytable.clearTable();
    }

    document.getElementById("add").onclick = () => {
        mytable.setTableData(mtd, false, (tr, dt) => {
            if (parseInt(dt["数量"].textContent) > 5) {
                dt["数量"].style.backgroundColor = "pink";
            }
            if (dt["a"].textContent === "1") {
                tr.style.backgroundColor = "yellow";
            }
        });
    }

    document.getElementById("reload").onclick = () => {
        mytable.setTableData(mtd, true, (tr, dt) => {
            if (parseInt(dt["数量"].textContent) > 5) {
                dt["数量"].style.backgroundColor = "pink";
            }
            if (dt["a"].textContent === "1") {
                tr.style.backgroundColor = "yellow";
            }
        });
    }




    mytable.addSelectionChangedEvent((rs) => {
        console.log(rs);
    })



});