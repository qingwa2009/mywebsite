'use strict';
var MyShader = function (GLProgram) {
    var defaultVShader = GLProgram.compileVShader(
        `	#version 300 es
		precision highp float;
		layout(location=0) in vec3 aPos;
		layout(location=1) in vec3 aNormal;
		layout(location=2) in vec3 posOffset;

		out vec3 worldPos;		
 		out vec3 vNs;	        

        uniform mat4 uM;
        uniform mat4 uP;
		uniform mat4 uV;
		
        void main(){
        	vec4 wp=uM*vec4(aPos+posOffset,1.0);
			vec4 pos = uP * uV * wp;

			worldPos=wp.xyz;
			vNs=(uM*vec4(aNormal,0.0)).xyz;
            
			gl_Position=pos;			
        }
	`);
    var defaultFShader = GLProgram.compileFShader(
        `	#version 300 es
		precision highp float;
		layout(location=0) out vec4 fragColor;
		in vec3 vNs;
		in vec3 worldPos;

        uniform vec3 cameraPos;
		uniform vec3 lightPos;
		uniform vec4 abcd;
		uniform vec3 mainColor;
		uniform float smoothness;
		void main(){
			vec3 lightDir=normalize(lightPos);
			vec3 normal=normalize(vNs);
			float e = dot(lightDir,normal);
			float esp=step(0.0,e);
			float f = smoothstep(abcd.x,abcd.y,e);
			float g = smoothstep(abcd.z,abcd.w,e);
			e=max(0.2,(f+g)*0.5);			
			vec3 viewDir = normalize(cameraPos - worldPos);
			float u=max(esp*dot(normal,normalize(viewDir+lightDir)),0.0);
			float sp =pow(u,smoothness);

 			vec4 color=vec4(mainColor*e+vec3(sp),1.0);
	  		fragColor = color;
		}
	`);
    var defaultProgram = new GLProgram(defaultVShader, defaultFShader);

    var outlineVShader = GLProgram.compileVShader(
        `	#version 300 es
        precision highp float;
        layout(location=0) in vec3 aPos;
        layout(location=1) in vec3 aNormal;
        
        uniform mat4 uM;
        uniform mat4 uP;
        uniform mat4 uV; 
        out vec3 color;
           
        void main(){	            
            vec4 pos = uP * uV * uM * vec4(aPos,1.0);            
            gl_Position=pos;    
            int m=gl_VertexID%3;
            color=m==0?vec3(1.0,0.0,0.0):(m==1?vec3(0.0,1.0,0.0):vec3(0.0,0.0,1.0)); 
        }
    `);
    var outlineFShader = GLProgram.compileFShader(
        `	#version 300 es
        precision highp float;
        layout(location=0) out vec4 fragColor; 
        in vec3 color;
        void main(){    
            float u=1.0;
            vec3 l = max(abs(dFdx(color)),abs(dFdy(color)));
            //vec3 l = fwidth(color);
            if (any(lessThan(color/l,vec3(u)))){
            	//fragColor = vec4(color,1.0);	
                fragColor = vec4(vec3(0.0),1.0);	            	
            }else{
                fragColor=vec4(1.0);
            	//discard;
            }               
        }
    `);
    var outlineProgram = new GLProgram(outlineVShader, outlineFShader);

    var collapseVShader = GLProgram.compileVShader(
        `	#version 300 es
        precision highp float;
        layout(location=0) in vec3 aPos;
        layout(location=1) in vec3 aNormal;
        layout(location=2) in vec3 posOffset;
        
        out vec3 worldPos;		
 		out vec3 vNs;

        uniform mat4 uM;
        uniform mat4 uP;
        uniform mat4 uV;    
        
        uniform float progress;
        uniform float range;
        uniform vec3 pivot;
        
        
        void main(){
        	vec4 pos=uM*vec4(aPos+posOffset,1.0);         	        	            
            vec3 p0=pos.xyz;
            
            float t =progress*distance(pivot,p0)/range;
            t=pow(smoothstep(0.0,1.0,t),1.0);            

            p0 = p0+(pivot-p0)*t;
            gl_Position=uP*uV*vec4(p0,1.0);    
            
            worldPos=p0;
            vNs=(uM*vec4(aNormal,0.0)).xyz;  
        }
    `);


    var collapseProgram = new GLProgram(collapseVShader, defaultFShader);
    
    var rayMarchingVShader=GLProgram.compileVShader(
        `
        attribute vec3 aPos;
        void main(){         
            gl_Position=vec4(aPos.xy, 0.9999, 1.0);
        }
        `
    );

    var rayMarchingFShader=GLProgram.compileFShader(
        `
        #define MAX_STEP 64
        #define SURF_DIST 0.01    
        #define MAX_DIST 100.

        precision highp float;
        uniform vec2 uResolution;
        uniform float uTime;
        
        vec4 sphere=vec4(0., 1., 6., 1.);
        vec4 light=vec4(3., 10., -3., .9);     
        vec3 camera=vec3(0., 3., 0.);

        vec4 sp0=vec4(-1.0,0.1,3.,0.1);
        vec4 sp1=vec4(10.0,5.,15.,10.);

        //pos:xyz,radius:w
        float sdSphere(vec3 p, vec4 sp){
        	return distance(p, sp.xyz)-sp.w;//点到球体表面最近距离
        }
        
		float sdCapsule(vec3 p, vec3 a, vec3 b, float r){
			vec3 ap=p-a;
			vec3 ab=b-a;
			float t = clamp(dot(ap,ab)/dot(ab,ab), 0., 1.);
			return distance(p, a+ab*t)-r;
		}

		float sdTorus(vec3 p, vec3 o, float r0, float r1){
			vec3 op=p-o;			
			return length(vec2(length(op.xz)-r0,op.y))-r1;
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

        //计算任意点到任意表面最小距离        
        float getDist(vec3 p){            
                     
            float d0 = p.y;//点到xz平面最近距离
            float d = sdSphere(p, sphere);   
            d=min(d, d0);
            d0 = sdCapsule(p, vec3(1.,2.,6.), vec3(3.,.5,5.), .5);            
			d=min(d, d0);
			d0 = sdTorus(p, vec3(-1.5, .5, 4.), 1., .3);
			d=min(d, d0);

			d0 = sdBox(p, vec3(-2., 1.5, 4.), vec4(1.5, 1.0, 1.5, 0.1));
			float d1=sdSphere(p, vec4(-2., 1.5, 4., 0.9)); 
			
			d0 = opIns(d0, d1);
			d0 = opSub(d0, d1);			
			d0 = opIns(d0, p.y-1.6);
			d0-=.03;

			d=min(d, d0);

            return d;
        }

        //计算任意表面过指定点的法线
        vec3 getNormal(vec3 p){
            float d=getDist(p);
            vec2 e = vec2(SURF_DIST*.01, 0.);
            vec3 n = d-vec3(
                getDist(p-e.xyy),
                getDist(p-e.yxy),
                getDist(p-e.yyx));
            return normalize(n);
        }

        //从ro起点超rd步进，计算步进过程中碰到的最小的距离
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
        
        bool getShadow(vec3 p, vec3 normal, vec3 lightDir,float lightDist){
        	float d=rayMarch(p + normal*SURF_DIST*2.0, lightDir); 	
        	return d<lightDist;
        }
        
        void main(){
        	vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;

            float t=uTime*0.0001;
            light.xz += vec2(sin(t), cos(t))*5.0;
			//sphere.y-=1.0;
            //sphere.y+=abs(sin(t*3.3));

        	vec3 ro=camera;
        	vec3 rd=normalize(vec3(uv-vec2(0.,.5),1.0)); 
        	                       
            float d=rayMarch(ro, rd);
            vec3 p=ro+rd*d;
            vec3 normal = getNormal(p);      

            float lightIntensity=light.w;
            /*pointLight*/
            vec3 lightDir=normalize(light.xyz-p);                        
            float lightDist=distance(light.xyz,p);            
			/*dirLight*/
			lightDir=normalize(light.xyz);
			lightDist=MAX_DIST;
			

            bool inShadow = getShadow(p, normal, lightDir, lightDist);            
            float shadow=inShadow ? 0.8 : 1.0;
            float AO = getAO(p, normal);            
            float diff=getDiffuse(lightDir, normal)*shadow*lightIntensity*AO;                                                
            float specular=inShadow ? 0. : getSpecular(lightDir, normal, -rd);                            
                        
            vec3 col=diff*vec3(1.0,1.0,1.0)+vec3(specular);            
			gl_FragColor=vec4(col,1.0);
        }
        `
    );
    
    var rayMarchingProgram=new GLProgram(rayMarchingVShader, rayMarchingFShader);

    return {
        "defaultProgram": defaultProgram,
        "outlineProgram": outlineProgram,
        "collapseProgram":collapseProgram,
        "rayMarchingProgram":rayMarchingProgram,
    };
}
