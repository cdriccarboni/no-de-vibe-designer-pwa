import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EngineId, ConsoleLog, ExecutionStats } from '../types/engine';
import { transpileTypeScript, parseISF } from '../services/adapters';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Terminal,
} from 'lucide-react';

interface PreviewPanelProps {
  engineId: EngineId;
  code: string;
  secondaryCode?: string; // For hybrid mode (GLSL shader)
  uniforms: Record<string, number>;
  onLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  onClearLogs: () => void;
  onBridgeParamsUpdate?: (params: Record<string, number>) => void;
  onFpsUpdate?: (fps: number, frameTimeMs: number) => void;
  isExecutable: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  engineId,
  code,
  secondaryCode,
  uniforms,
  onLog,
  onClearLogs,
  onBridgeParamsUpdate,
  onFpsUpdate,
  isExecutable,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const webgpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isRunning, setIsRunning] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stats, setStats] = useState<ExecutionStats>({
    fps: 60,
    frameTimeMs: 16.6,
    frameCount: 0,
    renderStatus: 'running',
    gpuRenderer: 'WebGL 2.0 (Direct Hardware)',
  });
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // Python / Pyodide state
  const [pythonOutput, setPythonOutput] = useState<{ stdout: string[]; result?: string; status: 'idle' | 'loading' | 'success' | 'error' }>({
    stdout: [],
    status: 'idle',
  });

  // WebGPU diagnostic state
  const [webgpuStatus, setWebgpuStatus] = useState<{
    supported: boolean;
    adapterInfo?: string;
    message: string;
  }>({
    supported: false,
    message: 'Diagnostic en cours...',
  });

  const mouseCoords = useRef({ x: 0.5, y: 0.5 });
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // WebGPU Real Detection & WGSL execution
  useEffect(() => {
    if (engineId === 'webgpu') {
      const initWebGPU = async () => {
        if (!('gpu' in navigator)) {
          setWebgpuStatus({
            supported: false,
            message: 'navigator.gpu n\'est pas disponible dans ce contexte de navigation.',
          });
          onLog({
            type: 'warn',
            message: 'WebGPU : API non détectée (Chrome 113+ ou activation des flags requise).',
            source: 'WebGPU Engine',
          });
          return;
        }

        try {
          const navGpu = (navigator as unknown as { gpu?: any }).gpu;
          if (!navGpu) return;
          const adapter = await navGpu.requestAdapter();
          if (!adapter) {
            setWebgpuStatus({
              supported: false,
              message: 'Adaptateur WebGPU null (pilote graphique non conforme).',
            });
            return;
          }

          const device = await adapter.requestDevice();
          const info = adapter.info ? `${adapter.info.vendor || 'GPU'} ${adapter.info.architecture || ''}` : 'Périphérique GPU Détecté';
          setWebgpuStatus({
            supported: true,
            adapterInfo: info,
            message: `Périphérique WebGPU initialisé avec succès (${info}).`,
          });

          // Compile WGSL
          const canvas = webgpuCanvasRef.current;
          if (canvas) {
            const context = canvas.getContext('webgpu') as any;
            if (context) {
              const format = navGpu.getPreferredCanvasFormat();
              context.configure({ device, format, alphaMode: 'premultiplied' });

              const shaderModule = device.createShaderModule({ code });
              const compilationInfo = await shaderModule.getCompilationInfo();
              if (compilationInfo.messages.some((m: { type: string }) => m.type === 'error')) {
                onLog({
                  type: 'error',
                  message: `Erreur de compilation WGSL : ${compilationInfo.messages.map((m: { message: string }) => m.message).join('\n')}`,
                  source: 'WebGPU WGSL',
                });
                return;
              }

              const pipeline = device.createRenderPipeline({
                layout: 'auto',
                vertex: { module: shaderModule, entryPoint: 'vs_main' },
                fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format }] },
                primitive: { topology: 'triangle-list' }
              });

              const renderPass = () => {
                const commandEncoder = device.createCommandEncoder();
                const textureView = context.getCurrentTexture().createView();
                const passEncoder = commandEncoder.beginRenderPass({
                  colorAttachments: [{
                    view: textureView,
                    clearValue: { r: 0.03, g: 0.03, b: 0.05, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                  }]
                });
                passEncoder.setPipeline(pipeline);
                passEncoder.draw(3);
                passEncoder.end();
                device.queue.submit([commandEncoder.finish()]);
              };

              renderPass();
              onLog({
                type: 'info',
                message: 'Pipeline WGSL WebGPU exécuté sur matériel direct.',
                source: 'WebGPU Engine',
              });
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setWebgpuStatus({
            supported: false,
            message: `Erreur d'initialisation WebGPU : ${msg}`,
          });
        }
      };
      initWebGPU();
    }
  }, [engineId, code, onLog]);

  // Python / Pyodide Execution
  useEffect(() => {
    if (engineId === 'pyodide') {
      let isCancelled = false;
      setPythonOutput({ stdout: ['Initialisation de l\'environnement WebAssembly CPython...'], status: 'loading' });

      const runPythonInBrowser = async () => {
        try {
          // Check if pyodide is already in window
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let pyodide = (window as any).pyodideInstance;
          if (!pyodide) {
            // Load pyodide script from CDN
            if (!document.getElementById('pyodide-script')) {
              const script = document.createElement('script');
              script.id = 'pyodide-script';
              script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
              document.head.appendChild(script);
              await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error('Impossible de charger pyodide.js'));
              });
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).loadPyodide) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              pyodide = await (window as any).loadPyodide();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).pyodideInstance = pyodide;
            } else {
              throw new Error('Runtime Pyodide non accessible');
            }
          }

          if (isCancelled) return;

          // Capture stdout
          const stdoutLines: string[] = [];
          pyodide.setStdout({
            batched: (msg: string) => {
              stdoutLines.push(msg);
              onLog({ type: 'info', message: msg, source: 'Python Stdout' });
            }
          });

          // Run Python code
          const result = await pyodide.runPythonAsync(code);
          const resultStr = result !== undefined ? String(result) : undefined;

          if (!isCancelled) {
            setPythonOutput({
              stdout: stdoutLines.length > 0 ? stdoutLines : ['Code Python exécuté sans sortie print() directe.'],
              result: resultStr,
              status: 'success'
            });
            onLog({
              type: 'info',
              message: `Script Python exécuté avec succès. Valeur renvoyée : ${resultStr || 'None'}`,
              source: 'Pyodide WASM'
            });
          }
        } catch (err: unknown) {
          if (!isCancelled) {
            const msg = err instanceof Error ? err.message : String(err);
            setPythonOutput({
              stdout: [`Erreur d'exécution Python : ${msg}`],
              status: 'error'
            });
            onLog({
              type: 'error',
              message: `Exception Python : ${msg}`,
              source: 'Pyodide WASM'
            });
          }
        }
      };

      runPythonInBrowser();
      return () => { isCancelled = true; };
    }
  }, [engineId, code, onLog]);

  // Handle postMessage logs from iframe runners (JavaScript, TypeScript & p5.js)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.source === 'lab-runner') {
        const { type, message, lineNumber, fps, frameTimeMs, bridgeParams } = event.data;
        if (type) {
          onLog({
            type,
            message,
            lineNumber,
            source: engineId.toUpperCase(),
          });
        }
        if (fps !== undefined && frameTimeMs !== undefined) {
          const roundedFps = Math.round(fps);
          const delta = parseFloat(frameTimeMs.toFixed(1));
          setStats((prev) => ({
            ...prev,
            fps: roundedFps,
            frameTimeMs: delta,
            frameCount: prev.frameCount + 1,
          }));
          if (onFpsUpdate) onFpsUpdate(roundedFps, delta);
        }
        if (bridgeParams && onBridgeParamsUpdate) {
          onBridgeParamsUpdate(bridgeParams);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [engineId, onLog, onBridgeParamsUpdate]);

  // Sync uniforms dynamically into running iframe without reloading
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          source: 'lab-parent',
          type: 'update-uniforms',
          uniforms,
        },
        '*'
      );
    }
  }, [uniforms]);

  // GLSL & ISF Shader Engine Runner
  const runGLSLorISF = useCallback(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      onLog({
        type: 'error',
        message: 'Impossible d\'initialiser le contexte WebGL.',
        source: 'WebGL Engine',
      });
      return;
    }

    let shaderSource = code;
    let isfInputs: Array<{ NAME: string; TYPE: string }> = [];

    // If ISF engine: parse header and inject ISF standard definitions
    if (engineId === 'isf') {
      const parsed = parseISF(code);
      isfInputs = parsed.inputs;
      shaderSource = `
        precision highp float;
        uniform vec2 RENDERSIZE;
        uniform float TIME;
        ${parsed.inputs.map(inp => `uniform float ${inp.NAME};`).join('\n')}
        ${parsed.glslCode}
      `;
    }

    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, shaderSource);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const errorLog = gl.getShaderInfoLog(fs) || 'Erreur inconnue de compilation shader';
      gl.deleteShader(fs);
      gl.deleteShader(vs);

      const match = errorLog.match(/ERROR:\s+\d+:(\d+):/i);
      const lineNum = match ? parseInt(match[1], 10) : undefined;

      onLog({
        type: 'error',
        message: `Erreur de compilation Shader :\n${errorLog}`,
        lineNumber: lineNum,
        source: engineId === 'isf' ? 'ISF Compiler' : 'GLSL Compiler',
      });
      setStats((prev) => ({ ...prev, renderStatus: 'error' }));
      return;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onLog({
        type: 'error',
        message: `Erreur d'édition des liens : ${gl.getProgramInfoLog(program)}`,
        source: 'WebGL Linker',
      });
      return;
    }

    onLog({
      type: 'info',
      message: `${engineId === 'isf' ? 'Shader ISF' : 'Shader GLSL'} compilé et lié au matériel GPU.`,
      source: engineId.toUpperCase(),
    });
    setStats((prev) => ({ ...prev, renderStatus: 'running' }));

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uRenderSize = gl.getUniformLocation(program, 'RENDERSIZE');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uISFTime = gl.getUniformLocation(program, 'TIME');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uCustom = gl.getUniformLocation(program, 'u_custom');

    // Dynamic ISF Uniform Locations
    const isfLocations: Record<string, WebGLUniformLocation | null> = {};
    if (engineId === 'isf') {
      for (const inp of isfInputs) {
        isfLocations[inp.NAME] = gl.getUniformLocation(program, inp.NAME);
      }
    }

    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsAccumulator = 0;

    const renderLoop = (now: number) => {
      if (!isRunning) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const elapsedSec = (now - startTimeRef.current) / 1000;
      const deltaMs = now - lastTime;
      lastTime = now;

      frameCounter++;
      fpsAccumulator += deltaMs;
      if (fpsAccumulator >= 500) {
        const curFps = Math.round((frameCounter * 1000) / fpsAccumulator);
        const delta = parseFloat(deltaMs.toFixed(1));
        const cappedFps = Math.min(curFps, 120);
        setStats((prev) => ({
          ...prev,
          fps: cappedFps,
          frameTimeMs: delta,
          frameCount: prev.frameCount + frameCounter,
        }));
        if (onFpsUpdate) onFpsUpdate(cappedFps, delta);
        frameCounter = 0;
        fpsAccumulator = 0;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayW = Math.round(canvas.clientWidth * dpr);
      const displayH = Math.round(canvas.clientHeight * dpr);

      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
        gl.viewport(0, 0, displayW, displayH);
      }

      gl.useProgram(program);

      if (uResolution) gl.uniform2f(uResolution, displayW, displayH);
      if (uRenderSize) gl.uniform2f(uRenderSize, displayW, displayH);
      if (uTime) gl.uniform1f(uTime, elapsedSec);
      if (uISFTime) gl.uniform1f(uISFTime, elapsedSec);
      if (uMouse) gl.uniform2f(uMouse, mouseCoords.current.x, mouseCoords.current.y);

      if (uCustom) {
        const xVal = uniforms['Aberration'] ?? uniforms['Vitesse'] ?? uniforms['Zoom'] ?? uniforms['segments'] ?? Object.values(uniforms)[0] ?? 1.0;
        const yVal = uniforms['Courbure'] ?? uniforms['Distorsion'] ?? uniforms['vitesse'] ?? Object.values(uniforms)[1] ?? 1.0;
        const zVal = uniforms['Scanlines'] ?? uniforms['Échelle'] ?? uniforms['zoom'] ?? Object.values(uniforms)[2] ?? 1.0;
        const wVal = uniforms['Glow'] ?? uniforms['Luminescence'] ?? uniforms['intensite'] ?? Object.values(uniforms)[3] ?? 1.0;
        gl.uniform4f(uCustom, xVal, yVal, zVal, wVal);
      }

      // Feed ISF inputs from uniforms
      if (engineId === 'isf') {
        for (const [name, loc] of Object.entries(isfLocations)) {
          if (loc) {
            const val = uniforms[name] ?? 1.0;
            gl.uniform1f(loc, val);
          }
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(positionBuffer);
    };
  }, [code, uniforms, isRunning, engineId, onLog]);

  // Hybrid Pipeline Runner (p5.js ➔ GLSL)
  const runHybridPipeline = useCallback(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, secondaryCode || '');
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const errorLog = gl.getShaderInfoLog(fs) || 'Erreur shader hybride';
      onLog({
        type: 'error',
        message: `Erreur Shader Hybride :\n${errorLog}`,
        source: 'Shader Hybride',
      });
      return;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const p5Texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, p5Texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uCustom = gl.getUniformLocation(program, 'u_custom');
    const uP5Texture = gl.getUniformLocation(program, 'u_p5Texture');
    const uPulseIntensity = gl.getUniformLocation(program, 'u_bridge_pulseIntensity');
    const uAngularVel = gl.getUniformLocation(program, 'u_bridge_angularVelocity');
    const uMouseActivity = gl.getUniformLocation(program, 'u_bridge_mouseActivity');

    let currentBridgeParams: Record<string, number> = {
      pulseIntensity: 0.5,
      angularVelocity: 0.0,
      mouseActivity: 0.0,
    };

    const messageListener = (event: MessageEvent) => {
      if (event.data && event.data.source === 'lab-runner' && event.data.bridgeParams) {
        currentBridgeParams = { ...currentBridgeParams, ...event.data.bridgeParams };
        if (onBridgeParamsUpdate) onBridgeParamsUpdate(currentBridgeParams);
      }
    };
    window.addEventListener('message', messageListener);

    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsAccumulator = 0;

    const renderHybridLoop = (now: number) => {
      if (!isRunning) {
        animationFrameRef.current = requestAnimationFrame(renderHybridLoop);
        return;
      }

      const elapsedSec = (now - startTimeRef.current) / 1000;
      const deltaMs = now - lastTime;
      lastTime = now;

      frameCounter++;
      fpsAccumulator += deltaMs;
      if (fpsAccumulator >= 500) {
        const curFps = Math.round((frameCounter * 1000) / fpsAccumulator);
        const delta = parseFloat(deltaMs.toFixed(1));
        const cappedFps = Math.min(curFps, 120);
        setStats((prev) => ({
          ...prev,
          fps: cappedFps,
          frameTimeMs: delta,
          frameCount: prev.frameCount + frameCounter,
        }));
        if (onFpsUpdate) onFpsUpdate(cappedFps, delta);
        frameCounter = 0;
        fpsAccumulator = 0;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayW = Math.round(canvas.clientWidth * dpr);
      const displayH = Math.round(canvas.clientHeight * dpr);

      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
        gl.viewport(0, 0, displayW, displayH);
      }

      if (iframeRef.current && iframeRef.current.contentDocument) {
        const p5Canvas = iframeRef.current.contentDocument.querySelector('canvas');
        if (p5Canvas && p5Canvas.width > 0 && p5Canvas.height > 0) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, p5Texture);
          try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p5Canvas);
          } catch {
            // Buffer wait
          }
        }
      }

      gl.useProgram(program);

      if (uResolution) gl.uniform2f(uResolution, displayW, displayH);
      if (uTime) gl.uniform1f(uTime, elapsedSec);
      if (uMouse) gl.uniform2f(uMouse, mouseCoords.current.x, mouseCoords.current.y);

      if (uCustom) {
        const xVal = uniforms['Aberration'] ?? uniforms['Vitesse'] ?? Object.values(uniforms)[0] ?? 1.4;
        const yVal = uniforms['Courbure'] ?? uniforms['Distorsion'] ?? Object.values(uniforms)[1] ?? 1.2;
        const zVal = uniforms['Scanlines'] ?? uniforms['Échelle'] ?? Object.values(uniforms)[2] ?? 0.8;
        const wVal = uniforms['Glow'] ?? uniforms['Luminescence'] ?? Object.values(uniforms)[3] ?? 1.3;
        gl.uniform4f(uCustom, xVal, yVal, zVal, wVal);
      }

      if (uPulseIntensity) gl.uniform1f(uPulseIntensity, currentBridgeParams.pulseIntensity ?? 0.5);
      if (uAngularVel) gl.uniform1f(uAngularVel, currentBridgeParams.angularVelocity ?? 0.0);
      if (uMouseActivity) gl.uniform1f(uMouseActivity, currentBridgeParams.mouseActivity ?? 0.0);

      if (uP5Texture) gl.uniform1i(uP5Texture, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameRef.current = requestAnimationFrame(renderHybridLoop);
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(renderHybridLoop);

    return () => {
      window.removeEventListener('message', messageListener);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(positionBuffer);
      gl.deleteTexture(p5Texture);
    };
  }, [secondaryCode, uniforms, isRunning, onLog, onBridgeParamsUpdate]);

  // Main trigger
  useEffect(() => {
    if (!isExecutable) return;
    if (engineId === 'glsl' || engineId === 'isf') {
      return runGLSLorISF();
    }
    if (engineId === 'hybrid-p5-glsl') {
      return runHybridPipeline();
    }
  }, [engineId, code, secondaryCode, isExecutable, runGLSLorISF, runHybridPipeline]);

  // Generate Iframe srcdoc for JS, TypeScript & p5.js
  const generateIframeSrcDoc = () => {
    let executableCode = code;

    // TypeScript: transpile via Sucrase
    if (engineId === 'typescript') {
      const { jsCode, error } = transpileTypeScript(code);
      if (error) {
        onLog({
          type: 'error',
          message: `Erreur de transpilation TypeScript : ${error}`,
          source: 'TypeScript Transpiler',
        });
        return '';
      }
      executableCode = jsCode;
    }

    if (engineId === 'javascript' || engineId === 'typescript') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #09090b; }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, time = 0;
    let mouse = { x: 0, y: 0, down: false };
    let isPaused = false;
    window.uniforms = ${JSON.stringify(uniforms)};

    window.addEventListener('message', (e) => {
      if (e.data && e.data.source === 'lab-parent' && e.data.type === 'update-uniforms') {
        window.uniforms = e.data.uniforms;
      }
    });

    const notifyParent = (type, message, lineNumber) => {
      window.parent.postMessage({
        source: 'lab-runner',
        type: type,
        message: String(message),
        lineNumber: lineNumber
      }, '*');
    };

    console.log = (...args) => notifyParent('info', args.join(' '));
    console.warn = (...args) => notifyParent('warn', args.join(' '));
    console.error = (...args) => notifyParent('error', args.join(' '));

    window.onerror = (msg, url, line) => {
      notifyParent('error', msg, line);
      return false;
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', () => { mouse.down = true; });
    window.addEventListener('mouseup', () => { mouse.down = false; });

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsAccumulator = 0;

    function mainLoop(now) {
      if (!isPaused) {
        time = now / 1000;
        const delta = now - lastTime;
        lastTime = now;

        frameCount++;
        fpsAccumulator += delta;
        if (fpsAccumulator >= 500) {
          const curFps = (frameCount * 1000) / fpsAccumulator;
          window.parent.postMessage({
            source: 'lab-runner',
            fps: curFps,
            frameTimeMs: delta
          }, '*');
          frameCount = 0;
          fpsAccumulator = 0;
        }

        if (typeof window.onFrame === 'function') {
          try {
            window.onFrame(time);
          } catch(err) {
            notifyParent('error', err.message, err.lineno);
          }
        }
      }
      requestAnimationFrame(mainLoop);
    }

    try {
      ${executableCode}
      notifyParent('info', 'Code exécuté avec succès.');
      requestAnimationFrame(mainLoop);
    } catch(err) {
      notifyParent('error', err.message, err.lineno);
    }
  </script>
</body>
</html>`;
    }

    if (engineId === 'p5js' || engineId === 'hybrid-p5-glsl') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="/vendor/p5.min.js"></script>
  <script>
    if (typeof p5 === 'undefined') {
      document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"><\\/script>');
    }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #09090b; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script>
    window.uniforms = ${JSON.stringify(uniforms)};
    window.addEventListener('message', (e) => {
      if (e.data && e.data.source === 'lab-parent' && e.data.type === 'update-uniforms') {
        window.uniforms = e.data.uniforms;
      }
    });

    const notifyParent = (type, message, lineNumber) => {
      window.parent.postMessage({
        source: 'lab-runner',
        type: type,
        message: String(message),
        lineNumber: lineNumber
      }, '*');
    };

    console.log = (...args) => notifyParent('info', args.join(' '));
    console.warn = (...args) => notifyParent('warn', args.join(' '));
    console.error = (...args) => notifyParent('error', args.join(' '));

    window.onerror = (msg, url, line) => {
      notifyParent('error', msg, line);
      return false;
    };

    window.setBridgeUniforms = (params) => {
      window.parent.postMessage({
        source: 'lab-runner',
        bridgeParams: params
      }, '*');
    };

    let lastFrame = performance.now();
    setInterval(() => {
      if (typeof frameRate === 'function') {
        const fps = frameRate();
        const delta = performance.now() - lastFrame;
        lastFrame = performance.now();
        window.parent.postMessage({
          source: 'lab-runner',
          fps: fps,
          frameTimeMs: delta
        }, '*');
      }
    }, 500);

    try {
      ${code}
    } catch(err) {
      notifyParent('error', err.message, err.lineno);
    }
  </script>
</body>
</html>`;
    }

    return '';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    mouseCoords.current = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* CASE 1: GLSL & ISF Canvas */}
      {(engineId === 'glsl' || engineId === 'isf') && (
        <canvas
          ref={webglCanvasRef}
          onMouseMove={handleMouseMove}
          className="w-full h-full block cursor-crosshair"
        />
      )}

      {/* CASE 2: Pipeline Hybride (p5 ➔ GLSL) */}
      {engineId === 'hybrid-p5-glsl' && (
        <div className="relative w-full h-full">
          <canvas
            ref={webglCanvasRef}
            onMouseMove={handleMouseMove}
            className="w-full h-full block cursor-crosshair z-10 relative"
          />
          <iframe
            ref={iframeRef}
            srcDoc={generateIframeSrcDoc()}
            title="p5.js Generator Offscreen"
            sandbox="allow-scripts allow-same-origin"
            className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0 -z-10"
          />
        </div>
      )}

      {/* CASE 3: JavaScript, TypeScript & standalone p5.js in sandboxed iframe */}
      {(engineId === 'javascript' || engineId === 'typescript' || engineId === 'p5js') && (
        <iframe
          ref={iframeRef}
          key={`${engineId}-${code.length}`}
          srcDoc={generateIframeSrcDoc()}
          title={`Sandbox ${engineId}`}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-none block"
        />
      )}

      {/* CASE 4: Python / Pyodide WASM Output Inspector */}
      {engineId === 'pyodide' && (
        <div className="p-6 max-w-xl w-full bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="flex items-center gap-2 text-zinc-200 font-semibold">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Exécution Python (CPython 3.12 WebAssembly)</span>
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] ${
              pythonOutput.status === 'success' ? 'bg-emerald-950/60 text-emerald-400' :
              pythonOutput.status === 'loading' ? 'bg-amber-950/60 text-amber-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {pythonOutput.status === 'loading' ? 'Calcul en cours...' : pythonOutput.status === 'success' ? 'Exécuté' : 'Prêt'}
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto p-2 bg-zinc-950 rounded border border-zinc-850">
            <span className="text-[10px] text-zinc-500 block">Sortie standard (sys.stdout) :</span>
            {pythonOutput.stdout.map((line, idx) => (
              <div key={idx} className="text-zinc-300 whitespace-pre-wrap leading-relaxed text-[11px]">
                {line}
              </div>
            ))}
          </div>

          {pythonOutput.result && (
            <div className="p-2.5 bg-cyan-950/30 border border-cyan-900/40 rounded text-cyan-300">
              <span className="text-[10px] text-cyan-400/80 block font-semibold mb-0.5">Valeur de retour convertie vers JS :</span>
              <pre className="text-[11px] whitespace-pre-wrap overflow-x-auto">{pythonOutput.result}</pre>
            </div>
          )}
        </div>
      )}

      {/* CASE 5: WebGPU Hardware Canvas & Diagnostic */}
      {engineId === 'webgpu' && (
        <div className="relative w-full h-full flex items-center justify-center">
          {webgpuStatus.supported ? (
            <canvas
              ref={webgpuCanvasRef}
              width={640}
              height={480}
              className="w-full h-full block"
            />
          ) : (
            <div className="p-8 max-w-lg w-full bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-4 text-center font-sans">
              <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center mx-auto text-cyan-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Diagnostic Matériel WebGPU</h3>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-left font-mono text-zinc-400">
                <p>{webgpuStatus.message}</p>
              </div>
              <p className="text-xs text-zinc-500">
                Conformément à la politique du laboratoire, aucune exécution n'est simulée sans pilote compatible.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CASE 6: Planned Engines (Phases B, C, D, E) */}
      {!isExecutable && engineId !== 'webgpu' && engineId !== 'pyodide' && (
        <div className="p-8 max-w-lg w-full bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">Moteur Planifié (Phase Suivante)</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ce moteur fait partie des spécifications cibles de No[co]de.
            Les tests et le runtime seront validés dans leur phase dédiée.
          </p>
        </div>
      )}
    </div>
  );
};
