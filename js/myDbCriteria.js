"use strict";
const availableOparations = {
    "=": true,
    "==": true,
    ">": true,
    "<": true,
    ">=": true,
    "<=": true,
    "!=": true,
    "<>": true,
    "in": true,
    "like": true,
}

const availableFunctions = {
    "": true,
    "abs": true,
    "char": true,
    "hex": true,
    "ifnull": true,
    "instr": true,
    "length": true,
    "lower": true,
    "ltrim": true,
    "max": true,
    "min": true,
    "nullif": true,
    "random": true,
    "round": true,
    "rtrim": true,
    "trim": true,
    "upper": true,
}

/**
 * 空格替换成_
 * @param {string} s 
 */
function replaceSpace(s) {
    return s.replace(/\s/g, '_');
}

/**
 * 解析字段名，字段名部分会被“”括起来，表名部分空格会被替换成_
 * @param {string} field 
 */
function parseFieldName(field) {
    const i = field.indexOf(".");
    if (i === -1) {
        return `"${field}"`;
    }
    const tb = replaceSpace(field.substr(0, i));
    return `${tb}."${field.substr(i + 1)}"`;
}

export default class MyDbCriteria {

    /**@type{MyDbCriteria.CriteriaWhere[]} */
    where = [];
    /**@type{MyDbCriteria.CriteriaOrderby[]} */
    orderby = [];

    /**
     * @param {string | MyDbCriteria.CriteriaWhere} field 
     * @param {string} op 
     * @param {string|number|boolean|{func:string, param:[]}} rhs 
     */
    addWhere(field, op, rhs) {
        if (field instanceof MyDbCriteria.CriteriaWhere) this.where.push(field);
        else this.where.push(new MyDbCriteria.CriteriaWhere(field, op, rhs));
    }

    /**
     * @param {string | MyDbCriteria.CriteriaOrderby} field 
     * @param {"ASC" | "DESC"} order 
     */
    addOrderBy(field, order) {
        if (field instanceof MyDbCriteria.CriteriaOrderby) this.orderby.push(field);
        else this.orderby.push(new MyDbCriteria.CriteriaOrderby(field, order));
    }

    toString() {
        return JSON.stringify(this);
    }

    /**
     * @return{{where:string, values:[], orderby:string}}
     */
    toCriteria() {
        const wheres = [];
        const values = [];
        for (let i = 0; i < this.where.length; i++) {
            const c = this.where[i].toCriteria();
            wheres.push(c.where);
            values.push(...c.values);
        }

        let where = "";
        if (wheres.length > 0) {
            where = " where " + wheres.join(" AND ");
        }

        const orderbys = [];
        if (this.orderby.length > 0) {
            for (let i = 0; i < this.orderby.length; i++) {
                orderbys.push(this.orderby[i].toCriteria());
            }
        }

        let orderby = "";
        if (orderbys.length > 0) {
            orderby = " order by " + orderbys.join(", ");
        }

        return { where, values, orderby };
    }

    static decorate(obj) {
        if (!obj.hasOwnProperty("where")) obj.where = [];
        if (!(obj.where instanceof Array)) throw new TypeError("criteria.where is not array!");
        for (const w of obj.where) {
            MyDbCriteria.CriteriaWhere.decorate(w);
        }

        if (!obj.hasOwnProperty("orderby")) obj.orderby = [];
        if (!(obj.orderby instanceof Array)) throw new TypeError("criteria.orderby is not array!");
        for (const o of obj.orderby) {
            MyDbCriteria.CriteriaOrderby.decorate(o);
        }

        Object.setPrototypeOf(obj, MyDbCriteria.prototype);
    }
}


MyDbCriteria.CriteriaWhere = class {

    /**
     * @param {string} field 
     * @param {string} op 
     * @param {string|number|boolean|{func:string, param:[]}} rhs 
     */
    constructor(field, op, rhs) {
        this.field = field;
        this.op = op;
        this.rhs = rhs;
    }

    toString() {
        return JSON.stringify(this);
    }

    /**解析出错时抛出错误 */
    toCriteria() {
        this.op = this.op.toLowerCase();
        if (!availableOparations[this.op]) throw new TypeError(`criteria.where.op='${this.op}'is not supported!`);

        const ss = [];
        const values = [];
        ss.push(parseFieldName(this.field));
        ss.push(this.op);
        if (typeof this.rhs === "object") {
            this.rhs.func = this.rhs.func.toLowerCase();
            if (!availableFunctions[this.rhs.func]) throw new TypeError(`criteria.where.rhs.func='${this.rhs.func}'is not supported!`);
            ss.push(this.rhs.func);
            ss.push("(");
            const n = this.rhs.param.length - 1;
            for (let i = 0; i < n; i++) {
                ss.push("?,")
                values.push(this.rhs.param[i]);
            }
            if (n > -1) {
                ss.push("?)");
                values.push(this.rhs.param[this.rhs.param.length - 1]);
            }
            else ss.push(")");
        } else {
            ss.push("?");
            values.push(this.rhs);
        }

        return { where: ss.join(" "), values };
    }

    static decorate(obj) {
        if (!obj.hasOwnProperty("field")) throw new TypeError("criteria.where does not contains 'field'!");
        if (typeof obj.field !== "string") throw new TypeError("criteria.where.field is not string!");
        if (!obj.hasOwnProperty("op")) throw new TypeError("criteria.where does not contains 'op'!");
        if (typeof obj.op !== "string") throw new TypeError("criteria.where.op is not string!");
        if (!obj.hasOwnProperty("rhs")) throw new TypeError("criteria.where does not contains 'rhs'!");
        if (typeof obj.rhs === "object") {
            if (!obj.rhs.hasOwnProperty("func")) obj.rhs.func = "";
            if (typeof obj.rhs.func !== "string") throw new TypeError("criteria.where.rhs.func is not string!");
            if (!obj.rhs.hasOwnProperty("param")) obj.rhs.param = [];
            if (!(obj.rhs.param instanceof Array)) throw new TypeError("criteria.where.rhs.param is not Array!");
        }

        Object.setPrototypeOf(obj, MyDbCriteria.CriteriaWhere.prototype);
    }
}

MyDbCriteria.CriteriaOrderby = class {
    /**
     * @param {string} field 
     * @param {"ASC" | "DESC"} order    
     */
    constructor(field, order) {
        this.field = field;
        order = order.toUpperCase();
        if (order !== "ASC" && order !== "DESC") throw new TypeError("order is not 'ASC' or 'DESC'!");
        this.order = order;
    }

    toString() {
        return JSON.stringify(this);
    }

    /**解析出错时抛出错误 */
    toCriteria() {
        if (this.order !== "ASC" && this.order !== "DESC") throw new TypeError("order is not 'ASC' or 'DESC'!");
        return `${parseFieldName(this.field)} ${this.order}`;
    }

    static decorate(obj) {
        if (!obj.hasOwnProperty("field")) throw new TypeError("criteria.orderby does not contains 'field'!");
        if (typeof obj.field !== "string") throw new TypeError("criteria.orderby.field is not string!");
        if (!obj.hasOwnProperty("order")) obj.order = "ASC";
        if (typeof obj.order !== "string") throw new TypeError("criteria.orderby.order is not string!");
        obj.order = obj.order.toUpperCase();
        if (obj.order !== "ASC" && obj.order !== "DESC") throw new TypeError("criteria.orderby.order is not 'ASC' or 'DESC'!");

        Object.setPrototypeOf(obj, MyDbCriteria.CriteriaOrderby.prototype);
    }
}

// module.exports = MyDbCriteria;