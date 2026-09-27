const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('nodeVibeNative',{
  appInfo:()=>ipcRenderer.invoke('app:info'),
  saveProject:p=>ipcRenderer.invoke('project:save',p),
  openProject:()=>ipcRenderer.invoke('project:open'),
  exportFile:p=>ipcRenderer.invoke('export:file',p),
  sendOsc:p=>ipcRenderer.invoke('network:osc',p),
  sendArtNet:p=>ipcRenderer.invoke('network:artnet',p),
  vibeOllama:p=>ipcRenderer.invoke('vibe:ollama',p),
  openPath:p=>ipcRenderer.invoke('system:openPath',p)
});
