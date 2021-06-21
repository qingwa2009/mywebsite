"use strict";

export default class MyInputFile extends HTMLElement {


  constructor() {
    super();

    this.input = document.createElement("input");
    this.input.id = MyInputFile.ID;
    this.input.type = "file";

    this.label = document.createElement("label");
    this.label.setAttribute("for", MyInputFile.ID);

    this.attachShadow({ mode: "open" });
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = new URL("myInputFile.css", import.meta.url);

    this.shadowRoot.appendChild(link);

    this.shadowRoot.appendChild(this.input);
    this.shadowRoot.appendChild(this.label);

    const attrs = ["accept", "capture", "multiple"];
    const ans = this.getAttributeNames()
    for (const a of attrs) {
      if (ans.includes(a)) {
        this.setAttribute(a, this.getAttribute(a));
      }
    }

    console.log("MyInputFile.constructed!");
  }

  setAttribute(...args) {
    this.input.setAttribute(...args);
  }

  removeAttribute(...args) {
    this.input.removeAttribute(...args);
  }

  set disabled(value) {
    this.input.disabled = value;
  }

  clear() {
    this.input.value = "";
  }

  get files() {
    return this.input.files;
  }

  /**   
   * @param {(fs: FileList)=>{}} callback 
   */
  addOnChangeListener(callback) {
    this.input.addEventListener("change", () => callback(this.input.files))
  }

}
MyInputFile.TAG = "my-input-file";
MyInputFile.ID = "uploadicon";
customElements.define(MyInputFile.TAG, MyInputFile);
