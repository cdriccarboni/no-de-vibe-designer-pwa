/**
 * Exécution réelle des agents déjà prouvés.
 * Python et JavaScript ne restent actifs que si 6*7 vaut 42.
 * Le shader n'est un succès que si Chrome compile et lit un pixel.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function probeFortyTwo() {
  const python = spawnSync("python3", ["-c", "print(6*7)"], { encoding: "utf8" });
  const javascript = spawnSync(process.execPath, ["-e", "console.log(6*7)"], { encoding: "utf8" });
  return {
    python: python.stdout.trim() === "42" ? 42 : null,
    javascript: javascript.stdout.trim() === "42" ? 42 : null
  };
}

export function compileWaveWithChrome(source, previewPath) {
  if (!fs.existsSync(CHROME)) {
    return { compile: false, observed: false, error: "Chrome absent" };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-wave-"));
  const htmlPath = path.join(dir, "wave.html");
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}canvas{display:block}</style><canvas id="c" width="320" height="180"></canvas><pre id="out"></pre><script>
const frag = ${JSON.stringify(source.fragment)};
const vert = ${JSON.stringify(source.vertex)};
const canvas = document.getElementById("c");
const out = document.getElementById("out");
const gl = canvas.getContext("webgl2");
if (!gl) { out.textContent = "COMPILE false NO_GL"; }
else {
  const make = (type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return gl.getShaderInfoLog(shader) || "compile";
    return shader;
  };
  const vs = make(gl.VERTEX_SHADER, vert);
  const fs = make(gl.FRAGMENT_SHADER, frag);
  if (typeof vs !== "object" || typeof fs !== "object") {
    out.textContent = "COMPILE false " + [vs, fs].filter(x => typeof x === "string").join(" ");
  } else {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      out.textContent = "COMPILE false " + (gl.getProgramInfoLog(program) || "link");
    } else {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const pixels = new Uint8Array([
        220,40,40,255, 40,180,60,255,
        40,80,220,255, 230,200,40,255
      ]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const set = (name, value) => {
        const slot = gl.getUniformLocation(program, name);
        if (slot) gl.uniform1f(slot, value);
      };
      set("u_amplitude", 0.08);
      set("u_frequency", 6);
      set("u_speed", 1.2);
      set("u_phase", 0.4);
      set("u_time", 1);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const pixel = new Uint8Array(4);
      gl.readPixels(160, 90, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      out.textContent = "COMPILE true PIXEL " + Array.from(pixel).join(",");
    }
  }
}
</script>`;
  fs.writeFileSync(htmlPath, html);
  fs.mkdirSync(path.dirname(previewPath), { recursive: true });
  const ran = spawnSync(CHROME, [
    "--headless=new",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--virtual-time-budget=4000",
    "--hide-scrollbars",
    `--screenshot=${previewPath}`,
    "--window-size=320,180",
    "--dump-dom",
    `file://${htmlPath}`
  ], { encoding: "utf8", timeout: 30000 });
  const text = `${ran.stdout || ""}\n${ran.stderr || ""}`;
  const matched = text.match(/COMPILE true PIXEL (\d+),(\d+),(\d+),(\d+)/);
  if (!matched) {
    const reason = (text.match(/COMPILE false[^\n<]*/)?.[0] || ran.error?.message || "compilation non observée").slice(0, 300);
    return { compile: false, observed: false, error: reason, preview: "" };
  }
  const pixel = matched.slice(1, 5).map(Number);
  const preview = fs.existsSync(previewPath) && fs.statSync(previewPath).size > 0 ? previewPath : "";
  return { compile: true, observed: true, pixel, preview, error: "" };
}
