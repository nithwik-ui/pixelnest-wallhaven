const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  downloadFile: (payload) => ipcRenderer.invoke("download-file", payload),
  onDownloadProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("download-progress", listener);
    return () => ipcRenderer.removeListener("download-progress", listener);
  },
  setAsWallpaper: (filePath) => ipcRenderer.invoke("set-as-wallpaper", filePath),
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  openMicrosoftStore: () => ipcRenderer.invoke("open-microsoft-store"),
  onUpdateStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("update-status", listener);
    return () => ipcRenderer.removeListener("update-status", listener);
  },
  windowControls: {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
  },
  isElectron: true,
});
