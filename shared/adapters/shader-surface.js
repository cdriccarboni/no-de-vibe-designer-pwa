const VERTEX = `attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
export const DEFAULT_FRAGMENT = `precision mediump float;uniform float u_time;uniform float u_intensity;uniform vec2 u_resolution;varying vec2 v_uv;void main(){vec2 uv=v_uv;float w=.5+.5*sin((uv.y*18.0)+(u_time*2.0)+sin(uv.x*8.0*u_intensity));vec3 a=vec3(.02,.08,.10),b=vec3(.10,.35,.42);gl_FragColor=vec4(mix(a,b,w*.45*u_intensity),.55);}`;

export class ShaderSurface {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.gl = this.canvas.getContext("webgl", { alpha: true, preserveDrawingBuffer: true });
    this.program = null;
    this.buffer = null;
    this.programs = new Map();
    this.currentFragment = "";
    if (this.gl) this.compile(DEFAULT_FRAGMENT);
  }

  compile(fragment, vertex = VERTEX) {
    const gl = this.gl;
    if (!gl) throw new Error("WebGL indisponible");
    const source = String(fragment || DEFAULT_FRAGMENT);
    const key = vertex + "\u0000" + source;
    const cached = this.programs.get(key);
    if (cached) {
      this.program = cached;
      this.currentFragment = source;
      return cached;
    }
    const make = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) || "GLSL invalide");
      }
      return s;
    };
    const vs = make(gl.VERTEX_SHADER, vertex);
    const fs = make(gl.FRAGMENT_SHADER, source);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) || "Link GLSL impossible");
    }
    this.program = p;
    this.currentFragment = source;
    this.programs.set(key, p);
    if (!this.buffer) {
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    }
    return p;
  }

  render(width, height, timeSeconds, { intensity = 1, fragment = "" } = {}) {
    const gl = this.gl;
    const wanted = String(fragment || DEFAULT_FRAGMENT);
    if (wanted !== this.currentFragment) this.compile(wanted);
    if (!gl || !this.program) return this.canvas;
    const d = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(width * d));
    this.canvas.height = Math.max(1, Math.round(height * d));
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const pos = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const ut = gl.getUniformLocation(this.program, "u_time");
    const ur = gl.getUniformLocation(this.program, "u_resolution");
    const ui = gl.getUniformLocation(this.program, "u_intensity");
    if (ut) gl.uniform1f(ut, timeSeconds);
    if (ur) gl.uniform2f(ur, this.canvas.width, this.canvas.height);
    if (ui) gl.uniform1f(ui, intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return this.canvas;
  }
}
