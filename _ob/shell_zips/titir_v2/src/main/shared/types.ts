// Shared type definitions used by both main and (type-check-only) renderer.
// This file is never imported for runtime code in the renderer bundle beyond
// type positions — see tsconfig.renderer.json's include list.

// ---- §4.3 Capability -------------------------------------------------

export type Capability = "filesystem" | "process" | "network" | "system_info";

export const CAPABILITIES: readonly Capability[] = [
  "filesystem",
  "process",
  "network",
  "system_info"
];

// ---- §7 Plugin manifest ------------------------------------------------

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  preload: string;
  capabilities?: Capability[];
  icon?: string;
  summary?: string;
  minShellVersion?: string; // UNGOVERNED — never checked (§7.3)
}

// ---- §9 Runtime lifecycle state -----------------------------------------

export type PluginRuntimeState =
  | "registered"
  | "mounted"
  | "visible"
  | "hidden"
  | "mount-failed"
  | "crashed"
  | "unregistered";

// ---- §10 Persisted configuration schema ---------------------------------

export interface ShellConfig {
  window: { width: number; height: number; x: number | null; y: number | null };
  activePluginId: string | null;
  plugins: Array<{
    id: string;
    enabled: boolean;
    order: number;
    acknowledgedCapabilities: Capability[];
  }>;
}

export function defaultShellConfig(): ShellConfig {
  return {
    window: { width: 1200, height: 800, x: null, y: null },
    activePluginId: null,
    plugins: []
  };
}

// ---- Registry snapshot pushed to renderers (§9.1, §12.1) ----------------

export interface PluginSnapshotEntry {
  id: string;
  name: string;
  summary?: string;
  icon?: string;
  enabled: boolean;
  order: number;
  capabilities: Capability[];
  acknowledgedCapabilities: Capability[];
  state: PluginRuntimeState;
}

export interface RegistrySnapshot {
  plugins: PluginSnapshotEntry[];
  activePluginId: string | null;
}

// ---- §13 Error contract ---------------------------------------------------

export type ErrorCode =
  | "INSTALL_ZIP_SLIP"
  | "INSTALL_INVALID_MANIFEST"
  | "INSTALL_RESERVED_PREFIX"
  | "INSTALL_DUPLICATE_ID"
  | "INSTALL_MISSING_ENTRY_FILE"
  | "INSTALL_INVALID_CAPABILITY"
  | "INSTALL_DISCLOSURE_DECLINED"
  | "MOUNT_PRELOAD_FAILED"
  | "UNINSTALL_NOT_FOUND"
  | "IPC_INVALID_PAYLOAD"
  | "IPC_UNAUTHORIZED_CALLER"
  | "CONFIG_CORRUPT"
  | "DIALOG_CANCELED";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T>(code: ErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}

// ---- §12 IPC channel payload/response shapes -----------------------------

export interface InstallPluginRequest {
  packagePath: string;
}
export interface InstallPluginResponse {
  pluginId: string;
}

export interface UninstallPluginRequest {
  pluginId: string;
}

export interface SetPluginEnabledRequest {
  pluginId: string;
  enabled: boolean;
}

export interface ReorderPluginsRequest {
  orderedIds: string[];
}

export interface OpenFileRequest {
  properties: string[];
  filters?: { name: string; extensions: string[] }[];
}
export interface OpenFileResponse {
  canceled: boolean;
  filePaths: string[];
}

export type PluginsChangedReason =
  | "installed"
  | "uninstalled"
  | "enabled-changed"
  | "reordered";

export interface PluginsChangedEvent {
  reason: PluginsChangedReason;
  snapshot: RegistrySnapshot;
}

export type PluginCrashReason = "crashed" | "mount-failed";

export interface PluginCrashedEvent {
  pluginId: string;
  reason: PluginCrashReason;
}
