'use strict';

function glProgram(gl) {
	function GLProgram(vShader, fShader) {
		if (!(this instanceof GLProgram))
			throw new Error("Please use new GLProgram to create the instance!");
		this.program = gl.createProgram();
		gl.attachShader(this.program, vShader);
		gl.attachShader(this.program, fShader);
		gl.linkProgram(this.program);
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			gl.deleteProgram(this.program);
			var es = "LinkProgram Error: " + gl.getProgramInfoLog(this.program);
			console.error(es);
			es = gl.getShaderInfoLog(vShader);
			if (es !== "") {
				console.warn(gl.getShaderSource(vShader));
				console.error(`v shader: ${es}`);
			}
			es = gl.getShaderInfoLog(fShader);
			if (es !== "") {
				console.warn(gl.getShaderSource(fShader));
				console.error(`f shader: ${es}`);
			}

			this.program = null;
			return;
		}
		this.attributes = {};
		this.uniforms = {};
		var count = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
		for (let i = 0; i < count; i++) {
			let name = gl.getActiveAttrib(this.program, i).name;
			this.attributes[name] = gl.getAttribLocation(this.program, name);
		}
		count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
		for (let i = 0; i < count; i++) {
			let name = gl.getActiveUniform(this.program, i).name;
			this.uniforms[name] = gl.getUniformLocation(this.program, name);
		}
	}
	GLProgram.prototype.useProgram = function () {
		gl.useProgram(this.program);
		this.onSetProperties(gl);
	}

	GLProgram.prototype.onSetProperties=function(gl){

	}
	GLProgram.compileShader = function (type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		//         if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
		//             const es="CompileShader Error: " + gl.getShaderInfoLog(shader);
		//             console.log("shader source:\n",source);
		//             console.error(es);
		//             gl.deleteShader(shader);
		//             return null;
		//         }
		return shader;
	}
	GLProgram.compileVShader = function (vSource) {
		return GLProgram.compileShader(gl.VERTEX_SHADER, vSource);
	}
	GLProgram.compileFShader = function (fSource) {
		return GLProgram.compileShader(gl.FRAGMENT_SHADER, fSource);
	}
	return GLProgram;
}

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

function GLTexture(gl, img) {
	if (!(this instanceof GLTexture))
		throw new Error("Please use new GLTexture to create the instance!");
	const tex = gl.createTexture();
	const level = 0;
	const internalFormat = gl.RGBA;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;

	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, new Uint8Array([0, 0, 0, 255]));

	img.onload = (e) => {
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, img.width, img.height, border, srcFormat, srcType, img);
		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
	}

	this.tex = tex;
}

function attrBuffer(gl) {
	const types = {};
	types[gl.BYTE] = Int8Array;
	types[gl.UNSIGNED_BYTE] = Uint8Array;
	types[gl.SHORT] = Int16Array;
	types[gl.UNSIGNED_SHORT] = Uint16Array;
	types[gl.HALF_FLOAT] = Float32Array;
	types[gl.FLOAT] = Float32Array;
	const byteLens = {};
	byteLens[gl.BYTE] = 8;
	byteLens[gl.UNSIGNED_BYTE] = 8;
	byteLens[gl.SHORT] = 16;
	byteLens[gl.UNSIGNED_SHORT] = 16;
	byteLens[gl.HALF_FLOAT] = 16;
	byteLens[gl.FLOAT] = 32;

	function AttrBuffer(arr, dataType, target = gl.ARRAY_BUFFER, onePointSize = 1, offset = 0, usage = gl.STATIC_DRAW) {
		if (!(this instanceof AttrBuffer))
			throw new Error("Please use new AttrBuffer to create the instance!");
		this.buffer = gl.createBuffer();
		//数组长度
		this.length = arr.length;
		//单个元素数据长度: 1 | 2 | 3 | 4
		this.size = onePointSize;
		//数据类型
		this.type = dataType;
		//元素个数
		this.count = Math.floor(this.length / this.size);
		//绑定缓冲位置：gl.ARRAY_BUFFER | gl.ELEMENT_ARRAY_BUFFER
		this.target = target;
		//数据偏移
		this.offset = offset * byteLens[dataType];
		//gl.STATIC_DRAW, gl.DYNAMIC_DRAW, gl.STREAM_DRAW
		this.usage = usage;
		this.data = new types[dataType](arr);
		gl.bindBuffer(target, this.buffer);
		gl.bufferData(target, this.data, this.usage);
	}
	AttrBuffer.prototype.updateBufData = function () {
		gl.bindBuffer(this.target, this.buffer);
		gl.bufferData(this.target, this.data, this.usage);
	}

	return AttrBuffer;
}

/**
 * 
 * @param {Object} points {vertices:[],normals:[],triangles:[]}
 */
function createVAO(gl, points){
	const vao = gl.createVertexArray();
	const vbos = [];
	gl.bindVertexArray(vao);
	var vbo = gl.createBuffer();
	vbos.push(vbo);
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, points.vertices, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    if(points.normals){
        vbo = gl.createBuffer();
		vbos.push(vbo);
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, points.normals, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, true, 0, 0);	
    }
	

    if(points.triangles){
        vbo = gl.createBuffer();
	    vbos.push(vbo);
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, points.triangles, gl.STATIC_DRAW);	
    }	

	gl.bindVertexArray(null);

	points["vao"] = vao;
	points["vbos"] = vbos;
    points["releaseVAO"]=()=>_releaseVAO.call(points,gl);
	return points;
}

function _releaseVAO(gl){
	gl.deleteVertexArray(this.vao);
	for (let i = 0; i < this.vbos.length; i++) {
		gl.deleteBuffer(this.vbos[i]);
	}
}