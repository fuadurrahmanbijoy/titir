import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from "electron";
import { z } from "zod";
import {
  installPluginSchema,
  uninstallPluginSchema,
  setPluginEnabledSchema,
  reorderPluginsSchema,
  getSnapshotSchema,
  openFileSchema
} from "./schemas";
import { err, ok, Result } from "../shared/types";
import {
  handleInstall,
  handleUninstall,
  handleSetEnabled,
  handleReorder,
  getSnapshot,
  mountAndShow,
  relaunchPlugin
} from "../plugins/plugin-manager";
import { pluginRegistry } from "../plugins/plugin-registry";
import { HUB_PLUGIN_ID } from "../shared/constants";
import { minimize, maximize, close } from "../window/window-controls";
import { lifecycle } from "../plugins/lifecycle";

let hubWebContentsId: number | null = null;
export function markHubWebContents(id: number) {
  hubWebContentsId = id;
}

/** §17 — defense-in-depth only; structural authorization is that a
 * non-Hub plugin's preload is never given these channels in the first place. */
function requireHubCaller(event: IpcMainInvokeEvent): Result<void> | null {
  if (hubWebContentsId !== null && event.sender.id === hubWebContentsId) return null;
  return err("IPC_UNAUTHORIZED_CALLER", "Only the Hub may call this channel.");
}

async function parsed<S extends z.ZodTypeAny>(schema: S, payload: unknown) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    return { ok: false as const, error: err("IPC_INVALID_PAYLOAD", "Payload failed schema validation.") };
  }
  return { ok: true as const, data: result.data as z.infer<S> };
}

export function registerChannels(getWindow: () => BrowserWindow | null) {
  ipcMain.handle("titir:installPlugin", async (event, payload) => {
    const unauthorized = requireHubCaller(event);
    if (unauthorized) return unauthorized;
    const p = await parsed(installPluginSchema, payload);
    if (!p.ok) return p.error;
    return handleInstall(p.data.packagePath);
  });

  ipcMain.handle("titir:uninstallPlugin", async (event, payload) => {
    const unauthorized = requireHubCaller(event);
    if (unauthorized) return unauthorized;
    const p = await parsed(uninstallPluginSchema, payload);
    if (!p.ok) return p.error;
    return handleUninstall(p.data.pluginId);
  });

  ipcMain.handle("titir:setPluginEnabled", async (event, payload) => {
    const unauthorized = requireHubCaller(event);
    if (unauthorized) return unauthorized;
    const p = await parsed(setPluginEnabledSchema, payload);
    if (!p.ok) return p.error;
    await handleSetEnabled(p.data.pluginId, p.data.enabled);
    return ok(undefined);
  });

  ipcMain.handle("titir:reorderPlugins", async (event, payload) => {
    const unauthorized = requireHubCaller(event);
    if (unauthorized) return unauthorized;
    const p = await parsed(reorderPluginsSchema, payload);
    if (!p.ok) return p.error;
    await handleReorder(p.data.orderedIds);
    return ok(undefined);
  });

  // Hub + shell renderer.
  ipcMain.handle("titir:getSnapshot", async (_event, payload) => {
    const p = await parsed(getSnapshotSchema, payload);
    if (!p.ok) return p.error;
    return ok(getSnapshot());
  });

  // Any plugin (including Hub) may open the file picker.
  ipcMain.handle("dialog:openFile", async (_event, payload) => {
    const p = await parsed(openFileSchema, payload);
    if (!p.ok) return p.error;
    const win = getWindow();
    if (!win) return err("IPC_INVALID_PAYLOAD", "No window available.");
    const result = await dialog.showOpenDialog(win, {
      properties: p.data.properties as any,
      filters: p.data.filters
    });
    return ok({ canceled: result.canceled, filePaths: result.filePaths });
  });

  // Shell renderer only, structurally: only shell-preload.ts exposes these.
  ipcMain.handle("window:minimize", async (_event, _payload) => {
    const win = getWindow();
    if (!win) return err("IPC_INVALID_PAYLOAD", "No window available.");
    minimize(win);
    return ok(undefined);
  });

  ipcMain.handle("window:maximize", async (_event, _payload) => {
    const win = getWindow();
    if (!win) return err("IPC_INVALID_PAYLOAD", "No window available.");
    maximize(win);
    return ok(undefined);
  });

  ipcMain.handle("window:close", async (_event, _payload) => {
    const win = getWindow();
    if (!win) return err("IPC_INVALID_PAYLOAD", "No window available.");
    close(win);
    return ok(undefined);
  });

  // Renderer -> main: mount + show a plugin (invoked when a nav icon is clicked).
  ipcMain.handle("titir:showPlugin", async (_event, payload) => {
    const win = getWindow();
    if (!win) return err("IPC_INVALID_PAYLOAD", "No window available.");
    const pluginId = String((payload as { pluginId?: unknown })?.pluginId ?? "");
    if (!pluginId || !pluginRegistry.has(pluginId)) {
      return err("IPC_INVALID_PAYLOAD", "Unknown pluginId.");
    }
    await mountAndShow(pluginId, win);
    if (pluginId === HUB_PLUGIN_ID) {
      const hubWcId = lifecycle.getWebContentsId(HUB_PLUGIN_ID);
      if (hubWcId !== null) markHubWebContents(hubWcId);
    }
    return ok(undefined);
  });

  ipcMain.handle("titir:relaunchPlugin", async (_event, payload) => {
    const pluginId = String((payload as { pluginId?: unknown })?.pluginId ?? "");
    if (!pluginId || !pluginRegistry.has(pluginId)) {
      return err("IPC_INVALID_PAYLOAD", "Unknown pluginId.");
    }
    const result = await relaunchPlugin(pluginId);
    return ok(result);
  });
}
