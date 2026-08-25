import { z } from "zod";

export const InstallPluginPayload = z.object({
  packagePath: z.string().min(1),
});

export const UninstallPluginPayload = z.object({
  pluginId: z.string().min(1),
});

export const SetPluginEnabledPayload = z.object({
  pluginId: z.string().min(1),
  enabled: z.boolean(),
});

export const ReorderPluginsPayload = z.object({
  orderedIds: z.array(z.string().min(1)),
});

export const GetSnapshotPayload = z.object({});

export const DialogOpenFilePayload = z.object({
  properties: z.array(z.string()),
  filters: z
    .array(z.object({ name: z.string(), extensions: z.array(z.string()) }))
    .optional(),
});

export const WindowActionPayload = z.object({});

export const CapabilityEnum = z.enum(["filesystem", "process", "network", "system_info"]);

export const PluginManifestSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9.-]+$/, "id must match ^[a-z0-9.-]+$"),
  name: z.string().min(1),
  version: z.string().min(1),
  entry: z.string().min(1),
  preload: z.string().min(1),
  capabilities: z.array(CapabilityEnum).min(1).optional(),
  icon: z.string().optional(),
  summary: z.string().optional(),
  minShellVersion: z.string().optional(),
});
