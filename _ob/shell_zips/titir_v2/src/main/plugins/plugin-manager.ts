import * as fs from "fs";
import * as path from "path";
import { app, BrowserWindow } from "electron";
import { pluginRegistry } from "./plugin-registry";
import { lifecycle } from "./lifecycle";
import { installPlugin, uninstallPlugin } from "./plugin-installer";
import { configStore } from "../store/config-store";
import { HUB_PLUGIN_ID } from "../shared/constants";
import { PluginManifest, RegistrySnapshot } from "../shared/types";

/** §18 — single-writer install/uninstall queue: one operation completes fully before the next begins. */
class InstallQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(fn, fn);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
const installQueue = new InstallQueue();

/** Boot: register the Hub (§7.4) and every previously-installed, still-present plugin (§10). */
export function bootRegisterPlugins() {
  const hubManifestPath = path.join(app.getAppPath(), "plugins", "builtin", "hub", "manifest.json");
  const hubManifest: PluginManifest = JSON.parse(fs.readFileSync(hubManifestPath, "utf-8"));
  pluginRegistry.registerHub(hubManifest);

  const config = configStore.get();
  const installedRoot = path.join(app.getAppPath(), "plugins", "installed");

  for (const entry of config.plugins) {
    const manifestPath = path.join(installedRoot, entry.id, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      console.error(`[plugin-manager] plugin "${entry.id}" in config but missing on disk — skipping`);
      continue;
    }
    try {
      const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      pluginRegistry.registerFromBoot(manifest, entry.enabled, entry.order, entry.acknowledgedCapabilities);
    } catch (e) {
      console.error(`[plugin-manager] failed to read manifest for "${entry.id}": ${(e as Error).message}`);
    }
  }

  pluginRegistry.activePluginId =
    config.activePluginId && pluginRegistry.has(config.activePluginId) ? config.activePluginId : null;
}

export async function mountAndShow(pluginId: string, win: BrowserWindow) {
  const entry = pluginRegistry.get(pluginId);
  if (!entry) return;
  lifecycle.attachWindow(win);
  await lifecycle.show(entry.manifest);
  await pluginRegistry.persist();
}

export async function relaunchPlugin(pluginId: string) {
  const entry = pluginRegistry.get(pluginId);
  if (!entry) return { debounced: false };
  return lifecycle.relaunch(entry.manifest);
}

export function bootMountHub(win: BrowserWindow) {
  lifecycle.attachWindow(win);
  const hub = pluginRegistry.get(HUB_PLUGIN_ID);
  if (hub) {
    // Hub is mounted on first click like any other plugin (§9.1); it is not
    // force-mounted at boot. Nothing to do here beyond attaching the window.
    void hub;
  }
}

export async function handleInstall(packagePath: string) {
  return installQueue.run(async () => {
    const result = await installPlugin(packagePath);
    if (result.ok) {
      pluginRegistry.emitChanged("installed");
    }
    return result;
  });
}

export async function handleUninstall(pluginId: string) {
  return installQueue.run(async () => {
    return pluginRegistry.withTransitionLock(pluginId, async () => {
      lifecycle.unmount(pluginId);
      const result = await uninstallPlugin(pluginId);
      if (result.ok) {
        pluginRegistry.emitChanged("uninstalled");
      }
      return result;
    });
  });
}

export async function handleSetEnabled(pluginId: string, enabled: boolean) {
  pluginRegistry.setEnabled(pluginId, enabled);
  await pluginRegistry.persist();
  pluginRegistry.emitChanged("enabled-changed");
}

export async function handleReorder(orderedIds: string[]) {
  pluginRegistry.reorder(orderedIds);
  await pluginRegistry.persist();
  pluginRegistry.emitChanged("reordered");
}

export function getSnapshot(): RegistrySnapshot {
  return pluginRegistry.snapshot();
}
