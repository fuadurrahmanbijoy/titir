import { contextBridge, ipcRenderer } from "electron";
import { Result, RegistrySnapshot, PluginsChangedEvent, PluginCrashedEvent } from "../shared/types";

// §12.1 — this is the shell renderer's own preload. It exposes exactly the
// channels the shell renderer needs: window controls, the one-shot snapshot
// bootstrap call, plugin show/relaunch, and the two push events. It never
// exposes titir:installPlugin/uninstallPlugin/setPluginEnabled/reorderPlugins
// — those are Hub-only (§12.1) and live in the Hub's own preload instead.

const titirShell = {
  getSnapshot: (): Promise<Result<RegistrySnapshot>> => ipcRenderer.invoke("titir:getSnapshot", {}),

  showPlugin: (pluginId: string): Promise<Result<void>> =>
    ipcRenderer.invoke("titir:showPlugin", { pluginId }),

  relaunchPlugin: (pluginId: string): Promise<Result<{ debounced: boolean }>> =>
    ipcRenderer.invoke("titir:relaunchPlugin", { pluginId }),

  onPluginsChanged: (cb: (event: PluginsChangedEvent) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: PluginsChangedEvent) => cb(payload);
    ipcRenderer.on("titir:pluginsChanged", listener);
    return () => ipcRenderer.removeListener("titir:pluginsChanged", listener);
  },

  onPluginCrashed: (cb: (event: PluginCrashedEvent) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: PluginCrashedEvent) => cb(payload);
    ipcRenderer.on("titir:pluginCrashed", listener);
    return () => ipcRenderer.removeListener("titir:pluginCrashed", listener);
  },

  window: {
    minimize: (): Promise<Result<void>> => ipcRenderer.invoke("window:minimize", {}),
    maximize: (): Promise<Result<void>> => ipcRenderer.invoke("window:maximize", {}),
    close: (): Promise<Result<void>> => ipcRenderer.invoke("window:close", {})
  }
};

contextBridge.exposeInMainWorld("titirShell", titirShell);

export type TitirShellBridge = typeof titirShell;
