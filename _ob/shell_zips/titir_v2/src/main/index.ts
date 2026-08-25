import { app, BrowserWindow } from "electron";
import { createShellWindow } from "./window/shell-window";
import { registerChannels } from "./ipc/channels";
import { wireBroadcast } from "./ipc/broadcast";
import { bootRegisterPlugins, bootMountHub } from "./plugins/plugin-manager";
import { configStore } from "./store/config-store";
import { lifecycle } from "./plugins/lifecycle";

let win: BrowserWindow | null = null;

function boot() {
  configStore.load(); // §9.4 — corrupt-file recovery happens here, before anything else reads config.
  bootRegisterPlugins(); // §7.4 — Hub registered every boot; §10 — previously-installed plugins re-read fresh.

  win = createShellWindow();
  lifecycle.attachWindow(win);
  wireBroadcast(win);
  registerChannels(() => win);
  bootMountHub(win);

  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(boot);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) boot();
});
