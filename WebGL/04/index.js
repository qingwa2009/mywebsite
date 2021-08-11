"use strict";
import MyCamera from "../js/MyCamera.js";
import MyGeometry from "../js/MyGeometry.js";
import { MyMatrix4x4 } from "../js/MyMatrix.js";
import { MyVector3 } from "../js/MyVector.js";
import MyGLProgram from "../js/MyGLProgram.js";
import MyMaterial from "../js/MyMaterial.js";
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

            vViewDir = uCamPos - (uMmat * apos).xyz;
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

        in vec2 vuv;
        in vec3 vnormal;
        in vec3 vtangent;
        in vec3 vbinormal;
        in vec3 vViewDir;
        layout(location=0) out vec4 fragColor;


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
            vec3 dir = reflect( vViewDir , normal);

            vec4 envColor = texture(uTexEnv, dir);           
            fragColor = vec4(uBaseFactor * color.rgb + uEnvFactor * envColor.rgb, 1.0);
        }
    `);

    const program = MyGLProgram.create(gl);
    program.link(vShader, fShader);

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


        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(plane.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, plane.transform);
        gl.uniformMatrix4fv(program.uniforms["uMInvTpmat"], false, plane.transform.inverse().transposed());
        plane.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, cube.transform);
        gl.uniformMatrix4fv(program.uniforms["uMInvTpmat"], false, cube.transform.inverse().transposed());
        cube.draw(gl);

        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(sphere.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, sphere.transform);
        gl.uniformMatrix4fv(program.uniforms["uMInvTpmat"], false, sphere.transform.inverse().transposed());
        sphere.draw(gl);

        cube.transform.translate(0, 0, -0.5);
        cube.transform.scale(-10, 10, 10);
        gl.uniformMatrix4fv(program.uniforms["uMVPmat"], false, mVP.multiply(cube.transform));
        gl.uniformMatrix4fv(program.uniforms["uMmat"], false, cube.transform);
        gl.uniformMatrix4fv(program.uniforms["uMInvTpmat"], false, cube.transform.inverse().transposed());
        cube.draw(gl);
        cube.transform.scale(-0.1, 0.1, 0.1);
        cube.transform.translate(0, 0, 0.5);

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
