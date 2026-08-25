import { WebContentsView, type BrowserWindow } from "electron";
import path from "node:path";
import { app } from "electron";
import type { PluginManifest } from "../shared/types";

function pluginRoot(manifest: PluginManifest, isBuiltin: boolean): string {
  return isBuiltin
    ? path.join(__dirname, "..", "..", "..", "plugins", "builtin", "hub")
    : path.join(app.getPath("userData"), "plugins", "installed", manifest.id);
}

export interface LoadedPlugin {
  view: WebContentsView;
}

/**
 * §5.1 — every plugin view, no exceptions: contextIsolation true,
 * sandbox false (full Node in preload), nodeIntegration false. No
 * per-plugin branching on declared capability.
 */
export function createPluginView(
  win: BrowserWindow,
  manifest: PluginManifest,
  isBuiltin = false
): LoadedPlugin {
  const root = pluginRoot(manifest, isBuiltin);
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      preload: path.join(root, manifest.preload),
    },
  });
  win.contentView.addChildView(view);
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  void view.webContents.loadFile(path.join(root, manifest.entry));
  return { view };
}
