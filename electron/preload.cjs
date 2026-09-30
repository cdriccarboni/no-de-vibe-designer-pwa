/**
 * Preload minimal — expose métadonnées runtime sans Node dans le renderer.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nvdDesktop", {
  runtime: "electron",
  platform: process.platform,
  arch: process.arch,
  remotePort: 4174,
  async sendOscUdp(message) {
    return ipcRenderer.invoke("nvd:osc-udp", message);
  },
  async sendArtNetUdp(message) {
    return ipcRenderer.invoke("nvd:artnet-udp", message);
  },
  async getHostCard() {
    return ipcRenderer.invoke("nvd:host-card");
  },
  async localAiProbe(options = {}) {
    return ipcRenderer.invoke("nvd:local-ai-probe", options);
  },
  async probeLocalAi(options = {}) {
    return ipcRenderer.invoke("nvd:local-ai-probe", options);
  },
  async localAiChat(options = {}) {
    return ipcRenderer.invoke("nvd:local-ai-chat", options);
  }
});
