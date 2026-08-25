import * as path from "path";
import { app, BrowserWindow } from "electron";
import { configStore } from "../store/config-store";
import { TITLEBAR_HEIGHT } from "../shared/constants";

/**
 * §6 — dist/main/ and dist/renderer/ are siblings under dist/. This file
 * compiles to dist/main/window/shell-window.js, two levels below dist/, so
 * loading the shell renderer's index.html needs ../../renderer/.
 */
function shellRendererIndex(): string {
  return path.join(__dirname, "../../renderer/index.html");
}

export function createShellWindow(): BrowserWindow {
  const config = configStore.get();

  const win = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    x: config.window.x ?? undefined,
    y: config.window.y ?? undefined,
    minWidth: 480,
    minHeight: 360,
    frame: false, // §16 — frameless, native OS chrome disabled entirely
    titleBarStyle: "hidden",
    backgroundColor: "#1F1F1F",
    webPreferences: {
      preload: path.join(__dirname, "../preload/shell-preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  win.loadFile(shellRendererIndex());

  const persistGeometry = () => {
    const bounds = win.getBounds();
    const current = configStore.get();
    configStore.writeDebounced({
      ...current,
      window: { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y }
    });
  };

  win.on("resize", persistGeometry);
  win.on("move", persistGeometry);

  return win;
}

export { TITLEBAR_HEIGHT };
