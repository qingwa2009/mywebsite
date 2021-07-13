"use strict";

/**@type{HTMLCanvasElement} */
let cv = null;
/**@type{WebGLRenderingContext} */
let gl = null;


/**每帧时间间隔ms */
let deltaTime = 0;
/**帧数 */
let frameCount = 0;

window.addEventListener('DOMContentLoaded', () => {
    // const App = top.window.App;
    // /**@type{MyMemu} */
    // const myMenu = App.myMenu;
    // const origin = top.location.origin;				// http://127.0.0.1
    // const host = top.location.host;					// 127.0.0.1
    // const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1


    cv = initCanvas();
    gl = cv.getContext("webgl2");
    if (!gl) alert("当前浏览器不支持webgl2！");

    window.gl = gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, -1, 1, -1, -1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    update();
});

function initCanvas() {
    /**@type{HTMLCanvasElement} */
    const cv = document.getElementById("cv");
    window.onresize = () => resizeCV(cv);
    return cv;
}

function resizeCV(/**@type{HTMLCanvasElement} */cv) {
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

}

function clear() {
    gl.clearColor(0.9, 0.9, 0.9, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

}

/**
 * 
 * @param {WebGLRenderingContext.VERTEX_SHADER | WebGLRenderingContext.FRAGMENT_SHADER} type 
 * @param {string} shaderSource 
 */
function compileShader(type, shaderSource) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    gl.getShaderParameter(shader, gl.COMPILE_STATUS)

    return shader;
}

function createProgram() {
    const p = gl.createProgram();
    gl.createShader()
    return p;
}

function draw() {

    // gl.useProgram()
    // gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}


let _st = new Date().getTime();
function update() {
    let et = new Date().getTime();
    deltaTime = et - _st;
    _st = et;
    frameCount++;

    clear();
    draw();
    requestAnimationFrame(update);
}