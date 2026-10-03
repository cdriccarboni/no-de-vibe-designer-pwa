/**
 * Sondes réelles des agents sur ce Mac. N'installe rien.
 * DISPONIBLE seulement si le programme tourne et renvoie une valeur.
 */
import { spawn } from "node:child_process";
import dgram from "node:dgram";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dspChecksum, registryFromProbes } from "../shared/agent-registry.js";
import { compileWaveWithChrome } from "./agent-runners.mjs";
import { waveShaderSource } from "../shared/shader-agent.js";
import { encodeOscMessage, decodeOscMessage } from "../shared/protocols/osc.js";
import { encodeArtNetChannel } from "../shared/protocols/artnet.js";
import { encodeSacnChannel, sacnMulticastAddress } from "../shared/protocols/sacn.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function run(cmd, args, { timeout = 20000, cwd } = {}) {
  return new Promise(resolve => {
    let settled = false;
    let timer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    let child;
    try {
      child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      finish({ ok: false, status: null, stdout: "", stderr: "", error: error.message });
      return;
    }
    let stdout = "";
    let stderr = "";
    timer = setTimeout(() => { child.kill("SIGKILL"); }, timeout);
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      finish({ ok: false, status: null, stdout: stdout.trim(), stderr: stderr.trim(), error: error.message });
    });
    child.on("close", status => {
      const killed = status === null || status === 137 || status === 9;
      finish({
        ok: status === 0,
        status,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: status === 0 ? "" : (killed && !stdout ? "timeout" : "")
      });
    });
  });
}

function firstLine(text) {
  return String(text || "").split(/\r?\n/).map(line => line.trim()).find(Boolean) || "";
}

function incompatible(text) {
  return /bad cpu type|incompatible architecture|not a mach-o|wrong architecture/i.test(String(text || ""));
}

function failed(ran, lastTest) {
  const blob = `${ran.stderr || ""}\n${ran.stdout || ""}\n${ran.error || ""}`;
  return {
    status: incompatible(blob) ? "NON DISPONIBLE" : "ÉCHEC",
    version: "",
    lastTest,
    error: firstLine(ran.stderr || ran.stdout || ran.error || "échec"),
    value: null
  };
}

function loopback(packet) {
  return new Promise(resolve => {
    const socket = dgram.createSocket("udp4");
    const timer = setTimeout(() => {
      socket.close();
      resolve({ ok: false, error: "timeout" });
    }, 1000);
    socket.on("error", error => {
      clearTimeout(timer);
      try { socket.close(); } catch { /* already closed */ }
      resolve({ ok: false, error: error.message });
    });
    socket.on("message", msg => {
      clearTimeout(timer);
      try { socket.close(); } catch { /* already closed */ }
      resolve({ ok: true, msg: Buffer.from(msg) });
    });
    socket.bind(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.send(Buffer.from(packet), port, "127.0.0.1");
    });
  });
}

async function probeValue(cmd, args, lastTest, { timeout = 8000, expect = "42", versionArgs = ["--version"] } = {}) {
  const ran = await run(cmd, args, { timeout });
  if (ran.error === "ENOENT" || /ENOENT|not found/i.test(ran.error)) {
    return { status: "ÉCHEC", version: "", lastTest, error: ran.error || "absent", value: null };
  }
  if (!ran.ok || ran.stdout !== expect) return failed(ran, lastTest);
  let version = "";
  if (versionArgs) {
    const ver = await run(cmd, versionArgs, { timeout: 4000 });
    version = firstLine(ver.stdout || ver.stderr);
  }
  return { status: "VALIDÉ", version, lastTest, error: "", value: Number(expect) };
}

async function compileAndRun(compiler, sourceName, source, outName, lastTest) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-agent-"));
  const sourcePath = path.join(dir, sourceName);
  const outPath = path.join(dir, outName);
  fs.writeFileSync(sourcePath, source);
  const compiled = await run(compiler, [sourcePath, "-o", outPath], { timeout: 20000 });
  if (!compiled.ok) return failed(compiled, lastTest);
  const ran = await run(outPath, [], { timeout: 8000 });
  if (!ran.ok || ran.stdout !== "42") return failed(ran, lastTest);
  const ver = await run(compiler, ["--version"], { timeout: 4000 });
  return { status: "VALIDÉ", version: firstLine(ver.stdout || ver.stderr), lastTest, error: "", value: 42 };
}

async function probeLanguages() {
  const patches = {};
  const nodeTest = `${process.execPath} -e "console.log(42)"`;
  const node = await probeValue(process.execPath, ["-e", "console.log(42)"], nodeTest, { versionArgs: ["-v"] });
  patches.node = node;
  patches.javascript = { ...node, lastTest: nodeTest };
  const pyTest = "python3 -c 'print(42)'";
  patches.python = await probeValue("python3", ["-c", "print(42)"], pyTest, { versionArgs: ["--version"] });

  const tsc = path.join(root, "node_modules", ".bin", "tsc");
  const tsTest = "tsc --strict add.ts && node add.js";
  if (!fs.existsSync(tsc)) {
    patches.typescript = { status: "ÉCHEC", version: "", lastTest: tsTest, error: "tsc absent", value: null };
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-ts-"));
    fs.writeFileSync(path.join(dir, "add.ts"), "const value: number = 21 + 21;\nconsole.log(value);\n");
    const compiled = await run(tsc, ["--strict", "--target", "es2022", "--module", "nodenext", "--moduleResolution", "nodenext", "add.ts"], { cwd: dir, timeout: 20000 });
    const ver = await run(tsc, ["--version"], { timeout: 8000 });
    if (!compiled.ok) {
      patches.typescript = failed(compiled, tsTest);
    } else {
      const ran = await run(process.execPath, ["add.js"], { cwd: dir, timeout: 8000 });
      patches.typescript = ran.ok && ran.stdout === "42"
        ? { status: "VALIDÉ", version: firstLine(ver.stdout || ver.stderr), lastTest: tsTest, error: "", value: 42 }
        : failed(ran, tsTest);
    }
  }

  const javaTest = "java -version";
  const java = await run("java", ["-version"], { timeout: 5000 });
  const blob = `${java.stderr}\n${java.stdout}\n${java.error}`;
  if (!java.ok || /unable to locate a java runtime/i.test(blob)) {
    patches.java = { status: "ÉCHEC", version: "", lastTest: javaTest, error: firstLine(java.stderr || java.stdout || java.error || "runtime absent"), value: null };
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-java-"));
    fs.writeFileSync(path.join(dir, "Nvd42.java"), "public class Nvd42 { public static void main(String[] args) { System.out.println(42); } }\n");
    const compiled = await run("javac", ["Nvd42.java"], { cwd: dir, timeout: 20000 });
    const ran = compiled.ok ? await run("java", ["Nvd42"], { cwd: dir, timeout: 8000 }) : compiled;
    const last = "javac Nvd42.java && java Nvd42";
    patches.java = ran.ok && ran.stdout === "42"
      ? { status: "VALIDÉ", version: firstLine(java.stderr || java.stdout), lastTest: last, error: "", value: 42 }
      : failed(ran, last);
  }
  return patches;
}

async function probeNative() {
  const patches = {};
  patches.c = await compileAndRun("clang", "add.c", "#include <stdio.h>\nint main(void){printf(\"%d\\n\", 42);return 0;}\n", "addc", "clang add.c && ./addc");
  patches.cpp = await compileAndRun("clang++", "add.cpp", "#include <iostream>\nint main(){std::cout<<42<<std::endl;return 0;}\n", "addcpp", "clang++ add.cpp && ./addcpp");
  const rust = await run("rustc", ["--version"], { timeout: 4000 });
  patches.rust = rust.ok
    ? await compileAndRun("rustc", "add.rs", "fn main(){println!(\"{}\", 42);}\n", "addrust", "rustc add.rs && ./addrust")
    : { status: "ÉCHEC", version: "", lastTest: "rustc --version", error: firstLine(rust.stderr || rust.error || "rustc absent"), value: null };

  const swiftTest = "swiftc add.swift && ./addswift";
  patches.swift = await compileAndRun("swiftc", "add.swift", "print(42)\n", "addswift", swiftTest);

  const metalSource = `import Metal
let device = MTLCreateSystemDefaultDevice()
guard let device else { fputs("NO_DEVICE\\n", stderr); exit(2) }
let src = """
#include <metal_stdlib>
using namespace metal;
kernel void add42(device int *out [[buffer(0)]], uint id [[thread_position_in_grid]]) {
  if (id == 0) { *out = 20 + 22; }
}
"""
do {
  let lib = try device.makeLibrary(source: src, options: nil)
  guard let fn = lib.makeFunction(name: "add42") else { throw NSError(domain: "metal", code: 1) }
  let pipe = try device.makeComputePipelineState(function: fn)
  guard let buffer = device.makeBuffer(length: 4, options: .storageModeShared),
        let queue = device.makeCommandQueue(),
        let cmd = queue.makeCommandBuffer(),
        let enc = cmd.makeComputeCommandEncoder() else { throw NSError(domain: "metal", code: 2) }
  enc.setComputePipelineState(pipe)
  enc.setBuffer(buffer, offset: 0, index: 0)
  enc.dispatchThreads(MTLSize(width: 1, height: 1, depth: 1), threadsPerThreadgroup: MTLSize(width: 1, height: 1, depth: 1))
  enc.endEncoding()
  cmd.commit()
  cmd.waitUntilCompleted()
  let value = buffer.contents().bindMemory(to: Int32.self, capacity: 1).pointee
  print("METAL \\(device.name) \\(value)")
} catch {
  fputs("\\(error)\\n", stderr)
  print("METAL_DEVICE \\(device.name)")
  exit(3)
}
`;
  const metalTest = "swiftc metal.swift && ./metal";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-metal-"));
  fs.writeFileSync(path.join(dir, "metal.swift"), metalSource);
  const compiled = await run("swiftc", ["metal.swift", "-o", "metal"], { cwd: dir, timeout: 30000 });
  if (!compiled.ok) {
    patches.metal = failed(compiled, metalTest);
  } else {
    const ran = await run(path.join(dir, "metal"), [], { timeout: 15000 });
    const matched = ran.stdout.match(/^METAL (.+) (\d+)$/);
    if (ran.ok && matched && matched[2] === "42") {
      patches.metal = { status: "VALIDÉ PARTIELLEMENT", version: matched[1], lastTest: metalTest, error: "calcul 42 observé, le patch ne route pas Metal", value: 42 };
    } else if (/^METAL_DEVICE /.test(ran.stdout)) {
      patches.metal = { status: "VALIDÉ PARTIELLEMENT", version: ran.stdout.replace(/^METAL_DEVICE /, ""), lastTest: metalTest, error: firstLine(ran.stderr || "calcul non terminé"), value: null };
    } else {
      patches.metal = failed(ran, metalTest);
    }
  }

  const midiTest = "swiftc midi.swift && ./midi";
  const midiSource = `import CoreMIDI
import Foundation
var client = MIDIClientRef()
let created = MIDIClientCreate("nvd-probe" as CFString, nil, nil, &client)
if created != noErr {
  fputs("MIDI_FAIL \\(created)\\n", stderr)
  exit(1)
}
final class Box: @unchecked Sendable { var value = 0 }
let box = Box()
var dest = MIDIEndpointRef()
let destStatus = MIDIDestinationCreateWithBlock(client, "nvd-in" as CFString, &dest) { packetList, _ in
  let packet = packetList.pointee.packet
  if packet.length >= 3 && packet.data.2 == 42 { box.value = 42 }
}
var port = MIDIPortRef()
let portStatus = MIDIOutputPortCreate(client, "nvd-port" as CFString, &port)
if destStatus == noErr && portStatus == noErr {
  var packet = MIDIPacket()
  packet.timeStamp = 0
  packet.length = 3
  packet.data.0 = 0x90
  packet.data.1 = 60
  packet.data.2 = 42
  var list = MIDIPacketList(numPackets: 1, packet: packet)
  MIDISend(port, dest, &list)
  Thread.sleep(forTimeInterval: 0.3)
  print("MIDI \\(box.value)")
} else {
  print("MIDI_API \\(MIDIGetNumberOfDestinations())")
}
`;
  const midiDir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-midi-"));
  fs.writeFileSync(path.join(midiDir, "midi.swift"), midiSource);
  const midiCompiled = await run("swiftc", ["midi.swift", "-o", "midi"], { cwd: midiDir, timeout: 30000 });
  if (!midiCompiled.ok) {
    patches.midi = failed(midiCompiled, midiTest);
  } else {
    const ran = await run(path.join(midiDir, "midi"), [], { timeout: 8000 });
    if (ran.ok && ran.stdout === "MIDI 42") {
      patches.midi = { status: "VALIDÉ PARTIELLEMENT", version: "CoreMIDI", lastTest: midiTest, error: "boucle virtuelle 42, aucun contrôleur externe", value: 42 };
    } else if (/^MIDI_API /.test(ran.stdout)) {
      patches.midi = { status: "VALIDÉ PARTIELLEMENT", version: "CoreMIDI", lastTest: midiTest, error: "client créé, message non reçu", value: null };
    } else {
      patches.midi = failed(ran, midiTest);
    }
  }

  const dspTest = "swiftc dsp.swift && ./dsp";
  const dspSource = `import AVFoundation
let engine = AVAudioEngine()
guard let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1) else {
  fputs("NO_FORMAT\\n", stderr); exit(2)
}
let source = AVAudioSourceNode { _, _, frameCount, audioBufferList -> OSStatus in
  let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
  let count = Int(frameCount)
  if let data = buffers[0].mData?.assumingMemoryBound(to: Float.self) {
    for i in 0..<count { data[i] = i == 0 ? 1 : 0 }
  }
  return noErr
}
engine.attach(source)
engine.connect(source, to: engine.mainMixerNode, format: format)
do {
  try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 64)
  try engine.start()
  guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 64) else { throw NSError(domain: "dsp", code: 1) }
  try engine.renderOffline(64, to: buffer)
  let sample = buffer.floatChannelData?[0][0] ?? -1
  print("DSP \\(sample)")
} catch {
  fputs("\\(error)\\n", stderr)
  exit(3)
}
`;
  const dspDir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-dsp-"));
  fs.writeFileSync(path.join(dspDir, "dsp.swift"), dspSource);
  const dspCompiled = await run("swiftc", ["dsp.swift", "-o", "dsp"], { cwd: dspDir, timeout: 30000 });
  const checksum = dspChecksum();
  const math = await run(process.execPath, ["-e", "let y=0,acc=0;for(let i=0;i<64;i++){const x=i===0?1:0;y+=0.25*(x-y);acc+=y}console.log(Math.round(acc*1000))"], { timeout: 4000 });
  if (dspCompiled.ok) {
    const ran = await run(path.join(dspDir, "dsp"), [], { timeout: 8000 });
    const matched = ran.stdout.match(/^DSP (\S+)/);
    if (ran.ok && matched && Number(matched[1]) > 0) {
      patches.dsp = { status: "VALIDÉ", version: "AVAudioEngine", lastTest: dspTest, error: "", value: Number(matched[1]) };
    } else if (math.ok && math.stdout === String(checksum)) {
      patches.dsp = { status: "VALIDÉ PARTIELLEMENT", version: "node", lastTest: "node checksum DSP ; " + dspTest, error: firstLine(ran.stderr || ran.error || "rendu audio absent"), value: null };
    } else {
      patches.dsp = failed(ran, dspTest);
    }
  } else if (math.ok && math.stdout === String(checksum)) {
    patches.dsp = { status: "VALIDÉ PARTIELLEMENT", version: "node", lastTest: "node checksum DSP", error: firstLine(dspCompiled.stderr || "AVAudioEngine non compilé"), value: null };
  } else {
    patches.dsp = failed(dspCompiled, dspTest);
  }
  return patches;
}

async function probeGraphics() {
  const patches = {};
  const glslTest = "Chrome headless WebGL2 compileShader + readPixels";
  if (!fs.existsSync(CHROME)) {
    const missing = { status: "ÉCHEC", version: "", lastTest: glslTest, error: "Chrome absent", value: null };
    patches.glsl = missing;
    patches.webgl = { ...missing };
  } else {
    const preview = path.join(os.tmpdir(), "nvd-registry-wave.png");
    const wave = compileWaveWithChrome(waveShaderSource(), preview);
    if (wave.compile === true && wave.observed === true && Array.isArray(wave.pixel)) {
      const value = wave.pixel.join(",");
      const row = { status: "VALIDÉ", version: "WebGL 2.0", lastTest: glslTest, error: "", value };
      patches.glsl = row;
      patches.webgl = { ...row };
    } else {
      const row = { status: "ÉCHEC", version: "", lastTest: glslTest, error: wave.error || "compilation non observée", value: null };
      patches.glsl = row;
      patches.webgl = { ...row };
    }
  }

  const gpuTest = "Chrome headless navigator.gpu compute 20+22";
  if (!fs.existsSync(CHROME)) {
    const missing = { status: "ÉCHEC", version: "", lastTest: gpuTest, error: "Chrome absent", value: null };
    patches.webgpu = missing;
    patches.wgsl = { ...missing };
    return patches;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-webgpu-"));
  const htmlPath = path.join(dir, "gpu.html");
  fs.writeFileSync(htmlPath, `<!doctype html><pre id="out">pending</pre><script type="module">
const out = document.getElementById("out");
try {
  if (!navigator.gpu) { out.textContent = "RESULT false no-gpu"; }
  else {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { out.textContent = "RESULT false no-adapter"; }
    else {
      const device = await adapter.requestDevice();
      const code = \`@group(0) @binding(0) var<storage, read_write> result: i32;
@compute @workgroup_size(1) fn main() { result = 20 + 22; }\`;
      const module = device.createShaderModule({ code });
      const info = await module.getCompilationInfo();
      const errors = info.messages.filter(item => item.type === "error").map(item => item.message);
      if (errors.length) { out.textContent = "RESULT false " + errors.join(" "); }
      else {
        const pipeline = device.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "main" } });
        const buffer = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
        const read = device.createBuffer({ size: 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer } }] });
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind);
        pass.dispatchWorkgroups(1);
        pass.end();
        encoder.copyBufferToBuffer(buffer, 0, read, 0, 4);
        device.queue.submit([encoder.finish()]);
        await read.mapAsync(GPUMapMode.READ);
        const value = new Int32Array(read.getMappedRange())[0];
        out.textContent = "RESULT true " + value + " " + (adapter.name || "");
      }
    }
  }
} catch (error) { out.textContent = "RESULT false " + (error && error.message || error); }
</script>`);
  const ran = await run(CHROME, [
    "--headless=new", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--enable-unsafe-webgpu", "--enable-features=Vulkan,UseSkiaRenderer",
    "--virtual-time-budget=8000", "--dump-dom", `file://${htmlPath}`
  ], { timeout: 30000 });
  const text = `${ran.stdout}\n${ran.stderr}`;
  const ok = text.match(/RESULT true (\d+) ([^\n<]*)/);
  const bad = text.match(/<pre id="out">RESULT false ([^<]+)/);
  if (ok && ok[1] === "42") {
    const version = (ok[2] || "WebGPU").trim();
    const row = { status: "VALIDÉ", version, lastTest: gpuTest, error: "", value: 42 };
    patches.webgpu = row;
    patches.wgsl = { ...row, lastTest: gpuTest };
  } else {
    const reason = (bad?.[1] || bad?.[2] || ran.error || "aucun calcul WebGPU").trim();
    const row = { status: "ÉCHEC", version: "", lastTest: gpuTest, error: reason.slice(0, 300), value: null };
    patches.webgpu = row;
    patches.wgsl = { ...row };
  }
  return patches;
}

async function probeMedia() {
  const patches = {};
  const ffmpeg = await run("ffmpeg", ["-version"], { timeout: 4000 });
  if (!ffmpeg.ok) {
    patches.ffmpeg = { status: "ÉCHEC", version: "", lastTest: "ffmpeg -version", error: firstLine(ffmpeg.stderr || ffmpeg.error || "ffmpeg absent"), value: null };
  } else {
    const ran = await run("ffmpeg", ["-hide_banner", "-f", "lavfi", "-i", "testsrc=s=16x16:d=0.04", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], { timeout: 8000 });
    patches.ffmpeg = ran.ok && ran.stdout.length > 0
      ? { status: "VALIDÉ", version: firstLine(ffmpeg.stdout), lastTest: "ffmpeg lavfi testsrc rawvideo", error: "", value: ran.stdout.length }
      : { status: "VALIDÉ PARTIELLEMENT", version: firstLine(ffmpeg.stdout), lastTest: "ffmpeg -version", error: firstLine(ran.stderr || ran.error || "image non produite"), value: null };
  }

  const cvTest = "python3 -c cv2.add 20+22";
  const cv = await run("python3", ["-c", "import cv2, numpy as np\na=np.array([[20]], dtype=np.uint8)\nb=np.array([[22]], dtype=np.uint8)\nprint(int(cv2.add(a,b)[0,0]))\nprint(cv2.__version__)"], { timeout: 8000 });
  if (cv.ok) {
    const lines = cv.stdout.split(/\r?\n/);
    patches.opencv = lines[0] === "42"
      ? { status: "VALIDÉ", version: lines[1] || "", lastTest: cvTest, error: "", value: 42 }
      : { status: "ÉCHEC", version: lines[1] || "", lastTest: cvTest, error: cv.stdout || "valeur absente", value: null };
  } else {
    patches.opencv = { status: "ÉCHEC", version: "", lastTest: cvTest, error: firstLine(cv.stderr || cv.error || "cv2 absent"), value: null };
  }

  const ndiLib = "/Library/SystemExtensions/DEE04047-DF1D-4A9B-A69F-F29323E7F8FE/com.newtek.Application-Mac-NDI-VirtualInput.Extension.systemextension/Contents/Frameworks/libndi_advanced.dylib";
  const found = [];
  const walk = dir => {
    if (found.length || !fs.existsSync(dir)) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (found.length) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !/node_modules|Caches/.test(full)) walk(full);
      else if (/libndi.*\.dylib$/.test(entry.name)) found.push(full);
    }
  };
  ["/Library/Application Support/NewTek", "/Library/NDI SDK for Apple", "/usr/local/lib"].forEach(walk);
  const lib = fs.existsSync(ndiLib) ? ndiLib : found[0];
  const ndiTest = "clang dlopen NDIlib_initialize + NDIlib_version";
  if (!lib) {
    patches.ndi = { status: "ÉCHEC", version: "", lastTest: ndiTest, error: "libndi introuvable", value: null };
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nvd-ndi-"));
    fs.writeFileSync(path.join(dir, "ndi.c"), `#include <dlfcn.h>\n#include <stdio.h>\nint main(void){\n  void *h = dlopen(${JSON.stringify(lib)}, RTLD_NOW);\n  if(!h){ fprintf(stderr, "%s\\n", dlerror()); return 1; }\n  int (*init)(void) = dlsym(h, "NDIlib_initialize");\n  const char *(*ver)(void) = dlsym(h, "NDIlib_version");\n  if(!init || !ver){ fprintf(stderr, "symboles absents\\n"); return 2; }\n  if(!init()){ fprintf(stderr, "initialize a échoué\\n"); return 3; }\n  const char *v = ver();\n  printf("%s\\n", v ? v : "");\n  return 0;\n}\n`);
    const compiled = await run("clang", ["ndi.c", "-o", "ndi", "-ldl"], { cwd: dir, timeout: 15000 });
    const ran = compiled.ok ? await run(path.join(dir, "ndi"), [], { timeout: 8000 }) : compiled;
    if (ran.ok && ran.stdout) {
      patches.ndi = { status: "VALIDÉ PARTIELLEMENT", version: firstLine(ran.stdout), lastTest: ndiTest, error: "bibliothèque initialisée ; le runtime du logiciel n'émet pas NDI", value: firstLine(ran.stdout) };
    } else {
      patches.ndi = failed(ran, ndiTest);
    }
  }

  const plist = "/Applications/TouchDesigner.app/Contents/Info.plist";
  const tdTest = "toeexpand fichier absent";
  let version = "";
  if (fs.existsSync(plist)) {
    const info = await run("defaults", ["read", plist, "CFBundleShortVersionString"], { timeout: 4000 });
    version = firstLine(info.stdout);
  }
  const toe = "/Applications/TouchDesigner.app/Contents/MacOS/toeexpand";
  if (!fs.existsSync(toe) && !version) {
    patches.touchdesigner = { status: "ÉCHEC", version: "", lastTest: tdTest, error: "TouchDesigner absent", value: null };
  } else if (fs.existsSync(toe)) {
    const ran = await run(toe, [path.join(os.tmpdir(), "nvd-missing.toe")], { timeout: 6000 });
    patches.touchdesigner = {
      status: "ÉCHEC",
      version,
      lastTest: tdTest,
      error: firstLine(ran.stderr || ran.stdout || ran.error || "exécution sans valeur"),
      value: null
    };
  } else {
    patches.touchdesigner = { status: "ÉCHEC", version, lastTest: "defaults read CFBundleShortVersionString", error: "version lue, programme non exécuté", value: null };
  }
  return patches;
}

async function probeProtocols() {
  const patches = {};
  const oscPacket = encodeOscMessage("/nvd", [{ type: "i", value: 42 }]);
  const osc = await loopback(oscPacket);
  let oscValue = null;
  if (osc.ok) {
    try { oscValue = decodeOscMessage(osc.msg).args[0]?.value; } catch { oscValue = null; }
  }
  const oscTest = "UDP 127.0.0.1 encodeOscMessage /nvd i 42";
  patches.osc = osc.ok && oscValue === 42
    ? { status: "VALIDÉ PARTIELLEMENT", version: "OSC 1.0", lastTest: oscTest, error: "boucle 127.0.0.1 a renvoyé 42, aucune console externe", value: 42 }
    : { status: osc.ok ? "NON DISPONIBLE" : "LIMITÉ", version: "OSC 1.0", lastTest: oscTest, error: osc.error || "valeur non relue", value: null };

  const artPacket = encodeArtNetChannel({ universe: 0, channel: 1, value: 42 });
  const art = await loopback(artPacket);
  const artTest = "UDP 127.0.0.1 encodeArtNetChannel 42";
  const artOk = art.ok && art.msg[18] === 42;
  patches.artnet = artOk
    ? { status: "VALIDÉ PARTIELLEMENT", version: "Art-Net 4", lastTest: artTest, error: "boucle 127.0.0.1 a renvoyé 42, aucune console externe", value: 42 }
    : { status: "ÉCHEC", version: "", lastTest: artTest, error: art.error || "paquet non relu", value: null };

  const sacnPacket = encodeSacnChannel({ universe: 1, channel: 1, value: 42 });
  const address = sacnMulticastAddress(1);
  const sacn = await loopback(sacnPacket);
  const sacnTest = `UDP 127.0.0.1 encodeSacnChannel 42 ; multicast ${address}`;
  const sacnOk = sacn.ok && sacn.msg[126] === 42 && address === "239.255.0.1";
  patches.sacn = sacnOk
    ? { status: "VALIDÉ PARTIELLEMENT", version: "E1.31", lastTest: sacnTest, error: "boucle 127.0.0.1 a renvoyé 42, aucune console externe", value: 42 }
    : { status: "ÉCHEC", version: "", lastTest: sacnTest, error: sacn.error || "paquet non relu", value: null };

  let devices = [];
  try { devices = fs.readdirSync("/dev").filter(name => /^cu\.(usb|wch|slab|ttyUSB)/i.test(name)); } catch { devices = []; }
  const dmxTest = "ls /dev/cu.usb*";
  patches.dmx = devices.length
    ? { status: "VALIDÉ PARTIELLEMENT", version: devices[0], lastTest: dmxTest, error: "interface vue, aucun univers DMX relu", value: null }
    : { status: "ÉCHEC", version: "", lastTest: dmxTest, error: "aucune interface DMX série", value: null };
  return patches;
}

async function probeRecorded(command, args, label) {
  const ran = await run(command, args, { timeout: 4000 });
  const seen = firstLine(ran.stdout || ran.stderr);
  return {
    status: "ÉCHEC",
    version: ran.ok ? seen : "",
    lastTest: `${command} ${args.join(" ")}`.trim(),
    error: ran.ok ? `${label} répond, aucun test fonctionnel validé` : firstLine(ran.stderr || ran.error || `${label} absent`),
    value: null,
    executable: false
  };
}

async function probeSecondary() {
  const patches = {};
  const apps = {
    godot: ["/Applications/Godot.app/Contents/MacOS/Godot", ["--version"]],
    unity: ["/Applications/Unity/Unity.app/Contents/MacOS/Unity", ["-version"]],
    unreal: ["/Users/Shared/Epic Games", ["-version"]],
    processing: ["/Applications/Processing.app/Contents/MacOS/Processing", ["--version"]]
  };
  for (const [id, [bin, args]] of Object.entries(apps)) {
    if (id === "unreal") {
      const present = fs.existsSync(bin);
      patches.unreal = { status: "ÉCHEC", version: "", lastTest: "UnrealEditor absent", error: present ? "dossier vu, éditeur non testé" : "UnrealEditor absent", value: null, executable: false };
      continue;
    }
    patches[id] = fs.existsSync(bin)
      ? await probeRecorded(bin, args, id)
      : { status: "ÉCHEC", version: "", lastTest: bin, error: "absent", value: null, executable: false };
  }
  for (const [id, command] of [["faust", "faust"], ["supercollider", "sclang"], ["puredata", "pd"], ["openframeworks", "openframeworks"], ["cinder", "cinder"], ["juce", "juce"]]) {
    const ran = await run(command, ["--version"], { timeout: 3000 });
    patches[id] = {
      status: "ÉCHEC",
      version: ran.ok ? firstLine(ran.stdout || ran.stderr) : "",
      lastTest: `${command} --version`,
      error: ran.ok ? "binaire vu, test fonctionnel non validé" : firstLine(ran.error || ran.stderr || "absent"),
      value: null,
      executable: false
    };
  }
  const p5 = await run(process.execPath, ["-e", "import('p5').then(()=>console.log('p5')).catch(error=>{console.error(error.message); process.exit(1)})"], { timeout: 8000 });
  patches.p5 = { status: "ÉCHEC", version: "", lastTest: "node import p5", error: p5.ok ? "module vu, aucun sketch exécuté" : firstLine(p5.stderr || p5.error || "p5 absent"), value: null, executable: false };

  const parallels = fs.existsSync("/Applications/Parallels Desktop.app");
  const utm = fs.existsSync("/Applications/UTM.app");
  const prl = await run("prlctl", ["list", "-a"], { timeout: 4000 });
  const windowsSeen = /windows/i.test(`${prl.stdout}\n${prl.stderr}`);
  patches.vvvv = {
    status: "NON DISPONIBLE",
    version: "",
    lastTest: parallels ? "prlctl list -a" : "Parallels Desktop absent",
    error: windowsSeen
      ? "Windows listé, vvvv/VL non exécuté"
      : `aucun Windows testé${utm ? " ; UTM présent" : ""}`,
    value: null,
    executable: false,
    windowsTested: false
  };
  return patches;
}

let cached = null;

export async function probeAgentRegistry({ refresh = false } = {}) {
  if (cached && !refresh) return cached;
  const [languages, native, graphics, media, protocols, secondary] = await Promise.all([
    probeLanguages(),
    probeNative(),
    probeGraphics(),
    probeMedia(),
    probeProtocols(),
    probeSecondary()
  ]);
  const osInfo = await run("sw_vers", ["-productVersion"], { timeout: 3000 });
  const probedAt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).format(new Date()).replace(" ", "T") + "+02:00";
  cached = registryFromProbes({ ...languages, ...native, ...graphics, ...media, ...protocols, ...secondary }, {
    probedAt,
    host: os.hostname(),
    os: `macOS ${firstLine(osInfo.stdout) || os.release()}`,
    arch: os.arch()
  });
  return cached;
}
