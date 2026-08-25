import { BrowserWindow } from "electron";
import path from "node:path";
import { readConfig, debouncedWriteWindowGeometry } from "../store/config-store";
import { resizeVisible } from "../plugins/lifecycle";

export async function createShellWindow(): Promise<BrowserWindow> {
  const config = await readConfig();

  const win = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    x: config.window.x,
    y: config.window.y,
    minWidth: 720,
    minHeight: 480,
    frame: false, // native OS chrome disabled entirely — custom-drawn chrome (§16)
    backgroundColor: "#FFFFFF", // light mode only
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "shell-preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile(path.join(__dirname, "..", "..", "renderer", "index.html"));
  win.once("ready-to-show", () => win.show());

  const persistGeometry = () => {
    const bounds = win.getBounds();
    void debouncedWriteWindowGeometry(config, {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    });
  };

  win.on("resize", () => {
    persistGeometry();
    resizeVisible(win);
  });
  win.on("move", persistGeometry);

  return win;
}
