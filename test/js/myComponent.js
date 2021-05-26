'use strict';
const pe = /\b(src|href)\s*?=\s*?(["'])(.+?)\2/gi;

class MyComp extends HTMLElement {
    static ATTR_TEMPLATE_ID = "templateid";
    constructor() {
        super();
        const tempid = this.getAttribute(MyComp.ATTR_TEMPLATE_ID);
        if (tempid) {
            const temp = document.getElementById(tempid).content;
            const shadow = this.attachShadow({ mode: 'open' });
            shadow.appendChild(temp.cloneNode(true));
        }
    }
}

customElements.define("my-template", class extends HTMLTemplateElement {
    constructor() {
        super();
        const url = this.getAttribute("src");

        if (url) {
            const xhr = new XMLHttpRequest();
            xhr.open('get', url);
            xhr.send();
            xhr.onload = ev => {
                const newBase = new URL(url, this.baseURI).href;
                const html = xhr.responseText;
                this.innerHTML = html.replace(pe, (...args) => {
                    return `${args[1]}="${new URL(args[3], newBase).href}"`;
                });
                customElements.define("my-comp", MyComp);
            };
        }
    }
}, { extends: 'template' });

