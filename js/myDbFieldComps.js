import { enumAllChildren } from "./myUtil.js";
import MyDbCriteria from "./MyDbCriteria.js";

export default class MyDbFieldComps {
    /**
     * 枚举paraentEm所有子控件，创建MyDbCriteria
     * @param {HTMLElement} parentEm      
     * @returns {MyDbCriteria}
     */
    static createCriteria(parentEm) {
        const criteria = new MyDbCriteria();

        for (const em of enumAllChildren(parentEm)) {
            if (em instanceof MyDbFieldComps.MyInput) {
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
}

MyDbFieldComps.MyInput = class extends HTMLInputElement {
    static TAG = "my-input";
    /**用于查询时的字段名 */
    static ATTR_FIELD_NAME = "fieldname";
    /**模糊查询类型 [left, right, both]*/
    static ATTR_FIELD_LIKE = "fieldlike";
    /**自动大写 */
    static ATTR_FIELD_UPPERCASE = "uppercase";
    /**比较类型 = < <= > >= \
     */
    static ATTR_FIELD_COMPARE = "fieldcompare";

    static FIELD_LIKE_TYPE = {
        Left: "left",
        Right: "right",
        Both: "both",
    }

    static COMPARE_TYPES = ["=", "<=", "<", ">=", ">"];

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
                break;
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

}
customElements.define(MyDbFieldComps.MyInput.TAG, MyDbFieldComps.MyInput, { extends: "input" });
