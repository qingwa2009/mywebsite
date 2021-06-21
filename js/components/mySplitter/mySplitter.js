"use strict";

export default class MySplitter extends HTMLElement {

  constructor() {
    super();
    this.addEventListener("mousedown", this._handleOnMouseDown);
    this.addEventListener("touchstart", this._handleOnMouseDown);

    const hm = this._handleOnMouseMove.bind(this);
    const hu = this._handleOnMouseUp.bind(this);
    this.handlers = {
      mousemove: hm,
      mouseup: hu,
      touchmove: hm,
      touchend: hu,
      touchcancel: hu,
    };

    this.attachShadow({ mode: "open" });
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = new URL("mySplitter.css", import.meta.url);
    this.shadowRoot.appendChild(link);

    console.log("MySplitter.constructed!");
  }
  _handleOnMouseDown(e) {
    for (var k in this.handlers) {
      document.addEventListener(k, this.handlers[k], { passive: false });
    }
    console.log("Splitter down!");
  }
  _handleOnMouseMove(e) {
    if (!((e instanceof TouchEvent) || e.buttons)) {
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
      offset = (e instanceof TouchEvent ? e.touches[0].clientX : e.clientX) - rect1.right;
    } else {
      t = "height"
      offset = (e instanceof TouchEvent ? e.touches[0].clientY : e.clientY) - rect1.bottom;
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
      document.removeEventListener(k, this.handlers[k], { passive: false });
    }
    console.log("Splitter up!");
  }
}
MySplitter.TAG = "my-splitter";
MySplitter.TYPE = { horizontal: "horizontal", vertical: "vertical" }
MySplitter.EDIT = { prev: "editprev", next: "editnext", both: "editboth" }

customElements.define(MySplitter.TAG, MySplitter);
