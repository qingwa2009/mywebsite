export default class MyGLProgram extends WebGLProgram {
    constructor() {
        console.assert(false, "please use MyGLProgram.Create!");
    }
    attachVertexShader() {

    }
    attachFragmentShader() {

    }
}

MyGLProgram.decorate = function (/**@type{WebGLProgram} */ program) {
    Object.setPrototypeOf(program, MyGLProgram.prototype);
    return program;
}

MyGLProgram.create = function (/**@type{WebGLRenderingContext|WebGL2RenderingContext} */ gl) {
    return MyGLProgram.decorate(gl.createProgram());
}