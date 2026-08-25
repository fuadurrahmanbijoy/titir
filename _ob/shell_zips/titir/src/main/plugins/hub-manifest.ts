import type { PluginManifest } from "../shared/types";

/** The Hub is not installed through the §8 pipeline — it ships with TiTir's own source. */
export const HUB_MANIFEST: PluginManifest = {
  id: "titir.hub",
  name: "Hub",
  version: "0.1.0",
  entry: "index.html",
  preload: "preload.js",
};
