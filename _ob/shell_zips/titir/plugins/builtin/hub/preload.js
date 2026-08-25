const { contextBridge, ipcRenderer } = require("electron");

// This is the ONE preload in the whole system that exposes the titir:*
// management channels. A third-party plugin's own preload never gets
// this — the channel simply isn't wired onto its window object.
contextBridge.exposeInMainWorld("titirHub", {
  installPlugin: (packagePath) => ipcRenderer.invoke("titir:installPlugin", { packagePath }),
  uninstallPlugin: (pluginId) => ipcRenderer.invoke("titir:uninstallPlugin", { pluginId }),
  setPluginEnabled: (pluginId, enabled) =>
    ipcRenderer.invoke("titir:setPluginEnabled", { pluginId, enabled }),
  reorderPlugins: (orderedIds) => ipcRenderer.invoke("titir:reorderPlugins", { orderedIds }),
  getSnapshot: () => ipcRenderer.invoke("titir:getSnapshot", {}),
  openFilePicker: () =>
    ipcRenderer.invoke("dialog:openFile", {
      properties: ["openFile"],
      filters: [{ name: "TiTir Plugin", extensions: ["titirpkg"] }],
    }),
  onPluginsChanged: (cb) => {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on("titir:pluginsChanged", listener);
    return () => ipcRenderer.removeListener("titir:pluginsChanged", listener);
  },
});
