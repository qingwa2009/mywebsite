'use strict';
import * as md from "./moduleTest.js";
import * as md2 from "./moduleTest.js";
function lala(){

}
console.log(md.lala());
console.log(md2.lala());

window.addEventListener('DOMContentLoaded', ()=>{
	console.log('DOMContentLoaded');
});
window.addEventListener('load', ()=>{
	console.log('load');
});
document.addEventListener('readystatechange', ()=>{
	console.log('readystatechange: '+document.readyState);
});
console.log("in module window.lala", window.lala);