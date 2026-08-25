import { z } from "zod";

// §12.1 — every ipcMain.handle payload is validated against one of these
// before any handler logic runs (§17).

export const installPluginSchema = z.object({
  packagePath: z.string().min(1)
});

export const uninstallPluginSchema = z.object({
  pluginId: z.string().min(1)
});

export const setPluginEnabledSchema = z.object({
  pluginId: z.string().min(1),
  enabled: z.boolean()
});

export const reorderPluginsSchema = z.object({
  orderedIds: z.array(z.string().min(1))
});

export const getSnapshotSchema = z.object({});

export const openFileSchema = z.object({
  properties: z.array(z.string()),
  filters: z
    .array(
      z.object({
        name: z.string(),
        extensions: z.array(z.string())
      })
    )
    .optional()
});

export const windowActionSchema = z.object({});

// §4.3 / §7 — manifest schema, used by manifest-schema.ts during install.
export const capabilitySchema = z.enum([
  "filesystem",
  "process",
  "network",
  "system_info"
]);

export const pluginManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9.-]+$/),
  name: z.string().min(1),
  version: z.string().min(1),
  entry: z.string().min(1),
  preload: z.string().min(1),
  capabilities: z.array(capabilitySchema).min(1).optional(),
  icon: z.string().optional(),
  summary: z.string().optional(),
  minShellVersion: z.string().optional()
});
