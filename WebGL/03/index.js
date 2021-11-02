"use strict";
import MyCamera from "../js/MyCamera.js";
import MyGeometry from "../js/MyGeometry.js";
import { MyMatrix4x4 } from "../js/MyMatrix.js";
import { MyVector3 } from "../js/MyVector.js";
import MyGLProgram from "../js/MyGLProgram.js";
import MyMaterial from "../js/MyMaterial.js";
import * as MyMath from "../js/MyMath.js";

window.addEventListener('DOMContentLoaded', function () {
    // const App = top.window.App;
    // /**@type{MyMemu} */
    // const myMenu = App.myMenu;
    // const origin = top.location.origin;				// http://127.0.0.1
    // const host = top.location.host;					// 127.0.0.1
    // const hostp = top.location.origin.substr(4);	// ://127.0.0.1或者s://127.0.0.1

    const inputs = document.querySelectorAll("input[type='radio']");
    let j = 0;
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        if (input.classList.length === 0) {
            let k = j;
            input.onchange = function (e) { eval(`cv${k}(${k})`) };
            j++;
        }
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

//height map transfer to normal map
function cv0(cvi) {
    const img = document.getElementById("heightMap");
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = img.width;// cv.clientWidth;
    cv.height = img.height;// cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const emKeepRatio = document.getElementById("keepRatio");
    emKeepRatio.onchange = () => {
        // console.log(emKeepRatio);
        if (emKeepRatio.checked) {
            cv.style.width = cv.width + "px";
            cv.style.height = cv.height + "px";
        } else {
            cv.style.width = "100%";
            cv.style.height = "100%";
        }
    }
    emKeepRatio.onchange();

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);

    window.onresize = e => {
        // cv.width = cv.clientWidth * 0.5;
        // cv.height = cv.clientHeight * 0.5;
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
    // cv.oncontextmenu = e => e.preventDefault();

    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        const float c0=0.;
        const float c1=1.;

        layout(location=0) in vec4 aPos;
        layout(location=2) in vec2 aUV;

        out vec2 vUV;
        void main(){
            gl_Position=aPos*vec4(2.0,2.0,2.0,1.0);      
            vUV = aUV;
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        const float c0=0.;
        const float c1=1.;

        uniform sampler2D uTex;
        uniform vec4 uTexSize;  //(1.0/texWidth, 1.0/texHeight, texWidth, texHeight);
        uniform float uHScale;

        in vec2 vUV;
        out vec4 fragColor;  
        
        void main(){    
            vec2 du = vec2(uTexSize.x, c0);
            float u1=texture(uTex, vUV).x;
            float u2=texture(uTex, vUV + du).x;                       
            vec3 nu = vec3(uTexSize.x * uHScale, c0,  u2-u1);

            vec2 dv = vec2(c0, -uTexSize.y);
            float v1=texture(uTex, vUV).x;
            float v2=texture(uTex, vUV + dv).x;
            vec3 nv = vec3(c0, uTexSize.y * uHScale, v2-v1);
            
            vec3 n= cross(nu, nv);
            n=normalize(n);
       
            fragColor =  vec4((n+c1)*0.5, 1.0); 
        }
    `);

    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const plane = new MyGeometry.Plane();
    plane.createVAOAll(gl, gl.STATIC_DRAW);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

    let updating = false;
    /**@type{HTMLInputElement} */
    const file = document.querySelectorAll("input[type='file']")[0];
    file.onchange = e => {
        const f = file.files[0];
        if (!f) return;
        const fr = new FileReader();
        fr.readAsDataURL(f);
        fr.onloadend = e => {
            img.src = fr.result;
            img.onload = e => {
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
            }
            updating = true;
        }
    }

    let hScale = 1;

    const emHScale = document.getElementById("hScale");
    emHScale.oninput = e => {
        hScale = emHScale.value;
        updating = true;
    }
    emHScale.oninput();



    function draw() {
        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();

        program.use();

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(program.uniforms["uTex"], 0);
        const texSize = new Float32Array([1 / img.width, 1 / img.height, img.width, img.height]);
        gl.uniform4fv(program.uniforms["uTexSize"], texSize);
        gl.uniform1f(program.uniforms["uHScale"], hScale);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        plane.draw(gl);

        if (updating) {
            updating = false;
            document.getElementById("outNormalMap").src = createNormalMapURL();
        }
        if (saving) {
            saving = false;
            saveAsFile();
        }

        requestAnimationFrame(draw);
    }

    const btns = document.querySelectorAll("input[type='button']");
    let saving = false;
    /**@type{CanvasRenderingContext2D} */
    let ctxSave = null;

    function createNormalMapURL() {
        // gl.readBuffer(gl.COLOR_ATTACHMENT0);
        const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        // console.log(pixels);

        if (!ctxSave) ctxSave = document.createElement("canvas").getContext("2d");
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        ctxSave.canvas.width = w;
        ctxSave.canvas.height = h;

        const imgdata = ctxSave.createImageData(w, h);

        let k = 0;
        const ww = w * 4;
        for (let i = 0; i < h; i++) {
            const offset = (h - i - 1) * ww;
            for (let j = 0; j < ww; j++) {
                imgdata.data[k] = pixels[offset + j];//翻转y轴
                k++;
            }
        }
        ctxSave.putImageData(imgdata, 0, 0);
        return ctxSave.canvas.toDataURL("image/png");
    }

    btns[0].onclick = e => {
        saving = true;
    }
    function saveAsFile() {
        download(createNormalMapURL);
    }
    let downloadA = null;
    function download(url) {
        if (!downloadA) downloadA = document.createElement("a");
        downloadA.download = "";
        downloadA.href = url;
        downloadA.click();
    }

    draw();
}

//height map
function cv1(cvi) {
    const img = document.getElementById("heightMap");
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = img.width;// cv.clientWidth;
    cv.height = img.height;// cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);

    window.onresize = e => {
        cv.width = cv.clientWidth;
        cv.height = cv.clientHeight;
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
    const inputind = 0;
    const m_ambient = document.querySelectorAll("#m_ambient")[inputind];
    const m_diffuse = document.querySelectorAll("#m_diffuse")[inputind];
    const m_specular = document.querySelectorAll("#m_specular")[inputind];
    const m_exponent = document.querySelectorAll("#m_specular_exponent")[inputind];
    const l_ambient = document.querySelectorAll("#l_ambient")[inputind];

    let m_ambient_color;
    let m_diffuse_color;
    let m_specular_color;
    let m_specular_exponent;
    let l_color;

    m_ambient.oninput = e => m_ambient_color = getColorFromInputElement(m_ambient);
    m_diffuse.oninput = e => m_diffuse_color = getColorFromInputElement(m_diffuse);
    m_specular.oninput = e => m_specular_color = getColorFromInputElement(m_specular);
    m_exponent.oninput = e => m_specular_exponent = parseFloat(m_exponent.value);
    l_ambient.oninput = e => l_color = getColorFromInputElement(l_ambient);

    m_ambient.oninput(); m_diffuse.oninput(); m_specular.oninput(); m_exponent.oninput();
    l_ambient.oninput();

    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        const float c0=0.;
        const float c1=1.;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;
        uniform float uScale;

        layout(location=0) in vec4 aPos;
        layout(location=1) in vec3 aNormal;
        layout(location=2) in vec2 aUV;

        out vec2 vUV;
        out vec3 vNormal;

        void main(){
            gl_Position=uMVPmat * aPos;            
            vUV = aUV * uScale;
            vNormal =(uMmat * vec4(aNormal, c0)).xyz;
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        const float c0=0.;
        const float c1=1.;

        uniform struct direction_light{
            vec3 direction;         //The normalized light direction in world space
            vec3 halfplane;         //The normalized half-plane vector H. This can be
                                    //precomputed for a directional light, as it does not change.
            vec4 color;
        } uLight;
        uniform struct material_props{
            vec4 ambient_color;
            vec4 diffuse_color;
            vec4 specular_color;
            float specular_exponent;
        } uMaterial;
        uniform sampler2D uTex;
        uniform vec4 uTexSize;  //(1.0/texWidth, 1.0/texHeight, texWidth, texHeight);
        uniform float uHScale;

        in vec3 vNormal;
        in vec2 vUV;
        out vec4 fragColor;  
        
        // normal in world space and is a
        // normalized vector; this function returns the computed color
        vec4 direction_light_color(vec3 normal){
            vec4 color = vec4(c0);
            color += (uLight.color * uMaterial.ambient_color);
            
            float ndotl = max(c0, dot(normal, uLight.direction));
            color += (ndotl * uLight.color * uMaterial.diffuse_color);

            float ndoth = max(c0, dot(normal, uLight.halfplane));
            color += (pow(ndoth, uMaterial.specular_exponent) * 
                      uLight.color * uMaterial.specular_color);
            
            return color;
        }

        void main(){    
            vec2 du = vec2(uTexSize.x , c0);
            float u1=texture(uTex, vUV ).x;
            float u2=texture(uTex, vUV + du).x;                       
            vec3 nu = vec3(uTexSize.x * uHScale, c0,  u2-u1);

            vec2 dv = vec2(c0, -uTexSize.y);
            float v1=texture(uTex, vUV).x;
            float v2=texture(uTex, vUV + dv).x;
            vec3 nv = vec3(c0, uTexSize.y * uHScale, v2-v1);
            
            vec3 n= cross(nu, nv);
            n=normalize(n);

            vec4 color = direction_light_color(n);         
            fragColor =  color;
        }
    `);


    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);


    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);


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


    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    const ips = document.querySelectorAll(".mip");
    for (let i = 0; i < ips.length; i++) {
        ips[i].onchange = e => changeFilter(ips[i].title);
    }
    function changeFilter(type) {
        const dic = {
            nearest: gl.NEAREST,
            linear: gl.LINEAR,
            nearest_mipmap_nearest: gl.NEAREST_MIPMAP_NEAREST,
            nearest_mipmap_linear: gl.NEAREST_MIPMAP_LINEAR,
            linear_mipmap_nearest: gl.LINEAR_MIPMAP_NEAREST,
            linear_mipmap_linear: gl.LINEAR_MIPMAP_LINEAR,
        };
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, dic[type]);
    }


    const lightDir = new MyVector3([0, 10, 10]).normalized();
    const texSize = new Float32Array([1 / img.width, 1 / img.height, img.width, img.height]);

    const emLightAng = document.getElementById("lightAng");
    emLightAng.oninput = e => {
        const a = MyMath.deg2radian * emLightAng.value
        const b = MyMath.deg2radian * 45;
        lightDir.z = Math.sin(b);
        const r = Math.cos(b);
        lightDir.x = r * Math.cos(a);
        lightDir.y = r * Math.sin(a);
    }
    emLightAng.oninput();

    let uvScale = 1;
    const emUVScale = document.getElementById("uvScale");
    emUVScale.oninput = e => {
        uvScale = emUVScale.value;
    }
    emUVScale.oninput();

    const emHScale = document.getElementById("hScale");

    function draw() {
        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();

        program.use();

        gl.uniform4fv(program.uniforms["uMaterial.ambient_color"], m_ambient_color);
        gl.uniform4fv(program.uniforms["uMaterial.diffuse_color"], m_diffuse_color);
        gl.uniform4fv(program.uniforms["uMaterial.specular_color"], m_specular_color);
        gl.uniform1f(program.uniforms["uMaterial.specular_exponent"], m_specular_exponent);
        gl.uniform4fv(program.uniforms["uLight.color"], l_color);

        const vLightDir = lightDir;//MyVector3.from(mV.multiplyVec(lightDir));
        const vHalfplane = MyVector3.from(camera.transform.zAxis).add(vLightDir).normalized(); //new MyVector3([0, 0, 1]).added(vLightDir).normalized();
        gl.uniform3fv(program.uniforms["uLight.direction"], vLightDir);
        gl.uniform3fv(program.uniforms["uLight.halfplane"], vHalfplane);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(program.uniforms["uTex"], 0);
        gl.uniform4fv(program.uniforms["uTexSize"], texSize);

        gl.uniform1f(program.uniforms["uScale"], uvScale);
        gl.uniform1f(program.uniforms["uHScale"], emHScale.value);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, plane.transform);

        // gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        // gl.clear(gl.COLOR_BUFFER_BIT);
        // plane.draw(gl);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        plane.draw(gl);


        // gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(sphere.transform));
        // gl.uniformMatrix4fv(program.uniforms["uMmat"], false, sphere.transform);
        // sphere.draw(gl);

        requestAnimationFrame(draw);
    }

    draw();
}

let anim = false;

//normal map
function cv2(cvi) {
    const img = document.getElementById("outNormalMap");
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = img.width;// cv.clientWidth;
    cv.height = img.height;// cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);
    camera.mouseControl(cv);

    window.onresize = e => {
        cv.width = cv.clientWidth;
        cv.height = cv.clientHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    cv.oncontextmenu = e => e.preventDefault();
    const inputind = 0;
    const m_ambient = document.querySelectorAll("#m_ambient")[inputind];
    const m_diffuse = document.querySelectorAll("#m_diffuse")[inputind];
    const m_specular = document.querySelectorAll("#m_specular")[inputind];
    const m_exponent = document.querySelectorAll("#m_specular_exponent")[inputind];
    const l_ambient = document.querySelectorAll("#l_ambient")[inputind];

    let m_ambient_color;
    let m_diffuse_color;
    let m_specular_color;
    let m_specular_exponent;
    let l_color;

    m_ambient.oninput = e => m_ambient_color = getColorFromInputElement(m_ambient);
    m_diffuse.oninput = e => m_diffuse_color = getColorFromInputElement(m_diffuse);
    m_specular.oninput = e => m_specular_color = getColorFromInputElement(m_specular);
    m_exponent.oninput = e => m_specular_exponent = parseFloat(m_exponent.value);
    l_ambient.oninput = e => l_color = getColorFromInputElement(l_ambient);

    m_ambient.oninput(); m_diffuse.oninput(); m_specular.oninput(); m_exponent.oninput();
    l_ambient.oninput();

    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        const float c0=0.;
        const float c1=1.;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;
        uniform float uScale;

        layout(location=0) in vec4 aPos;
        layout(location=1) in vec3 aNormal;
        layout(location=2) in vec2 aUV;
        layout(location=3) in vec3 aTangent; 

        out vec2 vUV;
        out vec3 vNormal;
        out vec3 vTangent;
        out vec3 vBinormal;

        vec3 createBinormal(vec3 normal, vec3 tangent){
            return cross(normal, tangent);
        }

        void main(){
            gl_Position=uMVPmat * aPos;            
            vUV = aUV * uScale;
            vNormal =normalize((uMmat * vec4(aNormal, c0)).xyz);
            vTangent=normalize((uMmat * vec4(aTangent, c0)).xyz);
            vBinormal = createBinormal(vNormal, vTangent);
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        const float c0=0.;
        const float c1=1.;

        uniform struct direction_light{
            vec3 direction;         //The normalized light direction in world space
            vec3 halfplane;         //The normalized half-plane vector H. This can be
                                    //precomputed for a directional light, as it does not change.
            vec4 color;
        } uLight;
        uniform struct material_props{
            vec4 ambient_color;
            vec4 diffuse_color;
            vec4 specular_color;
            float specular_exponent;
        } uMaterial;
        uniform sampler2D uTex;        
        uniform float uHScale;
        uniform bool uShowNormal;

        in vec3 vNormal;
        in vec3 vTangent;
        in vec3 vBinormal;
        in vec2 vUV;
        out vec4 fragColor;  
        
        // normal in world space and is a
        // normalized vector; this function returns the computed color
        vec4 direction_light_color(vec3 normal){
            vec4 color = vec4(c0);
            color += (uLight.color * uMaterial.ambient_color);
            
            float ndotl = max(c0, dot(normal, uLight.direction));
            color += (ndotl * uLight.color * uMaterial.diffuse_color);

            float ndoth = max(c0, dot(normal, uLight.halfplane));
            color += (pow(ndoth, uMaterial.specular_exponent) * 
                      uLight.color * uMaterial.specular_color);
            
            return color;
        }

        vec3 getNormalFromTex(sampler2D tex, vec2 uv){
            return texture(tex, uv).rgb * 2.0 -1.0;
        }

        void main(){    
            vec3 n = getNormalFromTex(uTex, vUV);
            n.z*=uHScale;
            n = vTangent * n.x + vBinormal * n.y + vNormal * n.z; 
            n=normalize(n);
            vec4 color = direction_light_color(n);         
            fragColor = uShowNormal ? vec4(n, c1) : color;            
        }
    `);


    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);


    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);


    const sphere = new MyGeometry.Sphere();
    const plane = new MyGeometry.Plane();
    const cube = new MyGeometry.Cube();

    plane.createVAOAll(gl, gl.STATIC_DRAW);
    cube.createVAOAll(gl, gl.STATIC_DRAW);
    sphere.createVAOAll(gl, gl.STATIC_DRAW);

    plane.transform.scale(10, 10, 10);
    sphere.transform.translate(0, 0, 0.5);
    cube.transform.translate(1.5, 0, 0.5);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    const lightDir = new MyVector3([0, 10, 10]).normalized();

    const emLightAng = document.getElementById("lightAng1");
    emLightAng.oninput = e => {
        const a = MyMath.deg2radian * emLightAng.value
        const b = MyMath.deg2radian * 45;
        lightDir.z = Math.sin(b);
        const r = Math.cos(b);
        lightDir.x = r * Math.cos(a);
        lightDir.y = r * Math.sin(a);
    }
    emLightAng.oninput();

    let hScale = 1;
    const emHScale = document.getElementById("hScale1");
    emHScale.oninput = e => {
        hScale = emHScale.value;
    }
    emHScale.oninput();

    let uvScale = 1;
    const emUVScale = document.getElementById("uvScale1");
    emUVScale.oninput = e => {
        uvScale = emUVScale.value;
    }
    emUVScale.oninput();

    document.getElementById("btnAnim").onclick = e => {
        anim = !anim;
    }

    function draw() {
        if (anim) {
            // cube.transform.rotateX(0.01);
            // cube.transform.rotateY(0.01);
            cube.transform.rotateZ(0.01);
            sphere.transform.rotateZ(0.01);
        }

        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        program.use();

        gl.uniform4fv(program.uniforms["uMaterial.ambient_color"], m_ambient_color);
        gl.uniform4fv(program.uniforms["uMaterial.diffuse_color"], m_diffuse_color);
        gl.uniform4fv(program.uniforms["uMaterial.specular_color"], m_specular_color);
        gl.uniform1f(program.uniforms["uMaterial.specular_exponent"], m_specular_exponent);
        gl.uniform4fv(program.uniforms["uLight.color"], l_color);

        const vLightDir = lightDir;
        const vHalfplane = MyVector3.from(camera.transform.zAxis).add(vLightDir).normalized();
        gl.uniform3fv(program.uniforms["uLight.direction"], vLightDir);
        gl.uniform3fv(program.uniforms["uLight.halfplane"], vHalfplane);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(program.uniforms["uTex"], 0);
        gl.uniform1f(program.uniforms['uHScale'], hScale);
        gl.uniform1f(program.uniforms['uScale'], uvScale);
        gl.uniform1f(program.uniforms["uShowNormal"], document.getElementById("showNormal").checked ? 1 : 0);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, plane.transform);
        plane.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, cube.transform);
        cube.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, sphere.transform);
        sphere.draw(gl);

        requestAnimationFrame(draw);
    }


    draw();
}

//parallax map
function cv3(cvi) {
    const imgHeight = document.getElementById("heightMap");
    const imgNormal = document.getElementById("outNormalMap");
    const imgGrid = document.getElementById("gridMap");
    const imgDiffuse = document.getElementById("diffuseMap");

    const cv = document.getElementsByTagName("canvas")[cvi];

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);
    camera.mouseControl(cv);

    window.onresize = e => {
        cv.width = cv.clientWidth;
        cv.height = cv.clientHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    cv.oncontextmenu = e => e.preventDefault();
    const inputind = 0;
    const m_ambient = document.querySelectorAll("#m_ambient")[inputind];
    const m_diffuse = document.querySelectorAll("#m_diffuse")[inputind];
    const m_specular = document.querySelectorAll("#m_specular")[inputind];
    const m_exponent = document.querySelectorAll("#m_specular_exponent")[inputind];
    const l_ambient = document.querySelectorAll("#l_ambient")[inputind];

    let m_ambient_color;
    let m_diffuse_color;
    let m_specular_color;
    let m_specular_exponent;
    let l_color;

    m_ambient.oninput = e => m_ambient_color = getColorFromInputElement(m_ambient);
    m_diffuse.oninput = e => m_diffuse_color = getColorFromInputElement(m_diffuse);
    m_specular.oninput = e => m_specular_color = getColorFromInputElement(m_specular);
    m_exponent.oninput = e => m_specular_exponent = parseFloat(m_exponent.value);
    l_ambient.oninput = e => l_color = getColorFromInputElement(l_ambient);

    m_ambient.oninput(); m_diffuse.oninput(); m_specular.oninput(); m_exponent.oninput();
    l_ambient.oninput();

    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        const float c0=0.;
        const float c1=1.;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;        
        uniform float uScale;
        uniform vec3 uViewPosInObjSpace;

        layout(location=0) in vec4 aPos;
        layout(location=1) in vec3 aNormal;
        layout(location=2) in vec2 aUV;
        layout(location=3) in vec3 aTangent; 

        out vec2 vUV;
        out vec3 vNormal;
        out vec3 vTangent;
        out vec3 vBinormal;
        out vec3 vViewDirInTangentSpace;

        vec3 createBinormal(vec3 normal, vec3 tangent){
            return cross(normal, tangent);
        }
        
        vec3 viewDirInTangentSpace(vec3 normal, vec3 tangent, vec3 vertexPos, vec3 viewPosInObjectSpace){
            vec3 viewDir = viewPosInObjectSpace - vertexPos;
            vec3 binormal= createBinormal(normal, tangent);
            //正交矩阵的逆等于该矩阵的转置
            // mat3 obj2Tangent=inverse(mat3(tangent, binormal, normal));
            // return obj2Tangent * viewDir;
            return viewDir * mat3(tangent, binormal, normal);//transpose(mat3(tangent, binormal, normal));
        }

        void main(){
            gl_Position=uMVPmat * aPos;            
            vUV = aUV * uScale;
            vNormal =normalize((uMmat * vec4(aNormal, c0)).xyz);
            vTangent=normalize((uMmat * vec4(aTangent, c0)).xyz);
            vBinormal = createBinormal(vNormal, vTangent);
            
            vViewDirInTangentSpace = viewDirInTangentSpace(aNormal, aTangent, aPos.xyz, uViewPosInObjSpace);
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        const float c0=0.;
        const float c1=1.;

        uniform struct direction_light{
            vec3 direction;         //The normalized light direction in world space
            vec3 halfplane;         //The normalized half-plane vector H. This can be
                                    //precomputed for a directional light, as it does not change.
            vec4 color;
        } uLight;
        uniform struct material_props{
            vec4 ambient_color;
            vec4 diffuse_color;
            vec4 specular_color;
            float specular_exponent;
        } uMaterial;
        
        uniform sampler2D uTexColor;
        uniform sampler2D uTexNormal;        
        uniform float uHScale;
        uniform bool uShowNormal;

        uniform sampler2D uTexHeight;
        uniform float uParallax;

        uniform sampler2D uGridTex;
        uniform vec2 uGridScale;

        in vec3 vNormal;
        in vec3 vTangent;
        in vec3 vBinormal;
        in vec3 vViewDirInTangentSpace;
        in vec2 vUV;
        out vec4 fragColor;  
        
        // normal in world space and is a
        // normalized vector; this function returns the computed color
        vec4 direction_light_color(vec3 normal){
            vec4 color = vec4(c0);
            color += (uLight.color * uMaterial.ambient_color);            
            
            float ndotl = max(c0, dot(normal, uLight.direction));
            color += (ndotl * uLight.color * uMaterial.diffuse_color);

            float ndoth = max(c0, dot(normal, uLight.halfplane));
            color += (pow(ndoth, uMaterial.specular_exponent) * 
                      uLight.color * uMaterial.specular_color);
            
            return color;
        }

        vec3 getNormalFromTex(sampler2D tex, vec2 uv){
            return texture(tex, uv).rgb * 2.0 -1.0;
        }

        float getParallaxHeight(vec2 uv, sampler2D texHeight){
            return texture(texHeight, uv).g;
        }

        vec2 parallaxOffset(vec2 uv, vec3 viewDir, sampler2D texHeight){
            float height = getParallaxHeight(uv, texHeight);
            height -= 0.5;
            height *= uParallax;
            viewDir.xy /= viewDir.z;
            return viewDir.xy * height;
        }

        void applyParallax(inout vec2 uv, vec3 viewDirInTangentSpace, sampler2D texHeight){
            viewDirInTangentSpace.y = -viewDirInTangentSpace.y;
            // viewDirInTangentSpace.xy /= (viewDirInTangentSpace.z + 0.42);

            vec2 uvOffset=parallaxOffset(uv, viewDirInTangentSpace, texHeight);
            uv += uvOffset;
        }

        void main(){    
            vec2 uv=vUV;                   
            vec3 viewDirInTangentSpace = normalize(vViewDirInTangentSpace);
            applyParallax(uv, viewDirInTangentSpace, uTexHeight);

            vec3 n = getNormalFromTex(uTexNormal, uv);
            n.z*=uHScale;
            n = vTangent * n.x + vBinormal * n.y + vNormal * n.z; 
            n=normalize(n);

            vec2 detailUV=uv * uGridScale;
            vec4 color = direction_light_color(n);
            color += uLight.color * texture(uTexColor, uv);
            color *= texture(uGridTex, detailUV);
            // fragColor =vec4((viewDirInTangentSpace + 1.) * 0.5, 1.);     
            fragColor =uShowNormal ? vec4(n, c1) : color;            
        }
    `);


    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);


    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);


    const sphere = new MyGeometry.Sphere(1, 4);
    const plane = new MyGeometry.Plane();
    const cube = new MyGeometry.Cube();


    plane.createVAOAll(gl, gl.STATIC_DRAW);
    cube.createVAOAll(gl, gl.STATIC_DRAW);
    sphere.createVAOAll(gl, gl.STATIC_DRAW);

    plane.transform.scale(10, 10, 10);
    sphere.transform.translate(0, 0, 0.5);
    cube.transform.translate(1.5, 0, 0.5);
    cube.transform.rotateY(Math.PI * 0.5);

    const texDiffuse = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texDiffuse);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgDiffuse);
    gl.generateMipmap(gl.TEXTURE_2D);

    const texNormal = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texNormal);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgNormal);
    gl.generateMipmap(gl.TEXTURE_2D);

    const texHeight = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texHeight);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgHeight);
    gl.generateMipmap(gl.TEXTURE_2D);


    const smp = gl.createSampler();
    gl.samplerParameteri(smp, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(smp, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const texGrid = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texGrid);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgGrid);
    gl.generateMipmap(gl.TEXTURE_2D);

    const smpGrid = gl.createSampler();
    gl.samplerParameteri(smp, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.samplerParameteri(smp, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const lightDir = new MyVector3([0, 10, 10]).normalized();

    /**@type{HTMLInputElement} */
    const file = document.querySelectorAll("input[type='file']")[1];
    file.onchange = e => {
        const f = file.files[0];
        if (!f) return;
        const fr = new FileReader();
        fr.readAsDataURL(f);
        fr.onloadend = e => {
            imgDiffuse.src = fr.result;
            imgDiffuse.onload = e => {
                gl.bindTexture(gl.TEXTURE_2D, texDiffuse);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgDiffuse);
            }
        }
    }

    const emLightAng = document.getElementById("lightAng1");
    emLightAng.oninput = e => {
        const a = MyMath.deg2radian * emLightAng.value
        const b = MyMath.deg2radian * 45;
        lightDir.z = Math.sin(b);
        const r = Math.cos(b);
        lightDir.x = r * Math.cos(a);
        lightDir.y = r * Math.sin(a);
    }
    emLightAng.oninput();

    let hScale = 1;
    const emHScale = document.getElementById("hScale1");
    emHScale.oninput = e => {
        hScale = emHScale.value;
    }
    emHScale.oninput();

    let uvScale = 1;
    const emUVScale = document.getElementById("uvScale1");
    emUVScale.oninput = e => {
        uvScale = emUVScale.value;
    }
    emUVScale.oninput();

    let uvGridScale = 1;
    const emUVGridScale = document.getElementById("uvGridScale");
    emUVGridScale.oninput = e => {
        uvGridScale = emUVGridScale.value;
    }
    emUVGridScale.oninput();

    let parallax = 0;
    const emParallax = document.getElementById("parallax");
    emParallax.oninput = e => {
        parallax = emParallax.value;
    }
    emParallax.oninput();


    document.getElementById("btnAnim").onclick = e => {
        anim = !anim;
    }


    gl.bindTexture(gl.TEXTURE_2D, texNormal);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgNormal);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, texHeight);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgHeight);
    gl.generateMipmap(gl.TEXTURE_2D);

    function draw() {
        if (anim) {
            cube.transform.rotateX(0.01);
            cube.transform.rotateY(0.01);
            cube.transform.rotateZ(0.01);
            sphere.transform.rotateZ(0.01);
        }

        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();
        const camPos = camera.transform.localPosition;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        program.use();

        gl.uniform4fv(program.uniforms["uMaterial.ambient_color"], m_ambient_color);
        gl.uniform4fv(program.uniforms["uMaterial.diffuse_color"], m_diffuse_color);
        gl.uniform4fv(program.uniforms["uMaterial.specular_color"], m_specular_color);
        gl.uniform1f(program.uniforms["uMaterial.specular_exponent"], m_specular_exponent);
        gl.uniform4fv(program.uniforms["uLight.color"], l_color);

        const vLightDir = lightDir;
        const vHalfplane = MyVector3.from(camera.transform.zAxis).add(vLightDir).normalized();
        gl.uniform3fv(program.uniforms["uLight.direction"], vLightDir);
        gl.uniform3fv(program.uniforms["uLight.halfplane"], vHalfplane);



        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texNormal);
        gl.bindSampler(0, smp);
        gl.uniform1i(program.uniforms["uTexNormal"], 0);
        gl.uniform1f(program.uniforms['uHScale'], hScale);
        gl.uniform1f(program.uniforms['uScale'], uvScale);
        gl.uniform1f(program.uniforms["uShowNormal"], document.getElementById("showNormal").checked ? 1 : 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texHeight);
        gl.bindSampler(1, smp);
        gl.uniform1i(program.uniforms["uTexHeight"], 1);
        gl.uniform1f(program.uniforms["uParallax"], parallax);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texGrid);
        gl.bindSampler(2, smpGrid);
        gl.uniform1i(program.uniforms["uGridTex"], 2);
        gl.uniform2f(program.uniforms["uGridScale"], uvGridScale, uvGridScale);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, texDiffuse);
        gl.bindSampler(3, smp);
        gl.uniform1i(program.uniforms["uTexColor"], 3);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, plane.transform);
        gl.uniform3fv(program.uniforms["uViewPosInObjSpace"], plane.transform.inverse().multiplyPoint(camPos));
        plane.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, cube.transform);
        gl.uniform3fv(program.uniforms["uViewPosInObjSpace"], cube.transform.inverse().multiplyPoint(camPos));
        cube.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, sphere.transform);
        gl.uniform3fv(program.uniforms["uViewPosInObjSpace"], sphere.transform.inverse().multiplyPoint(camPos));
        sphere.draw(gl);

        requestAnimationFrame(draw);
    }


    draw();
}

//raymarching
function cv4(cvi) {
    const imgHeight = document.getElementById("heightMap");
    const imgNormal = document.getElementById("outNormalMap");
    const imgGrid = document.getElementById("gridMap");
    const imgDiffuse = document.getElementById("diffuseMap");

    const cv = document.getElementsByTagName("canvas")[cvi];

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);
    camera.mouseControl(cv);

    window.onresize = e => {
        cv.width = cv.clientWidth;
        cv.height = cv.clientHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    cv.oncontextmenu = e => e.preventDefault();
    const inputind = 0;
    const m_ambient = document.querySelectorAll("#m_ambient")[inputind];
    const m_diffuse = document.querySelectorAll("#m_diffuse")[inputind];
    const m_specular = document.querySelectorAll("#m_specular")[inputind];
    const m_exponent = document.querySelectorAll("#m_specular_exponent")[inputind];
    const l_ambient = document.querySelectorAll("#l_ambient")[inputind];

    let m_ambient_color;
    let m_diffuse_color;
    let m_specular_color;
    let m_specular_exponent;
    let l_color;

    m_ambient.oninput = e => m_ambient_color = getColorFromInputElement(m_ambient);
    m_diffuse.oninput = e => m_diffuse_color = getColorFromInputElement(m_diffuse);
    m_specular.oninput = e => m_specular_color = getColorFromInputElement(m_specular);
    m_exponent.oninput = e => m_specular_exponent = parseFloat(m_exponent.value);
    l_ambient.oninput = e => l_color = getColorFromInputElement(l_ambient);

    m_ambient.oninput(); m_diffuse.oninput(); m_specular.oninput(); m_exponent.oninput();
    l_ambient.oninput();

    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        const float c0=0.;
        const float c1=1.;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;        
        uniform float uScale;
        uniform vec3 uViewPosInObjSpace;

        layout(location=0) in vec4 aPos;
        layout(location=1) in vec3 aNormal;
        layout(location=2) in vec2 aUV;
        layout(location=3) in vec3 aTangent; 

        out vec2 vUV;
        out vec3 vNormal;
        out vec3 vTangent;
        out vec3 vBinormal;
        out vec3 vViewDirInTangentSpace;

        vec3 createBinormal(vec3 normal, vec3 tangent){
            return cross(normal, tangent);
        }
        
        vec3 viewDirInTangentSpace(vec3 normal, vec3 tangent, vec3 vertexPos, vec3 viewPosInObjectSpace){
            vec3 viewDir = viewPosInObjectSpace - vertexPos;
            vec3 binormal= createBinormal(normal, tangent);
            //正交矩阵的逆等于该矩阵的转置
            // mat3 obj2Tangent=inverse(mat3(tangent, binormal, normal));
            // return obj2Tangent * viewDir;
            return viewDir * mat3(tangent, binormal, normal);//transpose(mat3(tangent, binormal, normal));
        }

        void main(){
            gl_Position=uMVPmat * aPos;            
            vUV = aUV * uScale;
            vNormal =normalize((uMmat * vec4(aNormal, c0)).xyz);
            vTangent=normalize((uMmat * vec4(aTangent, c0)).xyz);
            vBinormal = createBinormal(vNormal, vTangent);
            
            vViewDirInTangentSpace = viewDirInTangentSpace(aNormal, aTangent, aPos.xyz, uViewPosInObjSpace);
        }
    `);
    /**
     * 
     */
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        const float c0=0.;
        const float c1=1.;

        uniform struct direction_light{
            vec3 direction;         //The normalized light direction in world space
            vec3 halfplane;         //The normalized half-plane vector H. This can be
                                    //precomputed for a directional light, as it does not change.
            vec4 color;
        } uLight;
        uniform struct material_props{
            vec4 ambient_color;
            vec4 diffuse_color;
            vec4 specular_color;
            float specular_exponent;
        } uMaterial;
        
        uniform sampler2D uTexColor;
        uniform sampler2D uTexNormal;        
        uniform float uHScale;
        uniform bool uShowNormal;

        uniform sampler2D uTexHeight;
        uniform float uParallax;

        uniform sampler2D uGridTex;
        uniform vec2 uGridScale;

        uniform float uRaymarchingStep;
        uniform float uUseBinaryApproach;
        uniform float uBinaryApproachStep;

        in vec3 vNormal;
        in vec3 vTangent;
        in vec3 vBinormal;
        in vec3 vViewDirInTangentSpace;
        in vec2 vUV;
        out vec4 fragColor;  
        
        // normal in world space and is a
        // normalized vector; this function returns the computed color
        vec4 direction_light_color(vec3 normal){
            vec4 color = vec4(c0);
            color += (uLight.color * uMaterial.ambient_color);            
            
            float ndotl = max(c0, dot(normal, uLight.direction));
            color += (ndotl * uLight.color * uMaterial.diffuse_color);

            float ndoth = max(c0, dot(normal, uLight.halfplane));
            color += (pow(ndoth, uMaterial.specular_exponent) * 
                      uLight.color * uMaterial.specular_color);
            
            return color;
        }

        vec3 getNormalFromTex(sampler2D tex, vec2 uv){
            return texture(tex, uv).rgb * 2.0 -1.0;
        }

        float getParallaxHeight(vec2 uv, sampler2D texHeight){
            return texture(texHeight, uv).g;
        }

        vec2 parallaxOffset(vec2 uv, vec3 viewDir, sampler2D texHeight){
            float height = getParallaxHeight(uv, texHeight);
            height -= 0.5;
            height *= uParallax;
            
            return viewDir.xy * height;
        }

        vec2 parallaxOffsetRaymarching(vec2 uv, vec3 viewDir, sampler2D texHeight){
            float count = uRaymarchingStep;
            float dz= 1./count;
            viewDir.xy /= viewDir.z;
            vec2 uvOffset = viewDir.xy * uParallax;
            vec2 dOffset = uvOffset * dz;
            
            float surfaceHeight = getParallaxHeight(uv + uvOffset, texHeight);//[0,1]            
            float z = c1;    
            vec2 preUVOffset = uvOffset;
            float preSurfaceHeight = surfaceHeight;
            float preZ = z;
            for(; z>c0 && z>surfaceHeight; z -= dz){                
                preUVOffset = uvOffset;
                preSurfaceHeight=surfaceHeight;
                preZ = z;
                uvOffset -= dOffset;
                surfaceHeight = getParallaxHeight(uv + uvOffset, texHeight);           
            }

            if( uUseBinaryApproach < 0.5 ){                
                /**
                 * 方法1：
                 * 近似求线性交点
                 * line1: (0, preZ)->(1, z) : v(t) = preZ + (z - preZ) * t
                 * line2: (0, preSurface)->(1, surface) ; s(t) = preSurface + (surface - preSurface) * t
                 * 交点 v(t) = s(t)
                 * t = (preSurface - preZ) / [(z - preZ)  -  (surface - preSurface)];
                 */            
                float t = min((preSurfaceHeight - preZ) / (z - surfaceHeight + preSurfaceHeight - preZ), c1);            
                uvOffset = preUVOffset - dOffset * t;   // uvOffset = preUVOffset + (uvOffset - preUVOffset) * t;
            }else{
                /**
                 * 方法2：
                 * 二分法逼近求交点             
                 */
                for(float i=0.0; i<uBinaryApproachStep; i+=c1){
                    dOffset *= 0.5;
                    dz *= 0.5;

                    if(z > surfaceHeight){
                        uvOffset -= dOffset;
                        z -= dz;                    
                    }else{
                        uvOffset += dOffset;
                        z += dz;
                    }                            
                    surfaceHeight = getParallaxHeight(uv + uvOffset, texHeight);
                }
            }
            return uvOffset ;
        }

        void applyParallax(inout vec2 uv, vec3 viewDirInTangentSpace, sampler2D texHeight){      
            viewDirInTangentSpace.y = -viewDirInTangentSpace.y;
            // viewDirInTangentSpace.xy /= (viewDirInTangentSpace.z + 0.42);
            
            // vec2 uvOffset=parallaxOffset(uv, viewDirInTangentSpace, texHeight);
            vec2 uvOffset=parallaxOffsetRaymarching(uv, viewDirInTangentSpace, texHeight);
            uv += uvOffset;
        }

        void main(){    
            vec2 uv=vUV; 
            vec3 viewDirInTangentSpace = normalize(vViewDirInTangentSpace);
            applyParallax(uv, viewDirInTangentSpace, uTexHeight);
            // if(uv.x<0. || uv.x>1. || uv.y<0. || uv.y>1.) discard;

            vec3 n = getNormalFromTex(uTexNormal, uv);
            n.z*=uHScale;
            n = vTangent * n.x + vBinormal * n.y + vNormal * n.z; 
            n=normalize(n);

            vec2 detailUV=uv * uGridScale;
            vec4 color = direction_light_color(n);
            color += uLight.color * texture(uTexColor, uv);
            color *= texture(uGridTex, detailUV);
            // fragColor =vec4((viewDirInTangentSpace + 1.) * 0.5, 1.);     
            fragColor =uShowNormal ? vec4(n, c1) : color;            
        }
    `);


    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);


    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);


    const sphere = new MyGeometry.Sphere();
    const plane = new MyGeometry.Plane();
    const cube = new MyGeometry.Cube();

    plane.createVAOAll(gl, gl.STATIC_DRAW);
    cube.createVAOAll(gl, gl.STATIC_DRAW);
    sphere.createVAOAll(gl, gl.STATIC_DRAW);

    plane.transform.scale(10, 10, 10);
    sphere.transform.translate(0, 0, 0.5);
    cube.transform.translate(1.5, 0, 0.5);
    cube.transform.rotateY(Math.PI * 0.5);

    const texDiffuse = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texDiffuse);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgDiffuse);
    gl.generateMipmap(gl.TEXTURE_2D);

    const texNormal = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texNormal);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgNormal);
    gl.generateMipmap(gl.TEXTURE_2D);

    const texHeight = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texHeight);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgHeight);
    gl.generateMipmap(gl.TEXTURE_2D);


    const smp = gl.createSampler();
    gl.samplerParameteri(smp, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(smp, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const texGrid = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texGrid);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgGrid);
    gl.generateMipmap(gl.TEXTURE_2D);

    const smpGrid = gl.createSampler();
    gl.samplerParameteri(smp, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.samplerParameteri(smp, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const lightDir = new MyVector3([0, 10, 10]).normalized();

    const emLightAng = document.getElementById("lightAng1");
    emLightAng.oninput = e => {
        const a = MyMath.deg2radian * emLightAng.value
        const b = MyMath.deg2radian * 45;
        lightDir.z = Math.sin(b);
        const r = Math.cos(b);
        lightDir.x = r * Math.cos(a);
        lightDir.y = r * Math.sin(a);
    }
    emLightAng.oninput();

    let hScale = 1;
    const emHScale = document.getElementById("hScale1");
    emHScale.oninput = e => {
        hScale = emHScale.value;
    }
    emHScale.oninput();

    let uvScale = 1;
    const emUVScale = document.getElementById("uvScale1");
    emUVScale.oninput = e => {
        uvScale = emUVScale.value;
    }
    emUVScale.oninput();

    let uvGridScale = 1;
    const emUVDetailScale = document.getElementById("uvGridScale");
    emUVDetailScale.oninput = e => {
        uvGridScale = emUVDetailScale.value;
    }
    emUVDetailScale.oninput();

    let parallax = 0;
    const emParallax = document.getElementById("parallax1");
    emParallax.oninput = e => {
        parallax = emParallax.value;
    }
    emParallax.oninput();

    let raymarchingStep = 10;
    const emRaymarchingStep = document.getElementById("raymarchingStep");
    emRaymarchingStep.oninput = e => {
        raymarchingStep = emRaymarchingStep.value;
    }
    emRaymarchingStep.oninput();

    let binaryApproachStep = 10;
    const emBinaryApproachStep = document.getElementById("binaryApproachStep");
    emBinaryApproachStep.oninput = e => {
        binaryApproachStep = emBinaryApproachStep.value;
    }
    emBinaryApproachStep.oninput();



    document.getElementById("btnAnim").onclick = e => {
        anim = !anim;
    }


    const emBinaryApproach = document.getElementById("binaryApproach");

    gl.bindTexture(gl.TEXTURE_2D, texNormal);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgNormal);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, texHeight);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgHeight);
    gl.generateMipmap(gl.TEXTURE_2D);

    function draw() {
        if (anim) {
            cube.transform.rotateX(0.01);
            cube.transform.rotateY(0.01);
            cube.transform.rotateZ(0.01);
            sphere.transform.rotateZ(0.01);
        }

        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();
        const camPos = camera.transform.localPosition;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        program.use();

        gl.uniform4fv(program.uniforms["uMaterial.ambient_color"], m_ambient_color);
        gl.uniform4fv(program.uniforms["uMaterial.diffuse_color"], m_diffuse_color);
        gl.uniform4fv(program.uniforms["uMaterial.specular_color"], m_specular_color);
        gl.uniform1f(program.uniforms["uMaterial.specular_exponent"], m_specular_exponent);
        gl.uniform4fv(program.uniforms["uLight.color"], l_color);

        const vLightDir = lightDir;
        const vHalfplane = MyVector3.from(camera.transform.zAxis).add(vLightDir).normalized();
        gl.uniform3fv(program.uniforms["uLight.direction"], vLightDir);
        gl.uniform3fv(program.uniforms["uLight.halfplane"], vHalfplane);



        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texNormal);
        gl.bindSampler(0, smp);
        gl.uniform1i(program.uniforms["uTexNormal"], 0);
        gl.uniform1f(program.uniforms['uHScale'], hScale);
        gl.uniform1f(program.uniforms['uScale'], uvScale);
        gl.uniform1f(program.uniforms["uShowNormal"], document.getElementById("showNormal").checked ? 1 : 0);
        gl.uniform1f(program.uniforms['uRaymarchingStep'], raymarchingStep);
        gl.uniform1f(program.uniforms['uUseBinaryApproach'], emBinaryApproach.checked ? 1 : 0);
        gl.uniform1f(program.uniforms['uBinaryApproachStep'], binaryApproachStep);


        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texHeight);
        gl.bindSampler(1, smp);
        gl.uniform1i(program.uniforms["uTexHeight"], 1);
        gl.uniform1f(program.uniforms["uParallax"], parallax);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texGrid);
        gl.bindSampler(2, smpGrid);
        gl.uniform1i(program.uniforms["uGridTex"], 2);
        gl.uniform2f(program.uniforms["uGridScale"], uvGridScale, uvGridScale);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, texDiffuse);
        gl.bindSampler(3, smp);
        gl.uniform1i(program.uniforms["uTexColor"], 3);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, plane.transform);
        gl.uniform3fv(program.uniforms["uViewPosInObjSpace"], plane.transform.inverse().multiplyPoint(camPos));
        plane.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, cube.transform);
        gl.uniform3fv(program.uniforms["uViewPosInObjSpace"], cube.transform.inverse().multiplyPoint(camPos));
        cube.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, sphere.transform);
        gl.uniform3fv(program.uniforms["uViewPosInObjSpace"], sphere.transform.inverse().multiplyPoint(camPos));
        sphere.draw(gl);

        requestAnimationFrame(draw);
    }


    draw();
}