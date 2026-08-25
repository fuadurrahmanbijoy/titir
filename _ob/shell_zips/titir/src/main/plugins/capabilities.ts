import type { Capability } from "../shared/types";

export const CAPABILITY_LABELS: Record<Capability, string> = {
  filesystem: "Read and write files on this computer",
  process: "Start or control other programs",
  network: "Open raw network connections",
  system_info: "Read hardware and OS details",
};

export function describeCapabilities(caps: Capability[]): string[] {
  return caps.map((c) => CAPABILITY_LABELS[c]);
}
