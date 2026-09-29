/**
 * Backend WebGL2. Sans contexte, les méthodes échouent explicitement.
 * Un backend WebGPU pourra exécuter le même graphe de passes plus tard.
 */

export const BLEND_MODES = ["normal", "add", "multiply", "screen"];

export class WebGL2Backend {
  constructor(gl) {
    this.gl = gl || null;
  }

  requireGl() {
    if (!this.gl) throw new Error("WebGL2 indisponible");
    return this.gl;
  }

  compile(fragmentSource, vertexSource) {
    const gl = this.requireGl();
    const vertex = vertexSource || `attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
    const make = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) || "GLSL invalide";
        gl.deleteShader(shader);
        throw new Error(log);
      }
      return shader;
    };
    const vs = make(gl.VERTEX_SHADER, vertex);
    const fs = make(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || "Link GLSL impossible";
      gl.deleteProgram(program);
      throw new Error(log);
    }
    return program;
  }

  createRenderTarget(width, height) {
    const gl = this.requireGl();
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width | 0, height | 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Framebuffer WebGL2 incomplet");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, framebuffer, width: width | 0, height: height | 0 };
  }

  /** Upload d’un raster RGBA vers une texture 2D (chemin GPU réel). */
  uploadPixels(target, pixels, width, height) {
    const gl = this.requireGl();
    if (!target?.texture) throw new Error("Cible texture absente");
    if (!pixels || pixels.length < width * height * 4) throw new Error("Pixels incomplets pour upload WebGL2");
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width | 0, height | 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return target;
  }

  applyBlend(mode) {
    const gl = this.requireGl();
    gl.enable(gl.BLEND);
    if (mode === "normal") gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    else if (mode === "add") gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    else if (mode === "multiply") gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    else if (mode === "screen") gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else throw new Error(`Blend inconnu : ${mode}`);
  }
}
