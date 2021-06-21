export default class MyTableData {

    constructor() {
        /**用于分页查找，加载下一页 */
        this.ID = "";
        this.count = 0;
        /**对于分页查询可以用来显示查询到的总记录数，默认值-1 */
        this.totalCount = -1;
        this.EOF = true;
        this.title = [];
        this.type = [];
        this.data = [];
        this.error = "";
    }
    toString() {
        return JSON.stringify(this);
    }

    /**@returns{MyTableData} */
    static decorate(mtd) {
        if (!mtd.hasOwnProperty("ID")) mtd.ID = "";
        if (!mtd.hasOwnProperty("EOF")) mtd.EOF = true;
        if (!mtd.hasOwnProperty("title")) throw new TypeError("Its not MyTableData!");
        if (!mtd.hasOwnProperty("data")) throw new TypeError("Its not MyTableData!");

        Object.setPrototypeOf(mtd, MyTableData.prototype);
        return mtd;
    }

    createTitleIndex() {
        if (this.titleIndex) return;
        const titleIndex = {};
        for (let i = 0; i < this.title.length; i++) {
            titleIndex[this.title[i]] = i;
        }
        Object.defineProperty(this, "titleIndex", { value: titleIndex });
    }

    /**
     * 调用前请确保已经调用createTitleIndex创建了索引
     * @param {number} row 
     * @param {string} title 
     */
    getData(row, title) {
        return this.data[row][this.titleIndex[title]];
    }

    /**
     * 枚举data里面的每一条数据，如果data的长度与title的长度不一致将报错
     * @param {boolean} cloneObject false时枚举返回同一个对象，true每次枚举返回新对象，默认false
     * @returns {IterableIterator<Object<string, string>>}
     */
    *iterator(cloneObject = false) {
        const n = this.data.length;
        const m = this.title.length;
        if (cloneObject) {
            for (let i = 0; i < n; i++) {
                const obj = {};
                const dt = this.data[i];
                // if (dt.length !== m) throw new TypeError("data length does not match title length!");
                for (let j = 0; j < m; j++) {
                    obj[this.title[j]] = dt[j];
                }
                yield obj;
            }
        } else {
            const obj = {};
            for (let i = 0; i < n; i++) {
                const dt = this.data[i];
                // if (dt.length !== m) throw new TypeError("data length does not match title length!");
                for (let j = 0; j < m; j++) {
                    obj[this.title[j]] = dt[j];
                }
                yield obj;
            }
        }
    }
}