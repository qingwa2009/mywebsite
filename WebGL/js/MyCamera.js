import { MyMatrix4x4 } from "./MyMatrix.js";
export default class MyCamera {
    /**
     * @param {number} fov 视角弧度制
     * @param {number} aspectRatio 宽高比
     * @param {number} near 近平面
     * @param {number} far 远平面
     */
    constructor(fov, aspectRatio, near, far) {
        this.transform = new MyMatrix4x4();
        this.updatePersperctiveMatrix(fov, aspectRatio, near, far);
    }


    _updatePersperctiveMatrix() {
        /**@type{MyMatrix4x4} */
        this._persperctiveMatrix = MyMatrix4x4.persperctiveMatrix(this._fov, this._aspectRatio, this._near, this._far, this._persperctiveMatrix);
    }

    /**
     * @param {number} fov 视角弧度制
     * @param {number} aspectRatio 宽高比
     * @param {number} near 近平面
     * @param {number} far 远平面
     */
    updatePersperctiveMatrix(fov, aspectRatio, near, far) {
        this._fov = fov;
        this._aspectRatio = aspectRatio;
        this._near = near;
        this._far = far;
        this._updatePersperctiveMatrix();
    }

    getViewProjectMatrix() {
        return MyMatrix4x4.multiply(this._persperctiveMatrix, this.transform.inverse());
    }
    getViewMatrix() {
        return this.transform.inverse();
    }
    /**不要随意改变该返回值 */
    get projectMatrix() {
        return this._persperctiveMatrix;
    }
    /**
     * @param {number} value
     */
    set fov(value) {
        if (this._far === value) return;
        this._fov = value;
        this._updatePersperctiveMatrix();
    }
    /**
     * @param {number} value
     */
    set aspectRatio(value) {
        if (this._aspectRatio === value) return;
        this._aspectRatio = value;
        this._updatePersperctiveMatrix();
    }
    /**
     * @param {number} value
     */
    set near(value) {
        if (this._near === value) return;
        this._near = value;
        this._updatePersperctiveMatrix();
    }
    /**
     * @param {number} value
     */
    set far(value) {
        if (this._far === value) return
        this._far = value;
        this._updatePersperctiveMatrix();
    }

    get fov() {
        return this._fov;
    }

    get aspectRatio() {
        return this._aspectRatio;
    }

    get near() {
        return this._near;
    }

    get far() {
        return this._far;
    }
}


