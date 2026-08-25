import { pluginManifestSchema } from "../ipc/schemas";
import { PluginManifest, Result, ok, err } from "../shared/types";
import { RESERVED_ID_PREFIX } from "../shared/constants";

/**
 * §8 step 2/3 — schema validation via zod, then the two structural refusals
 * that aren't expressible as a bare zod shape: reserved id prefix, and
 * (elsewhere, by the caller who knows the current registry) duplicate id.
 * This function only knows about the manifest in isolation.
 */
export function validateManifest(json: unknown): Result<PluginManifest> {
  const parsed = pluginManifestSchema.safeParse(json);
  if (!parsed.success) {
    return err("INSTALL_INVALID_MANIFEST", `Manifest failed validation: ${parsed.error.message}`);
  }

  const manifest = parsed.data as PluginManifest;

  if (manifest.id.startsWith(RESERVED_ID_PREFIX)) {
    return err(
      "INSTALL_RESERVED_PREFIX",
      `Plugin id "${manifest.id}" uses the reserved "${RESERVED_ID_PREFIX}" prefix.`
    );
  }

  return ok(manifest);
}
