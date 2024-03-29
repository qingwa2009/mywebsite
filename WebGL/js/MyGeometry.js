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
        /**@type{Float32Array} */
        this.tangents = null;
        /**@type{Float32Array} */
        this.binormals = null;
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


    createVAOAll(gl, usage) {
        this.createVAO(gl, () => {
            this.createVBOvertices(gl, MyGeometry.attrb_vertex_location, usage);
            this.createVBOnormals(gl, MyGeometry.attrb_normal_location, usage);
            this.createVBOuvs(gl, MyGeometry.attrb_uv_location, usage);
            this.createVBOtangents(gl, MyGeometry.attrb_tangent_location, usage);
            this.createVBObinormals(gl, MyGeometry.attrb_binormal_location, usage);
            this.createVBOIndices(gl, usage);
        });
    }

    /** 
     * @param {WebGL2RenderingContext} gl 
     * @param {number} location 
     * @param {number} usage STATIC_DRAW...
     */
    createVBOvertices(gl, location, usage) {
        console.assert(!this._vboVertices, "不要重复调用！");
        this._vboVertices = MyGeometry.createAttrbPointer(gl, this.vertices, usage, location, this.vertexPointerSize);
    }
    /** 
     * @param {WebGL2RenderingContext} gl 
     * @param {number} location 
     * @param {number} usage STATIC_DRAW...
     */
    createVBOnormals(gl, location, usage) {
        console.assert(!this._vboNormals, "不要重复调用！");
        this._vboNormals = MyGeometry.createAttrbPointer(gl, this.normals, usage, location, this.normalPointerSize);
    }
    /** 
     * @param {WebGL2RenderingContext} gl 
     * @param {number} location 
     * @param {number} usage STATIC_DRAW...
     */
    createVBOtangents(gl, location, usage) {
        console.assert(!this._vboTangents, "不要重复调用！");
        this._vboTangents = MyGeometry.createAttrbPointer(gl, this.tangents, usage, location, this.tangentPointerSize);
    }
    /** 
     * @param {WebGL2RenderingContext} gl 
     * @param {number} location 
     * @param {number} usage STATIC_DRAW...
     */
    createVBObinormals(gl, location, usage) {
        console.assert(!this._vboBinormals, "不要重复调用！");
        this._vboBinormals = MyGeometry.createAttrbPointer(gl, this.binormals, usage, location, this.binormalPointerSize);
    }
    /** 
     * @param {WebGL2RenderingContext} gl 
     * @param {number} location 
     * @param {number} usage STATIC_DRAW...
     */
    createVBOuvs(gl, location, usage) {
        console.assert(!this._vboUVs, "不要重复调用！");
        this._vboUVs = MyGeometry.createAttrbPointer(gl, this.uvs, usage, location, this.uvPointerSize);
    }

    get vertexPointerSize() {
        return 3;
    }

    get normalPointerSize() {
        return 3;
    }

    get tangentPointerSize() {
        return 3;
    }

    get binormalPointerSize() {
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

    /**     
     * @param {WebGL2RenderingContext} gl 
     */
    draw(gl, drawType = WebGLRenderingContext.TRIANGLES) {
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
        if (this._vboTangents) {
            gl.deleteBuffer(this._vboTangents);
            this._vboTangents = null;
        }
        if (this._vboBinormals) {
            gl.deleteBuffer(this._vboBinormals);
            this._vboBinormals = null;
        }
        if (this._vboIndices) {
            gl.deleteBuffer(this._vboIndices);
            this._vboIndices = null;
        }
    }
}
MyGeometry.attrb_vertex_location = 0;
MyGeometry.attrb_normal_location = 1;
MyGeometry.attrb_uv_location = 2;
MyGeometry.attrb_tangent_location = 3;
MyGeometry.attrb_binormal_location = 4;

/**
 * 生成顶点切线与副法线
 * @param {number[]} vs 顶点
 * @param {number} vSize 单个顶点数据个数
 * @param {number[]} ns 法线
 * @param {number} nSize 单个法线数据个数
 * @param {number[]} uvs uv
 * @param {number} uvSize 单个uv数据个数
 * @param {number[]} indices 顶点索引
 * @returns {{tangents:number[], binormals:number[]}}
 */
MyGeometry.createTangent = function (vs, vSize, ns, nSize, uvs, uvSize, indices) {
    const tangents = [];
    const binormals = [];
    const n = indices.length;
    for (let i = 0; i < n; i += 3) {
        let ind;
        let ii;
        ind = indices[i];
        ii = ind * vSize;
        const v00 = vs[ii], v01 = vs[ii + 1], v02 = vs[ii + 2];
        ii = ind * nSize;
        const n00 = ns[ii], n01 = ns[ii + 1], n02 = ns[ii + 2];
        ii = ind * uvSize;
        const uv00 = uvs[ii], uv01 = uvs[ii + 1];

        ind = indices[i + 1];
        ii = ind * vSize;
        const v10 = vs[ii], v11 = vs[ii + 1], v12 = vs[ii + 2];
        ii = ind * nSize;
        const n10 = ns[ii], n11 = ns[ii + 1], n12 = ns[ii + 2];
        ii = ind * uvSize;
        const uv10 = uvs[ii], uv11 = uvs[ii + 1];

        ind = indices[i + 2];
        ii = ind * vSize;
        const v20 = vs[ii], v21 = vs[ii + 1], v22 = vs[ii + 2];
        ii = ind * nSize;
        const n20 = ns[ii], n21 = ns[ii + 1], n22 = ns[ii + 2];
        ii = ind * uvSize;
        const uv20 = uvs[ii], uv21 = uvs[ii + 1];

        const E10 = v10 - v00, E11 = v11 - v01, E12 = v12 - v02;
        const E20 = v20 - v00, E21 = v21 - v01, E22 = v22 - v02;
        const U1 = uv10 - uv00, V1 = uv11 - uv01;
        const U2 = uv20 - uv00, V2 = uv21 - uv01;

        const e = U2 * V1 - U1 * V2;
        const
            t0 = (V1 * E20 - V2 * E10) / e,
            t1 = (V1 * E21 - V2 * E11) / e,
            t2 = (V1 * E22 - V2 * E12) / e;
        let B0, B1, B2;
        let T0, T1, T2;
        let S;

        ii = indices[i] * 3;
        if (tangents[ii] === undefined) {
            B0 = n01 * t2 - n02 * t1;
            B1 = n02 * t0 - n00 * t2;
            B2 = n00 * t1 - n01 * t0;
            T0 = B1 * n02 - B2 * n01;
            T1 = B2 * n00 - B0 * n02;
            T2 = B0 * n01 - B1 * n00;
            S = Math.hypot(T0, T1, T2);
            tangents[ii] = T0 / S;
            tangents[ii + 1] = T1 / S;
            tangents[ii + 2] = T2 / S;
            S = Math.hypot(B0, B1, B2);
            binormals[ii] = B0 / S;
            binormals[ii + 1] = B1 / S;
            binormals[ii + 2] = B2 / S;
        }

        ii = indices[i + 1] * 3;
        if (tangents[ii] === undefined) {
            B0 = n11 * t2 - n12 * t1;
            B1 = n12 * t0 - n10 * t2;
            B2 = n10 * t1 - n11 * t0;
            T0 = B1 * n12 - B2 * n11;
            T1 = B2 * n10 - B0 * n12;
            T2 = B0 * n11 - B1 * n10;
            S = Math.hypot(T0, T1, T2);
            tangents[ii] = T0 / S;
            tangents[ii + 1] = T1 / S;
            tangents[ii + 2] = T2 / S;
            S = Math.hypot(B0, B1, B2);
            binormals[ii] = B0 / S;
            binormals[ii + 1] = B1 / S;
            binormals[ii + 2] = B2 / S;
        }

        ii = indices[i + 2] * 3;
        if (tangents[ii] === undefined) {
            B0 = n21 * t2 - n22 * t1;
            B1 = n22 * t0 - n20 * t2;
            B2 = n20 * t1 - n21 * t0;
            T0 = B1 * n22 - B2 * n21;
            T1 = B2 * n20 - B0 * n22;
            T2 = B0 * n21 - B1 * n20;
            S = Math.hypot(T0, T1, T2);
            tangents[ii] = T0 / S;
            tangents[ii + 1] = T1 / S;
            tangents[ii + 2] = T2 / S;
            S = Math.hypot(B0, B1, B2);
            binormals[ii] = B0 / S;
            binormals[ii + 1] = B1 / S;
            binormals[ii + 2] = B2 / S;
        }
    }
    return { tangents, binormals };
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
        this.tangents = new Float32Array([
            1, 0, 0, 1, 0, 0,
            1, 0, 0, 1, 0, 0,
        ]);
        this.binormals = new Float32Array([
            0, 1, 0, 0, 1, 0,
            0, 1, 0, 0, 1, 0,
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
        const tangents = [];
        const binormals = [];
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
                tangents.push(1, 0, 0);
                binormals.push(0, 1, 0);
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
        this.tangents = new Float32Array(tangents);
        this.binormals = new Float32Array(binormals);
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
        this.tangents = new Float32Array([
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        ]);
        this.binormals = new Float32Array([
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
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
        const tangents = [];
        const binormals = [];

        let ind = 0;
        const du = 1 / seg;
        const dv = 1 / seg;
        let u = du * 0.5;
        let v = 0;
        let ta = da * 0.5;
        //上
        for (let i = 0; i < seg; i++) {
            vertices.push(0, 0, r);
            normals.push(0, 0, 1);
            const sta = -Math.sin(ta);
            const cta = Math.cos(ta);
            tangents.push(sta, cta, 0);
            binormals.push(-cta, sta, 0);
            ta += da;

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
                tangents.push(-sinb, cosb, 0);
                binormals.push(-cosa * cosb, -cosa * sinb, sina);
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
            const ii = i * 3;
            tangents.push(tangents[ii], tangents[ii + 1], tangents[ii + 2]);
            binormals.push(binormals[ii], binormals[ii + 1], binormals[ii + 2]);
            uvs.push(u, v);
            u += du;
            indices.push(ind, ind - seg, ind - seg - 1);
            ind++;
        }


        this.vertices = new Float32Array(vertices);
        this.normals = new Float32Array(normals);
        this.tangents = new Float32Array(tangents);
        this.binormals = new Float32Array(binormals);
        this.uvs = new Float32Array(uvs);
        this.indices = new Uint16Array(indices);
    }
}

MyGeometry.Cone = class extends MyGeometry {
    constructor(diameter = 1, height = 1, seg = 24) {
        super();
        seg = Math.max(3, seg);
        const r = diameter * 0.5;
        const da = Math.PI * 2 / seg;
        const db = Math.PI / seg;

        const vertices = [];
        const normals = [];
        const indices = []
        const uvs = [];
        const tangents = [];
        const binormals = [];

        let ind = 0;
        const du = 1 / seg;
        const dv = 1 / seg;
        let u = 0.25;
        let v = 0.5;
        let ta = da * 0.5;
        //上
        for (let i = 0; i < seg; i++) {
            vertices.push(0, 0, height);
            normals.push(0, 0, 1);
            const sta = -Math.sin(ta);
            const cta = Math.cos(ta);
            tangents.push(sta, cta, 0);
            binormals.push(-cta, sta, 0);
            ta += da;

            uvs.push(0.25, 0.5);

            indices.push(ind, ind + seg, ind + seg + 1);

            ind++;
        }

        //中
        const hr1_2 = Math.pow(height * height + r * r, -0.5);
        const rp = r * hr1_2;
        const hp = h * hr1_2;

        v += dv;
        u = 0;
        for (let i = 0; i <= seg; i++) {
            const b = da * i;
            const cosb = Math.cos(b);
            const sinb = Math.sin(b);
            const x = cosb * r;
            const y = sinb * r;

            vertices.push(x, y, 0);
            normals.push(cosb * hp, sinb * hp, rp);
            tangents.push(-sinb, cosb, 0);
            binormals.push(-cosb * rp, -sinb * rp, hp);

            uvs.push(u, v);

            u += du;
        }

        ind += seg + 2;
        //底
        for (let i = 0; i < seg; i++) {
            vertices.push(0, 0, 0);
            normals.push(0, 0, -1);

            let j = i * 3;
            tangents.push(-1 * tangents[j], -1 * tangents[j + 1], 0);
            binormals.push(-1 * binormals[j], -1 * binormals[j + 1], 0);

            uvs.push(0.75, 0.5);
            indices.push(ind, ind + seg, ind + seg + 1);

            ind++;
        }

        for (let i = 0; i <= seg; i++) {

            vertices.push(x, y, 0);
            normals.push(cosb * hp, sinb * hp, rp);
            tangents.push(-sinb, cosb, 0);
            binormals.push(-cosb * rp, -sinb * rp, hp);

        }



        this.vertices = new Float32Array(vertices);
        this.normals = new Float32Array(normals);
        this.tangents = new Float32Array(tangents);
        this.binormals = new Float32Array(binormals);
        this.uvs = new Float32Array(uvs);
        this.indices = new Uint16Array(indices);
    }


}