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
  async sendSacnUdp(message) {
    return ipcRenderer.invoke("nvd:sacn-udp", message);
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
  async localAiShow(options = {}) {
    return ipcRenderer.invoke("nvd:local-ai-show", options);
  },
  async localAiAgentsScan(options = {}) {
    return ipcRenderer.invoke("nvd:local-ai-agents-scan", options);
  },
  async localAiChat(options = {}) {
    return ipcRenderer.invoke("nvd:local-ai-chat", options);
  },
  async installLocalAi(options = {}) {
    return ipcRenderer.invoke("nvd:local-ai-install", options);
  },
  async aiNodeRequest(options = {}) {
    return ipcRenderer.invoke("nvd:ai-node-request", options);
  },
  async aiAssetRequest(options = {}) {
    return ipcRenderer.invoke("nvd:ai-asset-request", options);
  }
});
