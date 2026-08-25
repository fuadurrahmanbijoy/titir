import { BrowserWindow, WebContentsView } from "electron";
import { EventEmitter } from "events";
import { PluginManifest, PluginCrashReason } from "../shared/types";
import { createPluginView } from "./plugin-loader";
import { pluginRegistry } from "./plugin-registry";
import { NAV_WIDTH, RELAUNCH_DEBOUNCE_MS } from "../shared/constants";

interface MountedView {
  manifest: PluginManifest;
  view: WebContentsView;
}

class Lifecycle extends EventEmitter {
  private mountedViews = new Map<string, MountedView>();
  private relaunchDebounce = new Map<string, number>();
  private win: BrowserWindow | null = null;

  attachWindow(win: BrowserWindow) {
    this.win = win;
    win.on("resize", () => this.reapplyVisibleBounds());
  }

  isMounted(pluginId: string): boolean {
    return this.mountedViews.has(pluginId);
  }

  getWebContentsId(pluginId: string): number | null {
    return this.mountedViews.get(pluginId)?.view.webContents.id ?? null;
  }

  /** §9 — a plugin is never mounted before its icon is first clicked. */
  async mount(manifest: PluginManifest): Promise<void> {
    if (!this.win) throw new Error("lifecycle: no window attached");
    if (this.mountedViews.has(manifest.id)) return;

    await pluginRegistry.withTransitionLock(manifest.id, async () => {
      const view = createPluginView(manifest);

      view.webContents.on("preload-error", (_event, _preloadPath, error) => {
        // §9.2 — preload threw synchronously: mount-failed, distinct from crashed.
        this.teardown(manifest.id);
        pluginRegistry.setState(manifest.id, "mount-failed");
        this.emitCrash(manifest.id, "mount-failed", error);
      });

      view.webContents.on("render-process-gone", () => {
        // §15 — renderer process died: crashed. Registry entry untouched.
        this.teardown(manifest.id);
        pluginRegistry.setState(manifest.id, "crashed");
        this.emitCrash(manifest.id, "crashed");
      });

      this.win!.contentView.addChildView(view);
      this.mountedViews.set(manifest.id, { manifest, view });
      pluginRegistry.setState(manifest.id, "mounted");
    });
  }

  /** Shows this plugin (mounting first if needed) and hides whichever was previously shown. */
  async show(manifest: PluginManifest): Promise<void> {
    if (!this.isMounted(manifest.id)) {
      await this.mount(manifest);
    }
    const previous = pluginRegistry.activePluginId;
    if (previous && previous !== manifest.id) {
      this.hideBounds(previous);
      if (pluginRegistry.get(previous)) pluginRegistry.setState(previous, "hidden");
    }
    pluginRegistry.activePluginId = manifest.id;
    pluginRegistry.setState(manifest.id, "visible");
    this.reapplyVisibleBounds();
  }

  private hideBounds(pluginId: string) {
    const mv = this.mountedViews.get(pluginId);
    if (mv) mv.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }

  /** §11 — recompute the visible plugin's bounds; called on show and on every window resize. */
  reapplyVisibleBounds() {
    if (!this.win) return;
    const activeId = pluginRegistry.activePluginId;
    if (!activeId) return;
    const mv = this.mountedViews.get(activeId);
    if (!mv) return;
    const [winW, winH] = this.win.getContentSize();
    mv.view.setBounds({
      x: NAV_WIDTH,
      y: 0,
      width: Math.max(0, winW - NAV_WIDTH),
      height: winH
    });
  }

  /** Tears down exactly one plugin's view; every other plugin and the shell are unaffected. */
  private teardown(pluginId: string) {
    const mv = this.mountedViews.get(pluginId);
    if (!mv || !this.win) return;
    try {
      this.win.contentView.removeChildView(mv.view);
    } catch {
      // view may already be gone
    }
    // WebContentsView has no explicit destroy(); dropping the reference and
    // removing it from the window releases the underlying WebContents.
    this.mountedViews.delete(pluginId);
    if (pluginRegistry.activePluginId === pluginId) {
      pluginRegistry.activePluginId = null;
    }
  }

  /** Explicit uninstall path: unmount if mounted (§8 reverse). */
  unmount(pluginId: string) {
    this.teardown(pluginId);
  }

  private emitCrash(pluginId: string, reason: PluginCrashReason, error?: unknown) {
    if (error) console.error(`[lifecycle] ${pluginId} ${reason}:`, error);
    this.emit("crash", { pluginId, reason });
  }

  /** §9.3 — manual relaunch only, debounced exactly 2000ms per pluginId. */
  async relaunch(manifest: PluginManifest): Promise<{ debounced: boolean }> {
    const now = Date.now();
    const last = this.relaunchDebounce.get(manifest.id) ?? 0;
    if (now - last < RELAUNCH_DEBOUNCE_MS) {
      return { debounced: true };
    }
    this.relaunchDebounce.set(manifest.id, now);
    await this.show(manifest);
    return { debounced: false };
  }
}

export const lifecycle = new Lifecycle();
