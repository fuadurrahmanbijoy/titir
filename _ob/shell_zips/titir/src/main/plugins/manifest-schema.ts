import type { PluginManifest, Result } from "../shared/types";
import { ok, err } from "../shared/types";
import { PluginManifestSchema } from "../ipc/schemas";

export function validateManifest(json: unknown): Result<PluginManifest> {
  const parsed = PluginManifestSchema.safeParse(json);
  if (!parsed.success) {
    return err("INSTALL_INVALID_MANIFEST", parsed.error.issues.map((i) => i.message).join("; "));
  }
  if (parsed.data.id.startsWith("titir.")) {
    return err("INSTALL_RESERVED_PREFIX", `"${parsed.data.id}" uses the reserved titir.* prefix`);
  }
  return ok(parsed.data as PluginManifest);
}
