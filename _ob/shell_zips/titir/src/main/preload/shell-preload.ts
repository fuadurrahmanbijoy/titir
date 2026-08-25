import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("titir", {
  installPlugin: (packagePath: string) => ipcRenderer.invoke("titir:installPlugin", { packagePath }),
  uninstallPlugin: (pluginId: string) => ipcRenderer.invoke("titir:uninstallPlugin", { pluginId }),
  setPluginEnabled: (pluginId: string, enabled: boolean) =>
    ipcRenderer.invoke("titir:setPluginEnabled", { pluginId, enabled }),
  reorderPlugins: (orderedIds: string[]) => ipcRenderer.invoke("titir:reorderPlugins", { orderedIds }),
  getSnapshot: () => ipcRenderer.invoke("titir:getSnapshot", {}),
  selectPlugin: (pluginId: string) => ipcRenderer.invoke("titir:selectPlugin", pluginId),

  onPluginsChanged: (cb: (payload: unknown) => void) => {
    const listener = (_: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("titir:pluginsChanged", listener);
    return () => ipcRenderer.removeListener("titir:pluginsChanged", listener);
  },
  onPluginCrashed: (cb: (payload: unknown) => void) => {
    const listener = (_: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("titir:pluginCrashed", listener);
    return () => ipcRenderer.removeListener("titir:pluginCrashed", listener);
  },

  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },
});
