export default class MyTexture extends WebGLTexture {
    constructor() {
        console.assert(false, "please use MyTexture.create!");
    }

    /**
     * @param {WebGL2RenderingContext} gl 
     * @param {number} target gl.TEXTURE_2D
     */
    _init(gl, target) {
        /**@type {WebGL2RenderingContext}*/
        this.gl = gl;
        this.target = target;
    }

    /**
     * @param {number} level 0
     * @param {number} internalformat gl.RGBA
     * @param {number} format gl.RGBA
     * @param {number} type gl.UNSIGNED_BYTE
     * @param {HTMLImageElement} img 
     */
    loadFromImg(level, internalformat, format, type, img, genMipmap = true) {
        const gl = this.gl;
        gl.bindTexture(this.target, this);
        gl.texImage2D(this.target, level, internalformat, format, type, img);
        if (genMipmap) {
            gl.generateMipmap(this.target);
        }

    }

    /**
     * @param {number} level 0
     * @param {number} internalformat gl.RGBA
     * @param {number} width 
     * @param {number} height 
     * @param {number} format gl.RGBA
     * @param {number} type gl.UNSIGNED_BYTE
     * @param {ArrayBufferView|null} buffer 
     */
    loadFromBuffer(level, internalformat, width, height, format, type, buffer, genMipmap = true) {
        const gl = this.gl;
        gl.bindTexture(this.target, this);
        gl.texImage2D(this.target, level, internalformat, width, height, 0, format, type, buffer);
        if (genMipmap) {
            gl.generateMipmap(this.target);
        }
    }

    /**
     * @param {number} unit gl.TEXTURE0
     */
    activeAndBind(unit) {
        this.gl.activeTexture(unit);
        this.gl.bindTexture(this.target, this);
    }
}

/**
 * @param {WebGLTexture} texture 
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
 * @param {number} target gl.TEXTURE_2D
 * @returns {MyTexture}
 */
MyTexture.decorate = function (texture, gl, target) {
    Object.setPrototypeOf(texture, MyTexture.prototype);
    texture._init(gl, target);
    return texture;
}

/**
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
 * @param {number} target gl.TEXTURE_2D
 * @returns {MyTexture}
 */
MyTexture.create = function (gl, target) {
    return MyTexture.decorate(gl.createTexture(), gl, target);
}

MyTexture.Sampler = class {
    /**     
     * @param {WebGL2RenderingContext} gl      
     * @param {number} minFilter gl.LINEAR_MIPMAP_LINEAR
     * @param {number} magFilter gl.LINEAR
     */
    constructor(gl, minFilter, magFilter) {
        /**@type {WebGL2RenderingContext}*/
        this.gl = gl;
        /**@type {WebGLSampler}*/
        this.smp = gl.createSampler();
        gl.samplerParameteri(this.smp, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.samplerParameteri(this.smp, gl.TEXTURE_MAG_FILTER, magFilter);
    }

    /**
     * @param {number} wraps gl.CLAMP_TO_EDGE
     * @param {number} wrapt gl.CLAMP_TO_EDGE
     */
    wrapST(wraps, wrapt) {
        this.gl.samplerParameteri(this.smp, this.gl.TEXTURE_WRAP_S, wraps);
        this.gl.samplerParameteri(this.smp, this.gl.TEXTURE_WRAP_T, wrapt);
    }

    /**
     * @param {number} unit 0 1 2
     */
    bind(unit) {
        this.gl.bindSampler(unit, this.smp);
    }
}

// MyTexture.TexCube = class extends MyTexture {
//     /**     
//      * @param {WebGL2RenderingContext} gl 
//      */
//     constructor(gl) {
//         super(gl);
//         this.target = gl.TEXTURE_CUBE_MAP;
//     }
// }

