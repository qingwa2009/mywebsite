"use strict";
import MyCamera from "../js/MyCamera.js";
import MyGeometry from "../js/MyGeometry.js";
import { MyMatrix4x4 } from "../js/MyMatrix.js";
import { MyVector3 } from "../js/MyVector.js";
import MyGLProgram from "../js/MyGLProgram.js";
import MyMaterial from "../js/MyMaterial.js";
import MyTexture from "../js/MyTexture.js";
import * as MyMath from "../js/MyMath.js";
import { getElementsById } from "../../js/myUtil.js";

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

//environment map
function cv0(cvi) {

    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);
    camera.mouseControl(cv);

    window.onresize = e => {
        // cv.width = cv.clientWidth * 0.5;
        // cv.height = cv.clientHeight * 0.5;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    cv.oncontextmenu = e => e.preventDefault();

    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        uniform mat4 uMVPmat;
        uniform mat4 uMmat;
        uniform mat4 uMInvTpmat;
        uniform vec3 uCamPos;

        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;
        layout(location=2) in vec2 auv;
        layout(location=3) in vec3 atangent;
        layout(location=4) in vec3 abinormal;
        
        out vec3 vpos;
        out vec2 vuv;
        out vec3 vnormal;
        out vec3 vtangent;
        out vec3 vbinormal;
        out vec3 vViewDir;
        void main(){
            gl_Position = uMVPmat * apos;
            
            
            vuv = auv;
            mat3 mit = mat3(uMInvTpmat[0].xyz, uMInvTpmat[1].xyz, uMInvTpmat[2].xyz);
            vnormal =normalize(mit * anormal);
            vtangent =normalize(mit * atangent);
            vbinormal =normalize(mit * abinormal);

            // vnormal =normalize((uMInvTpmat * vec4(anormal, 0.)).xyz);
            // vtangent =normalize((uMInvTpmat * vec4(atangent, 0.)).xyz);
            // vbinormal =normalize((uMInvTpmat * vec4(abinormal, 0.)).xyz);

            vpos = (uMmat * apos).xyz;
            vViewDir = uCamPos - vpos;
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        struct DirectionLight{
            vec3 direction;         //The normalized light direction in world space
            vec3 halfplane;         //The normalized half-plane vector H. This can be
                                    //precomputed for a directional light, as it does not change.
            vec4 color;
        }; 
        struct Material{
            vec4 ambient;
            vec4 diffuse;
            vec4 specular;
            float specular_exp;
        };
        uniform DirectionLight uLight;
        uniform Material uMaterial;
        
        uniform sampler2D uTexBase;
        uniform sampler2D uTexNormal;
        uniform samplerCube uTexEnv;     
        uniform float uBaseFactor;
        uniform float uEnvFactor;
        uniform float uNormalFactor;

        in vec3 vpos;
        in vec2 vuv;
        in vec3 vnormal;
        in vec3 vtangent;
        in vec3 vbinormal;
        in vec3 vViewDir;
        layout(location=0) out vec4 fragColor;

        const vec3 hBoxSize = vec3(5.);
        
        vec4 directionLight(vec3 normal, DirectionLight light, Material material){
            float ndl = max(0., dot(normal, light.direction)) ;
            float ndh = max(0., dot(normal, light.halfplane)) ;
            vec4 color = (material.ambient + ndl* material.diffuse + pow(ndh, material.specular_exp) * material.specular) * light.color; 
            return color;
        }
        void main(){
            vec4 color = texture(uTexBase, vuv);

            vec3 normal = texture(uTexNormal, vuv).rgb;            
            normal = normal * 2.0 - 1.0 ;
            normal = mix(vec3(0.,0.,1.), normal, uNormalFactor);

            mat3 tbnMat = mat3(vtangent, vbinormal, vnormal);            
            normal = normalize(tbnMat * normal);
            color *= directionLight(normal, uLight, uMaterial);

            vec3 viewDir = normalize(vViewDir);
            vec3 dir = reflect( -vViewDir , normal);

            vec3 c = sign(dir) * hBoxSize;
            vec3 d = (c - vpos) ;
            vec3 s = abs(d / dir);
            dir =min(s.z, min(s.x, s.y)) * dir + vpos;

            vec4 envColor = texture(uTexEnv, dir);           
            fragColor = vec4(uBaseFactor * color.rgb + uEnvFactor * envColor.rgb, 1.0);
        }
    `);

    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);

    const vShader2 = MyGLProgram.VShader.create(gl, `#version 300 es
        uniform mat4 uMVPmat;
        uniform mat4 uMmat;
        
        layout(location=0) in vec4 apos;

        out vec3 dir;
        void main(){
            gl_Position = uMVPmat * apos;
            dir = (uMmat * apos).xyz;
            // dir = vec3(dir.x, dir.y, -dir.z);
        }
    `);
    const fShader2 = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;

        uniform samplerCube uTexEnv;     
        in vec3 dir;
        layout(location=0) out vec4 fragColor;
        void main(){
            vec4 envColor = texture(uTexEnv, dir);           
            fragColor = envColor;
        }
    `);
    const program2 = MyGLProgram.create(gl);
    program2.link(vShader2, fShader2);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const plane = new MyGeometry.Plane();
    plane.createVAOAll(gl, gl.STATIC_DRAW);
    const cube = new MyGeometry.Cube();
    cube.createVAOAll(gl, gl.STATIC_DRAW);
    const sphere = new MyGeometry.Sphere();
    sphere.createVAOAll(gl, gl.STATIC_DRAW);

    plane.transform.scale(10, 10, 10);
    cube.transform.translate(0, 0, 0.5);
    sphere.transform.translate(0, 0, 1.25);
    sphere.transform.scale(1, 1, 0.5);


    const imgs = document.getElementsByTagName("img");
    const texEnv = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texEnv);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[0]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[1]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[2]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[3]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[4]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[5]);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    const texDiffuse = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texDiffuse);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[7]);
    gl.generateMipmap(gl.TEXTURE_2D);

    const texNormal = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texNormal);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[6]);
    gl.generateMipmap(gl.TEXTURE_2D);


    var tick = 0;
    function draw() {
        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();

        program.use();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texEnv);
        gl.uniform1i(program.uniforms["uTexEnv"], 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texNormal);
        gl.uniform1i(program.uniforms["uTexNormal"], 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texDiffuse);
        gl.uniform1i(program.uniforms["uTexBase"], 2);

        gl.uniform3fv(program.uniforms["uCamPos"], camera.transform.localPosition);

        const halfplane = MyVector3.from(camera.transform.zAxis).added(lightDir).normalized();
        gl.uniform3fv(program.uniforms["uLight.direction"], lightDir);
        gl.uniform3fv(program.uniforms["uLight.halfplane"], halfplane);
        gl.uniform4fv(program.uniforms["uLight.color"], lightColor);

        gl.uniform4fv(program.uniforms["uMaterial.ambient"], ambient);
        gl.uniform4fv(program.uniforms["uMaterial.diffuse"], diffuse);
        gl.uniform4fv(program.uniforms["uMaterial.specular"], specular);
        gl.uniform1f(program.uniforms["uMaterial.specular_exp"], exponent);

        gl.uniform1f(program.uniforms["uBaseFactor"], baseFactor);
        gl.uniform1f(program.uniforms["uEnvFactor"], envFactor);
        gl.uniform1f(program.uniforms["uNormalFactor"], normalFactor);


        plane.transform.positionZ = 4.9 * Math.sin(MyMath.deg2radian * tick * 0.1);
        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, plane.transform);
        gl.uniformMatrix4fv(program.uniforms["uMInvTpmat"], false, plane.transform.inverseAffine().transposed());
        gl.disable(gl.CULL_FACE);
        plane.draw(gl);
        gl.enable(gl.CULL_FACE);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, cube.transform);
        gl.uniformMatrix4fv(program.uniforms["uMInvTpmat"], false, cube.transform.inverseAffine().transposed());
        cube.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, sphere.transform);
        gl.uniformMatrix4fv(program.uniforms["uMInvTpmat"], false, sphere.transform.inverseAffine().transposed());
        sphere.draw(gl);

        program2.use();
        cube.transform.translate(0, 0, -0.5);
        cube.transform.scale(-10, 10, 10);
        gl.uniformMatrix4fv(program2.uniforms["uMVPmat"], false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program2.uniforms["uMmat"], false, cube.transform);
        cube.draw(gl);

        cube.transform.scale(-0.1, 0.1, 0.1);
        cube.transform.translate(0, 0, 0.5);

        tick++;
        requestAnimationFrame(draw);
    }


    let ambient, diffuse, specular, exponent;
    let lightColor, lightDir = new MyVector3();
    let baseFactor, envFactor, normalFactor;

    const {
        emAmbient, emDiffuse, emSpecular, emExponent,
        emLightColor, emLightAng,
        emBaseFactor, emEnvFactor, emNormalFactor
    } = getElementsById(document);

    emAmbient.oninput = e => ambient = getColorFromInputElement(emAmbient);
    emDiffuse.oninput = e => diffuse = getColorFromInputElement(emDiffuse);
    emSpecular.oninput = e => specular = getColorFromInputElement(emSpecular);
    emExponent.oninput = e => exponent = parseFloat(emExponent.value);
    emLightColor.oninput = e => lightColor = getColorFromInputElement(emLightColor);
    emBaseFactor.oninput = e => baseFactor = parseFloat(emBaseFactor.value);
    emEnvFactor.oninput = e => envFactor = parseFloat(emEnvFactor.value);
    emNormalFactor.oninput = e => normalFactor = parseFloat(emNormalFactor.value);

    emLightAng.oninput = e => {
        const a = MyMath.deg2radian * emLightAng.value
        const b = MyMath.deg2radian * 45;
        lightDir.z = Math.sin(b);
        const r = Math.cos(b);
        lightDir.x = r * Math.cos(a);
        lightDir.y = r * Math.sin(a);
    }

    emLightAng.oninput(); emLightColor.oninput();
    emAmbient.oninput(); emDiffuse.oninput(); emSpecular.oninput(); emExponent.oninput();
    emBaseFactor.oninput(); emEnvFactor.oninput(); emNormalFactor.oninput();

    draw();
}

//Particle System
function cv1(cvi) {
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);
    camera.mouseControl(cv);

    window.onresize = e => {
        // cv.width = cv.clientWidth * 0.5;
        // cv.height = cv.clientHeight * 0.5;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    cv.oncontextmenu = e => e.preventDefault();

    const unit = 0.05;
    const particleCount = 10000;
    const particleSize = 20.1;
    const touch = new Float32Array([0, 0, particleSize / cv.clientWidth, 0]);
    cv.onclick = e => {
        touch[0] = e.clientX / cv.clientWidth * 2 - 1;
        touch[1] = 1 - e.clientY / cv.clientHeight * 2;
        touch[3] = 100;
        console.log(touch[0], touch[1]);
    }

    const p = MyGLProgram.create(gl);
    const v = MyGLProgram.VShader.create(gl, `#version 300 es
        #define NUM_PARTICLES   ${particleCount}
        #define ATTR_POSITION   0         
        #define ATTR_VELOCITY   1
        #define ATTR_SIZE       2
        #define ATTR_CURTIME    3
        #define ATTR_LIFETIME   4

        layout (location = ATTR_POSITION) in vec2 aPos;    
        layout (location = ATTR_VELOCITY) in vec2 aVelocity;
        
        uniform float dt;
        uniform float unit;        
        uniform vec4 uTouch;    //vec4(x, y, size, force);
        
        out vec2 vPos;
        out vec2 vVelocity;        

        const vec2 g = vec2(0, -9.8);
        
        float reduction = 0.5;
        bool hit = false;

        void main(){
            vec2 gt = g * dt;
            vPos =aPos + (aVelocity * dt + 0.5 * gt * dt) * unit;

            vec2 dd = vPos - uTouch.xy;
            float ddd = length(dd);
            if (uTouch.w>1. && ddd<uTouch.z){
                vVelocity = ddd / uTouch.z * normalize(dd) * uTouch.w ;
            }else{
                vVelocity = aVelocity + gt;
            }

            
            if(vPos.x < -1.0) {
                vPos.x = -1.0;
                if(vVelocity.x < 0.0) {
                    vVelocity.x = -aVelocity.x;
                }
                hit = true;
            }
            else if(vPos.x > 1.0) {
                vPos.x = 1.0;
                if(vVelocity.x > 0.0) {
                    vVelocity.x = -aVelocity.x;
                }
                hit = true;
            }
            if(vPos.y < -.9) {
                vPos.y = -.9;
                if(vVelocity.y < 0.0) {
                    vVelocity.y = -aVelocity.y;
                }
                hit = true;
            }
            else if(vPos.y > 1.0) {
                vPos.y = 1.0;
                if(vVelocity.y > 0.0) {
                    vVelocity.y = -aVelocity.y;
                }
                hit = true;
            }

            if (hit) {
                vVelocity *= reduction;
                hit = false;
            }
        }
    `);
    const f = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        void main(){}
    `);

    const p1 = MyGLProgram.create(gl);
    p1.link(MyGLProgram.VShader.create(gl, `#version 300 es
        layout (location = 0) in vec2 aPos;    
        layout (location = 1) in vec2 aVelocity;
        void main(){                        
            gl_Position=vec4(aPos, 0.0, 1.0);
            gl_PointSize=${particleSize};
        }
    `), MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        out vec4 fragColor;
        void main(){
            vec2 uv = gl_PointCoord-vec2(0.5);
            float r2 = uv.x * uv.x + uv.y * uv.y;
            if(r2<0.25){
                vec3 c0 = vec3(0.7, 0.0, 0.0);
                vec3 c1 = vec3(1.0, 0.5, 0.0);            
                float d = r2*4.0;
                fragColor = vec4(smoothstep(c0, c1, vec3(d)), d);
            }
            else discard;

        }
    `));

    gl.transformFeedbackVaryings(p, ["vPos", "vVelocity"], gl.INTERLEAVED_ATTRIBS);
    p.link(v, f);

    const arr = [];
    for (let i = 0; i < particleCount; i++) {
        arr.push(0, 0, Math.random() * 40 - 20, Math.random() * 40 - 20);
    }
    const iv = new Float32Array(arr);

    const vbo0 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo0);
    gl.bufferData(gl.ARRAY_BUFFER, iv, gl.STATIC_DRAW);

    const vbo1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo1);
    gl.bufferData(gl.ARRAY_BUFFER, iv.byteLength, gl.DYNAMIC_DRAW);



    const vbos = [vbo0, vbo1];

    const vaos = [gl.createVertexArray(), gl.createVertexArray()];
    for (let i = 0; i < vaos.length; i++) {
        gl.bindVertexArray(vaos[i]);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbos[i]);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);


        gl.bindVertexArray(null);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    let ind0 = 0;
    let preTime = new Date().getTime();

    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let currTime = new Date().getTime();
        let dt = currTime - preTime;
        preTime = currTime;


        const ind1 = !ind0 + 0;

        p.use();

        gl.bindVertexArray(vaos[ind0]);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, vbos[ind1]);
        gl.uniform1f(p.uniforms["unit"], unit);
        gl.uniform1f(p.uniforms["dt"], dt / 1000);
        gl.uniform4fv(p.uniforms["uTouch"], touch);

        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, particleCount);
        gl.endTransformFeedback();

        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.waitSync(sync, 0, gl.TIMEOUT_IGNORED);
        gl.deleteSync(sync);
        gl.disable(gl.RASTERIZER_DISCARD);

        // const ov = new Float32Array(4);
        // gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, ov);
        // console.log(ov);


        p1.use();
        // gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
        // gl.bindVertexArray(vaos[ind1]);
        gl.drawArrays(gl.POINTS, 0, particleCount);


        ind0 = ind1;
        touch[3] = 0;
        requestAnimationFrame(draw);
    }

    draw();
}

//Image Postprocessing
function cv2(cvi) {

    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);
    camera.mouseControl(cv);

    window.onresize = e => {
        // cv.width = cv.clientWidth * 0.5;
        // cv.height = cv.clientHeight * 0.5;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    cv.oncontextmenu = e => e.preventDefault();

    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;

        out vec3 vNormal;  
        void main(){
            gl_Position=uMVPmat * apos;
            vNormal =  ((uMmat * vec4(anormal, 0.)).xyz + 1.0) * 0.5;                
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;

        in vec3 vNormal;
        out vec4 fragColor;             

        void main(){                  
            fragColor = vec4(vNormal, 1.0);
        }
    `);

    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);

    const vShader2 = MyGLProgram.VShader.create(gl, `#version 300 es
        layout(location=${MyGeometry.attrb_vertex_location}) in vec4 aPos;
        layout(location=${MyGeometry.attrb_uv_location}) in vec2 aUV;
        out vec2 vUV;
        void main(){
            gl_Position = aPos;
            vUV = vec2(aUV.x, 1.0-aUV.y);            
        }
    `);

    const SMP_COUNT = 4
    const SMP_OFFSETS = new Float32Array(SMP_COUNT * 2);
    const fShader2 = MyGLProgram.FShader.create(gl, `#version 300 es
        #define SMP_COUNT ${SMP_COUNT}
        precision mediump float;

        in vec2 vUV;
        out vec4 fragColor;

        uniform sampler2D uTex;
        uniform vec2[SMP_COUNT] offsets;
        void main(){
            // for (int i=0; i<SMP_COUNT; i++){
            //     fragColor+=texture(uTex, vUV+offsets[i]);
            // }
            // fragColor*=0.25;

            vec4 c;
            fragColor = vec4(0.0);
            c = texture(uTex, vUV+offsets[0]);
            fragColor.r = c.r;           
            fragColor.a += c.a;
            c = texture(uTex, vUV+offsets[1]);
            fragColor.g = c.g;     
            fragColor.a += c.a;
            c = texture(uTex, vUV+offsets[2]);            
            fragColor.b = c.b; 
            fragColor.a += c.a;
            fragColor.a *= 0.333;

        }
    `);
    const program2 = MyGLProgram.create(gl);
    program2.link(vShader2, fShader2);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const plane = new MyGeometry.Plane(2, 2);
    plane.createVAOAll(gl, gl.STATIC_DRAW);
    const cube = new MyGeometry.Cube();
    cube.createVAOAll(gl, gl.STATIC_DRAW);
    const sphere = new MyGeometry.Sphere();
    sphere.createVAOAll(gl, gl.STATIC_DRAW);

    cube.transform.translate(0, 0, 0.5);
    sphere.transform.translate(0, 0, 1.25);
    sphere.transform.scale(1, 1, 0.5);

    const fbo = gl.createFramebuffer();
    const fboWidth = gl.drawingBufferWidth;
    const fboHeight = gl.drawingBufferHeight;

    const tex = MyTexture.create(gl, gl.TEXTURE_2D);
    tex.loadFromBuffer(0, gl.RGBA, fboWidth, fboHeight, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const smp = new MyTexture.Sampler(gl, gl.LINEAR_MIPMAP_NEAREST, gl.LINEAR);
    smp.wrapST(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

    const rbo = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, fboWidth, fboHeight);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex.target, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rbo);

    const statusFBO = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (statusFBO !== gl.FRAMEBUFFER_COMPLETE) {
        alert(`frame buffer is not complete: ${statusFBO}`);
    } else {

    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


    function draw() {
        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        // gl.clearColor(1.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        program.use();
        gl.uniformMatrix4fv(program.uniforms.uMVPmat, false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program.uniforms.uMmat, false, sphere.transform);
        sphere.draw(gl);
        gl.uniformMatrix4fv(program.uniforms.uMVPmat, false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program.uniforms.uMmat, false, cube.transform);
        cube.draw(gl);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // gl.clearColor(0.0, 1.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program2);
        tex.activeAndBind(gl.TEXTURE0);
        smp.bind(0);
        gl.uniform1i(program2.uTex, 0);

        for (let i = 0; i < SMP_COUNT; i++) {
            let j = i * 2;
            SMP_OFFSETS[j] = Math.random() * 0.02;
            SMP_OFFSETS[j + 1] = Math.random() * 0.02;
        }
        gl.uniform2fv(program2.uniforms["offsets[0]"], SMP_OFFSETS);
        plane.draw(gl);


        requestAnimationFrame(draw);
    }

    draw();
}

//blur
function cv3(cvi) {

    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);
    camera.mouseControl(cv);

    window.onresize = e => {
        // cv.width = cv.clientWidth * 0.5;
        // cv.height = cv.clientHeight * 0.5;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    cv.oncontextmenu = e => e.preventDefault();

    const programBase = MyGLProgram.create(gl);
    programBase.link(MyGLProgram.VShader.create(gl, `#version 300 es
        layout(location=0) in vec4 apos;
        uniform mat4 uMVPmat;  
        void main(){
            gl_Position=uMVPmat * apos;               
        }
    `), MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;
        uniform vec4 blurColor;
        layout(location=0) out vec4 fragColor;             
        void main(){                  
            fragColor = blurColor;
        }
    `));

    const programBlur = MyGLProgram.create(gl);
    programBlur.link(MyGLProgram.VShader.create(gl, `#version 300 es
        layout(location=${MyGeometry.attrb_vertex_location}) in vec4 aPos;
        layout(location=${MyGeometry.attrb_uv_location}) in vec2 aUV;
        out vec2 vUV;
        void main(){
            gl_Position = aPos;
            vUV = vec2(aUV.x, 1.0-aUV.y);            
        }
    `), MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;

        in vec2 vUV;
        layout(location=0) out vec4 fragColor;

        uniform sampler2D uTex;
        uniform vec2[4] offsets;
        uniform float offset;
        void main(){
            fragColor=vec4(0.0);
            for (int i=0; i<4; i++){
                fragColor+=texture(uTex, vUV+offsets[i]*offset);
            }
            fragColor*=0.25;
        }
    `));


    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;

        out vec3 vNormal;  
        void main(){
            gl_Position=uMVPmat * apos;
            vNormal =  ((uMmat * vec4(anormal, 0.)).xyz + 1.0) * 0.5;                
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;

        in vec3 vNormal;
        out vec4 fragColor;             

        void main(){                  
            fragColor = vec4(vNormal, 1.0);
        }
    `);

    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const plane = new MyGeometry.Plane(2, 2);
    plane.createVAOAll(gl, gl.STATIC_DRAW);
    const cube = new MyGeometry.Cube();
    cube.createVAOAll(gl, gl.STATIC_DRAW);
    const sphere = new MyGeometry.Sphere();
    sphere.createVAOAll(gl, gl.STATIC_DRAW);

    cube.transform.translate(0, 0, 0.5);
    sphere.transform.translate(0, 0, 1.25);
    sphere.transform.scale(1, 1, 0.5);

    const fbo0 = gl.createFramebuffer();
    const fbo1 = gl.createFramebuffer();
    const fboWidth = gl.drawingBufferWidth;
    const fboHeight = gl.drawingBufferHeight;

    const tex0 = MyTexture.create(gl, gl.TEXTURE_2D);
    tex0.loadFromBuffer(0, gl.RGBA, fboWidth, fboHeight, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const tex1 = MyTexture.create(gl, gl.TEXTURE_2D);
    tex1.loadFromBuffer(0, gl.RGBA, fboWidth, fboHeight, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const smp = new MyTexture.Sampler(gl, gl.NEAREST, gl.NEAREST);
    smp.wrapST(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

    // const rbo = gl.createRenderbuffer();
    // gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
    // gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, fboWidth, fboHeight);
    // gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo0);
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex0.target, tex0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo1);
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex1.target, tex1, 0);

    let statusFBO = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (statusFBO !== gl.FRAMEBUFFER_COMPLETE) {
        alert(`frame buffer is not complete: ${statusFBO}`);
    } else {

    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    let blurStep = 3;
    let blurSize = 0.01 / blurStep;
    let blurSpeed = 3;
    let blurColor = new Float32Array([0.0, 1.0, 1.0, 1.0]);
    const mvps = {};
    const SMP_OFFSETS = new Float32Array([1, 1, 1, -1, -1, -1, -1, 1]);

    let tick = 0;
    function draw() {
        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo0);
        // gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        programBase.use();
        gl.uniform4fv(programBase.uniforms.blurColor, blurColor);
        mvps.sphere = mVP.multiply(sphere.transform);
        gl.uniformMatrix4fv(programBase.uniforms.uMVPmat, false, mvps.sphere);
        sphere.draw(gl);
        mvps.cube = mVP.multiply(cube.transform);
        gl.uniformMatrix4fv(programBase.uniforms.uMVPmat, false, mvps.cube);
        cube.draw(gl);

        gl.useProgram(programBlur);
        smp.bind(0);
        gl.uniform1i(programBlur.uTex, 0);
        gl.uniform2fv(programBlur.uniforms["offsets[0]"], SMP_OFFSETS);

        let dblur = Math.sin(MyMath.deg2radian * tick * blurSpeed) * blurSize;
        let tex;
        let fbo;
        for (let i = 0; i < blurStep; i++) {
            if (i % 2 === 0) {
                tex = tex0;
                fbo = fbo1;
            } else {
                tex = tex1;
                fbo = fbo0;
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            tex.activeAndBind(gl.TEXTURE0);
            gl.uniform1f(programBlur.uniforms.offset, dblur * (i + 1));
            plane.draw(gl);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        tex.activeAndBind(gl.TEXTURE0);
        plane.draw(gl);

        gl.clear(gl.DEPTH_BUFFER_BIT);
        program.use();
        gl.uniformMatrix4fv(program.uniforms.uMVPmat, false, mvps.sphere);
        gl.uniformMatrix4fv(program.uniforms.uMmat, false, sphere.transform);
        sphere.draw(gl);
        gl.uniformMatrix4fv(program.uniforms.uMVPmat, false, mvps.cube);
        gl.uniformMatrix4fv(program.uniforms.uMmat, false, cube.transform);
        cube.draw(gl);

        tick++;
        requestAnimationFrame(draw);
    }

    draw();
}

//Projective Texturing
function cv4(cvi) {

    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    camera.transform.rotateX(Math.PI / 4);
    camera.transform.translate(0, 0, 10);
    camera.mouseControl(cv);

    window.onresize = e => {
        // cv.width = cv.clientWidth * 0.5;
        // cv.height = cv.clientHeight * 0.5;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        camera.aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    }
    window.onresize();
    cv.oncontextmenu = e => e.preventDefault();


    const vShader = MyGLProgram.VShader.create(gl, `#version 300 es
        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;

        uniform mat4 uMVPmat;        
        uniform mat4 uMmat;

        uniform mat4 uLightMVPmat;

        out vec3 vNormal; 
        out vec3 vProjUV; 
        void main(){
            gl_Position=uMVPmat * apos;
            vNormal =  ((uMmat * vec4(anormal, 0.)).xyz + 1.0) * 0.5;    
            vProjUV = ((uLightMVPmat * apos + 1.0) * 0.5).xyz;   
                     
            // vProjUV = (uLightMVPmat * apos).xyz * mat3(0.5, 0.0, 0.5,
            //                                            0.0,-0.5, 0.5,
            //                                            0.0, 0.0, 1.0);
        }
    `);
    const fShader = MyGLProgram.FShader.create(gl, `#version 300 es
        precision mediump float;

        in vec3 vNormal;
        in vec3 vProjUV;

        uniform sampler2D uTex;
        out vec4 fragColor;             

        void main(){
            vec4 c;
            if(vProjUV.x<0. || vProjUV.y<0. || vProjUV.x>1. || vProjUV.y>1.){
                c = vec4(1.0);
            }else{
                c = texture(uTex, vProjUV.xy);
                // c = textureProj(uTex, vProjUV);
            }             
            fragColor = vec4(vNormal, 1.0) * c;
        }
    `);

    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const plane = new MyGeometry.Plane(10, 10);
    plane.createVAOAll(gl, gl.STATIC_DRAW);
    const cube = new MyGeometry.Cube();
    cube.createVAOAll(gl, gl.STATIC_DRAW);
    const sphere = new MyGeometry.Sphere();
    sphere.createVAOAll(gl, gl.STATIC_DRAW);

    cube.transform.translate(0, 0, 0.5);
    sphere.transform.translate(0, 0, 1.25);
    sphere.transform.scale(1, 1, 0.5);

    const projLight = new MyCamera(Math.PI / 1.5, 1.0, 0.1, 200);
    projLight.transform.translate(0, 0, 3);

    const img = document.getElementById("favicon");
    const tex0 = MyTexture.create(gl, gl.TEXTURE_2D);
    tex0.loadFromImg(0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img, true);
    const smp = new MyTexture.Sampler(gl, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST);
    smp.wrapST(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

    let tick = 0;
    function draw() {
        const mVP = camera.getViewProjectMatrix();
        const mV = camera.getViewMatrix();
        const mligtVP = projLight.getViewProjectMatrix();

        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        program.use();
        tex0.activeAndBind(gl.TEXTURE0);
        smp.bind(0);
        gl.uniform1i(program.uniforms.uTex, 0);

        gl.uniformMatrix4fv(program.uniforms.uMVPmat, false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program.uniforms.uMmat, false, sphere.transform);
        gl.uniformMatrix4fv(program.uniforms.uLightMVPmat, false, mligtVP.multiply(sphere.transform));
        sphere.draw(gl);
        gl.uniformMatrix4fv(program.uniforms.uMVPmat, false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program.uniforms.uMmat, false, cube.transform);
        gl.uniformMatrix4fv(program.uniforms.uLightMVPmat, false, mligtVP.multiply(cube.transform));
        cube.draw(gl);
        gl.uniformMatrix4fv(program.uniforms.uMVPmat, false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uniforms.uMmat, false, plane.transform);
        gl.uniformMatrix4fv(program.uniforms.uLightMVPmat, false, mligtVP.multiply(plane.transform));
        plane.draw(gl);

        projLight.transform.translate(Math.sin(MyMath.deg2radian * tick) * 0.02, 0, 0);
        // projLight.transform.rotateZ(Math.sin(MyMath.deg2radian * tick) * 0.02);
        tick++;
        requestAnimationFrame(draw);
    }

    draw();
}