import yauzl from "yauzl";
import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import type { PluginManifest, PluginRecord, Result, Capability } from "../shared/types";
import { ok, err } from "../shared/types";
import { validateManifest } from "./manifest-schema";
import { pluginRegistry } from "./plugin-registry";

function installedRoot(): string {
  return path.join(app.getPath("userData"), "plugins", "installed");
}

/**
 * Serialized behind a single promise chain so two simultaneous
 * `.titirpkg` drops can never write to plugins/installed/ concurrently,
 * and an uninstall can never race an install of the same id (§18).
 */
let installQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = installQueue.then(fn, fn);
  installQueue = run.catch(() => undefined);
  return run;
}

async function rimraf(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

/** Extracts a .titirpkg entry-by-entry, refusing (and cleaning up) any zip-slip target. */
async function extractSafely(
  packagePath: string,
  targetDir: string
): Promise<Result<void>> {
  await fs.mkdir(targetDir, { recursive: true });

  return new Promise((resolve) => {
    yauzl.open(packagePath, { lazEntries: true } as any, (openErr, zipfile) => {
      if (openErr || !zipfile) {
        resolve(err("INSTALL_INVALID_MANIFEST", "Could not open package archive"));
        return;
      }
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        const resolvedTarget = path.resolve(targetDir, entry.fileName);
        // The one line this whole function exists for: refuse anything
        // that would land outside targetDir, before a byte is written.
        if (!resolvedTarget.startsWith(targetDir + path.sep) && resolvedTarget !== targetDir) {
          zipfile.close();
          void rimraf(targetDir);
          resolve(err("INSTALL_ZIP_SLIP", `Entry "${entry.fileName}" resolves outside the install directory`));
          return;
        }
        if (/\/$/.test(entry.fileName)) {
          fs.mkdir(resolvedTarget, { recursive: true }).then(() => zipfile.readEntry());
          return;
        }
        zipfile.openReadStream(entry, async (streamErr, readStream) => {
          if (streamErr || !readStream) {
            zipfile.close();
            void rimraf(targetDir);
            resolve(err("INSTALL_INVALID_MANIFEST", "Corrupt archive entry"));
            return;
          }
          await fs.mkdir(path.dirname(resolvedTarget), { recursive: true });
          const chunks: Buffer[] = [];
          readStream.on("data", (c) => chunks.push(c as Buffer));
          readStream.on("end", async () => {
            await fs.writeFile(resolvedTarget, Buffer.concat(chunks));
            zipfile.readEntry();
          });
        });
      });
      zipfile.on("end", () => resolve(ok(undefined)));
      zipfile.on("error", () => {
        void rimraf(targetDir);
        resolve(err("INSTALL_INVALID_MANIFEST", "Archive read error"));
      });
    });
  });
}

export interface InstallOptions {
  /** Called after manifest validation; must resolve true to proceed if capabilities is non-empty. */
  confirmDisclosure: (capabilities: Capability[]) => Promise<boolean>;
}

export function installPlugin(
  packagePath: string,
  options: InstallOptions
): Promise<Result<{ pluginId: string }>> {
  return enqueue(async () => {
    // Extract to a staging dir first; we don't know the id until the
    // manifest is parsed, and the final dir is named by id.
    const stagingDir = path.join(installedRoot(), `.staging-${Date.now()}`);
    const extracted = await extractSafely(packagePath, stagingDir);
    if (!extracted.ok) return extracted;

    let manifestJson: unknown;
    try {
      manifestJson = JSON.parse(await fs.readFile(path.join(stagingDir, "manifest.json"), "utf-8"));
    } catch {
      await rimraf(stagingDir);
      return err("INSTALL_INVALID_MANIFEST", "manifest.json missing or not valid JSON");
    }

    const validated = validateManifest(manifestJson);
    if (!validated.ok) {
      await rimraf(stagingDir);
      return validated;
    }
    const manifest: PluginManifest = validated.data;

    if (pluginRegistry.get(manifest.id)) {
      await rimraf(stagingDir);
      return err("INSTALL_DUPLICATE_ID", `A plugin with id "${manifest.id}" is already installed`);
    }

    const entryPath = path.join(stagingDir, manifest.entry);
    const preloadPath = path.join(stagingDir, manifest.preload);
    const [entryExists, preloadExists] = await Promise.all([
      fs.access(entryPath).then(() => true, () => false),
      fs.access(preloadPath).then(() => true, () => false),
    ]);
    if (!entryExists || !preloadExists) {
      await rimraf(stagingDir);
      return err("INSTALL_MISSING_ENTRY_FILE", "Declared entry or preload file does not exist in the package");
    }

    const caps = manifest.capabilities ?? [];
    if (caps.length > 0) {
      const confirmed = await options.confirmDisclosure(caps);
      if (!confirmed) {
        await rimraf(stagingDir);
        return err("INSTALL_DISCLOSURE_DECLINED", "Capability disclosure was declined");
      }
    }

    const finalDir = path.join(installedRoot(), manifest.id);
    await fs.rename(stagingDir, finalDir);

    const record: PluginRecord = {
      manifest,
      enabled: true,
      order: pluginRegistry.snapshot().plugins.length,
      acknowledgedCapabilities: caps,
      state: "installed",
    };
    pluginRegistry.register(record);

    return ok({ pluginId: manifest.id });
  });
}

export function uninstallPlugin(pluginId: string): Promise<Result<void>> {
  return enqueue(async () => {
    if (!pluginRegistry.get(pluginId)) {
      return err("UNINSTALL_NOT_FOUND", `No installed plugin with id "${pluginId}"`);
    }
    await rimraf(path.join(installedRoot(), pluginId));
    pluginRegistry.unregister(pluginId);
    return ok(undefined);
  });
}
