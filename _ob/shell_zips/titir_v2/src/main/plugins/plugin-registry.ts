import { EventEmitter } from "events";
import {
  Capability,
  PluginManifest,
  PluginRuntimeState,
  PluginSnapshotEntry,
  RegistrySnapshot
} from "../shared/types";
import { configStore } from "../store/config-store";
import { HUB_PLUGIN_ID } from "../shared/constants";

interface RegistryEntry {
  manifest: PluginManifest;
  enabled: boolean;
  order: number;
  acknowledgedCapabilities: Capability[];
  state: PluginRuntimeState;
  isHub: boolean;
}

/**
 * §18 — Per-plugin transition lock. A second transition request for the
 * same pluginId while one is in flight is queued behind it, never run
 * concurrently against the same plugin's state.
 */
class TransitionLock {
  private queues = new Map<string, Promise<unknown>>();

  async run<T>(pluginId: string, fn: () => Promise<T>): Promise<T> {
    const prior = this.queues.get(pluginId) ?? Promise.resolve();
    const next = prior.then(fn, fn);
    // Swallow rejection for chaining purposes only; caller still awaits `next`.
    this.queues.set(
      pluginId,
      next.catch(() => undefined)
    );
    return next;
  }
}

export class PluginRegistry extends EventEmitter {
  private entries = new Map<string, RegistryEntry>();
  private lock = new TransitionLock();
  activePluginId: string | null = null;

  /** Called once at boot after each installed plugin's manifest.json is re-read fresh (§10). */
  registerFromBoot(manifest: PluginManifest, enabled: boolean, order: number, acknowledgedCapabilities: Capability[]) {
    this.entries.set(manifest.id, {
      manifest,
      enabled,
      order,
      acknowledgedCapabilities,
      state: "registered",
      isHub: manifest.id === HUB_PLUGIN_ID
    });
  }

  /** §7.4 — the Hub is unconditionally registered/mounted every boot, never in plugins[]. */
  registerHub(manifest: PluginManifest) {
    this.entries.set(manifest.id, {
      manifest,
      enabled: true,
      order: -1,
      acknowledgedCapabilities: [],
      state: "registered",
      isHub: true
    });
  }

  registerNewInstall(manifest: PluginManifest, acknowledgedCapabilities: Capability[]) {
    const nextOrder = this.maxNonHubOrder() + 1;
    this.entries.set(manifest.id, {
      manifest,
      enabled: true,
      order: nextOrder,
      acknowledgedCapabilities,
      state: "registered",
      isHub: false
    });
  }

  private maxNonHubOrder(): number {
    let max = -1;
    for (const e of this.entries.values()) {
      if (!e.isHub) max = Math.max(max, e.order);
    }
    return max;
  }

  get(pluginId: string): RegistryEntry | undefined {
    return this.entries.get(pluginId);
  }

  has(pluginId: string): boolean {
    return this.entries.has(pluginId);
  }

  isHub(pluginId: string): boolean {
    return this.entries.get(pluginId)?.isHub ?? false;
  }

  remove(pluginId: string) {
    this.entries.delete(pluginId);
  }

  setState(pluginId: string, state: PluginRuntimeState) {
    const e = this.entries.get(pluginId);
    if (e) e.state = state;
  }

  setEnabled(pluginId: string, enabled: boolean) {
    const e = this.entries.get(pluginId);
    if (e) e.enabled = enabled;
  }

  reorder(orderedIds: string[]) {
    orderedIds.forEach((id, index) => {
      const e = this.entries.get(id);
      if (e && !e.isHub) e.order = index;
    });
  }

  /** §18 — every lifecycle transition for a given plugin acquires this lock first. */
  async withTransitionLock<T>(pluginId: string, fn: () => Promise<T>): Promise<T> {
    return this.lock.run(pluginId, fn);
  }

  snapshot(): RegistrySnapshot {
    const plugins: PluginSnapshotEntry[] = [...this.entries.values()]
      .filter((e) => !e.isHub)
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        id: e.manifest.id,
        name: e.manifest.name,
        summary: e.manifest.summary,
        icon: e.manifest.icon,
        enabled: e.enabled,
        order: e.order,
        capabilities: e.manifest.capabilities ?? [],
        acknowledgedCapabilities: e.acknowledgedCapabilities,
        state: e.state
      }));
    return { plugins, activePluginId: this.activePluginId };
  }

  /** Persists enabled/order/acknowledgedCapabilities into titir.config.json (Hub excluded, §7.4/§10). */
  async persist(): Promise<void> {
    const current = configStore.get();
    const plugins = [...this.entries.values()]
      .filter((e) => !e.isHub)
      .map((e) => ({
        id: e.manifest.id,
        enabled: e.enabled,
        order: e.order,
        acknowledgedCapabilities: e.acknowledgedCapabilities
      }));
    await configStore.write({
      ...current,
      activePluginId: this.activePluginId,
      plugins
    });
  }

  emitChanged(reason: "installed" | "uninstalled" | "enabled-changed" | "reordered") {
    this.emit("changed", { reason, snapshot: this.snapshot() });
  }
}

export const pluginRegistry = new PluginRegistry();
