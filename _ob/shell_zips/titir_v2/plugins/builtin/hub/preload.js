"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// §12.1 — titir:installPlugin/uninstallPlugin/setPluginEnabled/reorderPlugins
// are wired ONLY here. No other plugin's preload exposes these; a
// third-party plugin author simply never writes this file, so the channels
// are structurally unreachable from their page (§17 IPC_UNAUTHORIZED_CALLER
// exists as defense-in-depth on top of that).
const titirHub = {
    installPlugin: (packagePath) => electron_1.ipcRenderer.invoke("titir:installPlugin", { packagePath }),
    uninstallPlugin: (pluginId) => electron_1.ipcRenderer.invoke("titir:uninstallPlugin", { pluginId }),
    setPluginEnabled: (pluginId, enabled) => electron_1.ipcRenderer.invoke("titir:setPluginEnabled", { pluginId, enabled }),
    reorderPlugins: (orderedIds) => electron_1.ipcRenderer.invoke("titir:reorderPlugins", { orderedIds }),
    getSnapshot: () => electron_1.ipcRenderer.invoke("titir:getSnapshot", {}),
    openFile: (properties, filters) => electron_1.ipcRenderer.invoke("dialog:openFile", { properties, filters }),
    onPluginsChanged: (cb) => {
        const listener = (_e, payload) => cb(payload);
        electron_1.ipcRenderer.on("titir:pluginsChanged", listener);
        return () => electron_1.ipcRenderer.removeListener("titir:pluginsChanged", listener);
    }
};
electron_1.contextBridge.exposeInMainWorld("titirHub", titirHub);
