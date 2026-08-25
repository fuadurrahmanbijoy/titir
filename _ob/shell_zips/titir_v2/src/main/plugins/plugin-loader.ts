import * as path from "path";
import { app, WebContentsView } from "electron";
import { PluginManifest } from "../shared/types";
import { HUB_PLUGIN_ID } from "../shared/constants";

function pluginDir(manifest: PluginManifest): string {
  if (manifest.id === HUB_PLUGIN_ID) {
    return path.join(app.getAppPath(), "plugins", "builtin", "hub");
  }
  return path.join(app.getAppPath(), "plugins", "installed", manifest.id);
}

/**
 * §5.1 — every plugin view, no exceptions, gets the identical security
 * settings below regardless of its declared capabilities (§4.3 UNGOVERNED,
 * §20 Definition of Done). This is the one place those settings are set.
 */
export function createPluginView(manifest: PluginManifest): WebContentsView {
  const dir = pluginDir(manifest);
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(dir, manifest.preload),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  view.webContents.loadFile(path.join(dir, manifest.entry));

  return view;
}
