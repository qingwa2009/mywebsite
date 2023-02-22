'use strict';
import { MyMatrix4x4 } from "../js/MyMatrix.js";
import MyGLProgram from "../js/MyGLProgram.js";
import MyGeometry from "../js/MyGeometry.js";
(() => {
	const ID_CANVAS = "glCanvas";
	const cv = document.getElementById(ID_CANVAS);

	/**
	 * @type WebGL2RenderingContext
	 */
	const gl = cv.getContext("webgl2");
	if (!gl) {
		alert("该浏览器不支持WebGL2！");
		return;
	}

	OnCanvasResize(null, true);

	var rayMarchingVShader = MyGLProgram.VShader.create(gl,
		`
        attribute vec3 aPos;
        void main(){         
            gl_Position=vec4(aPos.xy*2.0, 0.9999, 1.0);
        }
        `
	);

	var rayMarchingFShader = MyGLProgram.FShader.create(gl,
		`
        #define MAX_STEP 64
        #define SURF_DIST 0.001    
        #define MAX_DIST 100.

        precision mediump float;
        uniform vec2 uResolution;
        uniform float uTime;
		uniform mat4 uCamMat;

		mat4 mSphere=mat4(
			1.,0.,0.,0.,
			0.,1.,0.,0.,
			0.,0.,1.,0.,
			0.,1.3,0.,1.
		);
        mat4 mTorus=mat4(
			1.,0.,0.,0.,
			0.,0.,-1.,0.,
			0.,1.,0.,0.,
			0.,1.3,0.,1.
		);
        mat4 mSphereView;
		mat4 mTorusView;	

        vec4 sphere=vec4(0., 1., 6., 1.);
        vec4 light=vec4(3., 10., -3., .9);     

        vec4 sp0=vec4(-1.0,0.1,3.,0.1);
        vec4 sp1=vec4(10.0,5.,15.,10.);

		//gles2.0居然没inverse函数
		mat4 inverse(in mat4 m){
			//无裁切变换逆矩阵
			m[0][3]=0.;m[1][3]=0.;m[2][3]=0.;			
			float mm=1.0/dot(m[0].xyz,m[0].xyz);
			float nn=1.0/dot(m[1].xyz,m[1].xyz);
			float oo=1.0/dot(m[2].xyz,m[2].xyz);			
			m[0]*=mm;m[1]*=nn;m[2]*=oo;

			float s=m[3][3];
			m[3]/=-s;		
			mat4 m1=mat4(
				m[0][0], m[1][0], m[2][0], 0., 
				m[0][1], m[1][1], m[2][1], 0.,
				m[0][2], m[1][2], m[2][2], 0.,
				dot(m[0],m[3]),dot(m[1],m[3]),dot(m[2],m[3]),1.0/s
			);
			return m1;
		}

		void updateMat(){
			mSphereView=inverse(mSphere) * uCamMat;
			mTorusView=inverse(mTorus) * uCamMat;
		}

		//p为物体坐标系的点
        float sdSphere(vec3 p, float r){
        	return length(p)-r;
        }

		float sdPlane(vec3 p, vec2 wh){
			wh*=0.5;
			p=abs(p);
			p.x = max(0., p.x-wh.x);
			p.z = max(0., p.z-wh.y);
        	return length(p);
        }
        
		float sdCapsule(vec3 p, vec3 a, vec3 b, float r){
			vec3 ap=p-a;
			vec3 ab=b-a;
			float t = clamp(dot(ap,ab)/dot(ab,ab), 0., 1.);
			return distance(p, a+ab*t)-r;
		}

		float sdTorus(vec3 p, float r0, float r1){
			return length(vec2(length(p.xz)-r0, p.y))-r1;
		}

		//size.w:圆角
        float sdBox(vec3 p, vec3 o, vec4 size){        	
        	vec3 hsize=0.5*size.xyz-size.w;
			vec3 d = abs(p-o)-hsize;			
			return length(max(d,0.))-size.w;
        }

		float opIns(float d0, float d1){
			return max(d0, d1);
		}

		float opSub(float d0, float d1){
			return max(d0,-d1);
		}
		
		
        //计算任意点到任意表面最小距离，p为摄像机坐标系的点。
        float getDist(vec3 p){            
        	vec4 ap = vec4(p, 1.0);
            float d0 = MAX_DIST;
			float d = MAX_DIST;
			vec3 pp;
			pp = (uCamMat * ap).xyz;	//摄像机坐标系转世界坐标系         
			// if(pp.y>0.)
			// d0 = pp.y;					//点到xz平面最近距离
			// d=min(d, d0);

			d0 = sdPlane(pp, vec2(4., 3.));
			d=min(d, d0);
			
			pp =(mSphereView * ap).xyz;
            d0 = sdSphere(pp, 0.5);			
            d=min(d, d0);
			
			// pp = (mTorusView * ap).xyz;
			// d0 = sdTorus(pp, 1., .3);
			// d=min(d, d0);
			
            // d0 = sdCapsule(p, vec3(1.,2.,6.), vec3(3.,.5,5.), .5);            
			// d=min(d, d0);
			

			// d0 = sdBox(p, vec3(-2., 1.5, 4.), vec4(1.5, 1.0, 1.5, 0.1));
			// float d1=sdSphere(p, vec4(-2., 1.5, 4., 0.9)); 
			
			// d0 = opIns(d0, d1);
			// d0 = opSub(d0, d1);			
			// d0 = opIns(d0, p.y-1.6);
			// d0-=.03;

			// d=min(d, d0);

            return d;
        }

        //计算任意表面过指定点的法线，p为摄像机坐标系的点，返回摄像机坐标系的法线。
        vec3 getNormal(vec3 p){
            float d=getDist(p);
            vec2 e = vec2(SURF_DIST*.1, 0.);
            vec3 n = d-vec3(
                getDist(p-e.xyy),
                getDist(p-e.yxy),
                getDist(p-e.yyx));
            return normalize(n);
			// const float h = SURF_DIST*0.01;
			// const vec2 k = vec2(1., -1.);
			// return normalize(k.xyy * getDist(p + k.xyy * h) +
			// 				 k.yyx * getDist(p + k.yyx * h) + 
			// 				 k.yxy * getDist(p + k.yxy * h) +
			// 				 k.xxx * getDist(p + k.xxx * h));
        }

        //在摄像机坐标系从ro起点朝rd步进，计算步进过程中碰到的最小的距离
        float rayMarch(vec3 ro, vec3 rd){
        	float d=0.;
        	for(int i=0; i<MAX_STEP; i++){
        		vec3 p=ro+rd*d;        		
                float ds=getDist(p);
                d+=ds;
                if(d>MAX_DIST || ds<SURF_DIST)break;
        	}
        	return d;
        }

        float getAO(vec3 p, vec3 n){        	
        	float d0=SURF_DIST*5.;
			vec3 p0=p+n*d0;        		
            float d=getDist(p0);            
        	return smoothstep(-d0, d0,  d);
        }
		
        float getDiffuse(vec3 lightDir, vec3 normal){
        	return dot(lightDir,normal)*.5+.5;
        }
        
        float getSpecular(vec3 lightDir, vec3 normal, vec3 viewDir){
            float specular = max(dot(normalize(lightDir+viewDir), normal),0.);
            specular=pow(specular,50.0);
            return specular;
        }

        //计算p点是否处于阴影内，p、normal、lightDir分别为摄像机坐标系的点跟向量。
        bool getShadow(vec3 p, vec3 normal, vec3 lightDir,float lightDist){
        	float d=rayMarch(p + normal*SURF_DIST*2.0, lightDir); 	
        	return d<lightDist;
        }
        
        void main(){
        	vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;

            float t=uTime*0.0001;
            light.xz += vec2(sin(t), cos(t))*5.0;

			updateMat();

			//摄像机坐标系，左手坐标系
        	vec3 rd=normalize(vec3(uv, 3.)); 
            float d=rayMarch(vec3(0.0), rd);

            vec3 p=rd*d;
            vec3 normal = getNormal(p);      

            float lightIntensity=light.w;
            /*pointLight*/
            // vec3 lightDir=normalize(light.xyz-p);                        
            // float lightDist=distance(light.xyz,p);            
			/*dirLight*/
			vec3 lightDir=normalize(light.xyz);
			float lightDist=MAX_DIST;
			
			vec3 lightDirInCam = (inverse(uCamMat) * vec4(lightDir,0.)).xyz;
            bool inShadow = getShadow(p, normal, lightDirInCam, lightDist);            
            float shadow=inShadow ? 0.8 : 1.0;

            float AO = getAO(p, normal);            
            float diff=getDiffuse(lightDirInCam, normal)*shadow*lightIntensity*AO;                                                
            float specular=inShadow ? 0. : getSpecular(lightDirInCam, normal, -rd);                            
                        
            vec3 col=diff*vec3(1.0,1.0,1.0)+vec3(specular);  
			gl_FragColor = vec4(col,1.);
			//gl_FragColor = vec4((normal+1.)*0.5,1.);
 			// if (d<MAX_DIST){ 
 			// 	gl_FragColor=vec4(normal,1.);				
 			// }else{
 			// 	gl_FragColor=vec4(vec3(0.0),1.);
 			// }
			
			
        }
        `
	);

	const rayMarchingProgram = MyGLProgram.create(gl);
	rayMarchingProgram.link(rayMarchingVShader, rayMarchingFShader);

	const plane = new MyGeometry.Plane();
	plane.createVAOAll(gl, gl.STATIC_DRAW);

	const cameraTransform = new MyMatrix4x4();
	cameraTransform.translate(0, 1, -10);

	var lastTime = Date.now();
	var deltaTime = 0;
	var totalTime = 0;
	update();

	function update() {
		deltaTime = Date.now() - lastTime;
		totalTime += deltaTime;
		lastTime = Date.now();

		draw();
		requestAnimationFrame(update);
	}

	var scrollSensitivity = -100;
	var rotSensitivity = -0.01;
	var movSensitivity = 0.01;
	var fov = Math.PI * 0.06;
	var near = 10;
	var far = 100000;
	var projectMatrix = MyMatrix4x4.persperctiveMatrix(fov, cv.width / cv.height, near, far);
	var pivot = new Float32Array([0, 0, 0]);



	gl.enable(gl.DEPTH_TEST);
	function draw() {
		clear();

		rayMarchingProgram.use();
		gl.uniform2fv(rayMarchingProgram.uniforms.uResolution, new Float32Array([cv.width, cv.height]));
		gl.uniform1f(rayMarchingProgram.uniforms.uTime, totalTime);
		gl.uniformMatrix4fv(rayMarchingProgram.uniforms.uCamMat, false, cameraTransform);
		plane.draw(gl);
	}

	function clear() {
		gl.clearColor(0, 0, 0, 1);
		gl.clearDepth(1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
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
	var x = 0, y = 0;
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
			movCamera(dx, dy);
		} else if (e.buttons & 4) {
			rotCamera(dx, dy);
			// console.log(cameraTransform.toString());
		}
	}
	function movCamera(dx, dy) {
		cameraTransform.translate(-dx * movSensitivity, dy * movSensitivity, 0);
	}

	function rotCamera(dx, dy) {
		let rad = dx * rotSensitivity;
		if (Math.abs(rad) > Number.EPSILON) {
			let yAxis = new Float32Array([0, 1, 0]);
			cameraTransform.rotateAround(pivot, yAxis, -rad, true);
		}
		rad = dy * rotSensitivity;
		if (Math.abs(rad) > Number.EPSILON) {
			let xAxis = cameraTransform.xAxis;
			cameraTransform.rotateAround(pivot, xAxis, -rad, true);
		}
	}

	function onMouseMove(e) {
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
		let now = Date.now();
		let d = now - prevScrollTime;
		cameraTransform.translate(0, 0, Math.sign(e.wheelDelta) * 1 / d * scrollSensitivity)
		prevScrollTime = now;
	}
	function onDbClick(e) {
		if (currClickBtn !== 4)
			return;
	}
	cv.addEventListener("mousemove", onMouseMove);
	cv.addEventListener("mousedown", onMouseDown);
	cv.addEventListener("mouseup", onMouseUp);
	cv.addEventListener("mousewheel", onMouseScroll);

	window.addEventListener("resize", OnCanvasResize);
	window.gl = gl;

}
)();
