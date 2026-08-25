import type { BrowserWindow, WebContentsView } from "electron";
import { NAV_WIDTH, RELAUNCH_DEBOUNCE_MS } from "../shared/constants";
import { pluginRegistry, withPluginLock } from "./plugin-registry";
import { createPluginView } from "./plugin-loader";
import type { PluginManifest } from "../shared/types";
import { broadcastPluginsChanged, broadcastPluginCrashed } from "../ipc/broadcast";

const views = new Map<string, WebContentsView>();
const lastRelaunch = new Map<string, number>();

function visibleBounds(win: BrowserWindow) {
  const [width, height] = win.getContentSize();
  return { x: NAV_WIDTH, y: 0, width: width - NAV_WIDTH, height };
}

const ZERO_BOUNDS = { x: 0, y: 0, width: 0, height: 0 };

export function mountAndShow(
  win: BrowserWindow,
  manifest: PluginManifest,
  isBuiltin = false
): Promise<void> {
  return withPluginLock(manifest.id, async () => {
    let view = views.get(manifest.id);
    if (!view) {
      const loaded = createPluginView(win, manifest, isBuiltin);
      view = loaded.view;
      views.set(manifest.id, view);

      view.webContents.on("render-process-gone", () => {
        view!.setBounds(ZERO_BOUNDS);
        views.delete(manifest.id);
        pluginRegistry.setState(manifest.id, "crashed");
        broadcastPluginCrashed(manifest.id, "crashed");
      });

      view.webContents.once("did-fail-load", () => {
        pluginRegistry.setState(manifest.id, "mount-failed");
        broadcastPluginCrashed(manifest.id, "mount-failed");
      });
    }

    // Hide whatever was previously visible.
    const current = pluginRegistry.snapshot().activePluginId;
    if (current && current !== manifest.id) {
      const currentView = views.get(current);
      currentView?.setBounds(ZERO_BOUNDS);
      pluginRegistry.setState(current, "hidden");
    }

    view.setBounds(visibleBounds(win));
    pluginRegistry.setActive(manifest.id);
    pluginRegistry.setState(manifest.id, "visible");
    broadcastPluginsChanged("installed");
  });
}

export function resizeVisible(win: BrowserWindow): void {
  const activeId = pluginRegistry.snapshot().activePluginId;
  if (!activeId) return;
  const view = views.get(activeId);
  view?.setBounds(visibleBounds(win));
}

export function relaunch(win: BrowserWindow, manifest: PluginManifest, isBuiltin = false): void {
  const last = lastRelaunch.get(manifest.id) ?? 0;
  if (Date.now() - last < RELAUNCH_DEBOUNCE_MS) return;
  lastRelaunch.set(manifest.id, Date.now());
  views.delete(manifest.id); // force a fresh WebContentsView
  void mountAndShow(win, manifest, isBuiltin);
}

export function teardown(pluginId: string): void {
  const view = views.get(pluginId);
  if (view) {
    view.webContents.close();
    views.delete(pluginId);
  }
}
