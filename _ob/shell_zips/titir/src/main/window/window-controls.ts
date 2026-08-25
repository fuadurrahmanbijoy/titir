import { ipcMain, type BrowserWindow } from "electron";
import { ok, type Result } from "../shared/types";

export function registerWindowControls(win: BrowserWindow): void {
  ipcMain.handle("window:minimize", (): Result<void> => {
    win.minimize();
    return ok(undefined);
  });

  ipcMain.handle("window:maximize", (): Result<void> => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return ok(undefined);
  });

  ipcMain.handle("window:close", (): Result<void> => {
    win.close();
    return ok(undefined);
  });
}
