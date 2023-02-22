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

        this.mbDraging = false;
        this.rbDraging = false;
        this.rotSensitivity = 0.01;
        this.wheelSensitivity = 0.01;
        this.movSensitivity = 0.01;
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
        return MyMatrix4x4.multiply(this._persperctiveMatrix, this.transform.inverseOrtho());
    }
    getViewMatrix() {
        return this.transform.inverseOrtho();
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


    /**
     * @param {HTMLElement} em 
     */
    mouseControl(em) {
        em.addEventListener("mousedown", e => {
            if (e.button === 1) this.mbDraging = true;
            if (e.button === 2) this.rbDraging = true;
        });
        em.addEventListener("mouseup", e => {
            if (e.button === 1) this.mbDraging = false;
            if (e.button === 2) this.rbDraging = false;
        });
        em.addEventListener("mousemove", e => {
            if (!e.buttons) return;
            const dx = e.movementX;
            const dy = e.movementY;
            if (this.mbDraging) {
                rotCamera.call(this, dx, dy);
            } else if (this.rbDraging) {
                this.transform.translate(-dx * this.movSensitivity, dy * this.movSensitivity, 0);
            }
        });
        function rotCamera(dx, dy) {
            let rad = dx * this.rotSensitivity;
            if (Math.abs(rad) > Number.EPSILON) {
                this.transform.rotateAround([0, 0, 0], [0, 0, 1], -rad, true);
            }
            rad = dy * this.rotSensitivity;
            if (Math.abs(rad) > Number.EPSILON) {
                let xAxis = this.transform.xAxis;
                this.transform.rotateAround([0, 0, 0], xAxis, -rad, true);
            }
        }
        em.addEventListener("wheel", e => {
            const dz = e.wheelDelta * this.wheelSensitivity;
            this.transform.translate(0, 0, dz);
        });
    }
}


