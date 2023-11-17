'use strict';
import { MyMatrix4x4 } from "../js/MyMatrix.js";
import * as MySTL from "../js/STLFileReader.js";


(() => {
	const ID_CANVAS = "glCanvas";
	var cv = document.getElementById(ID_CANVAS);
	var obj = null;

	var gl = cv.getContext("webgl2");
	if (!gl) {
		alert("该浏览器不支持WebGL2！");
		return;
	}

	OnCanvasResize(null, true);

	const GLProgram = glProgram(gl);
	const myShader = MyShader(GLProgram);
	const AttrBuffer = attrBuffer(gl);
	initGL();

	const vSource = `        
        attribute vec2 aPos;
        attribute float aSize;
        uniform mat4 uMVP;
        void main(){
            //gl_Position=uMVP*aPos;
            gl_PointSize=aSize;
            gl_Position=vec4(aPos,-1.0,1.0);
        }
    `;

	const fSource = `
        precision highp float;
        uniform float offset;

        const float pi=3.1415926535897932384626433832795;
        const float rad60=1.0/3.0*pi;
        const float sin60 = sin(rad60);
        float sin2ladder(float a, float sina){
            if (sina>sin60){
                return 1.0;
            }else if (sina<-sin60){
                return 0.0;
            }
            return (sina+1.0)*0.5;
        }
        void main(){
            float x=(gl_PointCoord.x-0.5)*2.0;
            float y=(gl_PointCoord.y-0.5)*2.0;
            float r=x*x + y*y;
            if(r<1.0 && r>0.5){
                float a=atan(y/x)+offset;
                if (x<0.0) a += pi;
                else if (x>0.0 && y<0.0) a += 2.0*pi;

                float r=sin2ladder(a,sin(a));
                float g=sin2ladder(a,sin(a+rad60*2.0));
                float b=sin2ladder(a,sin(a+rad60*4.0));
                gl_FragColor=vec4(r,g,b,1.0);
            }else{
                discard;
            }            
        }        
    `;

	var vShader = GLProgram.compileVShader(vSource);
	var fShader = GLProgram.compileFShader(fSource);
	var program = new GLProgram(vShader, fShader);
	console.log(program);

	const rayMarchingObj = createVAO(gl, {
		'vertices': new Float32Array([
			-1, 1, 0, 1, 1, 0,
			-1, -1, 0, 1, -1, 0]),
		'triangles': new Uint16Array([0, 1, 2, 2, 1, 3]),
	});

	var points = new AttrBuffer([-1, -1], gl.FLOAT, gl.ARRAY_BUFFER, 2, 0, gl.DYNAMIC_DRAW);
	var sizes = new AttrBuffer([100], gl.FLOAT, gl.ARRAY_BUFFER);
	console.log(points);

	var lastTime = Date.now();
	var deltaTime = 0;
	var totalTime = 0;
	update();

	function initGL() {
		gl.enable(gl.DEPTH_TEST);
	}

	function update() {
		deltaTime = Date.now() - lastTime;
		totalTime += deltaTime;
		lastTime = Date.now();

		draw();
		requestAnimationFrame(update);
	}

	let em = document.getElementById("fixedLightDir");
	var fixedLightDir = em.checked;
	em.onchange = (e) => fixedLightDir = e.target.checked;
	const cartoonABCD = new Float32Array([0, 0, 0, 0]);
	const sABCD = ["cartoonA", "cartoonB", "cartoonC", "cartoonD"];
	const updateCartoonABCD = (em, i) => {
		let value = Number(em.value).toFixed(3);
		cartoonABCD[i] = value;
		em.labels[0].textContent = `${sABCD[i].substr(7, 1)}:${value}`
	}

	for (let i = 0; i < cartoonABCD.length; i++) {
		em = document.getElementById(sABCD[i]);
		updateCartoonABCD(em, i);
		em.oninput = e => updateCartoonABCD(e.target, i);
	}
	em = document.getElementById("smoothness");
	let smoothness = Number(em.value);
	em.oninput = e => smoothness = Number(e.target.value);

	const selectProgram = document.getElementById("usedProgram");
	Object.keys(myShader).forEach(k => {
		let op = document.createElement("option");
		op.setAttribute("value", k);
		op.insertAdjacentText("afterBegin", k);
		selectProgram.options.add(op);
	});
	function parseColor(color) {
		let c = Number("0x" + color.substr(1, 6));
		return new Float32Array([(c >> 16) / 255, ((c & 0xFF00) >> 8) / 255, (c & 0xFF) / 255]);
	}

	em = document.getElementById("mainColor");
	let mainColor = parseColor(em.value);
	em.onchange = e => mainColor = parseColor(e.target.value);




	var scrollSensitivity = 10000;
	var rotSensitivity = 0.01;
	var fov = Math.PI * 0.06;
	var near = 10;
	var far = 100000;
	var projectMatrix = MyMatrix4x4.persperctiveMatrix(fov, cv.width / cv.height, near, far);
	var pivot = new Float32Array([0, 0, 0]);
	const modelTransfrom = new MyMatrix4x4();
	const cameraTransform = new MyMatrix4x4();

	var lightPos = new Float32Array([1, 1, 1]);

	myShader.defaultProgram.onSetProperties = function (gl) {
		gl.uniform3fv(this.uniforms.lightPos, lightPos);
		gl.uniform4fv(this.uniforms.abcd, cartoonABCD);
		gl.uniform3fv(this.uniforms.mainColor, mainColor);
		gl.uniform3fv(this.uniforms.cameraPos, cameraTransform.localPosition);
		gl.uniform1f(this.uniforms.smoothness, smoothness);
	}

	var collapseProgress = 0.5;
	myShader.collapseProgram.onSetProperties = function (gl) {
		gl.uniform3fv(this.uniforms.lightPos, lightPos);
		gl.uniform4fv(this.uniforms.abcd, cartoonABCD);
		gl.uniform3fv(this.uniforms.mainColor, mainColor);
		gl.uniform3fv(this.uniforms.cameraPos, cameraTransform.localPosition);
		gl.uniform1f(this.uniforms.smoothness, smoothness);

		collapseProgress = Math.abs(Math.sin(totalTime * 0.0005));
		gl.uniform1f(this.uniforms.progress, collapseProgress);
		gl.uniform1f(this.uniforms.range, 100.0);
		gl.uniform3fv(this.uniforms.pivot, pivot);
	}

	const posOffsetBuf = ((count, x, y, z) => {
		const posOffset = new Float32Array(count * count * count * 3);
		for (let i = 0; i < count; i++) {
			for (let j = 0; j < count; j++) {
				for (let k = 0; k < count; k++) {
					let ind = (i * count * count + j * count + k) * 3;
					posOffset[ind] = i * x;
					posOffset[ind + 1] = j * y;
					posOffset[ind + 2] = k * z;
				}
			}
		}
		let buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, posOffset, gl.STATIC_DRAW);

		return buf;
	})(10, 100, 100, 100);

	// myShader.rayMarchingProgram.onSetProperties = function (gl) {
	// 	gl.uniform2fv(this.uniforms.uResolution, new Float32Array([cv.width, cv.height]));
	// 	if (this.uniforms.uTime) gl.uniform1f(this.uniforms.uTime, totalTime);
	// }

	function draw() {
		clear();
		if (obj !== null) {
			let material = myShader[selectProgram.value];
			material.useProgram();
			gl.bindVertexArray(obj.vao);

			gl.bindBuffer(gl.ARRAY_BUFFER, posOffsetBuf);
			gl.enableVertexAttribArray(2);
			gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
			gl.vertexAttribDivisor(2, 1);

			gl.uniformMatrix4fv(material.uniforms.uM, false, modelTransfrom);
			gl.uniformMatrix4fv(material.uniforms.uV, false, cameraTransform.inverseOrtho());
			gl.uniformMatrix4fv(material.uniforms.uP, false, projectMatrix);
			//gl.drawArrays(gl.TRIANGLES, 0, obj.count * 3);
			gl.drawArraysInstanced(gl.TRIANGLES, 0, obj.count * 3, 1);
			gl.bindVertexArray(null);
		}

		// myShader.rayMarchingProgram.useProgram();
		// gl.bindVertexArray(rayMarchingObj.vao);
		// gl.drawElements(gl.TRIANGLES, rayMarchingObj.triangles.length, gl.UNSIGNED_SHORT, 0);
		// gl.bindVertexArray(null);

		// program.useProgram();
		// gl.bindBuffer(points.target, points.buffer);
		// gl.vertexAttribPointer(program.attributes.aPos, points.size, points.type, false, 0, 0);
		// gl.enableVertexAttribArray(program.attributes.aPos);
		// gl.enableVertexAttribArray(program.attributes.aSize);
		// var n = 3;
		// var offset = Math.PI / n;
		// for (var i = 0; i < n; i++) {
		// 	gl.bindBuffer(sizes.target, sizes.buffer);
		// 	gl.vertexAttribPointer(program.attributes.aSize, sizes.size, sizes.type, false, 0, 0);
		// 	updateCursorSize(i * offset);
		// 	gl.uniform1f(program.uniforms.offset, i * offset + Math.PI * totalTime / 1000 * 3);
		// 	gl.drawArrays(gl.POINTS, 0, points.count);
		// }

	}

	function clear() {
		gl.clearColor(0.8, 0.8, 0.8, 1);
		gl.clearDepth(1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	function updateCursorSize(offset = 0) {
		var size = 20 * Math.abs(Math.sin(Math.PI * totalTime / 1000 + offset));
		sizes.data[0] = size;
		sizes.updateBufData();
	}

	function updateCursor(x, y) {
		points.data[0] = x / cv.width * 2 - 1;
		points.data[1] = 1 - y / cv.height * 2;
		points.updateBufData();
	}

	function OnCanvasResize(e, forceResize = false) {
		if (cv.height != cv.clientHeight || cv.width != cv.clientWidth || forceResize) {
			cv.height = cv.clientHeight;
			cv.width = cv.clientWidth;
			console.log(cv.width, cv.height);
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			projectMatrix = MyMatrix4x4.persperctiveMatrix(fov, cv.width / cv.height, near, far);
		}
	}

	var isDraging = false;
	var x = 0
		, y = 0;
	function startDrag(e) {
		isDraging = true;
		x = e.offsetX;
		y = e.offsetY;
	}
	function endDrag(e) {
		isDraging = false;
	}
	function dragging(e) {
		const dx = e.offsetX - x;
		const dy = e.offsetY - y;
		x = e.offsetX;
		y = e.offsetY;
		if (!isDraging)
			return;
		if (e.buttons === 0) {
			endDrag(e);
			return;
		}
		if (e.buttons & 1) {
			if (obj)
				movCamera(dx, dy);
		} else if (e.buttons & 4) {
			if (obj)
				rotCamera(dx, dy);
		}
	}
	function movCamera(dx, dy) {
		cameraTransform.translate(-dx, dy, 0);
	}

	const yAxis = new Float32Array([0, 1, 0]);
	function rotCamera(dx, dy) {
		let rad = dx * rotSensitivity;
		if (Math.abs(rad) > Number.EPSILON) {
			// modelTransfrom.rotateAround(pivot, yAxis, rad);
			cameraTransform.rotateAround(pivot, yAxis, -rad, true);
		}
		rad = dy * rotSensitivity;
		if (Math.abs(rad) > Number.EPSILON) {
			let xAxis = cameraTransform.xAxis;
			// modelTransfrom.rotateAround(pivot, [1, 0, 0], rad);
			cameraTransform.rotateAround(pivot, xAxis, -rad, true);
		}
		if (!fixedLightDir) {
			lightPos[0] = cameraTransform.positionX - pivot[0];
			lightPos[1] = cameraTransform.positionY - pivot[1];
			lightPos[2] = cameraTransform.positionZ - pivot[2];
		}

	}

	function zoomToFit() {
		let invc = cameraTransform.inverseOrtho();
		let center = invc.multiplyPoint(pivot);

		let d = Math.hypot(boundary[3] - boundary[0], boundary[4] - boundary[1], boundary[5] - boundary[2]) / 2;
		let p = [d, d, center[2] + d];
		let pp = projectMatrix.multiplyPoint(p, 0);
		let offset = Math.max(pp[0], pp[1]) - pp[2];
		cameraTransform.translate(center[0], center[1], offset);
	}

	var boundary;
	function centerPivot() {
		boundary = obj.boundary;
		pivot[0] = (boundary[0] + boundary[3]) * 0.5;
		pivot[1] = (boundary[1] + boundary[4]) * 0.5;
		pivot[2] = (boundary[2] + boundary[5]) * 0.5;
	}

	function onMouseMove(e) {
		updateCursor(e.offsetX, e.offsetY);
		dragging(e);
	}

	var prevClickBtn;
	var currClickBtn
	function onMouseDown(e) {
		startDrag(e);
		currClickBtn = e.buttons;
	}

	var prevClickTime;
	function onMouseUp(e) {
		let currClickTime = Date.now();
		if (currClickBtn === prevClickBtn && currClickTime - prevClickTime < 300) {
			onDbClick(e);
		}
		prevClickBtn = currClickBtn;
		prevClickTime = currClickTime;

		endDrag(e);
	}
	let prevScrollTime = Date.now();
	function onMouseScroll(e) {
		if (!obj)
			return;
		let now = Date.now();
		let d = now - prevScrollTime;
		cameraTransform.translate(0, 0, Math.sign(e.wheelDelta) * 1 / d * scrollSensitivity)
		prevScrollTime = now;
	}
	function onDbClick(e) {
		if (currClickBtn !== 4)
			return;
		if (!obj)
			return;
		centerPivot();
		zoomToFit();
	}
	cv.addEventListener("mousemove", onMouseMove);
	cv.addEventListener("mousedown", onMouseDown);
	cv.addEventListener("mouseup", onMouseUp);
	cv.addEventListener("mousewheel", onMouseScroll);

	window.addEventListener("resize", OnCanvasResize);
	window.gl = gl;
	document.getElementById("file").addEventListener("change", ev => {
		const input = ev.target;
		if (obj !== null) {
			MySTL.releaseSTLVAO(obj, gl);
			obj = null;
		}
		if (input.files.length === 0) {
			return;
		}

		MySTL.createVAOFromSTLFile(input.files[0], gl).then(stl => {
			obj = stl;
			centerPivot();
			zoomToFit();
		}
		);

	}
	);
}
)();
