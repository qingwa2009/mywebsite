"use strict";

class PopUpInfo extends HTMLElement {
    constructor() {
        super();
        let shadow = this.attachShadow({ mode: 'open' });
        let wrapper = document.createElement('span');
        wrapper.setAttribute('class', 'wrapper');
        let icon = document.createElement('span');
        icon.setAttribute('class', 'icon');
        icon.setAttribute('tabindex', 0);
        let info = document.createElement('span');
        info.setAttribute('class', 'info');
        let text = this.getAttribute('data-text');
        info.textContent = text;

        let imgUrl;
        if (this.hasAttribute('img')) {
            imgUrl = this.getAttribute('img');
        } else {
            imgUrl = 'js/serviceworkers/icon.png';
        }
        let img = document.createElement('img');
        img.src = imgUrl;
        icon.appendChild(img);

        let style = document.createElement('style');
        style.textContent = `
        .wrapper{
            position:relative;
        }
        .info{
            font-size:0.8em;
            width:200px;
            display:inline-block;
            border:1px solid black;
            padding: 10px;
            background:white;
            border-radius:10px;
            opacity:0;
            transition:0.6s all;
            position:absolute;
            bottom:10px;
            left: 10px;
            z-index:3;
        }
        img{
            width:1.2em;
        }
        .icon:hover + .info, .icon:focus + .info{
            opacity:1;
        }
        `;

        // const linkEm=document.createElement('link');
        // linkEm.setAttribute('rel', 'stylesheet');
        // linkEm.setAttribute('href', 'style.css');
        // shadow.appendChild(linkEm);

        shadow.appendChild(style);
        shadow.appendChild(wrapper);
        wrapper.appendChild(icon);
        wrapper.appendChild(info);
    }


}
customElements.define('popup-info', PopUpInfo);

window.addEventListener('DOMContentLoaded', () => {
    /**@type{HTMLTemplateElement} */
    const temp = document.getElementById('temp');
    //template元素不会显示在文档里，需要手动将其内容添加到文档里才会显示出来
    temp.parentElement.appendChild(temp.content);


});
