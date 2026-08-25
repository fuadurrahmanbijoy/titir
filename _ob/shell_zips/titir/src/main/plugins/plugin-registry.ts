import { EventEmitter } from "node:events";
import type { PluginRecord, RegistrySnapshot, ShellConfig } from "../shared/types";
import { readConfig, writeConfig } from "../store/config-store";

/**
 * Per-pluginId lock so a second lifecycle transition for the same plugin,
 * requested while one is already in flight, queues behind it instead of
 * running concurrently (Shell Guide §18).
 */
const locks = new Map<string, Promise<unknown>>();

export function withPluginLock<T>(pluginId: string, fn: () => Promise<T>): Promise<T> {
  const prior = locks.get(pluginId) ?? Promise.resolve();
  const next = prior.then(fn, fn);
  locks.set(
    pluginId,
    next.catch(() => undefined)
  );
  return next;
}

class PluginRegistry extends EventEmitter {
  private records = new Map<string, PluginRecord>();
  private activePluginId: string | null = null;

  async bootstrap(): Promise<void> {
    const config = await readConfig();
    this.activePluginId = config.activePluginId;
    // Third-party plugin records are re-derived from disk manifests by the
    // installer/loader at boot in a full build; the in-memory shape below
    // is what the registry exposes to the shell renderer either way.
    for (const p of config.plugins) {
      const existing = this.records.get(p.id);
      if (existing) {
        existing.enabled = p.enabled;
        existing.order = p.order;
        existing.acknowledgedCapabilities = p.acknowledgedCapabilities;
      }
    }
  }

  register(record: PluginRecord): void {
    this.records.set(record.manifest.id, record);
    this.persist();
    this.emit("changed", { reason: "installed" });
  }

  unregister(pluginId: string): void {
    this.records.delete(pluginId);
    if (this.activePluginId === pluginId) this.activePluginId = null;
    this.persist();
    this.emit("changed", { reason: "uninstalled" });
  }

  setEnabled(pluginId: string, enabled: boolean): void {
    const rec = this.records.get(pluginId);
    if (!rec) return;
    rec.enabled = enabled;
    this.persist();
    this.emit("changed", { reason: "enabled-changed" });
  }

  reorder(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const rec = this.records.get(id);
      if (rec) rec.order = index;
    });
    this.persist();
    this.emit("changed", { reason: "reordered" });
  }

  setActive(pluginId: string | null): void {
    this.activePluginId = pluginId;
    this.persist();
  }

  setState(pluginId: string, state: PluginRecord["state"]): void {
    const rec = this.records.get(pluginId);
    if (rec) rec.state = state;
  }

  get(pluginId: string): PluginRecord | undefined {
    return this.records.get(pluginId);
  }

  snapshot(): RegistrySnapshot {
    return {
      activePluginId: this.activePluginId,
      plugins: [...this.records.values()].sort((a, b) => a.order - b.order),
    };
  }

  private persist(): void {
    const config: ShellConfig = {
      window: { width: 1200, height: 800 }, // window geometry owned/overwritten by shell-window.ts
      activePluginId: this.activePluginId,
      plugins: [...this.records.values()].map((r) => ({
        id: r.manifest.id,
        enabled: r.enabled,
        order: r.order,
        acknowledgedCapabilities: r.acknowledgedCapabilities,
      })),
    };
    void writeConfig(config);
  }
}

export const pluginRegistry = new PluginRegistry();
