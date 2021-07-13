import { MyMatrix4x4 } from "./MyMatrix.js"

export default class MyGeometry {
    constructor() {
        this.transform = new MyMatrix4x4();
        /**@type{Float32Array} */
        this.vertices = null;
        /**@type{Float32Array} */
        this.normals = null;
        /**@type{Float32Array} */
        this.uvs = null;
        /**@type{Uint8Array|Uint16Array} */
        this.indices = null;
    }

    /**
     * @param {WebGL2RenderingContext} gl 
     * @param {()=>{}} callback 在里面调用绑定vbo操作
     */
    createVAO(gl, callback) {
        console.assert(!this._vao, "不要重复调用！");
        this._vao = gl.createVertexArray();
        gl.bindVertexArray(this._vao);
        callback();
        gl.bindVertexArray(null);
    }

    createVBOvertices(/**@type{WebGL2RenderingContext}*/gl, location, usage) {
        console.assert(!this._vboVertices, "不要重复调用！");
        this._vboVertices = MyGeometry.createAttrbPointer(gl, this.vertices, usage, location, this.vertexPointerSize);
    }
    createVBOnormals(/**@type{WebGL2RenderingContext}*/gl, location, usage) {
        console.assert(!this._vboNormals, "不要重复调用！");
        this._vboNormals = MyGeometry.createAttrbPointer(gl, this.normals, usage, location, this.normalPointerSize);
    }
    createVBOuvs(/**@type{WebGL2RenderingContext}*/gl, location, usage) {
        console.assert(!this._vboUVs, "不要重复调用！");
        this._vboUVs = MyGeometry.createAttrbPointer(gl, this.uvs, usage, location, this.uvPointerSize);
    }

    get vertexPointerSize() {
        return 3;
    }

    get normalPointerSize() {
        return 3;
    }

    get uvPointerSize() {
        return 2;
    }

    get indicesPointerType() {
        return WebGL2RenderingContext.UNSIGNED_SHORT;
    }

    createVBOIndices(/**@type{WebGL2RenderingContext}*/gl, usage) {
        this._vboIndices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._vboIndices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, usage);
    }


    draw(/**@type{WebGL2RenderingContext}*/gl, drawType = WebGLRenderingContext.TRIANGLES) {
        gl.bindVertexArray(this._vao);
        gl.drawElements(drawType, this.indices.length, this.indicesPointerType, 0);
        gl.bindVertexArray(null);
    }

    /**
     * @param {WebGL2RenderingContext} gl 
     */
    release(gl) {
        if (this._vao) {
            gl.deleteVertexArray(this._vao);
            this._vao = null;
        }
        if (this._vboVertices) {
            gl.deleteBuffer(this._vboVertices);
            this._vboVertices = null;
        }
        if (this._vboNormals) {
            gl.deleteBuffer(this._vboNormals);
            this._vboNormals = null;
        }
        if (this._vboUVs) {
            gl.deleteBuffer(this._vboUVs);
            this._vboUVs = null;
        }
        if (this._vboIndices) {
            gl.deleteBuffer(this._vboIndices);
            this._vboIndices = null;
        }
    }


}

/**
 * @param {WebGL2RenderingContext} gl  
 * @param {ArrayBuffer} srcData 
 * @param {number} usage STATIC_DRAW|DYNAMIC_DRAW|STREAM_DRAW
 * @param {number} location 
 * @param {number} pointerSize
 * @param {number} pointerType
 * @param {boolean} normalized
 * @param {number} stride
 * @param {number} offset
 */
MyGeometry.createAttrbPointer = function (gl, srcData, usage, location, pointerSize, pointerType = WebGLRenderingContext.FLOAT, normalized = false, stride = 0, offset = 0) {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, srcData, usage);

    gl.vertexAttribPointer(location, pointerSize, pointerType, normalized, stride, offset);
    gl.enableVertexAttribArray(location);

    return vbo;
}

MyGeometry.Plane = class extends MyGeometry {
    constructor(sizeX = 1, sizeY = 1) {
        super();
        const hx = sizeX * 0.5;
        const hy = sizeY * 0.5;
        const hz = 0;
        this.vertices = new Float32Array([
            -hx, -hy, hz, +hx, -hy, hz,
            -hx, +hy, hz, +hx, +hy, hz,
        ]);
        this.normals = new Float32Array([
            0, 0, 1, 0, 0, 1,
            0, 0, 1, 0, 0, 1,
        ]);
        this.uvs = new Float32Array([
            0, 1, 1, 1,
            0, 0, 1, 0,
        ]);
        this.indices = new Uint8Array([
            0, 1, 2, 1, 3, 2,
        ]);

    }

    get indicesPointerType() {
        return WebGL2RenderingContext.UNSIGNED_BYTE;
    }
}

/**
 *细分平面 
 */
MyGeometry.SubdivPlane = class extends MyGeometry {
    constructor(sizeX = 1, sizeY = 1, segX = 10, segY = 10) {
        super();
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const rx = sizeX * 0.5;
        const ry = sizeY * 0.5;
        const dx = sizeX / segX;
        const dy = sizeY / segY;
        const dux = 1 / segX;
        const duy = -1 / segY;

        let x = -rx, y = -ry;
        let ux = 0, uy = 1;

        for (let i = 0; i <= segY; i++) {
            for (let j = 0; j <= segX; j++) {
                vertices.push(x, y, 0);
                normals.push(0, 0, 1);
                uvs.push(ux, uy);

                x += dx;
                ux += dux;
            }
            x = -rx;
            y += dy;
            ux = 0;
            uy += duy;
        }

        let ind = 0;
        for (let i = 0; i < segY; i++) {
            for (let j = 0; j < segX; j++) {
                const p0 = ind, p1 = ind + 1, p2 = ind + segX + 1, p3 = ind + segX + 2;
                indices.push(p0, p1, p3);
                indices.push(p2, p0, p3);
                ind++;
            }
            ind++;
        }

        this.vertices = new Float32Array(vertices);
        this.normals = new Float32Array(normals);
        this.uvs = new Float32Array(uvs);
        this.indices = new Uint16Array(indices);

    }
}

MyGeometry.Cube = class extends MyGeometry {
    constructor(sizeX = 1, sizeY = 1, sizeZ = 1) {
        super();
        const hx = sizeX * 0.5;
        const hy = sizeY * 0.5;
        const hz = sizeZ * 0.5;

        this.vertices = new Float32Array([
            +hx, +hy, +hz, +hx, -hy, +hz, -hx, +hy, +hz, -hx, -hy, +hz,
            -hx, +hy, +hz, -hx, -hy, +hz, -hx, +hy, -hz, -hx, -hy, -hz,
            -hx, +hy, -hz, -hx, -hy, -hz, +hx, +hy, -hz, +hx, -hy, -hz,
            +hx, +hy, -hz, +hx, -hy, -hz, +hx, +hy, +hz, +hx, -hy, +hz,
            +hx, +hy, -hz, +hx, +hy, +hz, -hx, +hy, -hz, -hx, +hy, +hz,
            +hx, -hy, +hz, +hx, -hy, -hz, -hx, -hy, +hz, -hx, -hy, -hz,
        ]);
        this.normals = new Float32Array([
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        ]);
        this.uvs = new Float32Array([
            0.50, 0.25, 0.50, 0.50, 0.25, 0.25, 0.25, 0.50,
            0.25, 0.25, 0.25, 0.50, 0.00, 0.25, 0.00, 0.50,
            1.00, 0.25, 1.00, 0.50, 0.75, 0.25, 0.75, 0.50,
            0.75, 0.25, 0.75, 0.50, 0.50, 0.25, 0.50, 0.50,
            0.50, 0.00, 0.50, 0.25, 0.25, 0.00, 0.25, 0.25,
            0.50, 0.50, 0.50, 0.75, 0.25, 0.50, 0.25, 0.75,
        ]);
        this.indices = new Uint8Array([
            0, 2, 1, 2, 3, 1,
            4, 6, 5, 6, 7, 5,
            8, 10, 9, 10, 11, 9,
            12, 14, 13, 14, 15, 13,
            16, 18, 17, 18, 19, 17,
            20, 22, 21, 22, 23, 21,
        ]);
        this.colors = new Float32Array([
            0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1,
            0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1,
            1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1,
            1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1,
            1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1,
            0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
        ]);
    }

    get indicesPointerType() {
        return WebGL2RenderingContext.UNSIGNED_BYTE;
    }

    createVBOcolors(/**@type{WebGL2RenderingContext}*/gl, location, usage) {
        console.assert(!this._vboColors, "不要重复调用！");
        this._vboColors = MyGeometry.createAttrbPointer(gl, this.colors, usage, location, 4);
    }

    release(gl) {
        super.release(gl);
        if (this._vboColors) {
            gl.deleteBuffer(this._vboColors);
            this._vboColors = null;
        }
    }

}

MyGeometry.Sphere = class extends MyGeometry {
    constructor(diameter = 1, seg = 24) {
        super();
        seg = Math.max(3, seg);
        const r = diameter * 0.5;
        const da = Math.PI * 2 / seg;
        const db = Math.PI / seg;

        const vertices = [];
        const normals = [];
        const indices = []
        const uvs = [];

        let ind = 0;
        const du = 1 / seg;
        const dv = 1 / seg;
        let u = du * 0.5;
        let v = 0;
        //上
        for (let i = 0; i < seg; i++) {
            vertices.push(0, 0, r);
            normals.push(0, 0, 1);
            uvs.push(u, v);
            u += du;

            indices.push(ind, ind + seg, ind + seg + 1);

            ind++;
        }
        //中
        for (let i = 1; i < seg; i++) {
            const a = db * i;
            const cosa = Math.cos(a);
            const sina = Math.sin(a);
            const z = cosa * r;
            const rr = sina * r;
            v += dv;
            u = 0;
            for (let j = 0; j <= seg; j++) {
                const b = da * j;
                const cosb = Math.cos(b);
                const sinb = Math.sin(b);
                const x = cosb * rr;
                const y = sinb * rr;

                vertices.push(x, y, z);
                normals.push(cosb * sina, sinb * sina, cosa);
                uvs.push(u, v);

                u += du;
            }
        }
        const pc = seg - 2;
        for (let i = 0; i < pc; i++) {
            for (let j = 0; j < seg; j++) {
                indices.push(ind, ind + seg + 1, ind + 1);
                indices.push(ind + seg + 1, ind + seg + 2, ind + 1);
                ind++;
            }
            ind++;
        }

        //下
        ind += seg + 1;
        v += dv;
        u = du * 0.5;
        for (let i = 0; i < seg; i++) {
            vertices.push(0, 0, -r);
            normals.push(0, 0, -1);
            uvs.push(u, v);
            u += du;
            indices.push(ind, ind - seg, ind - seg - 1);
            ind++;
        }


        this.vertices = new Float32Array(vertices);
        this.normals = new Float32Array(normals);
        this.uvs = new Float32Array(uvs);
        this.indices = new Uint16Array(indices);
    }
}
