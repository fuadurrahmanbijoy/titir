// Cross-process layout constants (§11, §16). Consumed by both main-process
// bounds math and the shell renderer's own CSS/layout so the two values used
// for "where the plugin view sits" and "how wide the nav column is drawn"
// can never drift apart.

export const NAV_WIDTH = 72;
export const TITLEBAR_HEIGHT = 40;

// §9.3 — Relaunch debounce, exact number.
export const RELAUNCH_DEBOUNCE_MS = 2000;

// §7.4 / §7.1 — reserved id prefix for shell-owned plugins (the Hub).
export const RESERVED_ID_PREFIX = "titir.";
export const HUB_PLUGIN_ID = "titir.hub";

// §7.1 — id pattern.
export const PLUGIN_ID_PATTERN = /^[a-z0-9.-]+$/;
