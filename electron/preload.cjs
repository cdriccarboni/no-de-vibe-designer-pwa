/**
 * Preload minimal — expose métadonnées runtime sans Node dans le renderer.
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("nvdDesktop", {
  runtime: "electron",
  platform: process.platform,
  arch: process.arch
});
