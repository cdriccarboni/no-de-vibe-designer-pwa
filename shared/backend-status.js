export const BACKEND_STATUS = {
  "probedAt": "2026-10-03T22:00:00+02:00",
  "host": "MacBook-Air-M4",
  "os": "macOS 26.6.2",
  "rows": [
    {
      "id": "python",
      "name": "Python",
      "label": "Python",
      "version": "3.9.6",
      "state": "DISPONIBLE",
      "status": "DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "script"
      ],
      "detect": "command -v python3",
      "install": "",
      "test": "/usr/bin/python3 -c 'print(6*7)' → 42",
      "launch": "python3",
      "talk": "processus local",
      "proof": "/usr/bin/python3 -c 'print(6*7)' a affiché 42",
      "installUrl": ""
    },
    {
      "id": "node",
      "name": "Node",
      "label": "Node",
      "version": "v24.21.0",
      "state": "DISPONIBLE",
      "status": "DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "script",
        "realtime"
      ],
      "detect": "command -v node",
      "install": "",
      "test": "node -e 'console.log(6*7)' → 42",
      "launch": "node",
      "talk": "processus local",
      "proof": "node -e 'console.log(6*7)' a affiché 42",
      "installUrl": ""
    },
    {
      "id": "javascript",
      "name": "JavaScript",
      "label": "JavaScript",
      "version": "v24.21.0",
      "state": "DISPONIBLE",
      "status": "DISPONIBLE",
      "platform": "web",
      "capabilities": [
        "script",
        "realtime",
        "2d"
      ],
      "detect": "le runtime Node exécute le graphe",
      "install": "",
      "test": "node -e 'console.log(6*7)' → 42",
      "launch": "navigateur ou Node",
      "talk": "graphe JS du Designer",
      "proof": "le même processus Node a exécuté 6*7 et a affiché 42",
      "installUrl": ""
    },
    {
      "id": "typescript",
      "name": "TypeScript",
      "label": "TypeScript",
      "version": "5.9.3",
      "state": "DISPONIBLE",
      "status": "DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "script"
      ],
      "detect": "node_modules/.bin/tsc --version",
      "install": "",
      "test": "tsc --strict add.ts && node add.js → 42",
      "launch": "tsc",
      "talk": "compilation locale",
      "proof": "tsc 5.9.3 a compilé add.ts, node add.js a affiché 42",
      "installUrl": ""
    },
    {
      "id": "java",
      "name": "Java",
      "label": "Java",
      "version": "",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "script"
      ],
      "detect": "java -version",
      "install": "https://adoptium.net/temurin/releases/",
      "test": "aucun essai : runtime absent",
      "launch": "",
      "talk": "processus, non branché",
      "proof": "java -version : Unable to locate a Java Runtime",
      "installUrl": "https://adoptium.net/temurin/releases/"
    },
    {
      "id": "processing",
      "name": "Processing",
      "label": "Processing",
      "version": "",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "2d"
      ],
      "detect": "application Processing absente",
      "install": "https://processing.org/download",
      "test": "aucun essai",
      "launch": "",
      "talk": "fichier .pde, non branché",
      "proof": "aucun binaire Processing",
      "installUrl": "https://processing.org/download"
    },
    {
      "id": "cpp",
      "name": "C/C++",
      "label": "C/C++",
      "version": "Apple clang 21.0.0",
      "state": "DISPONIBLE",
      "status": "DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "native"
      ],
      "detect": "clang++ --version",
      "install": "",
      "test": "clang++ add.cpp → 42 ; clang add.c exit 0",
      "launch": "clang++",
      "talk": "binaire natif lancé par le relevé",
      "proof": "clang++ a affiché 42 ; clang add.c s'est terminé 0",
      "installUrl": ""
    },
    {
      "id": "rust",
      "name": "Rust",
      "label": "Rust",
      "version": "",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "native"
      ],
      "detect": "rustc absent",
      "install": "https://rustup.rs/",
      "test": "aucun essai",
      "launch": "",
      "talk": "binaire, non branché",
      "proof": "rustc absent",
      "installUrl": "https://rustup.rs/"
    },
    {
      "id": "faust",
      "name": "Faust",
      "label": "Faust",
      "version": "",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "audio"
      ],
      "detect": "faust absent",
      "install": "https://faust.grame.fr/downloads/",
      "test": "aucun essai",
      "launch": "",
      "talk": "DSP, non branché",
      "proof": "faust absent",
      "installUrl": "https://faust.grame.fr/downloads/"
    },
    {
      "id": "swift",
      "name": "Swift",
      "label": "Swift",
      "version": "6.4",
      "state": "DISPONIBLE",
      "status": "DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "native"
      ],
      "detect": "swiftc --version",
      "install": "",
      "test": "swiftc a compilé un programme exécuté",
      "launch": "swiftc",
      "talk": "binaire natif",
      "proof": "swiftc 6.4 a compilé un programme qui a affiché METAL Apple M4 42",
      "installUrl": ""
    },
    {
      "id": "metal",
      "name": "Metal",
      "label": "Metal",
      "version": "Apple M4",
      "state": "DISPONIBLE AVEC LIMITATIONS",
      "status": "DISPONIBLE AVEC LIMITATIONS",
      "platform": "macOS",
      "capabilities": [
        "gpu"
      ],
      "detect": "MTLCreateSystemDefaultDevice",
      "install": "xcodebuild -downloadComponent MetalToolchain",
      "test": "calcul Metal 20+22 → 42 ; xcrun metal : MetalToolchain absent",
      "launch": "binaire Swift",
      "talk": "l'application n'appelle pas Metal",
      "proof": "calcul Metal 20+22 a affiché 42 ; compilateur metal absent",
      "installUrl": ""
    },
    {
      "id": "touchdesigner",
      "name": "TouchDesigner",
      "label": "TouchDesigner",
      "version": "2025.33230",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "2d",
        "3d",
        "video",
        "osc"
      ],
      "detect": "Info.plist CFBundleShortVersionString",
      "install": "",
      "test": "TouchDesigner --version interrompu sans sortie ; toeexpand : Error opening file",
      "launch": "",
      "talk": "export Python existant, runtime muet",
      "proof": "version lue 2025.33230, essai d'exécution non concluant",
      "installUrl": ""
    },
    {
      "id": "unity",
      "name": "Unity",
      "label": "Unity",
      "version": "",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "3d"
      ],
      "detect": "Unity.app absente",
      "install": "https://unity.com/download",
      "test": "aucun essai",
      "launch": "",
      "talk": "éditeur, non branché",
      "proof": "Unity.app absente",
      "installUrl": "https://unity.com/download"
    },
    {
      "id": "unreal",
      "name": "Unreal",
      "label": "Unreal",
      "version": "",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "3d"
      ],
      "detect": "UnrealEditor absent",
      "install": "https://www.unrealengine.com/en-US/download",
      "test": "aucun essai",
      "launch": "",
      "talk": "éditeur, non branché",
      "proof": "UnrealEditor absent",
      "installUrl": "https://www.unrealengine.com/en-US/download"
    },
    {
      "id": "webgl",
      "name": "WebGL",
      "label": "WebGL",
      "version": "WebGL 2.0 (OpenGL ES 3.0 Chromium)",
      "state": "DISPONIBLE",
      "status": "DISPONIBLE",
      "platform": "web",
      "capabilities": [
        "2d",
        "video",
        "gpu",
        "shaders"
      ],
      "detect": "canvas.getContext('webgl2')",
      "install": "",
      "test": "Chrome 154.0.8037.97 headless, compile=true",
      "launch": "navigateur",
      "talk": "WebGL2Backend.compile",
      "proof": "Chrome 154.0.8037.97, compile=true",
      "installUrl": ""
    },
    {
      "id": "webgpu",
      "name": "WebGPU",
      "label": "WebGPU",
      "version": "Chrome 154.0.8037.97",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "web",
      "capabilities": [
        "gpu"
      ],
      "detect": "navigator.gpu",
      "install": "",
      "test": "no-adapter sans GPU ; essai avec GPU non terminé",
      "launch": "navigateur",
      "talk": "WebGPUBackend, essai non concluant",
      "proof": "aucun calcul WebGPU terminé",
      "installUrl": ""
    },
    {
      "id": "wgsl",
      "name": "WGSL",
      "label": "WGSL",
      "version": "Chrome 154.0.8037.97",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "web",
      "capabilities": [
        "shaders",
        "gpu"
      ],
      "detect": "createShaderModule",
      "install": "",
      "test": "aucune compilation terminée",
      "launch": "navigateur",
      "talk": "shader WebGPU, essai non concluant",
      "proof": "aucune compilation WGSL terminée",
      "installUrl": ""
    },
    {
      "id": "glsl",
      "name": "GLSL",
      "label": "GLSL",
      "version": "WebGL 2.0",
      "state": "DISPONIBLE",
      "status": "DISPONIBLE",
      "platform": "web",
      "capabilities": [
        "shaders"
      ],
      "detect": "compileShader",
      "install": "",
      "test": "fragment shader compile=true",
      "launch": "navigateur",
      "talk": "WebGL2Backend.compile",
      "proof": "fragment shader compilé, compile=true",
      "installUrl": ""
    },
    {
      "id": "ffmpeg",
      "name": "FFmpeg",
      "label": "FFmpeg",
      "version": "",
      "state": "NON DISPONIBLE",
      "status": "NON DISPONIBLE",
      "platform": "macOS",
      "capabilities": [
        "video",
        "audio"
      ],
      "detect": "ffmpeg absent",
      "install": "https://ffmpeg.org/download.html",
      "test": "aucun essai",
      "launch": "",
      "talk": "processus, non branché",
      "proof": "ffmpeg absent",
      "installUrl": "https://ffmpeg.org/download.html"
    },
    {
      "id": "ndi",
      "name": "NDI",
      "label": "NDI",
      "version": "6.3.0.3",
      "state": "DISPONIBLE AVEC LIMITATIONS",
      "status": "DISPONIBLE AVEC LIMITATIONS",
      "platform": "macOS",
      "capabilities": [
        "video"
      ],
      "detect": "libndi_advanced.dylib",
      "install": "",
      "test": "NDIlib_initialize + NDIlib_version → NDI SDK APPLE 6.3.0.3",
      "launch": "bibliothèque native",
      "talk": "le node navigateur ne charge pas cette bibliothèque",
      "proof": "clang a exécuté NDIlib_initialize et a affiché NDI SDK APPLE 6.3.0.3",
      "installUrl": ""
    }
  ]
}
