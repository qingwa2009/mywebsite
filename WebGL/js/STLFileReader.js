'use strict';

var readSTLFile = function (file) {
	return new Promise((resolve, reject) => {
		let fr = new FileReader();
		fr.readAsArrayBuffer(file);

		fr.onloadend = () => {
			let buf = fr.result;
			let dv = new DataView(buf, 80);
			const count = dv.getUint32(0, true);
			const vs = new Float32Array(count * 9);
			const ns = new Float32Array(count * 9);
			let boundary = new Float32Array(
				[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER,
				Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
			for (let i = 0, j = 0, k = 0, offset = 4; i < count; i++) {
				ns[j] = dv.getFloat32(offset, true);
				offset += 4;
				j++;

				ns[j] = dv.getFloat32(offset, true);
				offset += 4;
				j++;

				ns[j] = dv.getFloat32(offset, true);
				offset += 4;
				j++;

				ns[j] = ns[j - 3];
				j++;
				ns[j] = ns[j - 3];
				j++;
				ns[j] = ns[j - 3];
				j++;
				ns[j] = ns[j - 3];
				j++;
				ns[j] = ns[j - 3];
				j++;
				ns[j] = ns[j - 3];
				j++;

				for (let l = 0; l < 9; l++) {
					let v = dv.getFloat32(offset, true);
					vs[k] = v;
					let yu = k % 3;
					if (v < boundary[yu]) {
						boundary[yu] = v;
					}
					yu += 3;
					if (v > boundary[yu]) {
						boundary[yu] = v;
					}
					offset += 4;
					k++;
				}

				offset += 2;
			}

			resolve({ "count": count, "vertices": vs, "normals": ns, "boundary": boundary });
		};
	});
}
/**
 * 
 * @param {Blob} file stl文件
 * @param {WebGL2RenderingContext} gl 
 */
var createVAOFromSTLFile = function (file, gl) {
	return readSTLFile(file).then(
		points => {
			const vao = gl.createVertexArray();
			const vbos = [];
			gl.bindVertexArray(vao);
			var vbo = gl.createBuffer();
			vbos.push(vbo);
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, points.vertices, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
			vbo = gl.createBuffer();
			vbos.push(vbo);
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, points.normals, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(1);
			gl.vertexAttribPointer(1, 3, gl.FLOAT, true, 0, 0);
			gl.bindVertexArray(null);
			points["vao"] = vao;
			points["vbos"] = vbos;
			return points;
		}
	);
}

var releaseSTLVAO = function (stl, gl) {
	gl.deleteVertexArray(stl.vao);
	for (let i = 0; i < stl.vbos.length; i++) {
		gl.deleteBuffer(stl.vbos[i]);
	}
}