import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import { dialog } from "electron";
import type { Result, RegistrySnapshot } from "../shared/types";
import { ok, err } from "../shared/types";
import { pluginRegistry } from "./plugin-registry";
import { installPlugin, uninstallPlugin } from "./plugin-installer";
import { mountAndShow, teardown } from "./lifecycle";
import { HUB_MANIFEST } from "./hub-manifest";

let mainWindow: BrowserWindow | null = null;
export function bindWindow(win: BrowserWindow): void {
  mainWindow = win;
}

export async function handleInstallPlugin(packagePath: string): Promise<Result<{ pluginId: string }>> {
  return installPlugin(packagePath, {
    confirmDisclosure: async (capabilities) => {
      if (!mainWindow) return false;
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["Cancel", "Install"],
        defaultId: 1,
        cancelId: 0,
        title: "Plugin requests access",
        message: `This plugin can:\n${capabilities.map((c) => `• ${c}`).join("\n")}`,
      });
      return response === 1;
    },
  });
}

export async function handleUninstallPlugin(pluginId: string): Promise<Result<void>> {
  teardown(pluginId);
  return uninstallPlugin(pluginId);
}

export function handleSetEnabled(pluginId: string, enabled: boolean): Result<void> {
  if (!pluginRegistry.get(pluginId)) return err("UNINSTALL_NOT_FOUND", "Unknown plugin");
  pluginRegistry.setEnabled(pluginId, enabled);
  return ok(undefined);
}

export function handleReorder(orderedIds: string[]): Result<void> {
  pluginRegistry.reorder(orderedIds);
  return ok(undefined);
}

export function handleGetSnapshot(): Result<RegistrySnapshot> {
  return ok(pluginRegistry.snapshot());
}

export function handleSelectPlugin(pluginId: string): void {
  if (!mainWindow) return;
  const record = pluginId === HUB_MANIFEST.id ? { manifest: HUB_MANIFEST } : pluginRegistry.get(pluginId);
  if (!record) return;
  void mountAndShow(mainWindow, record.manifest, pluginId === HUB_MANIFEST.id);
}

export async function handleDialogOpenFile(
  _event: IpcMainInvokeEvent,
  properties: string[],
  filters?: { name: string; extensions: string[] }[]
): Promise<Result<{ canceled: boolean; filePaths: string[] }>> {
  if (!mainWindow) return err("DIALOG_CANCELED", "No window");
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: properties as any,
    filters,
  });
  return ok({ canceled: result.canceled, filePaths: result.filePaths });
}
