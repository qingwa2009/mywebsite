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



    return {
        "defaultProgram": defaultProgram,
        "outlineProgram": outlineProgram,
        "collapseProgram": collapseProgram
    };
}
