"use strict";

import MyMenu from "../../components/myMenu/myMenu.js";

/**@type{MyMenu} */
const myMenu = document.createElement(MyMenu.TAG);//new MyMenu();
myMenu.init();
window.myMenu = myMenu;

function callback(currentTarget, target, obj) {
    console.log(currentTarget, target, obj);
}

/**@param {MouseEvent} e 
 * @returns boolean
 */
function filter(e) {
    if (e.target instanceof HTMLDivElement) return false;
    return true;
}

const menu = [
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
];

myMenu.bindElementMenu(document.documentElement, menu, MyMenu.TYPES.CONTEXTMENU, filter);

window.addEventListener("DOMContentLoaded", () => {
    myMenu.bindElementMenu(document.getElementById("id"), menu, MyMenu.TYPES.MENU);
    const frame = document.getElementsByTagName("iframe")[0];
    myMenu.bindElementMenu(frame.contentDocument.documentElement, menu, MyMenu.TYPES.CONTEXTMENU);
    myMenu.bindWindow(frame.contentWindow);
    frame.contentWindow.addEventListener("DOMContentLoaded", () => {
        myMenu.bindElementMenu(frame.contentDocument.getElementById("id"), menu, MyMenu.TYPES.MENU);
        const frame2 = frame.contentDocument.getElementsByTagName("iframe")[0];
        myMenu.bindElementMenu(frame2.contentDocument.documentElement, menu, MyMenu.TYPES.CONTEXTMENU);
        myMenu.bindWindow(frame2.contentWindow);
        frame2.contentWindow.addEventListener("DOMContentLoaded", () => {
            myMenu.bindElementMenu(frame2.contentDocument.getElementById("id"), menu, MyMenu.TYPES.MENU);
            console.log("load 2");
        });
        console.log("load 1");
    });

    console.log("load 0");
});