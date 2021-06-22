'use strict';
export const MyVector3 = (function () {
    function f(value = 3) {
        if (this instanceof MyVector3) {
            let v = new Float32Array(value);
            f.fromArray(v);
            return v
        }
    }
    /**
     * @param {Float32Array} f32Arr
     * @returns {MyVector3} self
     */
    f.fromArray = function (f32Arr) {
        if (this instanceof MyVector3) return f32Arr;
        f.call(f32Arr);
        Object.setPrototypeOf(f32Arr, f.prototype);
        return f32Arr;
    }
    return f;
})();
MyVector3.constructor = MyVector3;

Object.setPrototypeOf(MyVector3.prototype, Float32Array.prototype);

Object.defineProperties(MyVector3, {
    normalize: {
		/**
         * @param {Float32Array} vec3 
         * @returns {MyVector3} new
         */
        value: function (vec3) {
            let d = 1 / Math.hypot(vec3[0], vec3[1], vec3[2]);
            var result = new MyVector3();
            result[0] = vec3[0] * d;
            result[1] = vec3[1] * d;
            result[2] = vec3[2] * d;
            return result;
        }
    },
});

/**
 * @returns{MyVector3}: self
 */
MyVector3.prototype.normalized = function () {
    let d = 1 / Math.hypot(this[0], this[1], this[2]);
    this[0] *= d;
    this[1] *= d;
    this[2] *= d;
    return this;
}

/**
 * @returns{Float32Array}: new
 */
MyVector3.prototype.normalize = function () {
    let x = this[0], y = this[1], z = this[2];
    let d = 1 / Math.hypot(x, y, z);
    let result = new MyVector3(3);
    result[0] = x * d;
    result[0] = y * d;
    result[0] = z * d;
    return result;
}

MyVector3.prototype.dot = function (vec3) {
    return this[0] * vec3[0] + this[1] * vec3[1] + this[2] * vec3[2];
}

