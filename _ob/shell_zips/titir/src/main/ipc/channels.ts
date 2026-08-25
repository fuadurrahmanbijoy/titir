import { ipcMain } from "electron";
import { err } from "../shared/types";
import {
  InstallPluginPayload,
  UninstallPluginPayload,
  SetPluginEnabledPayload,
  ReorderPluginsPayload,
  DialogOpenFilePayload,
} from "./schemas";
import {
  handleInstallPlugin,
  handleUninstallPlugin,
  handleSetEnabled,
  handleReorder,
  handleGetSnapshot,
  handleSelectPlugin,
  handleDialogOpenFile,
} from "../plugins/plugin-manager";

export function registerPluginChannels(): void {
  ipcMain.handle("titir:installPlugin", async (_event, payload) => {
    const parsed = InstallPluginPayload.safeParse(payload);
    if (!parsed.success) return err("IPC_INVALID_PAYLOAD", "Malformed installPlugin payload");
    return handleInstallPlugin(parsed.data.packagePath);
  });

  ipcMain.handle("titir:uninstallPlugin", async (_event, payload) => {
    const parsed = UninstallPluginPayload.safeParse(payload);
    if (!parsed.success) return err("IPC_INVALID_PAYLOAD", "Malformed uninstallPlugin payload");
    return handleUninstallPlugin(parsed.data.pluginId);
  });

  ipcMain.handle("titir:setPluginEnabled", (_event, payload) => {
    const parsed = SetPluginEnabledPayload.safeParse(payload);
    if (!parsed.success) return err("IPC_INVALID_PAYLOAD", "Malformed setPluginEnabled payload");
    return handleSetEnabled(parsed.data.pluginId, parsed.data.enabled);
  });

  ipcMain.handle("titir:reorderPlugins", (_event, payload) => {
    const parsed = ReorderPluginsPayload.safeParse(payload);
    if (!parsed.success) return err("IPC_INVALID_PAYLOAD", "Malformed reorderPlugins payload");
    return handleReorder(parsed.data.orderedIds);
  });

  ipcMain.handle("titir:getSnapshot", () => handleGetSnapshot());

  ipcMain.handle("titir:selectPlugin", (_event, pluginId: string) => {
    handleSelectPlugin(pluginId);
    return { ok: true, data: undefined };
  });

  ipcMain.handle("dialog:openFile", async (event, payload) => {
    const parsed = DialogOpenFilePayload.safeParse(payload);
    if (!parsed.success) return err("IPC_INVALID_PAYLOAD", "Malformed dialog:openFile payload");
    return handleDialogOpenFile(event, parsed.data.properties, parsed.data.filters);
  });
}
