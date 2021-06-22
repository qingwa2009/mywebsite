'use strict';
import { round } from "./MyMath.js";

export default function MyMatrix(f32arr = new Float32Array([
	1, 0, 0, 0,//x
	0, 1, 0, 0,//y
	0, 0, 1, 0,//z
	0, 0, 0, 1,//o
])) {
	if (!(this instanceof MyMatrix))
		throw new Error("Please use new MyMatrix()!");
	this.data = f32arr;
}
Object.defineProperties(MyMatrix, {
	persperctiveMatrix: {
		/**
		 * 
		 * @param {number} fieldOfViewInRadians 视角弧度制
		 * @param {number} aspectRatio 宽高比
		 * @param {number} near 近平面
		 * @param {number} far 远平面
		 */
		value: function (fieldOfViewInRadians, aspectRatio, near, far) {
			var m = new MyMatrix(new Float32Array(16));
			var fov = 1.0 / Math.tan(fieldOfViewInRadians / 2);
			var rangeInv = 1 / (near - far);
			m.data[0] = fov / aspectRatio;
			m.data[5] = fov;
			m.data[10] = (near + far) * rangeInv;
			m.data[11] = -1;
			m.data[14] = near * far * rangeInv * 2;
			m.data[15] = 0;
			return m;
		}
	},

	multiply: {
		/**
		 * mm0*mm1
		 * @param {MyMatrix} mm0 变换矩阵
		 * @param {MyMatrix} mm1 原矩阵
		 */
		value: function (mm0, mm1) {
			const m0 = mm0.data;
			const m1 = mm1.data;
			const mm = new MyMatrix(new Float32Array(16));
			const m = mm.data;
			let a00 = m1[0], a01 = m1[4], a02 = m1[8], a03 = m1[12],
				a10 = m1[1], a11 = m1[5], a12 = m1[9], a13 = m1[13],
				a20 = m1[2], a21 = m1[6], a22 = m1[10], a23 = m1[14],
				a30 = m1[3], a31 = m1[7], a32 = m1[11], a33 = m1[15];

			let b0 = m0[0], b1 = m0[4], b2 = m0[8], b3 = m0[12];
			m[0] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
			m[4] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
			m[8] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
			m[12] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

			b0 = m0[1], b1 = m0[5], b2 = m0[9], b3 = m0[13];
			m[1] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
			m[5] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
			m[9] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
			m[13] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

			b0 = m0[2], b1 = m0[6], b2 = m0[10], b3 = m0[14];
			m[2] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
			m[6] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
			m[10] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
			m[14] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

			b0 = m0[3], b1 = m0[7], b2 = m0[11], b3 = m0[15];
			m[3] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
			m[7] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
			m[11] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
			m[15] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
			return mm;
		}
	}
});

MyMatrix.prototype.toString = function () {
	return `
	${round(this.data[0], 6)},	${round(this.data[4], 6)},	${round(this.data[8], 6)},	${tround(his.data[12], 6)}
	${round(this.data[1], 6)},	${round(this.data[5], 6)},	${round(this.data[9], 6)},	${tround(his.data[13], 6)}
	${round(this.data[2], 6)},	${round(this.data[6], 6)},	${tround(his.data[10], 6)},	${tround(his.data[14], 6)}
	${round(this.data[3], 6)},	${round(this.data[7], 6)},	${tround(his.data[11], 6)},	${tround(his.data[15], 6)}
	`;
}

/**
 * @returns	new;
 */
MyMatrix.prototype.inverse = function () {
	const m0 = this.data;
	let a00 = m0[0], a01 = m0[4], a02 = m0[8], a03 = m0[12],
		a10 = m0[1], a11 = m0[5], a12 = m0[9], a13 = m0[13],
		a20 = m0[2], a21 = m0[6], a22 = m0[10], a23 = m0[14],
		a30 = m0[3], a31 = m0[7], a32 = m0[11], a33 = m0[15];
	let b00 = a22 * a33 - a23 * a32,
		b01 = a21 * a33 - a23 * a31,
		b02 = a21 * a32 - a22 * a31,
		b03 = a20 * a33 - a23 * a30,
		b04 = a20 * a32 - a22 * a30,
		b05 = a20 * a31 - a21 * a30,

		c00 = a02 * a13 - a03 * a12,
		c01 = a01 * a13 - a03 * a11,
		c02 = a01 * a12 - a02 * a11,
		c03 = a00 * a13 - a03 * a10,
		c04 = a00 * a12 - a02 * a10,
		c05 = a00 * a11 - a01 * a10
		;
	let det = c05 * b00 - c04 * b01 + c03 * b02 + c02 * b03 - c01 * b04 + c00 * b05;
	if (!det) {
		return null;
	}
	det = 1.0 / det;
	const m = new Float32Array(16);
	m[0] = (a11 * b00 - a12 * b01 + a13 * b02) * det;
	m[1] = (a12 * b03 - a10 * b00 - a13 * b04) * det;
	m[2] = (a10 * b01 - a11 * b03 + a13 * b05) * det;
	m[3] = (a11 * b04 - a10 * b02 - a12 * b05) * det;

	m[4] = (a02 * b01 - a01 * b00 - a03 * b02) * det;
	m[5] = (a00 * b00 - a02 * b03 + a03 * b04) * det;
	m[6] = (a01 * b03 - a00 * b01 - a03 * b05) * det;
	m[7] = (a00 * b02 - a01 * b04 + a02 * b05) * det;

	m[8] = (a31 * c00 - a32 * c01 + a33 * c02) * det;
	m[9] = (a32 * c03 - a30 * c00 - a33 * c04) * det;
	m[10] = (a30 * c01 - a31 * c03 + a33 * c05) * det;
	m[11] = (a31 * c04 - a30 * c02 - a32 * c05) * det;

	m[12] = (a22 * c01 - a21 * c00 - a23 * c02) * det;
	m[13] = (a20 * c00 - a22 * c03 + a23 * c04) * det;
	m[14] = (a21 * c03 - a20 * c01 - a23 * c05) * det;
	m[15] = (a20 * c02 - a21 * c04 + a22 * c05) * det;
	return new MyMatrix(m);
}

/**
 * @returns	self;
 */
MyMatrix.prototype.translate = function (x, y, z) {
	const m = this.data;
	m[12] = x * m[0] + y * m[4] + z * m[8] + m[12];
	m[13] = x * m[1] + y * m[5] + z * m[9] + m[13];
	m[14] = x * m[2] + y * m[6] + z * m[10] + m[14];
	m[15] = x * m[3] + y * m[7] + z * m[11] + m[15];
	return this;
}
/**
 * @returns	self;
 */
MyMatrix.prototype.scale = function (x, y, z) {
	const m = this.data;
	m[0] *= x; m[4] *= y; m[8] *= z;
	m[1] *= x; m[5] *= y; m[9] *= z;
	m[2] *= x; m[6] *= y; m[10] *= z;
	m[3] *= x; m[7] *= y; m[11] *= z;
	return this;
}
/**
 * @returns	self;
 */
MyMatrix.prototype.rotateX = function (rad) {
	const m = this.data;
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	let a01 = m[4], a02 = m[8],
		a11 = m[5], a12 = m[9],
		a21 = m[6], a22 = m[10],
		a31 = m[7], a32 = m[11];
	m[4] = a01 * c + a02 * s;
	m[5] = a11 * c + a12 * s;
	m[6] = a21 * c + a22 * s;
	m[7] = a31 * c + a32 * s;
	m[8] = a02 * c - a01 * s;
	m[9] = a12 * c - a11 * s;
	m[10] = a22 * c - a21 * s;
	m[11] = a32 * c - a31 * s;
	return this;
}
/**
 * @returns	self;
 */
MyMatrix.prototype.rotateY = function (rad) {
	const m = this.data;
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	let a00 = m[0], a02 = m[8],
		a10 = m[1], a12 = m[9],
		a20 = m[2], a22 = m[10],
		a30 = m[3], a32 = m[11];
	m[0] = a00 * c - a02 * s;
	m[1] = a10 * c - a12 * s;
	m[2] = a20 * c - a22 * s;
	m[3] = a30 * c - a32 * s;
	m[8] = a00 * s + a02 * c;
	m[9] = a10 * s + a12 * c;
	m[10] = a20 * s + a22 * c;
	m[11] = a30 * s + a32 * c;
	return this;
}
/**
 * @returns	self;
 */
MyMatrix.prototype.rotateZ = function (rad) {
	const m = this.data;
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	let a00 = m[0], a01 = m[4],
		a10 = m[1], a11 = m[5],
		a20 = m[2], a21 = m[6],
		a30 = m[3], a31 = m[7];
	m[0] = a00 * c + a01 * s;
	m[1] = a10 * c + a11 * s;
	m[2] = a20 * c + a21 * s;
	m[3] = a30 * c + a31 * s;
	m[4] = a01 * c - a00 * s;
	m[5] = a11 * c - a10 * s;
	m[6] = a21 * c - a20 * s;
	m[7] = a31 * c - a30 * s;
	return this;
}
/**
 * @param{Float32Array} pivot 旋转的轴点
 * @param{Float32Array} axis 旋转的轴
 * @param{Float32Array} rad 旋转弧度
 * @param{Boolean} isWorld 是否世界坐标空间，默认是true
 * @returns	self;
 */
MyMatrix.prototype.rotateAround = function (pivot, axis, rad, isWorld = true) {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	const t = 1 - c;
	let x = axis[0], y = axis[1], z = axis[2];
	let d = 1 / Math.hypot(x, y, z);
	x *= d; y *= d; z *= d;
	let p0 = pivot[0], p1 = pivot[1], p2 = pivot[2];

	let xx = x * x, xy = x * y, xz = x * z, yy = y * y, yz = y * z, zz = z * z;

	let b00 = xx * t + c, b01 = xy * t - z * s, b02 = xz * t + y * s, b03 = p0 - p0 * b00 - p1 * b01 - p2 * b02,
		b10 = xy * t + z * s, b11 = yy * t + c, b12 = yz * t - x * s, b13 = p1 - p0 * b10 - p1 * b11 - p2 * b12,
		b20 = xz * t - y * s, b21 = yz * t + x * s, b22 = zz * t + c, b23 = p2 - p0 * b20 - p1 * b21 - p2 * b22;

	const m = this.data;
	if (isWorld) {
		let a00 = m[0], a10 = m[1], a20 = m[2], a30 = m[3];
		m[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
		m[1] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
		m[2] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;

		a00 = m[4], a10 = m[5], a20 = m[6], a30 = m[7];
		m[4] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
		m[5] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
		m[6] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;

		a00 = m[8], a10 = m[9], a20 = m[10], a30 = m[11];
		m[8] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
		m[9] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
		m[10] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;

		a00 = m[12], a10 = m[13], a20 = m[14], a30 = m[15];
		m[12] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
		m[13] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
		m[14] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;

	} else {
		let a00 = m[0], a01 = m[4], a02 = m[8];

		m[0] = a00 * b00 + a01 * b10 + a02 * b20;
		m[4] = a00 * b01 + a01 * b11 + a02 * b21;
		m[8] = a00 * b02 + a01 * b12 + a02 * b22;
		m[12] += a00 * b03 + a01 * b13 + a02 * b23;

		a00 = m[1], a01 = m[5], a02 = m[9];
		m[1] = a00 * b00 + a01 * b10 + a02 * b20;
		m[5] = a00 * b01 + a01 * b11 + a02 * b21;
		m[9] = a00 * b02 + a01 * b12 + a02 * b22;
		m[13] += a00 * b03 + a01 * b13 + a02 * b23;


		a00 = m[2], a01 = m[6], a02 = m[10];
		m[2] = a00 * b00 + a01 * b10 + a02 * b20;
		m[6] = a00 * b01 + a01 * b11 + a02 * b21;
		m[10] = a00 * b02 + a01 * b12 + a02 * b22;
		m[14] += a00 * b03 + a01 * b13 + a02 * b23;


		a00 = m[3], a01 = m[7], a02 = m[11];
		m[3] = a00 * b00 + a01 * b10 + a02 * b20;
		m[7] = a00 * b01 + a01 * b11 + a02 * b21;
		m[11] = a00 * b02 + a01 * b12 + a02 * b22;
		m[15] += a00 * b03 + a01 * b13 + a02 * b23;
	}
	return this;
}
/**
 * @param{Float32Array} vec 向量
 * @param offset 偏移，对于多个向量保存在一个一维数组可以设置偏移来指定向量
 * @returns{Float32Array} 新向量
 */
MyMatrix.prototype.multiplyVec = function (vec, offset = 0) {
	const m = this.data;
	const v = new Float32Array(4);
	let x = vec[offset], y = vec[offset + 1], z = vec[offset + 2];
	v[0] = x * m[0] + y * m[4] + z * m[8];
	v[1] = x * m[1] + y * m[5] + z * m[9];
	v[2] = x * m[2] + y * m[6] + z * m[10];
	v[4] = x * m[3] + y * m[7] + z * m[11];
	return v;
}
/**
 * @param{Float32Array} point 点
 * @param offset 偏移，对于多个点保存在一个一维数组可以设置偏移来指定点
 * @returns{Float32Array} 新点
 */
MyMatrix.prototype.multiplyPoint = function (point, offset = 0) {
	const m = this.data;
	const v = new Float32Array(4);
	let x = point[offset], y = point[offset + 1], z = point[offset + 2];
	v[0] = x * m[0] + y * m[4] + z * m[8] + m[12];
	v[1] = x * m[1] + y * m[5] + z * m[9] + m[13];
	v[2] = x * m[2] + y * m[6] + z * m[10] + m[14];
	v[3] = x * m[3] + y * m[7] + z * m[11] + m[15];
	return v;
}

Object.defineProperties(MyMatrix.prototype, {
	localPosition: {
		get: function () { return new Float32Array([this.data[12], this.data[13], this.data[14]]) },
		set: function (value) {
			this.data[12] = value[0];
			this.data[13] = value[1];
			this.data[14] = value[2];
		}
	},
	positionX: {
		get: function () { return this.data[12] },
		set: function (value) { this.data[12] = value }
	},
	positionY: {
		get: function () { return this.data[13] },
		set: function (value) { this.data[13] = value }
	},
	positionZ: {
		get: function () { return this.data[14] },
		set: function (value) { this.data[14] = value }
	},
	xAxis: {
		get: function () { return new Float32Array([this.data[0], this.data[1], this.data[2], this.data[3]]); }
	},
	yAxis: {
		get: function () { return new Float32Array([this.data[4], this.data[5], this.data[6], this.data[7]]); }
	},
	zAxis: {
		get: function () { return new Float32Array([this.data[8], this.data[9], this.data[10], this.data[11]]); }
	}

});