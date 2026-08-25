import * as fs from "fs";
import * as path from "path";
import * as yauzl from "yauzl";
import { app, dialog } from "electron";
import { validateManifest } from "./manifest-schema";
import { isKnownCapability, describeForDisclosure } from "./capabilities";
import { pluginRegistry } from "./plugin-registry";
import { Result, ok, err, PluginManifest } from "../shared/types";

function installedRoot(): string {
  return path.join(app.getAppPath(), "plugins", "installed");
}

/**
 * §8 step 1 — resolves every zip entry's absolute target path *before*
 * writing a single byte. Any entry resolving outside targetDir refuses the
 * entire install (zip-slip). Runs before manifest.json is even read.
 */
async function extractWithPathSafety(zipPath: string, targetDir: string): Promise<Result<void>> {
  return new Promise((resolve) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr || !zipfile) {
        resolve(err("INSTALL_ZIP_SLIP", `Could not open package: ${openErr?.message ?? "unknown error"}`));
        return;
      }

      const cleanup = () => {
        try {
          fs.rmSync(targetDir, { recursive: true, force: true });
        } catch {
          // best-effort cleanup
        }
      };

      zipfile.readEntry();

      zipfile.on("entry", (entry: yauzl.Entry) => {
        const resolvedTarget = path.resolve(targetDir, entry.fileName);
        const relative = path.relative(targetDir, resolvedTarget);

        // Zip-slip check: the resolved path must stay inside targetDir.
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          zipfile.close();
          cleanup();
          resolve(err("INSTALL_ZIP_SLIP", `Entry "${entry.fileName}" resolves outside the install directory.`));
          return;
        }

        if (/\/$/.test(entry.fileName)) {
          // Directory entry.
          fs.mkdirSync(resolvedTarget, { recursive: true });
          zipfile.readEntry();
          return;
        }

        fs.mkdirSync(path.dirname(resolvedTarget), { recursive: true });
        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            zipfile.close();
            cleanup();
            resolve(err("INSTALL_ZIP_SLIP", `Could not read entry "${entry.fileName}".`));
            return;
          }
          const writeStream = fs.createWriteStream(resolvedTarget);
          readStream.pipe(writeStream);
          writeStream.on("finish", () => zipfile.readEntry());
          writeStream.on("error", () => {
            zipfile.close();
            cleanup();
            resolve(err("INSTALL_ZIP_SLIP", `Could not write entry "${entry.fileName}".`));
          });
        });
      });

      zipfile.on("end", () => resolve(ok(undefined)));
      zipfile.on("error", (zerr) => {
        cleanup();
        resolve(err("INSTALL_ZIP_SLIP", `Archive read error: ${zerr.message}`));
      });
    });
  });
}

/** §8 — the full, exact-order installation pipeline. Always run behind the §18 single-writer queue. */
export async function installPlugin(packagePath: string): Promise<Result<{ pluginId: string }>> {
  const tempTargetDir = path.join(installedRoot(), `__staging-${Date.now()}`);

  // Step 1 — path-safety extraction into a staging dir (id unknown yet).
  const extractResult = await extractWithPathSafety(packagePath, tempTargetDir);
  if (!extractResult.ok) return extractResult;

  const cleanupStaging = () => {
    try {
      fs.rmSync(tempTargetDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  };

  // Step 2/3 — manifest validation.
  const manifestPath = path.join(tempTargetDir, "manifest.json");
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    cleanupStaging();
    return err("INSTALL_INVALID_MANIFEST", "manifest.json is missing or is not valid JSON.");
  }

  const validated = validateManifest(manifestJson);
  if (!validated.ok) {
    cleanupStaging();
    return validated;
  }
  const manifest: PluginManifest = validated.data;

  if (pluginRegistry.has(manifest.id)) {
    cleanupStaging();
    return err("INSTALL_DUPLICATE_ID", `A plugin with id "${manifest.id}" is already installed.`);
  }

  if (manifest.capabilities) {
    for (const c of manifest.capabilities) {
      if (!isKnownCapability(c)) {
        cleanupStaging();
        return err("INSTALL_INVALID_CAPABILITY", `Unrecognized capability "${c}".`);
      }
    }
  }

  // Step 4 — entry/preload path existence.
  const entryPath = path.join(tempTargetDir, manifest.entry);
  const preloadPath = path.join(tempTargetDir, manifest.preload);
  if (!fs.existsSync(entryPath) || !fs.existsSync(preloadPath)) {
    cleanupStaging();
    return err("INSTALL_MISSING_ENTRY_FILE", `"${manifest.entry}" or "${manifest.preload}" not found in the package.`);
  }

  // Step 5 — capability disclosure, if any declared.
  const capabilities = manifest.capabilities ?? [];
  if (capabilities.length > 0) {
    const lines = describeForDisclosure(capabilities);
    const { response } = await dialog.showMessageBox({
      type: "warning",
      title: `Install "${manifest.name}"?`,
      message: `"${manifest.name}" requests the following capabilities:`,
      detail: lines.join("\n"),
      buttons: ["Cancel", "Install"],
      defaultId: 1,
      cancelId: 0
    });
    if (response !== 1) {
      cleanupStaging();
      return err("INSTALL_DISCLOSURE_DECLINED", "Install canceled — capability disclosure was not confirmed.");
    }
  }

  // Move staging dir to its final, id-named home.
  const finalDir = path.join(installedRoot(), manifest.id);
  fs.mkdirSync(installedRoot(), { recursive: true });
  fs.renameSync(tempTargetDir, finalDir);

  // Step 6 — registration.
  pluginRegistry.registerNewInstall(manifest, capabilities);
  await pluginRegistry.persist();

  // Step 7 — broadcast happens in the caller (plugin-manager.ts), which owns
  // the ipcMain.handle and the renderer push.
  return ok({ pluginId: manifest.id });
}

/** Reverse of install: unmount (caller's responsibility), deregister, delete from disk. */
export async function uninstallPlugin(pluginId: string): Promise<Result<void>> {
  if (!pluginRegistry.has(pluginId)) {
    return err("UNINSTALL_NOT_FOUND", `No installed plugin with id "${pluginId}".`);
  }
  pluginRegistry.remove(pluginId);
  await pluginRegistry.persist();
  try {
    fs.rmSync(path.join(installedRoot(), pluginId), { recursive: true, force: true });
  } catch (e) {
    console.error(`[plugin-installer] failed to delete files for ${pluginId}: ${(e as Error).message}`);
  }
  return ok(undefined);
}
