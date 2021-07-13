"use strict";
import { MyMatrix4x4 } from "../js/MyMatrix.js";

window.addEventListener('DOMContentLoaded', function () {
    // const App = top.window.App;
    // /**@type{MyMemu} */
    // const myMenu = App.myMenu;
    // const origin = top.location.origin;				// http://127.0.0.1
    // const host = top.location.host;					// 127.0.0.1
    // const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1

    const inputs = document.querySelectorAll("input[type='radio']");
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        input.onchange = function (e) { eval("cv" + i + "()") };
    }

});

//use drawArrays
function cv0() {
    const cv = document.getElementsByTagName("canvas")[0];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");
    if (!gl) alert("当前浏览器不支持webgl2！");

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.clearColor(0, 0, 0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        void main(){
            gl_Position=apos;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        out vec4 fragColor;
        void main(){
            fragColor=vec4(1.0, 0.0, 0.0, 1.0);
        }
    `);

    gl.compileShader(vShader);
    gl.compileShader(fShader);
    const p = gl.createProgram();
    gl.attachShader(p, vShader);
    gl.attachShader(p, fShader);


    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("link failed: ", gl.getProgramInfoLog(p));
        console.error("vShader log:", gl.getShaderInfoLog(vShader));
        console.error("fShader log:", gl.getShaderInfoLog(fShader));
    }

    gl.useProgram(p)

    const vbo1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

}
//use drawElements
function cv1() {
    const cv = document.getElementsByTagName("canvas")[1];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");
    if (!gl) {
        alert("brower is not support webgl2!");
        return;
    }

    const vbo1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5]), gl.STATIC_DRAW);
    const vbo2 = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo2);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
    layout(location=0) in vec4 apos;
    void main(){
        gl_Position=apos;
    }
    `);
    gl.shaderSource(fShader, `#version 300 es
    precision mediump float;
    out vec4 fragColor;
    void main(){
        fragColor=vec4(.5,.5,.5,1.0);
    }
    `);
    gl.compileShader(vShader);
    gl.compileShader(fShader);

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("link error: ", gl.getProgramInfoLog(program));
        console.error("vShader log:", gl.getShaderInfoLog(vShader));
        console.error("fSahder log:", gl.getShaderInfoLog(fShader));
    }

    gl.useProgram(program);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo2);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

}
//use VAO
function cv2() {
    const cv = document.getElementsByTagName("canvas")[2];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");
    if (!gl) {
        alert("brower is not support webgl2!");
        return;
    }

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        void main(){
            gl_Position=apos;
            gl_PointSize=20.;
        }
    `);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        out vec4 fragColor;
        void main(){
            float x = abs(gl_PointCoord.x-0.5);
            float y = 1.0-gl_PointCoord.y;
            if (y+4.*x-1.>0.) discard;
            fragColor= vec4(0., 1., 1., 1.) ;
        }
    `);
    const program = gl.createProgram();

    gl.compileShader(vShader);
    gl.compileShader(fShader);
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("program link error: ", gl.getProgramInfoLog(program));
        console.error("vShadre info: ", gl.getShaderInfoLog(vShader));
        console.error("fShadre info: ", gl.getShaderInfoLog(fShader));
    }

    //VAO只会记录 bindBuffer，vertexAttribPointer，enableVertexAttribArray，disableVertexAttribArray这些状态
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([.5, .5, -.5, .5, -.5, -.5, .5, -.5]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const vbo2 = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo2);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.POINTS, 6, gl.UNSIGNED_SHORT, 0);

}
//use bufferSubData to update vbo, getBufferSubData get buffer from vbo
function cv3() {
    const cv = document.getElementsByTagName("canvas")[3];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");
    if (!gl) {
        alert("brower is not support webgl2!");
        return;
    }

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        //条件编译：#define #undef #if #ifdef #ifndef #else #elif #endif

        //#error xxx 直接抛错

        //#pragma xxx

        //扩展
        //#extension [extension_name|all] : [require|enable|warn|disable]
        //#extension GL_NV_shadow_samplers_cube : disable

        layout(location=0) in vec4 apos;
        layout(location=1) in vec4 acol;

        //光栅插值类型，必须与fragment的一致，默认smooth
        //[smooth|flat] [centroid] [in|out] type name;        
        flat out vec4 vcol;                     

        void main(){
            gl_Position=apos;// + vec4(dir, 0) * speed;
            vcol=vec4(acol.rgb, 1.0) ;
        }
    `);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float; 
        //Triangles类型插值以3*第i个片元的主(i取1~n)，即每个三角面片的最后一个顶点
        flat in vec4 vcol;                      
        layout(location=0) out vec4 fragColor;
        void main(){
            fragColor=vcol;
        }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);

    gl.compileShader(vShader);
    gl.compileShader(fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("program link error:", gl.getProgramInfoLog(program));
        console.error("vShader info: ", gl.getShaderInfoLog(vShader));
        console.error("fShader info: ", gl.getShaderInfoLog(fShader));
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([.5, .5, -.5, .5, -.5, -.5, .5, -.5]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    //每个顶点指定颜色数据
    const vbo2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1., 0., 0., 0., 1., 0., 0., 0., 1., 1., 1., 0.]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    //每个顶点用相同的颜色数据（如果enableVertexAttribArray没有启用就会使用这个值）(VAO不会记录该状态)
    gl.vertexAttrib4f(1, 0, 1, 0, 1);

    const vbo3 = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo3);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    gl.bindVertexArray(null);


    gl.bindBuffer(gl.ARRAY_BUFFER, vbo2);
    gl.bufferSubData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * 6, new Float32Array([1.0]));

    //gl.copyBufferSubData() copy from srcBuf to targetBuf
    const b = new Float32Array(new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 12));
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, b);//read buffer
    console.log(b);

    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
}
//Using primitive restart, you can render multiple disconnected primitives
//(such as triangle fans or strips)
function cv4() {
    const cv = document.getElementsByTagName("canvas")[4];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    const gl = cv.getContext("webgl2");
    if (!gl) {
        alert("brower is not support webgl2!");
        return;
    }

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        void main(){
            gl_Position=apos;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        out vec4 fragColor;
        void main(){
            fragColor=vec4(1.0,0.,0.,1.);
        }
    `);

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);

    gl.compileShader(vShader);
    gl.compileShader(fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("program link error: ", gl.getProgramInfoLog(program));
        console.error("vShader info: ", gl.getShaderInfoLog(vShader));
        console.error("fShader info: ", gl.getShaderInfoLog(fShader));
    }

    const vertices = []
    const indices = [];
    const seg = 10;
    const r1 = 0.4;
    const r2 = 0.5;
    const a = Math.PI * 2 / seg;
    const aR2Offset = 0.5 * a;
    let j = 0;
    for (let i = 0; i < seg; i++) {
        let A = a * i;
        vertices.push(r1 * Math.cos(A));
        vertices.push(r1 * Math.sin(A));
        indices.push(j);
        j++;

        A += aR2Offset;
        vertices.push(r2 * Math.cos(A));
        vertices.push(r2 * Math.sin(A));
        indices.push(j);
        j++

    }
    indices.push(0);
    indices.push(1);


    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const vbo2 = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo2);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    const vao2 = gl.createVertexArray();
    gl.bindVertexArray(vao2);
    const vbo3 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo3);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, -1, 1, -0.8, 0.5, -1, 0.5, -0.8, -0.5, -1, -0.5, -0.8, -1, -1, -1, -0.8]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const vbo4 = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo4);
    //          primitive restart |
    const indices2 = [0, 1, 2, 3, 65535, 4, 5, 6, 7];
    // or 重复2个顶点
    // const indices2 = [0, 1, 2, 3, 3, 4, 4, 5, 6, 7];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices2), gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLE_STRIP, indices.length, gl.UNSIGNED_SHORT, 0)
    gl.bindVertexArray(null);

    gl.bindVertexArray(vao2);
    gl.drawElements(gl.TRIANGLE_STRIP, indices2.length, gl.UNSIGNED_SHORT, 0)
    gl.bindVertexArray(null);
}
//use drawElementsInstanced
function cv5() {
    const cv = document.getElementsByTagName("canvas")[5];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    const gl = cv.getContext("webgl2");

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec2 offset;
        layout(location=2) in vec3 acol;
        out vec4 vcol;
        void main(){
            vec4 pos=vec4(apos.xy+offset, 0, 1);
            gl_Position=pos;
            vcol=vec4(acol, 1.0);
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        in vec4 vcol;
        out vec4 fragColor;
        void main(){
            fragColor=vcol;
        }
    `);

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);

    gl.compileShader(vShader);
    gl.compileShader(fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("link error: ", gl.getProgramInfoLog(program));
        console.error("vShader info: ", gl.getShaderInfoLog(vShader));
        console.error("fShader info: ", gl.getShaderInfoLog(fShader));
    }

    const vertices = [0.1, 0.1, -0.1, 0.1, -0.1, -0.1, 0.1, -0.1];
    const indices = [0, 1, 2, 3, 0, 2];
    const offsets = [0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5];
    const colors = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0];

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const vbo2 = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo2);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    const vbo3 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo3);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsets), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
    //vertexAttribDivisor(index, divisor); 
    //divisor=0时表示 每个顶点取一次值，1时表示drawElementsInstanced每一个实例取一次值，
    //n时表示每隔n个实例取一次值，默认0
    gl.vertexAttribDivisor(1, 1);

    const vbo4 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo4);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribDivisor(2, 1);

    gl.bindVertexArray(null);


    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.drawElementsInstanced(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0, 4);
    gl.bindVertexArray(null);
}
//polygon offset
function cv6() {
    const cv = document.getElementsByTagName("canvas")[6];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");
    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);

    const vertices = [1, 1, -1, 1, -1, -1, 1, -1];
    const indices = [0, 1, 2, 3, 0, 2];


    const color1 = new Float32Array([1., 0., 0., 1.]);
    const color2 = new Float32Array([0., 1., 0., 1.]);
    let scale1 = 0.5;
    let scale2 = 0.2;

    let pOffsetFactor = parseFloat(document.getElementById("pOffsetFactor").value);
    let pOffsetUnits = parseFloat(document.getElementById("pOffsetUnits").value);
    document.getElementById("pOffsetFactor").onchange = (e) => {
        pOffsetFactor = parseFloat(e.currentTarget.value);
    }
    document.getElementById("pOffsetUnits").onchange = (e) => {
        pOffsetUnits = parseFloat(e.currentTarget.value);
    }

    const vMat = new MyMatrix4x4();


    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        uniform mat4 uViewMat;
        uniform float uScale;
        void main(){
            gl_Position=uViewMat * vec4(apos.xy*uScale, 0., 1.0);
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        out vec4 fragColor;
        uniform vec4 uColor;
        void main(){
            fragColor=uColor;
        }
    `);

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);

    gl.compileShader(vShader);
    gl.compileShader(fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("link error: ", gl.getProgramInfoLog(program));
        console.error("vShader info: ", gl.getShaderInfoLog(vShader));
        console.error("fShader info: ", gl.getShaderInfoLog(fShader));
    }

    for (const key of ["uColor", "uScale", "uViewMat"]) {
        program[key] = gl.getUniformLocation(program, key);
    }



    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vboVertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboVertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const vboIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vboIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.LEQUAL);
    // gl.depthRange(0, 1);//default
    // gl.clearDepth(1.0);//default


    const da = Math.PI / 300

    function draw() {
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindVertexArray(vao);

        vMat.rotateY(da);
        gl.uniformMatrix4fv(program.uViewMat, false, vMat.inverse());



        gl.uniform4fv(program.uColor, color1);
        gl.uniform1f(program.uScale, scale1);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);



        gl.uniform4fv(program.uColor, color2);
        gl.uniform1f(program.uScale, scale2);
        //polygonOffset
        gl.polygonOffset(pOffsetFactor, pOffsetUnits);
        gl.enable(gl.POLYGON_OFFSET_FILL);

        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.bindVertexArray(null);

        requestAnimationFrame(draw);

    }
    draw();
}
//Occlusion Queries
function cv7() {
    const cv = document.getElementsByTagName("canvas")[7];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    const gl = cv.getContext("webgl2");

    const vertices = [];
    const indices = [];
    const color = new Float32Array([1, 0, 0, 1]);

    const vertices2 = [0.35, 0, 0.1];
    const indices2 = [];
    const r3 = 0.1;
    const color2 = new Float32Array([0, 1, 0, 1]);

    const vertices3 = [
        vertices2[0] + r3, vertices2[1] + r3, vertices2[2],
        vertices2[0] - r3, vertices2[1] + r3, vertices2[2],
        vertices2[0] - r3, vertices2[1] - r3, vertices2[2],
        vertices2[0] + r3, vertices2[1] - r3, vertices2[2],
    ];

    const seg = 10;
    const r1 = 0.2;
    const r2 = 0.5;
    const a = Math.PI * 2 / seg;
    const aR2Offset = 0.5 * a;


    let j = 0;
    for (let i = 0; i < seg; i++) {
        let A = a * i;
        vertices.push(r1 * Math.cos(A));
        vertices.push(r1 * Math.sin(A));
        indices.push(j);
        j++;

        vertices2.push(vertices2[0] + r3 * Math.cos(A));
        vertices2.push(vertices2[1] + r3 * Math.sin(A));
        vertices2.push(vertices2[2]);
        indices2.push(i);

        A += aR2Offset;
        vertices.push(r2 * Math.cos(A));
        vertices.push(r2 * Math.sin(A));
        indices.push(j);
        j++;


    }
    indices.push(0);
    indices.push(1);

    indices2.push(indices2.length);
    indices2.push(1);

    const uViewMat = new MyMatrix4x4();


    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        uniform mat4 uViewMat;        
        void main(){
            gl_Position=uViewMat * apos;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        uniform vec4 uColor;
        out vec4 fragColor;
        void main(){
            fragColor=uColor;
        }
    `);

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);

    gl.compileShader(vShader);
    gl.compileShader(fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("link error: ", gl.getProgramInfoLog(program));
        console.error("vShader info: ", gl.getShaderInfoLog(vShader));
        console.error("fShader info: ", gl.getShaderInfoLog(fShader));
    }
    for (const key of ["uViewMat", "uColor"]) {
        program[key] = gl.getUniformLocation(program, key);
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vboVex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboVex);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    const vboInd = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vboInd);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    const vao2 = gl.createVertexArray();
    gl.bindVertexArray(vao2);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices2), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices2), gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    const vao3 = gl.createVertexArray();
    gl.bindVertexArray(vao3);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices3), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindVertexArray(null);

    gl.enable(gl.DEPTH_TEST);
    const da = Math.PI / 300;

    const ocq = gl.createQuery();
    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        uViewMat.rotateY(da);

        gl.useProgram(program);
        gl.uniformMatrix4fv(program.uViewMat, false, uViewMat.inverse());

        gl.bindVertexArray(vao);
        gl.uniform4fv(program.uColor, color);
        gl.drawElements(gl.TRIANGLE_STRIP, indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);


        gl.uniform4fv(program.uColor, color2);


        //Occlusion Queries
        if (gl.getQueryParameter(ocq, gl.QUERY_RESULT_AVAILABLE)) {
            if (!gl.getQueryParameter(ocq, gl.QUERY_RESULT)) {
                gl.disable(gl.DEPTH_TEST);
                gl.bindVertexArray(vao3);
                gl.drawArrays(gl.LINE_LOOP, 0, 4);
                gl.bindVertexArray(null);
                gl.enable(gl.DEPTH_TEST);
            }
        }

        gl.beginQuery(gl.ANY_SAMPLES_PASSED, ocq);
        gl.bindVertexArray(vao2);
        gl.drawElements(gl.TRIANGLE_FAN, indices2.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        gl.endQuery(gl.ANY_SAMPLES_PASSED);

        requestAnimationFrame(draw);
    }

    draw();

}

function cv8() {
    const cv = document.getElementsByTagName("canvas")[8];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    const gl = cv.getContext("webgl2");
    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);

    const vertices = [
        //0             1
        .5, .5, .5, .5, -.5, .5,
        //2             3
        -.5, .5, .5, -.5, -.5, .5,
        //4             5
        -.5, .5, -.5, -.5, -.5, -.5,
        //6             7
        -.5, .5, -.5, -.5, -.5, -.5,
        //8             9
        .5, .5, -.5, .5, -.5, -.5,
        //10            11
        .5, .5, -.5, .5, -.5, -.5,
        //12            13
        -.5, .5, -.5, -.5, -.5, -.5
    ];
    const normals = [
        0, 0, 0, 0, 0, 0,
        0, 0, 1, 0, 0, 0,
        -1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, -1,
        0, 0, 0, 1, 0, 0,
        0, 0, 0, 0, -1, 0,
        0, 1, 0, 0, 0, 0
    ];
    const uvs = [];
    const colors = [
        0, 0, 0, 1, 0, 0, 0, 1,
        0, 0, 1, 1, 0, 0, 0, 1,
        0, 1, 1, 1, 0, 0, 0, 1,
        0, 0, 0, 1, 1, 1, 0, 1,
        0, 0, 0, 1, 1, 0, 0, 1,
        0, 0, 0, 1, 1, 0, 1, 1,
        0, 1, 0, 1, 0, 0, 0, 1
    ];
    const indices = [
        1, 0, 2, 3, 1, 2,
        3, 2, 4, 5, 3, 4,
        6, 8, 7, 8, 9, 7,
        0, 1, 9, 8, 0, 9,
        0, 10, 12, 2, 0, 12,
        1, 3, 11, 3, 13, 11
    ];



    let near = 0.01;
    let far = 100;
    let projMat;
    let viewAng = Math.PI / 180 * parseFloat(document.getElementById("fov").value);


    const camera = new MyMatrix4x4();
    camera.translate(0, 0, 10);
    cv.addEventListener("mousewheel", e => {
        camera.translate(0, 0, e.wheelDelta * 0.001);
    });


    function resize() {
        // gl.viewport(0, 0, cv.clientWidth, cv.clientHeight);
        projMat = MyMatrix4x4.persperctiveMatrix(viewAng, cv.clientWidth / cv.clientHeight, near, far)
    }
    window.onresize = resize;
    resize();

    document.getElementById("fov").oninput = e => {
        viewAng = Math.PI / 180 * parseFloat(e.currentTarget.value);
        projMat = MyMatrix4x4.persperctiveMatrix(viewAng, cv.clientWidth / cv.clientHeight, near, far)
    }

    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;
        layout(location=2) in vec2 auvs;
        layout(location=4) in vec4 acolor;
        
        uniform mat4 uMVPMat;

        flat out vec4 vcolor;
        void main(){
            gl_Position=uMVPMat * apos;
            vcolor=acolor;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;

        flat in vec4 vcolor;
        out vec4 fragColor;

        void main(){            
            fragColor=vcolor;
        }
    `);

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);

    gl.compileShader(vShader);
    gl.compileShader(fShader);
    gl.linkProgram(program);
    if (!(gl.getProgramParameter(program, gl.LINK_STATUS))) {
        console.error("link error: ", gl.getProgramInfoLog(program));
        console.error("vShader info: ", gl.getShaderInfoLog(vShader));
        console.error("fShader info: ", gl.getShaderInfoLog(fShader));
    }
    for (const key of ["uMVPMat"]) {
        program[key] = gl.getUniformLocation(program, key);
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vboVex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboVex);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const vboCol = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboCol);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(4);

    const vboInd = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vboInd);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    const da = Math.PI / 300;
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);


    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        camera.rotateAround([0, 0, 0], [1, 1, 1], da);

        gl.useProgram(program);
        gl.uniformMatrix4fv(program.uMVPMat, false, MyMatrix4x4.multiply(projMat, camera.inverse()));

        gl.bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);

        requestAnimationFrame(draw);
    }
    draw();
}