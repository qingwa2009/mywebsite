'use strict';
function kaka(){
	
}
window.addEventListener('DOMContentLoaded', ()=>{
	console.log('DOMContentLoaded');
});
window.addEventListener('load', ()=>{
	console.log('load');
});
document.addEventListener('readystatechange', ()=>{
	console.log('readystatechange: '+document.readyState);
});
console.log(window.kaka);