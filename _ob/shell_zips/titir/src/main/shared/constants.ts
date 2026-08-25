/**
 * Cross-process layout constants.
 *
 * Imported by both the main process (window bounds math) and the shell
 * renderer (visual column width / titlebar height). Never redeclare these
 * values anywhere else — a second hardcoded literal is a bug (§20).
 */

/** Fixed width, in pixels, of the navigation column. Never changes with window size. */
export const NAV_WIDTH = 72;

/** Fixed height, in pixels, of the window-controls row atop the nav column. */
export const TITLEBAR_HEIGHT = 40;

/** Debounce window, in ms, for relaunching a crashed/mount-failed plugin. */
export const RELAUNCH_DEBOUNCE_MS = 2000;
