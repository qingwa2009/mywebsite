"use strict";
import MyMemu from "../components/myMenu/myMenu.js";

window.addEventListener('DOMContentLoaded', () => {
	const App = top.window.App;
	/**@type{MyMemu} */
	const myMenu = App.myMenu;
	const origin = top.location.origin;				// http://127.0.0.1
	const host = top.location.host;					// 127.0.0.1
	const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1

});
