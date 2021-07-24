'use strict';
export class MyVector3 extends Float32Array {
    /**
     * @param {number[]} arr 
     */
    constructor(arr = undefined) {
        super(3);
        if (arr) {
            this[0] = arr[0] ? arr[0] : 0;
            this[1] = arr[1] ? arr[1] : 0;
            this[2] = arr[2] ? arr[2] : 0;
        }
    }

    get x() { return this[0]; }
    get y() { return this[1]; }
    get z() { return this[2]; }
    set x(value) { this[0] = value; }
    set y(value) { this[1] = value; }
    set z(value) { this[2] = value; }


    normalized() {
        const d = 1 / Math.hypot(this[0], this[1], this[2]);
        this[0] *= d;
        this[1] *= d;
        this[2] *= d;
        return this;
    }

    /**     
     * @returns {MyVector3} new
     */
    normalize() {
        const x = this[0], y = this[1], z = this[2];
        const d = 1 / Math.hypot(x, y, z);
        const result = new MyVector3();
        result[0] = x * d;
        result[0] = y * d;
        result[0] = z * d;
        return result;
    }

    /**
     * @param {MyVector3|number[]} vec3 
     */
    dot(vec3) {
        return this[0] * vec3[0] + this[1] * vec3[1] + this[2] * vec3[2];
    }

    /**     
     * @param {MyVector3|number[]} vec3 
     * @returns new
     */
    cross(vec3) {
        const result = new MyVector3();
        result[0] = this[1] * vec3[2] - this[2] * vec3[1];
        result[1] = this[2] * vec3[0] - this[0] * vec3[2];
        result[2] = this[0] * vec3[1] - this[1] * vec3[0];
        return result;
    }

    /**
     * @param {MyVector3|number[]} vec3 
     */
    added(vec3) {
        this[0] += vec3[0];
        this[1] += vec3[1];
        this[2] += vec3[2];
        return this;
    }

    /**
     * 返回新的vector
     * @param {MyVector3|number[]} vec3      
     * @returns {MyVector3} new
     */
    add(vec3) {
        const result = new MyVector3();
        result[0] = this[0] + vec3[0];
        result[1] = this[1] + vec3[1];
        result[2] = this[2] + vec3[2];
        return result;
    }

    /**
     * 取反
     */
    negatived() {
        this[0] = -this[0];
        this[1] = -this[1];
        this[2] = -this[2];
        return this;
    }

    /**     
     * 取反
     * @returns {MyVector3} new
     */
    negative() {
        const result = new MyVector3();
        result[0] = -this[0];
        result[1] = -this[1];
        result[2] = -this[2];
        return result;
    }

    distance() {
        return Math.hypot(this[0], this[1], this[2]);
    }

}

/**
 * farr长度至少3
 * @param {Float32Array} farr 
 * @returns {MyVector3} self
 */
MyVector3.from = function (farr) {
    Object.setPrototypeOf(farr, MyVector3.prototype);
    return farr;
}