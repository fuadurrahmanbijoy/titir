import { app } from "electron";
import { createShellWindow } from "./window/shell-window";
import { registerWindowControls } from "./window/window-controls";
import { registerPluginChannels } from "./ipc/channels";
import { bindShellWindow } from "./ipc/broadcast";
import { pluginRegistry } from "./plugins/plugin-registry";
import { bindWindow } from "./plugins/plugin-manager";
import { mountAndShow } from "./plugins/lifecycle";
import { HUB_MANIFEST } from "./plugins/hub-manifest";

async function main(): Promise<void> {
  await app.whenReady();

  await pluginRegistry.bootstrap();

  const win = await createShellWindow();
  bindWindow(win);
  bindShellWindow(win);
  registerWindowControls(win);
  registerPluginChannels();

  // Hub is unconditionally registered and mounted on every boot,
  // independent of titir.config.json (§7.4). It is not part of the
  // scrollable plugins[] list — see NavColumn's fixed bottom slot.
  void mountAndShow(win, HUB_MANIFEST, true);
  pluginRegistry.setActive(null); // idle state until the person clicks an icon (§11)

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

void main();
