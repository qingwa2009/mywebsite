export default class MyGLProgram extends WebGLProgram {
    constructor() {
        console.assert(false, "please use MyGLProgram.create!");
    }

    /**
     * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
     */
    _init(gl) {
        this.gl = gl;
        /** @type{Object<string, WebGLUniformLocation>} */
        this.uniforms = {};
        /** @type{Object<string, WebGLActiveInfo} */
        this.uniformInfos = {};
    }

    /**
     * @param {MyGLProgram.VShader} vShader 
     * @param {MyGLProgram.FShader} fShader 
     */
    link(vShader, fShader) {
        this.vShader = vShader;
        this.fShader = fShader;

        this.gl.attachShader(this, vShader);
        this.gl.attachShader(this, fShader);
        vShader.compile();
        fShader.compile();

        this.gl.linkProgram(this);
        if (!this.gl.getProgramParameter(this, this.gl.LINK_STATUS)) {
            console.error("program link error: ", this.gl.getProgramInfoLog(this));
            const vInfo = this.gl.getShaderInfoLog(vShader);
            if (vInfo) console.error("vShader error: ", vInfo);
            const fInfo = this.gl.getShaderInfoLog(fShader);
            if (fInfo) console.error("fShader error: ", fInfo);
            return false;
        }

        this._getAllUniforms();
        return true;
    }


    _getAllUniforms() {
        const uniformCounts = this.gl.getProgramParameter(this, this.gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCounts; i++) {
            const info = this.gl.getActiveUniform(this, i);
            this.uniformInfos[info.name] = info;
            this.uniforms[info.name] = this.gl.getUniformLocation(this, info.name);
        }
    }


    use() {
        this.gl.useProgram(this);
    }

    delete() {
        this.gl.deleteProgram(this);
        if (this.vShader) this.vShader.delete();
        if (this.fShader) this.fShader.delete();
        this.gl = null;
    }
}

/**
 * @param {WebGLProgram} program 
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
 * @returns {MyGLProgram}
 */
MyGLProgram.decorate = function (program, gl) {
    Object.setPrototypeOf(program, MyGLProgram.prototype);
    program._init(gl);
    return program;
}

/**
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
 * @returns {MyGLProgram}
 */
MyGLProgram.create = function (gl) {
    return MyGLProgram.decorate(gl.createProgram(), gl);
}

MyGLProgram.Shader = class extends WebGLShader {
    constructor() {
        console.assert(false, "please use MyGLProgram.VShader.create!");
    }

    /**
     * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
     * @param {string} src 
     */
    _init(gl, src) {
        this.gl = gl;
        this.src = src;
        gl.shaderSource(this, src);
        this._isCompiled = false;
    }
    compile() {
        if (this._isCompiled) return;
        this.gl.compileShader(this);
        this._isCompiled = true;
    }
    delete() {
        this.gl.deleteShader(this);
        this.gl = null;
    }
}

MyGLProgram.VShader = class extends MyGLProgram.Shader { }
/**
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
 * @param {string} src 
 * @returns {MyGLProgram.VShader}
 */
MyGLProgram.VShader.create = function (gl, src) {
    const shader = gl.createShader(gl.VERTEX_SHADER);
    Object.setPrototypeOf(shader, MyGLProgram.VShader.prototype);
    shader._init(gl, src);
    return shader;
}

MyGLProgram.FShader = class extends MyGLProgram.Shader { }
/**
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl 
 * @param {string} src 
 * @returns {MyGLProgram.FShader}
 */
MyGLProgram.FShader.create = function (gl, src) {
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    Object.setPrototypeOf(shader, MyGLProgram.FShader.prototype);
    shader._init(gl, src);
    return shader;
}