import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { ShellConfig, defaultShellConfig } from "../shared/types";

const CONFIG_FILENAME = "titir.config.json";

function configPath(): string {
  return path.join(app.getPath("userData"), CONFIG_FILENAME);
}

function isShellConfig(value: unknown): value is ShellConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.window !== "object" || v.window === null) return false;
  const w = v.window as Record<string, unknown>;
  if (typeof w.width !== "number" || typeof w.height !== "number") return false;
  if (!("x" in w) || !("y" in w)) return false;
  if (v.activePluginId !== null && typeof v.activePluginId !== "string") return false;
  if (!Array.isArray(v.plugins)) return false;
  for (const p of v.plugins as unknown[]) {
    if (typeof p !== "object" || p === null) return false;
    const pp = p as Record<string, unknown>;
    if (typeof pp.id !== "string") return false;
    if (typeof pp.enabled !== "boolean") return false;
    if (typeof pp.order !== "number") return false;
    if (!Array.isArray(pp.acknowledgedCapabilities)) return false;
  }
  return true;
}

/**
 * §18 — Single-writer config store. Every write passes through this one
 * serialized promise chain, so a torn/half-written config file is
 * structurally impossible.
 */
class ConfigStore {
  private writeQueue: Promise<void> = Promise.resolve();
  private cached: ShellConfig | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingWrite: ShellConfig | null = null;

  /** §9.4 — corrupt-file recovery, exact behavior. Called once at boot. */
  load(): ShellConfig {
    const file = configPath();
    if (!fs.existsSync(file)) {
      const fresh = defaultShellConfig();
      this.cached = fresh;
      this.writeSync(fresh);
      return fresh;
    }

    try {
      const raw = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(raw);
      if (!isShellConfig(parsed)) {
        throw new Error("schema validation failed");
      }
      this.cached = parsed;
      return parsed;
    } catch (e) {
      // Corrupt file: rename, replace with defaults, continue booting.
      console.error(`[config-store] CONFIG_CORRUPT: ${(e as Error).message}`);
      try {
        const corruptPath = `${file}.corrupt-${Date.now()}`;
        fs.renameSync(file, corruptPath);
        console.error(`[config-store] preserved corrupt file at ${corruptPath}`);
      } catch (renameErr) {
        console.error(`[config-store] failed to preserve corrupt file: ${(renameErr as Error).message}`);
      }
      const fresh = defaultShellConfig();
      this.cached = fresh;
      this.writeSync(fresh);
      return fresh;
    }
  }

  get(): ShellConfig {
    if (!this.cached) return this.load();
    return this.cached;
  }

  /** Immediate, queued write — used for non-geometry changes (registry mutations). */
  async write(next: ShellConfig): Promise<void> {
    this.cached = next;
    this.writeQueue = this.writeQueue.then(() => this.writeSync(next));
    return this.writeQueue;
  }

  /** Debounced write — used for window geometry (§9.4/§10, resize/move spam). */
  writeDebounced(next: ShellConfig, delayMs = 250): void {
    this.cached = next;
    this.pendingWrite = next;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const toWrite = this.pendingWrite;
      this.pendingWrite = null;
      if (toWrite) {
        this.writeQueue = this.writeQueue.then(() => this.writeSync(toWrite));
      }
    }, delayMs);
  }

  private async writeSync(config: ShellConfig): Promise<void> {
    const file = configPath();
    const tmp = `${file}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(config, null, 2), "utf-8");
    await fs.promises.rename(tmp, file);
  }
}

export const configStore = new ConfigStore();
