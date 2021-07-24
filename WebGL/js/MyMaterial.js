import MyGLProgram from "./MyGLProgram.js";
import MyGeometry from "./MyGeometry.js";
import { MyMatrix4x4 } from "./MyMatrix.js";

export default class MyMaterial {
    /**
     * @param {WebGL2RenderingContext} gl 
     * @param {MyGLProgram.VShader} vShader
     * @param {MyGLProgram.FShader} fShader
     */
    constructor(gl, vShader = null, fShader = null) {
        this.gl = gl;
        this.program = MyGLProgram.create(gl);
        /** @type {MyGLProgram.VShader}*/
        this.vShader = vShader ? vShader : MyGLProgram.VShader.create(gl, this.vShaderSource);
        /** @type {MyGLProgram.FShader}*/
        this.fShader = fShader ? fShader : MyGLProgram.FShader.create(gl, this.fShaderSource);
        if (!this.program.link(this.vShader, this.fShader)) throw new Error('');
    }
    get vShaderSource() {
        throw 'vShaderSource 必须重载！';
    }
    get fShaderSource() {
        throw 'fShaderSource 必须重载！';
    }

}

MyMaterial.Standard = class extends MyMaterial {
    /**
     * @param {WebGL2RenderingContext} gl 
     */
    constructor(gl) {
        super(gl);
    }
    /**待续... */
}

MyMaterial.Point = class extends MyMaterial {
    static vsrc = `#version 300 es
        layout(location=0) in vec4 apos;
        uniform mat4 uMVPmat;
        uniform float uSize;
        void main(){
            gl_Position = uMVPmat * apos;
            gl_PointSize =  uSize;
        }
    `;
    static fsrc = `#version 300 es
        precision mediump float;
        uniform vec4 uColor;
        out vec4 fragColor;
        void main(){
            fragColor=uColor;
        }
    `;
    /**
     * @param {WebGL2RenderingContext} gl 
     * @param {number} radius
     * @param {number[]} color [1.0,1.0,1.0,1.0]
     */
    constructor(gl, radius = 1.0, color = [1.0, 1.0, 1.0, 1.0]) {
        super(gl);
        this.radius = radius;
        this.color = new Float32Array(color);
    }
    get vShaderSource() {
        return MyMaterial.Point.vsrc;
    }
    get fShaderSource() {
        return MyMaterial.Point.fsrc;
    }

    /**
     * @param {MyGeometry} geometry 
     * @param {MyMatrix4x4} mVP 相机视图投影矩阵
     */
    draw(geometry, mVP) {
        this.program.use();
        this.gl.uniformMatrix4fv(this.program.uniforms["uMVPmat"], false, mVP.multiply(geometry.transform));
        this.gl.uniform1f(this.program.uniforms["uSize"], this.radius);
        this.gl.uniform4fv(this.program.uniforms["uColor"], this.color);

        if (!geometry._vboVertices) geometry.createVBOvertices(this.gl, 0, this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, geometry._vboVertices);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, geometry.vertexPointerSize, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.POINTS, 0, geometry.vertices.length / 3);
    }
}