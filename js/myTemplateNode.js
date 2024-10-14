"use strict";
const MY_TEMPLATE_NODE_CLASSNAME = "mytemplate"

export default class MyTemplates{
	constructor(){
		/**
		 * @type {Map<string, Element>}
		 */
		this.templates = new Map();
		let ems = document.getElementsByClassName(MY_TEMPLATE_NODE_CLASSNAME);
		let i = 0;
		for (const em of ems) {
			let id = em.id;
			if(!id){
				id = `temp${i}`;
				i++;
			}
			em.id="";
			em.classList.remove(MY_TEMPLATE_NODE_CLASSNAME);
			em.remove();
			this.templates.set(id, em);
		}
	}
	/**
	 * @param {string} id 
	 * @returns {Element}
	 */
	clone(id){
		if(!this.templates.has(id)) 
			throw `not template for ${id}`;
		let em = this.templates.get(id);
		return em.cloneNode(true);
	}
}
// window.addEventListener('DOMContentLoaded', () => {
// 	window.mytemplates=new MyTemplates();
// });
