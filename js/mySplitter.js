"use strict";

export default class MySplitter extends HTMLElement {
  static TAG = "my-splitter";
  static TYPE = { horizontal: "horizontal", vertical: "vertical" }
  static EDIT = { prev: "editprev", next: "editnext", both: "editboth" }

  constructor() {
    super();
    this.addEventListener("mousedown", this._handleOnMouseDown, true);
    this.handlers = {
      mousemove: this._handleOnMouseMove.bind(this),
      mouseup: this._handleOnMouseUp.bind(this)
    };

    this.attachShadow({ mode: "open" });
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = "/css/mySplitter.css"
    this.shadowRoot.appendChild(link);

    console.log("MySplitter.constructed!");
  }
  _handleOnMouseDown(e) {
    for (var k in this.handlers) {
      document.addEventListener(k, this.handlers[k], true);
    }
    console.log("Splitter down!");
  }
  _handleOnMouseMove(e) {
    if (!e.buttons) {
      this._handleOnMouseUp(e);
      return false;
    }
    const preE = this.previousElementSibling;
    const nextE = this.nextElementSibling;
    if (!(preE && nextE)) return;
    const rect1 = preE.getBoundingClientRect();
    const rect2 = nextE.getBoundingClientRect();

    var t, offset;
    if (this.hasAttribute(MySplitter.TYPE.vertical)) {
      t = "width";
      offset = e.clientX - rect1.right;
    } else {
      t = "height"
      offset = e.clientY - rect1.bottom;
    }

    if (this.hasAttribute(MySplitter.EDIT.both)) {
      preE.style[t] = rect1[t] + offset + "px";
      nextE.style[t] = rect2[t] - offset + "px";
    } else if (this.hasAttribute(MySplitter.EDIT.next)) {
      nextE.style[t] = rect2[t] - offset + "px";
    } else {
      preE.style[t] = rect1[t] + offset + "px";
    }

    e.preventDefault();
    //     console.log("moving");
  }
  _handleOnMouseUp(e) {
    for (var k in this.handlers) {
      document.removeEventListener(k, this.handlers[k], true);
    }
    console.log("Splitter up!");
  }
}

customElements.define(MySplitter.TAG, MySplitter);
