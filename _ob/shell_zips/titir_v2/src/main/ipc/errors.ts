// §13 — the single authoritative error contract. Every shell-mediated
// (Track One) operation returns Result<T>; nothing throws across the IPC
// boundary. The actual ErrorCode/Result types live in shared/types.ts so
// both main and renderer (type-only) can reference them.

export { ok, err } from "../shared/types";
export type { Result, ErrorCode } from "../shared/types";
