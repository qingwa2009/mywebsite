"use strict";
import MyCamera from "../js/MyCamera.js";
import MyGeometry from "../js/MyGeometry.js";
import { MyMatrix4x4 } from "../js/MyMatrix.js";
import { MyVector3 } from "../js/MyVector.js";
import MyGLProgram from "../js/MyGLProgram.js";

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
        input.onchange = function (e) { eval(`cv${i}(${i})`) };
    }

});

/**
 * @param {HTMLInputElement} em 
 */
function getColorFromInputElement(em) {
    const s = em.value;
    const color = new Float32Array(4);
    color[0] = parseInt(s.substr(1, 2), 16) / 255;
    color[1] = parseInt(s.substr(3, 2), 16) / 255;
    color[2] = parseInt(s.substr(5, 2), 16) / 255;
    color[3] = 1;
    return color;
}
//fog
function cv0(cvi) {
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");


    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);

    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);

    window.onresize = e => {
        cv.width = cv.clientWidth;
        cv.height = cv.clientHeight;
        gl.viewport(0, 0, cv.clientWidth, cv.clientHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    let mbDraging = false;
    let rbDraging = false;
    let rotSensitivity = 0.01;
    let wheelSensitivity = 0.01;
    let movSensitivity = 0.01;
    cv.onmousedown = e => {
        if (e.button === 1) mbDraging = true;
        if (e.button === 2) rbDraging = true;
    }
    cv.onmouseup = e => {
        if (e.button === 1) mbDraging = false;
        if (e.button === 2) rbDraging = false;
    }
    cv.onmousemove = e => {
        if (!e.buttons) return;
        const dx = e.movementX;
        const dy = e.movementY;
        if (mbDraging) {
            rotCamera(dx, dy);
        } else if (rbDraging) {
            camera.transform.translate(-dx * movSensitivity, dy * movSensitivity, 0);
        }
    }
    function rotCamera(dx, dy) {
        let rad = dx * rotSensitivity;
        if (Math.abs(rad) > Number.EPSILON) {
            camera.transform.rotateAround([0, 0, 0], [0, 0, 1], -rad, true);
        }
        rad = dy * rotSensitivity;
        if (Math.abs(rad) > Number.EPSILON) {
            let xAxis = camera.transform.xAxis;
            camera.transform.rotateAround([0, 0, 0], xAxis, -rad, true);
        }
    }
    cv.onwheel = e => {
        const dz = e.wheelDelta * wheelSensitivity;
        camera.transform.translate(0, 0, dz);
    }
    cv.oncontextmenu = e => e.preventDefault();

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;
        layout(location=4) in vec4 acolor;
        uniform mat4 uMVPmat;

        flat out vec4 vColor;
        flat out vec3 vNormal;
        out float vDist;
        void main(){
            gl_Position=uMVPmat * apos;
            vColor=acolor;
            vNormal=anormal;
            vDist =pow(max(gl_Position.z,gl_DepthRange.near), 0.5) * 25.0 ;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;

        flat in vec4 vColor;
        flat in vec3 vNormal;
        in float vDist;
        
        uniform vec3 uFog;//(min, max, max-min)
        uniform vec4 uFogColor;

        out vec4 fragColor;     

        float calcFogFactor(){
            float factor =  (uFog.y - vDist)/uFog.z ;
            factor = clamp(factor, 0.0, 1.0);
            return factor;
        }
        
        void main(){            
            float fogFactor = calcFogFactor();
            vec4 color = vec4(abs(vNormal), 1.0) ;
            color = color * fogFactor + uFogColor * (1.0 - fogFactor);
            
            fragColor=color;
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
    for (const key of ["uMVPmat", "uFog", "uFogColor"]) {
        program[key] = gl.getUniformLocation(program, key);
    }



    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const sphere = new MyGeometry.Sphere();
    const plane = new MyGeometry.Plane();
    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    sphere.createVAO(gl, () => {
        sphere.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        sphere.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        sphere.createVBOIndices(gl, gl.STATIC_DRAW);
    });

    plane.transform.scale(10, 10, 10);
    sphere.transform.translate(0, 0, 0.5);
    let fogNear = 1;
    let fogFar = camera.far;
    const fog = new Float32Array([fogNear, fogFar, fogFar - fogNear]);

    const da = Math.PI / 300;
    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();
        gl.useProgram(program);

        gl.uniform3fv(program.uFog, fog);

        gl.uniform4fv(program.uFogColor, new Float32Array([250 / 255, 235 / 255, 215 / 255, 1]));

        gl.polygonOffset(-1, -1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.uniformMatrix4fv(program.uMVPmat, false, mVP.multiply(plane.transform));
        plane.draw(gl);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(program.uMVPmat, false, mVP.multiply(sphere.transform));
        sphere.draw(gl);
        requestAnimationFrame(draw);
    }
    draw();
}

//clip plane
function cv1(cvi) {
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    let clipDist = .5;
    document.getElementById("clipDist").oninput = e => {
        clipDist = parseFloat(e.currentTarget.value);
    };

    const gl = cv.getContext("webgl2");


    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);

    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);

    window.onresize = e => {
        cv.width = cv.clientWidth;
        cv.height = cv.clientHeight;
        gl.viewport(0, 0, cv.clientWidth, cv.clientHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    let mbDraging = false;
    let rbDraging = false;
    let rotSensitivity = 0.01;
    let wheelSensitivity = 0.01;
    let movSensitivity = 0.01;
    cv.onmousedown = e => {
        if (e.button === 1) mbDraging = true;
        if (e.button === 2) rbDraging = true;
    }
    cv.onmouseup = e => {
        if (e.button === 1) mbDraging = false;
        if (e.button === 2) rbDraging = false;
    }
    cv.onmousemove = e => {
        if (!e.buttons) return;
        const dx = e.movementX;
        const dy = e.movementY;
        if (mbDraging) {
            rotCamera(dx, dy);
        } else if (rbDraging) {
            camera.transform.translate(-dx * movSensitivity, dy * movSensitivity, 0);
        }
    }
    function rotCamera(dx, dy) {
        let rad = dx * rotSensitivity;
        if (Math.abs(rad) > Number.EPSILON) {
            camera.transform.rotateAround([0, 0, 0], [0, 0, 1], -rad, true);
        }
        rad = dy * rotSensitivity;
        if (Math.abs(rad) > Number.EPSILON) {
            let xAxis = camera.transform.xAxis;
            camera.transform.rotateAround([0, 0, 0], xAxis, -rad, true);
        }
    }
    cv.onwheel = e => {
        const dz = e.wheelDelta * wheelSensitivity;
        camera.transform.translate(0, 0, dz);
    }
    cv.oncontextmenu = e => e.preventDefault();

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;
        uniform vec4 uClipPlane;//Ax+By+Cz+D=0

        out vec3 vNormal;  
        out float vClipDist;      
        void main(){
            gl_Position=uMVPmat * apos;
            vNormal =  (uMmat * vec4(anormal, 0.)).xyz;            
            vec4 pos = uMmat * apos;
            vClipDist = dot(pos.xyz, uClipPlane.xyz) + uClipPlane.w;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;

        in vec3 vNormal;
        in float vClipDist;
        out vec4 fragColor;     
        
        void main(){       
            if(vClipDist < 0.0) discard;
            fragColor = gl_FrontFacing ?  vec4(abs(vNormal), 1.) : vec4(1., 1., 0., 1.);
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

    const uniformCounts = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCounts; i++) {
        const info = gl.getActiveUniform(program, i);
        program[info.name] = gl.getUniformLocation(program, info.name);
    }

    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);


    const sphere = new MyGeometry.Sphere();
    const plane = new MyGeometry.Plane();
    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    sphere.createVAO(gl, () => {
        sphere.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        sphere.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        sphere.createVBOIndices(gl, gl.STATIC_DRAW);
    });

    plane.transform.scale(10, 10, 10);
    sphere.transform.translate(0, 0, 0.5);

    const clipPlane = new MyVector3([-1, -1, -1]).normalized();
    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();
        gl.useProgram(program);


        gl.uniform4fv(program.uClipPlane, new Float32Array([...clipPlane, clipDist]));

        gl.uniformMatrix4fv(program.uMVPmat, false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uMmat, false, plane.transform);
        plane.draw(gl);

        gl.uniformMatrix4fv(program.uMVPmat, false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program.uMmat, false, sphere.transform);
        sphere.draw(gl);
        requestAnimationFrame(draw);
    }
    draw();
}

//render to texture
function cv2(cvi) {
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);

    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);

    window.onresize = e => {
        cv.width = cv.clientWidth * 0.5;
        cv.height = cv.clientHeight * 0.5;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    let mbDraging = false;
    let rbDraging = false;
    let rotSensitivity = 0.01;
    let wheelSensitivity = 0.01;
    let movSensitivity = 0.01;
    cv.onmousedown = e => {
        if (e.button === 1) mbDraging = true;
        if (e.button === 2) rbDraging = true;
    }
    cv.onmouseup = e => {
        if (e.button === 1) mbDraging = false;
        if (e.button === 2) rbDraging = false;
    }
    cv.onmousemove = e => {
        if (!e.buttons) return;
        const dx = e.movementX;
        const dy = e.movementY;
        if (mbDraging) {
            rotCamera(dx, dy);
        } else if (rbDraging) {
            camera.transform.translate(-dx * movSensitivity, dy * movSensitivity, 0);
        }
    }
    function rotCamera(dx, dy) {
        let rad = dx * rotSensitivity;
        if (Math.abs(rad) > Number.EPSILON) {
            camera.transform.rotateAround([0, 0, 0], [0, 0, 1], -rad, true);
        }
        rad = dy * rotSensitivity;
        if (Math.abs(rad) > Number.EPSILON) {
            let xAxis = camera.transform.xAxis;
            camera.transform.rotateAround([0, 0, 0], xAxis, -rad, true);
        }
    }
    cv.onwheel = e => {
        const dz = e.wheelDelta * wheelSensitivity;
        camera.transform.translate(0, 0, dz);
    }
    cv.oncontextmenu = e => e.preventDefault();

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    const fShader1 = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;
        layout(location=2) in vec2 auv;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;

        out vec3 vNormal;  
        out vec2 vUV;
        void main(){
            gl_Position=uMVPmat * apos;
            vNormal =  (uMmat * vec4(anormal, 0.)).xyz;            
            vUV=auv;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;

        in vec3 vNormal;
        in vec2 vUV;
        out vec4 fragColor;     

        uniform sampler2D uTex;

        void main(){                   
            fragColor = vec4(texture(uTex, vUV).rgb, 1.0);
        }
    `);
    gl.shaderSource(fShader1, `#version 300 es
        precision mediump float;
        in vec3 vNormal;
        out vec4 fragColor;
        void main(){
            fragColor=vec4(abs(vNormal), 1.);
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

    const program1 = gl.createProgram();
    gl.attachShader(program1, vShader);
    gl.attachShader(program1, fShader1);
    gl.compileShader(fShader1);
    gl.linkProgram(program1);
    if (!gl.getProgramParameter(program1, gl.LINK_STATUS)) {
        console.error("program1 link error: ", gl.getProgramInfoLog(program1));
        console.error("fShader1 info: ", gl.getShaderInfoLog(fShader1));
    }

    for (const p of [program, program1]) {
        const uniformCounts = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCounts; i++) {
            const info = gl.getActiveUniform(p, i);
            p[info.name] = gl.getUniformLocation(p, info.name);
        }
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);


    const sphere = new MyGeometry.Sphere();
    const plane = new MyGeometry.Plane();
    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        plane.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    sphere.createVAO(gl, () => {
        sphere.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        sphere.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        sphere.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        sphere.createVBOIndices(gl, gl.STATIC_DRAW);
    });

    plane.transform.scale(10, 10, 10);
    sphere.transform.translate(0, 0, 0.5);

    const fbo = gl.createFramebuffer();
    const rboDepth = gl.createRenderbuffer();
    const tex = gl.createTexture();

    const fboWidth = gl.drawingBufferWidth;
    const fboHeight = gl.drawingBufferHeight;

    gl.bindRenderbuffer(gl.RENDERBUFFER, rboDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, fboWidth, fboHeight);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fboWidth, fboHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    // gl.generateMipmap(gl.TEXTURE_2D);
    const smp = gl.createSampler();
    gl.samplerParameteri(smp, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(smp, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rboDepth);

    const statusFBO = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (statusFBO !== gl.FRAMEBUFFER_COMPLETE) {
        alert(`frame buffer is not complete: {statusFBO}`);
    } else {

    }

    function draw() {
        const mVP = camera.getViewProjectMatrix();

        gl.useProgram(program1);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        // gl.clearColor(1.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(program1.uMVPmat, false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program1.uMmat, false, sphere.transform);
        sphere.draw(gl);


        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // gl.clearColor(0.0, 1.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        gl.uniformMatrix4fv(program.uMVPmat, false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uMmat, false, plane.transform);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindSampler(0, smp);
        gl.uniform1i(program.uTex, 0);
        plane.draw(gl);


        requestAnimationFrame(draw);
    }
    draw();
}

//render to depth texture
function cv3(cvi) {
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);

    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);

    window.onresize = e => {
        cv.width = cv.clientWidth * 0.5;
        cv.height = cv.clientHeight * 0.5;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    let mbDraging = false;
    let rbDraging = false;
    let rotSensitivity = 0.01;
    let wheelSensitivity = 0.01;
    let movSensitivity = 0.01;
    cv.onmousedown = e => {
        if (e.button === 1) mbDraging = true;
        if (e.button === 2) rbDraging = true;
    }
    cv.onmouseup = e => {
        if (e.button === 1) mbDraging = false;
        if (e.button === 2) rbDraging = false;
    }
    cv.onmousemove = e => {
        if (!e.buttons) return;
        const dx = e.movementX;
        const dy = e.movementY;
        if (mbDraging) {
            rotCamera(dx, dy);
        } else if (rbDraging) {
            camera.transform.translate(-dx * movSensitivity, dy * movSensitivity, 0);
        }
    }
    function rotCamera(dx, dy) {
        let rad = dx * rotSensitivity;
        if (Math.abs(rad) > Number.EPSILON) {
            camera.transform.rotateAround([0, 0, 0], [0, 0, 1], -rad, true);
        }
        rad = dy * rotSensitivity;
        if (Math.abs(rad) > Number.EPSILON) {
            let xAxis = camera.transform.xAxis;
            camera.transform.rotateAround([0, 0, 0], xAxis, -rad, true);
        }
    }
    cv.onwheel = e => {
        const dz = e.wheelDelta * wheelSensitivity;
        camera.transform.translate(0, 0, dz);
    }
    cv.oncontextmenu = e => e.preventDefault();


    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;
        layout(location=2) in vec2 auv;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;

        out vec3 vNormal;  
        out vec2 vUV;
        void main(){
            gl_Position=uMVPmat * apos;
            vNormal =  (uMmat * vec4(anormal, 0.)).xyz;            
            vUV=auv;
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;

        in vec3 vNormal;
        in vec2 vUV;
        out vec4 fragColor;     

        uniform sampler2D uTex;

        void main(){ 
            float v =pow(texture(uTex, vec2(vUV.x, -vUV.y)).r, 10.0);         
            fragColor = vec4(v,v,v, 1.0);
        }
    `);
    const fShader1 = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        void main(){
        }
    `);

    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);
    const program1 = MyGLProgram.create(gl);
    program1.link(vShader, fShader1);


    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);


    const sphere = new MyGeometry.Sphere();
    const plane = new MyGeometry.Plane();
    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        plane.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    sphere.createVAO(gl, () => {
        sphere.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        sphere.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        sphere.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        sphere.createVBOIndices(gl, gl.STATIC_DRAW);
    });

    plane.transform.scale(10, 10, 10);
    sphere.transform.translate(0, 0, 0.5);

    const fbo = gl.createFramebuffer();
    const fboWidth = gl.drawingBufferWidth;
    const fboHeight = gl.drawingBufferHeight;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, fboWidth, fboHeight, 0, gl.RGB, gl.UNSIGNED_SHORT_5_6_5, null);
    // gl.generateMipmap(gl.TEXTURE_2D);

    const depthTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, fboWidth, fboHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const smp = gl.createSampler();
    gl.samplerParameteri(smp, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(smp, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);

    const statusFBO = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (statusFBO !== gl.FRAMEBUFFER_COMPLETE) {
        alert(`frame buffer is not complete: ${statusFBO}`);
    } else {

    }

    function draw() {
        const mVP = camera.getViewProjectMatrix();

        program1.use();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        gl.colorMask(false, false, false, false);
        gl.uniformMatrix4fv(program1.uniforms["uMVPmat"], false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program1.uniforms["uMmat"], false, sphere.transform);
        sphere.draw(gl);
        gl.uniformMatrix4fv(program1.uniforms["uMVPmat"], false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program1.uniforms["uMmat"], false, plane.transform);
        plane.draw(gl);
        gl.colorMask(true, true, true, true);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        program.use();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.uniform1i(program.uniforms["uTex"], 0);


        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, plane.transform);
        plane.draw(gl);

        requestAnimationFrame(draw);
    }
    draw();
}