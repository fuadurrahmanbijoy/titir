/** Closed enum of real system-access categories a plugin's preload may use. See Shell Guide §4.3. */
export type Capability = "filesystem" | "process" | "network" | "system_info";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  preload: string;
  capabilities?: Capability[];
  icon?: string;
  summary?: string;
  minShellVersion?: string;
}

export type PluginLifecycleState =
  | "installed" // registered, never mounted
  | "mounted" // view created, currently hidden or visible
  | "visible"
  | "hidden"
  | "mount-failed"
  | "crashed";

export interface PluginRecord {
  manifest: PluginManifest;
  enabled: boolean;
  order: number;
  acknowledgedCapabilities: Capability[];
  state: PluginLifecycleState;
}

export interface RegistrySnapshot {
  activePluginId: string | null;
  plugins: PluginRecord[];
}

export interface ShellConfig {
  window: { width: number; height: number; x?: number; y?: number };
  activePluginId: string | null;
  plugins: Array<{ id: string; enabled: boolean; order: number; acknowledgedCapabilities: Capability[] }>;
}

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
