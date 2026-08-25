import { BrowserWindow } from "electron";

export function minimize(win: BrowserWindow) {
  win.minimize();
}

export function maximize(win: BrowserWindow) {
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
}

export function close(win: BrowserWindow) {
  win.close();
}
