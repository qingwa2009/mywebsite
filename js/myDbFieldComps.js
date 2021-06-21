import { enumAllChildren } from "./myUtil.js";
import MyDbCriteria from "./myDbCriteria.js";

export default class MyDbFieldComps {
    /**
     * 枚举paraentEm所有继承MyDbFieldComps的子控件，创建MyDbCriteria，\
     * 只有写了fieldname属性的元素会取值
     * @param {HTMLElement} parentEm      
     * @param {HTMLElement[]} ignoreEms 忽略部分元素
     * @returns {MyDbCriteria}
     */
    static createCriteria(parentEm, ignoreEms) {
        const criteria = new MyDbCriteria();

        for (const em of enumAllChildren(parentEm)) {
            if (em instanceof MyDbFieldComps.MyInput || em instanceof MyDbFieldComps.MySelect) {
                if (ignoreEms && ignoreEms.includes(em)) continue;

                const c = em.getCriteriaWhere();
                if (c) {
                    if (c instanceof Array) {
                        for (const cc of c) {
                            criteria.addWhere(cc);
                        }
                    } else {
                        criteria.addWhere(c);
                    }
                }
            }
        }

        return criteria;
    }

    /**
     * 枚举paraentEm所有继承MyDbFieldComps的子控件获取值，\
     * 只有写了id的元素会取值
     * @param {HTMLElement} parentEm      
     * @param {HTMLElement[]} ignoreEms 忽略部分元素
     * @returns {Object<string, number|string|boolean>} 
     * 返回{id: value,...}
     */
    static createJSON(parentEm, ignoreEms) {
        const obj = {};

        for (const em of enumAllChildren(parentEm)) {
            if (em instanceof MyDbFieldComps.MyInput || em instanceof MyDbFieldComps.MySelect) {
                if (ignoreEms && ignoreEms.includes(em)) continue;
                const id = em.id;
                if (!id) continue;
                const v = em.getJSONValue();
                if (v === null) continue;
                obj[id] = v;
            }
        }

        return obj;
    }

    /**
     * 枚举paraentEm所有继承MyDbFieldComps的子控件设置disable状态
     * @param {HTMLElement} parentEm     
     * @param {boolean} disable 
     */
    static setAllDisable(parentEm, disable) {
        parentEm.setAttribute("disabled", disable);
        for (const em of enumAllChildren(parentEm)) {
            if (em instanceof MyDbFieldComps.MyInput || em instanceof MyDbFieldComps.MySelect) {
                em.setAttribute("disabled", disable);
            }
        }
    }
}

MyDbFieldComps.MyInput = class extends HTMLInputElement {


    constructor() {
        super();
        /**用于查询时的字段名 */
        this.fieldName = this.getAttribute(MyDbFieldComps.MyInput.ATTR_FIELD_NAME);
        /**模糊查询类型 [left, right, both]*/
        this.fieldLike = this.getAttribute(MyDbFieldComps.MyInput.ATTR_FIELD_LIKE);
        if (this.hasAttribute(MyDbFieldComps.MyInput.ATTR_FIELD_UPPERCASE)) {
            this.addEventListener("input", () => this.value = this.value.toUpperCase());
        }

        if (this.hasAttribute(MyDbFieldComps.MyInput.ATTR_FIELD_COMPARE)) {
            this.fieldCompare = this.getAttribute(MyDbFieldComps.MyInput.ATTR_FIELD_COMPARE);
        }
    }

    /**
     * @returns {MyDbCriteria.CriteriaWhere | null}
     */
    getCriteriaWhere() {
        if (!this.fieldName) return null;
        switch (this.type) {
            case "text":
            case "search":
            case "tel":
            case "url":
            case "email":
            case "number":
                return this._getTextCriteria();
            case "date":
                return this._getDateCriteria();
            default:
                console.warn(`this type of input '${this.type}' can not getCriteriaWhere!`);
                return null;
        }
    }

    /**
     * 文字类型
     * @returns {MyDbCriteria.CriteriaWhere | null}
     */
    _getTextCriteria() {
        const value = this.value.trim();
        if (!value) return null;

        const where = new MyDbCriteria.CriteriaWhere();

        where.field = this.fieldName;
        where.op = "like";
        switch (this.fieldLike) {
            case MyDbFieldComps.MyInput.FIELD_LIKE_TYPE.Left:
                where.rhs = `%${value}`;
                break;
            case MyDbFieldComps.MyInput.FIELD_LIKE_TYPE.Right:
                where.rhs = `${value}%`;
                break;
            case MyDbFieldComps.MyInput.FIELD_LIKE_TYPE.Both:
                where.rhs = `%${value}%`;
                break;
            default:
                where.rhs = value;
                where.op = "=";
                break;
        }

        return where;
    }

    /**
     * 日期类型
     * @returns { MyDbCriteria.CriteriaWhere|MyDbCriteria.CriteriaWhere[] | null}
     */
    _getDateCriteria() {
        const date = this.value;

        if (!date) return null;
        if (!MyDbFieldComps.MyInput.COMPARE_TYPES.includes(this.fieldCompare)) {
            console.error(`date compare type '${this.fieldCompare}' must not in ${MyDbFieldComps.MyInput.COMPARE_TYPES}`);
            return null;
        }
        const wheres = [new MyDbCriteria.CriteriaWhere(), new MyDbCriteria.CriteriaWhere()];
        wheres[0].field = this.fieldName;
        wheres[0].op = this.fieldCompare;
        wheres[1].field = this.fieldName;
        wheres[1].op = this.fieldCompare;
        wheres[0].rhs = { func: "datetime", param: [] };
        wheres[1].rhs = { func: "datetime", param: [] };

        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        const mm = d.getMonth() + 1;
        const dd = d.getDate();
        const date2 = `${d.getFullYear()}-${mm > 9 ? mm : '0' + mm}-${dd > 9 ? dd : '0' + dd}`

        switch (this.fieldCompare) {
            case "=":
                wheres[0].op = ">=";
                wheres[0].rhs.param.push(date);
                wheres[1].op = "<";
                // wheres[1].rhs.param(date, "+1 day");
                wheres[1].rhs.param.push(date2);
                return wheres
            case "<=":
                wheres[1].op = "<";
                // wheres[1].rhs.param(date, "+1 day");
                wheres[1].rhs.param.push(date2);
                return wheres[1];
            case "<":
                wheres[0].op = "<";
                wheres[0].rhs.param.push(date);
                return wheres[0];
            case ">=":
                wheres[0].op = ">=";
                wheres[0].rhs.param.push(date);
                return wheres[0];
            case ">":
                wheres[1].op = ">=";
                // wheres[1].rhs.param(date, "+1 day");
                wheres[1].rhs.param.push(date2);
                return wheres[1];
            default:
                return null;
        }
    }

    /**返回元素的值，或者null */
    getJSONValue() {
        switch (this.type) {
            case "text":
            case "search":
            case "tel":
            case "url":
            case "email":
                return this._getJSONText();
            case "number":
                return this._getJSONNumber();
            case "checkbox":
                return this._getJSONCheckbox();
            case "date":
                return this._getJSONDate();
            default:
                console.warn(`this type of input '${this.type}' can not getJSONValue!`);
                return null;
        }
    }

    _getJSONNumber() {
        if (this.value === "") return null;
        return Number(this.value);
    }

    _getJSONText() {
        const value = this.value.trim();
        if (!value) return null;
        return value;
    }

    _getJSONDate() {
        if (!this.value) return null;
        return Math.round(new Date(this.value).getTime() / 1000);
    }

    _getJSONCheckbox() {
        if (!this.checked) return null;
        return this.value;
    }

    setValue(v) {
        switch (this.type) {
            case "text":
            case "search":
            case "tel":
            case "url":
            case "email":
            case "number":
            case "date":
                this.value = v;
                return;
            case "checkbox":
                this.checked = this.value == v;
                return;
            default:
                throw new Error(`this type of input '${this.type}' can not setValue!`);
        }
    }

}

MyDbFieldComps.MyInput.TAG = "my-input";
/**用于查询时的字段名 */
MyDbFieldComps.MyInput.ATTR_FIELD_NAME = "fieldname";
/**模糊查询类型 [left, right, both]*/
MyDbFieldComps.MyInput.ATTR_FIELD_LIKE = "fieldlike";
/**自动大写 */
MyDbFieldComps.MyInput.ATTR_FIELD_UPPERCASE = "uppercase";
/**比较类型 = < <= > >= \
 */
MyDbFieldComps.MyInput.ATTR_FIELD_COMPARE = "fieldcompare";

MyDbFieldComps.MyInput.FIELD_LIKE_TYPE = {
    Left: "left",
    Right: "right",
    Both: "both",
}
MyDbFieldComps.MyInput.COMPARE_TYPES = ["=", "<=", "<", ">=", ">"];

customElements.define(MyDbFieldComps.MyInput.TAG, MyDbFieldComps.MyInput, { extends: "input" });


const URL_GET_LIST_ITEMS = "/myplm/getlist";
MyDbFieldComps.MySelect = class extends HTMLSelectElement {

    constructor() {
        super();
        /**用于查询时的字段名 */
        this.fieldName = this.getAttribute(MyDbFieldComps.MySelect.ATTR_FIELD_NAME);
        /**自动请求加载列表的url*/
        this.fieldQuery = this.getAttribute(MyDbFieldComps.MySelect.ATTR_FIELD_QUERY);
        /**模糊查询类型 [left, right, both]*/
        this.fieldLike = this.getAttribute(MyDbFieldComps.MySelect.ATTR_FIELD_LIKE);
        /**显示的行过滤 */
        this.fieldRowFilter = this.getAttribute(MyDbFieldComps.MySelect.ATTR_FIELD_ROWFILTER);
        /**默认值 */
        this.fieldDefaultValue = this.getAttribute(MyDbFieldComps.MySelect.ATTR_FIELD_DEFAULT_VALUE);

        if (this.fieldRowFilter) {
            try {
                this.fieldRowFilter = new Function(`return (${this.fieldRowFilter})(...arguments)`);
            } catch (error) {
                console.error("field row filter invalid: ", error);
            }
        }

        this.addEventListener("contextmenu", () => this.value = "");
        this.reloadList();
    }

    /**
     * @returns {Promise<void>}
     */
    reloadList() {
        if (!this.fieldQuery) return;
        const url = new URL(URL_GET_LIST_ITEMS, location);
        url.searchParams.append(this.fieldQuery, "");

        if (top.App) {
            return top.App.getSelectList(url.toString()).then(mtd => {
                const data = mtd.data;
                const n = data.length;
                this.innerHTML = "";
                if (!MyDbFieldComps.MySelect._tempDoc) MyDbFieldComps.MySelect._tempDoc = document.createDocumentFragment();
                MyDbFieldComps.MySelect._tempDoc.appendChild(document.createElement("option"));
                for (let i = 0; i < n; i++) {
                    const dt = data[i];
                    if (this.fieldRowFilter && !this.fieldRowFilter(...dt)) continue;
                    const em = document.createElement("option");
                    em.value = dt[0];
                    em.textContent = `${dt[0]} ${dt[1]}`;
                    if (this.fieldDefaultValue == dt[0]) em.setAttribute("selected", "true");
                    MyDbFieldComps.MySelect._tempDoc.appendChild(em);
                }
                this.append(MyDbFieldComps.MySelect._tempDoc);
            }, error => { });
        } else {
            const msg = "auto load select list failed: top.App is undefined!";
            console.error(msg);
            return Promise.reject(new Error(msg));
        }
    }

    /**
     * @returns {MyDbCriteria.CriteriaWhere | null}
     */
    getCriteriaWhere() {
        if (!this.fieldName) return null;
        const value = this.value;
        if (!value) return null;

        const where = new MyDbCriteria.CriteriaWhere();

        where.field = this.fieldName;
        where.op = "like";
        switch (this.fieldLike) {
            case MyDbFieldComps.MyInput.FIELD_LIKE_TYPE.Left:
                where.rhs = `%${value}`;
                break;
            case MyDbFieldComps.MyInput.FIELD_LIKE_TYPE.Right:
                where.rhs = `${value}%`;
                break;
            case MyDbFieldComps.MyInput.FIELD_LIKE_TYPE.Both:
                where.rhs = `%${value}%`;
                break;
            default:
                where.rhs = value;
                where.op = "=";
                break;
        }

        return where;
    }

    getJSONValue() {
        if (this.value === "") return null;
        return this.value;
    }

    setValue(v) {
        this.value = v;
    }
}

MyDbFieldComps.MySelect.TAG = "my-select";
/**用于查询时的字段名 */
MyDbFieldComps.MySelect.ATTR_FIELD_NAME = "fieldname";
/**自动请求加载列表的url*/
MyDbFieldComps.MySelect.ATTR_FIELD_QUERY = "fieldquery";
/**显示的行过滤 */
MyDbFieldComps.MySelect.ATTR_FIELD_ROWFILTER = "fieldrowfilter";
/**模糊查询类型 [left, right, both]*/
MyDbFieldComps.MySelect.ATTR_FIELD_LIKE = "fieldlike";
/**默认值 */
MyDbFieldComps.MySelect.ATTR_FIELD_DEFAULT_VALUE = "defaultvalue";

customElements.define(MyDbFieldComps.MySelect.TAG, MyDbFieldComps.MySelect, { extends: "select" });
