import { Capability, CAPABILITIES } from "../shared/types";

export { Capability, CAPABILITIES };

export const CAPABILITY_DESCRIPTIONS: Record<Capability, string> = {
  filesystem: "Read or write files and directories on this machine.",
  process: "Spawn or control other programs on this machine.",
  network: "Open raw network sockets (beyond ordinary web requests).",
  system_info: "Read OS/hardware details beyond what a web page normally sees."
};

export function isKnownCapability(value: string): value is Capability {
  return (CAPABILITIES as string[]).includes(value);
}

/**
 * §4.3 — UNGOVERNED. This function exists purely to shape what is shown to
 * the person during install-time disclosure (§8 step 5). It changes nothing
 * about what the shell technically grants: every mounted plugin's preload
 * runs under the identical sandbox: false environment (§5.1) regardless of
 * what it declares here or whether disclosure even applies.
 */
export function describeForDisclosure(capabilities: Capability[]): string[] {
  return capabilities.map((c) => `${c} — ${CAPABILITY_DESCRIPTIONS[c]}`);
}
