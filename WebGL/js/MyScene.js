import MyGeometry from "./MyGeometry.js";
import MyCamera from "./MyCamera.js";
import { MyMatrix4x4 } from "./MyMatrix.js";
import MyGLProgram from "./MyGLProgram.js";

class MyScene {
    /**
     * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
     */
    constructor(gl) {
        this.gl = gl;
        this.activeCamera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
        this.geometries = [];
        /**待续... */
    }

    draw() {
        const mVP = this.activeCamera.getViewProjectMatrix();
        /**待续... */
    }
}