import { BrowserWindow } from "electron";
import { pluginRegistry } from "../plugins/plugin-registry";
import { lifecycle } from "../plugins/lifecycle";
import { PluginsChangedEvent, PluginCrashedEvent } from "../shared/types";

/** Wires registry "changed" and lifecycle "crash" events to the shell renderer only. */
export function wireBroadcast(win: BrowserWindow) {
  pluginRegistry.on("changed", (event: PluginsChangedEvent) => {
    if (!win.isDestroyed()) {
      win.webContents.send("titir:pluginsChanged", event);
    }
  });

  lifecycle.on("crash", (event: PluginCrashedEvent) => {
    if (!win.isDestroyed()) {
      win.webContents.send("titir:pluginCrashed", event);
    }
  });
}
