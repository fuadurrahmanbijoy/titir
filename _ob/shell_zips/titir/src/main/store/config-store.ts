import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ShellConfig } from "../shared/types";
import { CapabilityEnum } from "../ipc/schemas";

const ShellConfigSchema = z.object({
  window: z.object({
    width: z.number(),
    height: z.number(),
    x: z.number().optional(),
    y: z.number().optional(),
  }),
  activePluginId: z.string().nullable(),
  plugins: z.array(
    z.object({
      id: z.string(),
      enabled: z.boolean(),
      order: z.number(),
      acknowledgedCapabilities: z.array(CapabilityEnum),
    })
  ),
});

const DEFAULT_CONFIG: ShellConfig = {
  window: { width: 1200, height: 800 },
  activePluginId: null,
  plugins: [],
};

function configPath(): string {
  return path.join(app.getPath("userData"), "titir.config.json");
}

/**
 * All writes are funneled through this single promise chain so two
 * concurrent writers can never produce a torn or half-written file
 * (Shell Guide §18).
 */
let writeQueue: Promise<void> = Promise.resolve();

export async function readConfig(): Promise<ShellConfig> {
  try {
    const raw = await fs.readFile(configPath(), "utf-8");
    const parsed = ShellConfigSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    // CONFIG_CORRUPT (or missing) — rename what's there (if anything) and
    // boot from defaults rather than fail to launch (§9.4).
    try {
      await fs.rename(configPath(), `${configPath()}.corrupt-${Date.now()}`);
    } catch {
      /* nothing to rename — first boot */
    }
    await writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
}

export function writeConfig(config: ShellConfig): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const tmp = `${configPath()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(config, null, 2), "utf-8");
    await fs.rename(tmp, configPath());
  });
  return writeQueue;
}

let debounceTimer: NodeJS.Timeout | null = null;

/** Window geometry writes are debounced, not written on every intermediate resize/move event. */
export function debouncedWriteWindowGeometry(
  current: ShellConfig,
  geometry: ShellConfig["window"]
): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void writeConfig({ ...current, window: geometry });
  }, 300);
}
