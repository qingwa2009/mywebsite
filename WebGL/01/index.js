"use strict";
import MyCamera from "../js/MyCamera.js";
import MyGeometry from "../js/MyGeometry.js";
import { MyMatrix4x4 } from "../js/MyMatrix.js";
import { MyVector3 } from "../js/MyVector.js";


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

function cv0(cvi) {
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const cube = new MyGeometry.Cube();
    const plane = new MyGeometry.Plane();
    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
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
        void main(){
            gl_Position=uMVPmat * apos;
            vColor=acolor;
            vNormal=anormal;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        flat in vec4 vColor;
        flat in vec3 vNormal;
        out vec4 fragColor;        
        void main(){
            // fragColor=vColor;
            fragColor=vec4(abs(vNormal), 1.0);//vec4((vNormal+vec3(1.))*0.5, 1.);
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
    for (const key of ["uMVPmat"]) {
        program[key] = gl.getUniformLocation(program, key);
    }




    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    cube.createVAO(gl, () => {
        cube.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        cube.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        cube.createVBOcolors(gl, 4, gl.STATIC_DRAW);
        cube.createVBOIndices(gl, gl.STATIC_DRAW);
    })

    plane.transform.scale(10, 10, 10);
    cube.transform.translate(0, 0, 0.5);
    const da = Math.PI / 300;
    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // camera.transform.rotateAround([0, 0, 0], [1, 1, 1], da);
        const mVP = camera.getViewProjectMatrix();
        gl.useProgram(program);

        gl.polygonOffset(-1, -1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, plane.transform));
        plane.draw(gl);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, cube.transform));
        cube.draw(gl);
        requestAnimationFrame(draw);
    }
    draw();
}

//direction light
function cv1(cvi) {
    const inputind = 0;
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
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
    const m_ambient = document.querySelectorAll("#m_ambient")[inputind];
    const m_diffuse = document.querySelectorAll("#m_diffuse")[inputind];
    const m_specular = document.querySelectorAll("#m_specular")[inputind];
    const m_exponent = document.querySelectorAll("#m_specular_exponent")[inputind];
    const l_ambient = document.querySelectorAll("#l_ambient")[inputind];
    const l_diffuse = document.querySelectorAll("#l_diffuse")[inputind];
    const l_specular = document.querySelectorAll("#l_specular")[inputind];

    let m_ambient_color;
    let m_diffuse_color;
    let m_specular_color;
    let l_ambient_color;
    let l_diffuse_color;
    let l_specular_color;
    let m_specular_exponent;

    m_ambient.oninput = e => m_ambient_color = getColorFromInputElement(m_ambient);
    m_diffuse.oninput = e => m_diffuse_color = getColorFromInputElement(m_diffuse);
    m_specular.oninput = e => m_specular_color = getColorFromInputElement(m_specular);
    m_exponent.oninput = e => m_specular_exponent = parseFloat(m_exponent.value);
    l_ambient.oninput = e => l_ambient_color = getColorFromInputElement(l_ambient);
    l_diffuse.oninput = e => l_diffuse_color = getColorFromInputElement(l_diffuse);
    l_specular.oninput = e => l_specular_color = getColorFromInputElement(l_specular);

    m_ambient.oninput(); m_diffuse.oninput(); m_specular.oninput(); m_exponent.oninput();
    l_ambient.oninput(); l_diffuse.oninput(); l_specular.oninput();

    cv.onwheel = e => {
        const dz = e.wheelDelta * wheelSensitivity;
        camera.transform.translate(0, 0, dz);
    }
    cv.oncontextmenu = e => e.preventDefault();

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        struct direction_light{
            vec3 direction;         //The normalized light direction in eye space
            vec3 halfplane;         //The normalized half-plane vector H. This can be
                                    //precomputed for a directional light, as it does not change.
            vec4 ambient_color;
            vec4 diffuse_color;
            vec4 specular_color;
        };
        struct material_props{
            vec4 ambient_color;
            vec4 diffuse_color;
            vec4 specular_color;
            float specular_exponent;
        };
        const float c_zero=0.;
        const float c_one=1.;

        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;

        uniform mat4 uMVPmat;
        uniform mat4 uMVmat;
        uniform material_props uMaterial;
        uniform direction_light uLight;

        out vec4 vColor;

        // normal has been transformed into eye space and is a
        // normalized vector; this function returns the computed color
        vec4 direction_light_color(vec3 normal){
            vec4 color = vec4(c_zero);
            color += (uLight.ambient_color * uMaterial.ambient_color);
            
            float ndotl = max(c_zero, dot(normal, uLight.direction));
            color += (ndotl * uLight.diffuse_color * uMaterial.diffuse_color);

            float ndoth = max(c_zero, dot(normal, uLight.halfplane));
            color += (pow(ndoth, uMaterial.specular_exponent) * 
                      uLight.specular_color * uMaterial.specular_color);
            
            return color;
        }

        void main(){
            gl_Position = uMVPmat * apos;
            vec3 normal = normalize((uMVmat * vec4(anormal, 0.)).xyz);
            vColor = direction_light_color(normal.xyz);
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        
        in vec4 vColor;
        out vec4 fragColor;        
        void main(){
            fragColor=vColor;
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

    for (const key of ["uMVPmat", "uMVmat",
        "uMaterial.ambient_color", "uMaterial.diffuse_color", "uMaterial.specular_color", "uMaterial.specular_exponent",
        "uLight.direction", "uLight.halfplane", "uLight.ambient_color", "uLight.diffuse_color", "uLight.specular_color"]) {
        program[key] = gl.getUniformLocation(program, key);
        console.assert(!!program[key], `${key} is undefined!`);
    }



    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);


    const plane = new MyGeometry.Plane();
    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    const cube = new MyGeometry.Cube();
    cube.createVAO(gl, () => {
        cube.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        cube.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        cube.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    const sphere = new MyGeometry.Sphere(1, 12);
    sphere.createVAO(gl, () => {
        sphere.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        sphere.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        sphere.createVBOIndices(gl, gl.STATIC_DRAW);
    })

    plane.transform.scale(10, 10, 10);
    cube.transform.translate(0, 0, 0.5);
    sphere.transform.translate(0, 0, 1.5);
    const lightDir = new MyVector3([0, 1, 1]).normalized();


    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const matV = camera.getViewMatrix();
        const matVP = MyMatrix4x4.multiply(camera.projectMatrix, matV);

        gl.useProgram(program);


        gl.uniform4fv(program["uMaterial.ambient_color"], m_ambient_color);
        gl.uniform4fv(program["uMaterial.diffuse_color"], m_diffuse_color);
        gl.uniform4fv(program["uMaterial.specular_color"], m_specular_color);
        gl.uniform1f(program["uMaterial.specular_exponent"], m_specular_exponent);

        gl.uniform4fv(program["uLight.ambient_color"], l_ambient_color);
        gl.uniform4fv(program["uLight.diffuse_color"], l_diffuse_color);
        gl.uniform4fv(program["uLight.specular_color"], l_specular_color);

        const vLightDir = MyVector3.from(matV.multiplyVec(lightDir));
        gl.uniform3fv(program["uLight.direction"], vLightDir);
        const vHalfplane = new MyVector3([0, 0, 1]).added(vLightDir).normalized();
        // console.log(camera.transform.zAxis);
        gl.uniform3fv(program["uLight.halfplane"], vHalfplane);

        gl.polygonOffset(-1, -1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(matVP, plane.transform));
        gl.uniformMatrix4fv(program.uMVmat, false, MyMatrix4x4.multiply(matV, plane.transform));
        plane.draw(gl);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(matVP, cube.transform));
        gl.uniformMatrix4fv(program.uMVmat, false, MyMatrix4x4.multiply(matV, cube.transform));
        cube.draw(gl);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(matVP, sphere.transform));
        gl.uniformMatrix4fv(program.uMVmat, false, MyMatrix4x4.multiply(matV, sphere.transform));
        sphere.draw(gl);


        requestAnimationFrame(draw);
    }
    draw();
}

//spot light
function cv2(cvi) {
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    const inputind = 1;
    const gl = cv.getContext("webgl2");

    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
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
    const m_ambient = document.querySelectorAll("#m_ambient")[inputind];
    const m_diffuse = document.querySelectorAll("#m_diffuse")[inputind];
    const m_specular = document.querySelectorAll("#m_specular")[inputind];
    const m_exponent = document.querySelectorAll("#m_specular_exponent")[inputind];
    const l_ambient = document.querySelectorAll("#l_ambient")[inputind];
    const l_diffuse = document.querySelectorAll("#l_diffuse")[inputind];
    const l_specular = document.querySelectorAll("#l_specular")[inputind];

    let m_ambient_color;
    let m_diffuse_color;
    let m_specular_color;
    let l_ambient_color;
    let l_diffuse_color;
    let l_specular_color;
    let m_specular_exponent;

    m_ambient.oninput = e => m_ambient_color = getColorFromInputElement(m_ambient);
    m_diffuse.oninput = e => m_diffuse_color = getColorFromInputElement(m_diffuse);
    m_specular.oninput = e => m_specular_color = getColorFromInputElement(m_specular);
    m_exponent.oninput = e => m_specular_exponent = parseFloat(m_exponent.value);
    l_ambient.oninput = e => l_ambient_color = getColorFromInputElement(l_ambient);
    l_diffuse.oninput = e => l_diffuse_color = getColorFromInputElement(l_diffuse);
    l_specular.oninput = e => l_specular_color = getColorFromInputElement(l_specular);

    m_ambient.oninput(); m_diffuse.oninput(); m_specular.oninput(); m_exponent.oninput();
    l_ambient.oninput(); l_diffuse.oninput(); l_specular.oninput();

    cv.onwheel = e => {
        const dz = e.wheelDelta * wheelSensitivity;
        camera.transform.translate(0, 0, dz);
    }
    cv.oncontextmenu = e => e.preventDefault();

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, `#version 300 es
        const float c_zero=0.;
        const float c_one=1.;

        layout(location=0) in vec4 apos;
        layout(location=1) in vec3 anormal;

        uniform mat4 uMVPmat;
        uniform mat4 uMVmat;
        
        out vec3 vNormal;
        out vec4 vPos;
        void main(){
            gl_Position = uMVPmat * apos;            
            vNormal = normalize((uMVmat * vec4(anormal, c_zero)).xyz);
            vPos = uMVmat*apos;            
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        struct spot_light{
            vec4 position;          //light pos in eye space
            vec3 direction;         //The normalized light direction in eye space
            vec3 attenuation_factor;       //attenuation factors k0, k1, k2
            bool compute_distance_attenuation;
            float exponent;         //spotlight exponent term
            float cutoff_angle;     //cutoff angle in degrees
            vec4 ambient_color;
            vec4 diffuse_color;
            vec4 specular_color;
        };
        struct material_props{
            vec4 ambient_color;
            vec4 diffuse_color;
            vec4 specular_color;
            float specular_exponent;
        };
        const float c_zero=0.;
        const float c_one=1.;

        in vec3 vNormal;
        in vec4 vPos;        
        out vec4 fragColor;  

        uniform material_props uMaterial;
        uniform spot_light uLight;
        
        // normal and position has been transformed into eye space and normal is a
        // normalized vector; this function returns the computed color
        vec4 spot_light_color(vec3 normal, vec4 position){
            vec4 color = vec4(c_zero);
            vec3 lightdir;
            vec3 halfplane;
            float att_factor=c_one;

            lightdir=uLight.position.xyz-position.xyz;
            if(uLight.compute_distance_attenuation){
                vec3 att_dist;
                att_dist.x=c_one;
                att_dist.z=dot(lightdir, lightdir);
                att_dist.y=sqrt(att_dist.z);
                att_factor=c_one/dot(att_dist, uLight.attenuation_factor);
            }

            lightdir=normalize(lightdir);

            if(uLight.cutoff_angle<180.0){
                float spot_factor=dot(-lightdir, uLight.direction);
                if(spot_factor>=cos(radians(uLight.cutoff_angle))){
                    spot_factor=pow(spot_factor, uLight.exponent);
                }else{
                    spot_factor=c_zero;
                }
                att_factor*=spot_factor;
            }

            if(att_factor>c_zero){
                color += (uLight.ambient_color * uMaterial.ambient_color);   
                
                float ndotl = max(c_zero, dot(normal, lightdir));
                color += (ndotl * uLight.diffuse_color * uMaterial.diffuse_color);
    
                halfplane=normalize(lightdir + vec3(c_zero, c_zero, c_one));
                float ndoth = dot(normal, halfplane);
                if(ndoth>c_zero){
                    color += (pow(ndoth, uMaterial.specular_exponent) * 
                              uLight.specular_color * uMaterial.specular_color);
                }
                color*=att_factor;
            }
            return vec4(color.xyz, 1.0);
            // return vec4(lightdir, 1.0);
        }

        void main(){
            vec4 color = spot_light_color(vNormal, vPos);
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

    for (const key of ["uMVPmat", "uMVmat",
        "uMaterial.ambient_color", "uMaterial.diffuse_color", "uMaterial.specular_color", "uMaterial.specular_exponent",
        "uLight.direction", "uLight.position", "uLight.attenuation_factor", "uLight.compute_distance_attenuation",
        "uLight.exponent", "uLight.cutoff_angle", "uLight.ambient_color", "uLight.diffuse_color", "uLight.specular_color"]) {
        program[key] = gl.getUniformLocation(program, key);
        console.assert(!!program[key], `${key} is undefined!`);
    }



    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);


    const plane = new MyGeometry.Plane();
    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    const cube = new MyGeometry.Cube();
    cube.createVAO(gl, () => {
        cube.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        cube.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        cube.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    const sphere = new MyGeometry.Sphere(1, 12);
    sphere.createVAO(gl, () => {
        sphere.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        sphere.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        sphere.createVBOIndices(gl, gl.STATIC_DRAW);
    })

    plane.transform.scale(10, 10, 10);
    cube.transform.translate(0, 0, 0.5);
    sphere.transform.translate(0, 0, 1.5);
    const lightDir = new MyVector3([0, -1, -1]).normalized();
    const lightPos = new MyVector3([0, 4, 4]);
    const attenuation_factor = new MyVector3([.1, .1, .01]);
    const compute_distance_attenuation = 1;
    const cutoff_angle = 15;
    const exponent = 70;

    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const matV = camera.getViewMatrix();
        const matVP = MyMatrix4x4.multiply(camera.projectMatrix, matV);

        gl.useProgram(program);


        gl.uniform4fv(program["uMaterial.ambient_color"], m_ambient_color);
        gl.uniform4fv(program["uMaterial.diffuse_color"], m_diffuse_color);
        gl.uniform4fv(program["uMaterial.specular_color"], m_specular_color);
        gl.uniform1f(program["uMaterial.specular_exponent"], m_specular_exponent);

        gl.uniform4fv(program["uLight.ambient_color"], l_ambient_color);
        gl.uniform4fv(program["uLight.diffuse_color"], l_diffuse_color);
        gl.uniform4fv(program["uLight.specular_color"], l_specular_color);

        const vLightDir = MyVector3.from(matV.multiplyVec(lightDir));
        gl.uniform3fv(program["uLight.direction"], vLightDir);
        gl.uniform4fv(program["uLight.position"], new Float32Array([...matV.multiplyPoint(lightPos), 1.0]));
        gl.uniform3fv(program["uLight.attenuation_factor"], attenuation_factor);
        gl.uniform1f(program["uLight.compute_distance_attenuation"], compute_distance_attenuation);
        gl.uniform1f(program["uLight.cutoff_angle"], cutoff_angle);
        gl.uniform1f(program["uLight.exponent"], exponent);

        gl.polygonOffset(-1, -1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(matVP, plane.transform));
        gl.uniformMatrix4fv(program.uMVmat, false, MyMatrix4x4.multiply(matV, plane.transform));
        plane.draw(gl);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(matVP, cube.transform));
        gl.uniformMatrix4fv(program.uMVmat, false, MyMatrix4x4.multiply(matV, cube.transform));
        cube.draw(gl);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(matVP, sphere.transform));
        gl.uniformMatrix4fv(program.uMVmat, false, MyMatrix4x4.multiply(matV, sphere.transform));
        sphere.draw(gl);


        requestAnimationFrame(draw);
    }
    draw();
}

//vertex textures
function cv3(cvi) {
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");

    const img = document.getElementsByTagName("img")[0];


    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    camera.transform.rotateX(Math.PI * 0.25);
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
        layout(location=2) in vec2 auv;
        layout(location=4) in vec4 acolor;

        uniform mat4 uMVPmat;
        uniform sampler2D uDispMap;

        flat out vec4 vColor;
        flat out vec3 vNormal;
        void main(){
            gl_PointSize=10.0;
            float displacement = texture(uDispMap, auv).r/255.0*10.0;
            vec4 offset = vec4(anormal * displacement, 0.0);
            gl_Position=uMVPmat * (apos + offset);
            vColor=acolor;
            vNormal=anormal;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        flat in vec4 vColor;
        flat in vec3 vNormal;
        out vec4 fragColor;        
        void main(){
            // fragColor=vColor;
            fragColor=vec4(abs(vNormal), 1.0);//vec4((vNormal+vec3(1.))*0.5, 1.);
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
    for (const key of ["uMVPmat", "uDispMap"]) {
        program[key] = gl.getUniformLocation(program, key);
    }


    const cube = new MyGeometry.Cube();
    const plane = new MyGeometry.SubdivPlane(1, 1, 64, 64);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        plane.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    cube.createVAO(gl, () => {
        cube.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        cube.createVBOnormals(gl, 1, gl.STATIC_DRAW);
        cube.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        cube.createVBOcolors(gl, 4, gl.STATIC_DRAW);
        cube.createVBOIndices(gl, gl.STATIC_DRAW);
    })

    plane.transform.scale(10, 10, 10);
    cube.transform.translate(0, 0, 0.5);

    const tex = gl.createTexture();


    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);



    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const mVP = camera.getViewProjectMatrix();
        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(program.uDispMap, 0);

        gl.polygonOffset(-1, -1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, plane.transform));
        plane.draw(gl, gl.LINE_STRIP);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, cube.transform));
        cube.draw(gl);
        requestAnimationFrame(draw);
    }
    draw();
}

//cube map
function cv4(cvi) {
    const imgs = document.getElementsByTagName("img");
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");


    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
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
        smooth out vec3 vNormal;
        void main(){
            gl_Position=uMVPmat * apos;
            vColor=acolor;
            vNormal=anormal;
        }
    `);
    gl.shaderSource(fShader, `#version 300 es
        precision mediump float;
        flat in vec4 vColor;
        smooth in vec3 vNormal;

        uniform samplerCube uTex;
        out vec4 fragColor;        
        void main(){            
            fragColor=texture(uTex, vNormal);
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
    for (const key of ["uMVPmat", "uTex"]) {
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
    })

    plane.transform.scale(10, 10, 10);
    sphere.transform.translate(0, 0, 0.5);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[1]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[2]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[3]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[4]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[5]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[6]);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);


    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const mVP = camera.getViewProjectMatrix();
        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.uniform1i(program.uTex, 0);

        gl.polygonOffset(-1, -1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, plane.transform));
        plane.draw(gl);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, sphere.transform));
        sphere.draw(gl);
        requestAnimationFrame(draw);
    }
    draw();
}

//3d texture and 2d texture array
function cv5(cvi) {
    const imgs = document.getElementsByTagName("img");
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");


    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
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
        layout(location=2) in vec2 auv;
        uniform mat4 uMVPmat;

        out vec2 vUv;
        void main(){
            gl_Position=uMVPmat * apos;
            vUv=auv*2.0;
        }
    `);
    const fsource = `#version 300 es
        precision mediump float;
        in vec2 vUv;
        uniform float uTexInd;
        uniform mediump {0} uTex;

        out vec4 fragColor;        
        void main(){            
            fragColor=texture(uTex, vec3(vUv, uTexInd));
        }
    `;
    gl.shaderSource(fShader, fsource.replace('{0}', "sampler3D"));
    gl.shaderSource(fShader1, fsource.replace('{0}', "sampler2DArray"));

    const program = gl.createProgram(), program1 = gl.createProgram();
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

    gl.attachShader(program1, vShader);
    gl.attachShader(program1, fShader1);
    gl.compileShader(fShader1);
    gl.linkProgram(program1);
    if (!gl.getProgramParameter(program1, gl.LINK_STATUS)) {
        console.error("link error: ", gl.getProgramInfoLog(program));
        console.error("vShader info: ", gl.getShaderInfoLog(vShader));
        console.error("fShader1 info: ", gl.getShaderInfoLog(fShader1));
    }
    for (const p of [program, program1]) {
        for (const key of ["uMVPmat", "uTex", "uTexInd"]) {
            p[key] = gl.getUniformLocation(p, key);
        }
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const sphere = new MyGeometry.Sphere();
    const plane = new MyGeometry.SubdivPlane();

    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    sphere.createVAO(gl, () => {
        sphere.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        sphere.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        sphere.createVBOIndices(gl, gl.STATIC_DRAW);
    })

    plane.transform.scale(2, 2, 2);
    sphere.transform.translate(0, 0, 0.5);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, tex);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA, 64, 64, 6, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[1]);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 1, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[2]);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 2, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[3]);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 3, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[4]);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 4, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[5]);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 5, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[6]);
    gl.generateMipmap(gl.TEXTURE_3D);

    const tex1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex1);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, 64, 64, 6, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[1]);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 1, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[2]);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 2, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[3]);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 3, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[4]);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 4, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[5]);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 5, 64, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, imgs[6]);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);

    //采样器
    const smp = gl.createSampler();
    gl.samplerParameteri(smp, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.samplerParameteri(smp, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(smp, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(smp, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

    let texInd = 0, texInd1 = 0;
    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const mVP = camera.getViewProjectMatrix();
        gl.useProgram(program);

        gl.uniform1f(program.uTexInd, texInd);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, tex);
        gl.bindSampler(0, smp);
        gl.uniform1i(program.uTex, 0);

        gl.polygonOffset(-1, -1);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        plane.transform.translate(-2, 0, 0);
        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, plane.transform));
        plane.draw(gl);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, sphere.transform));
        sphere.draw(gl);


        gl.useProgram(program1);
        gl.uniform1f(program1.uTexInd, texInd1);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex1);
        gl.bindSampler(0, smp);
        gl.uniform1i(program1.uTex, 0);

        plane.transform.translate(4, 0, 0);
        gl.uniformMatrix4fv(program1.uMVPmat, false, MyMatrix4x4.multiply(mVP, plane.transform));
        plane.draw(gl);
        plane.transform.translate(-2, 0, 0);

        texInd = (texInd + 0.02 / 6) % 1;
        texInd1 = (texInd1 + 0.02) % 6;
        requestAnimationFrame(draw);
    }
    draw();
}

//texture LOD
function cv6(cvi) {
    const imgs = document.getElementsByTagName("img");
    const cv = document.getElementsByTagName("canvas")[cvi];
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;

    const gl = cv.getContext("webgl2");


    const camera = new MyCamera(Math.PI / 4, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
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
        layout(location=2) in vec2 auv;
        uniform mat4 uMVPmat;

        out vec2 vUv;
        void main(){
            gl_Position=uMVPmat * apos;
            vUv=auv;
        }
    `);
    const fsource = `#version 300 es
        precision mediump float;
        in vec2 vUv;
        uniform float uTexInd;
        uniform mediump {0} uTex;

        out vec4 fragColor;        
        void main(){            
            fragColor=texture(uTex, vUv);
        }
    `;
    gl.shaderSource(fShader, fsource.replace('{0}', "sampler2D"));

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


    for (const p of [program]) {
        for (const key of ["uMVPmat", "uTex", "uTexInd"]) {
            p[key] = gl.getUniformLocation(p, key);
        }
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const sphere = new MyGeometry.Sphere();
    const plane = new MyGeometry.SubdivPlane();

    plane.createVAO(gl, () => {
        plane.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        plane.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        plane.createVBOIndices(gl, gl.STATIC_DRAW);
    });
    sphere.createVAO(gl, () => {
        sphere.createVBOvertices(gl, 0, gl.STATIC_DRAW);
        sphere.createVBOuvs(gl, 2, gl.STATIC_DRAW);
        sphere.createVBOIndices(gl, gl.STATIC_DRAW);
    })

    plane.transform.scale(2, 2, 2);
    sphere.transform.translate(0, 0, 0.5);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgs[1]);

    const cvv = document.createElement("canvas");
    const ctx = cvv.getContext("2d");
    cvv.width = 64;
    cvv.height = 64;

    ctx.scale(.5, .5);
    ctx.drawImage(imgs[2], 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 1, gl.RGBA, 32, 32, 0, gl.RGBA, gl.UNSIGNED_BYTE, ctx.getImageData(0, 0, 32, 32));

    ctx.scale(.5, .5);
    ctx.drawImage(imgs[3], 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 2, gl.RGBA, 16, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, ctx.getImageData(0, 0, 16, 16));

    ctx.scale(.5, .5);
    ctx.drawImage(imgs[4], 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 3, gl.RGBA, 8, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, ctx.getImageData(0, 0, 8, 8));

    ctx.scale(.5, .5);
    ctx.drawImage(imgs[5], 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 4, gl.RGBA, 4, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, ctx.getImageData(0, 0, 4, 4));

    ctx.scale(.5, .5);
    ctx.drawImage(imgs[6], 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 5, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, ctx.getImageData(0, 0, 2, 2));

    ctx.scale(.5, .5);
    ctx.drawImage(imgs[6], 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 6, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, ctx.getImageData(0, 0, 1, 1));


    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const mVP = camera.getViewProjectMatrix();
        gl.useProgram(program);


        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.uniform1i(program.uTex, 0);


        plane.transform.translate(-2, 0, 0);
        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, plane.transform));
        plane.draw(gl);
        plane.transform.translate(2, 0, 0);

        gl.uniformMatrix4fv(program.uMVPmat, false, MyMatrix4x4.multiply(mVP, sphere.transform));
        sphere.draw(gl);


        requestAnimationFrame(draw);
    }
    draw();
}