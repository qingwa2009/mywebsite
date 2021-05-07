"use strict";
class MyTable extends HTMLTableElement {
    static TAG = "my-table";
    constructor() {
        super();
    }
}

customElements.define(MyTable.TAG, MyTable, { extends: "table" });
