import { contextBridge, ipcRenderer } from "electron";

// §12.1 — titir:installPlugin/uninstallPlugin/setPluginEnabled/reorderPlugins
// are wired ONLY here. No other plugin's preload exposes these; a
// third-party plugin author simply never writes this file, so the channels
// are structurally unreachable from their page (§17 IPC_UNAUTHORIZED_CALLER
// exists as defense-in-depth on top of that).

const titirHub = {
  installPlugin: (packagePath: string) =>
    ipcRenderer.invoke("titir:installPlugin", { packagePath }),

  uninstallPlugin: (pluginId: string) =>
    ipcRenderer.invoke("titir:uninstallPlugin", { pluginId }),

  setPluginEnabled: (pluginId: string, enabled: boolean) =>
    ipcRenderer.invoke("titir:setPluginEnabled", { pluginId, enabled }),

  reorderPlugins: (orderedIds: string[]) =>
    ipcRenderer.invoke("titir:reorderPlugins", { orderedIds }),

  getSnapshot: () => ipcRenderer.invoke("titir:getSnapshot", {}),

  openFile: (properties: string[], filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke("dialog:openFile", { properties, filters }),

  onPluginsChanged: (cb: (event: unknown) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on("titir:pluginsChanged", listener);
    return () => ipcRenderer.removeListener("titir:pluginsChanged", listener);
  }
};

contextBridge.exposeInMainWorld("titirHub", titirHub);
