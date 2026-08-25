import type { BrowserWindow } from "electron";
import { pluginRegistry } from "../plugins/plugin-registry";

let shellWindow: BrowserWindow | null = null;
export function bindShellWindow(win: BrowserWindow): void {
  shellWindow = win;
  pluginRegistry.on("changed", ({ reason }: { reason: string }) => {
    broadcastPluginsChanged(reason as any);
  });
}

export function broadcastPluginsChanged(
  reason: "installed" | "uninstalled" | "enabled-changed" | "reordered"
): void {
  shellWindow?.webContents.send("titir:pluginsChanged", {
    reason,
    snapshot: pluginRegistry.snapshot(),
  });
}

export function broadcastPluginCrashed(pluginId: string, reason: "crashed" | "mount-failed"): void {
  shellWindow?.webContents.send("titir:pluginCrashed", { pluginId, reason });
}
