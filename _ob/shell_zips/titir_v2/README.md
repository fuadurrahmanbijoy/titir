# TiTir

A thin desktop host application that loads, launches, and displays
independently-built plugins. Built against `docs/shell-guide.md` v1.0.

> TiTir is a collection of apps, not one app.

## Build & run

```bash
npm install
npm run build      # tsc (main) -> vite (shell renderer) -> tsc (built-in Hub)
npm start           # build, then launch electron .
```

## Layout

- `src/main/` — main process: window, plugin lifecycle, IPC, config store.
- `src/renderer/` — the shell's own React tree: nav column + idle state only.
- `plugins/builtin/hub/` — the built-in Hub (`titir.hub`), install/uninstall/
  enable/reorder UI for every other plugin.
- `plugins/installed/` — where runtime-installed `.titirpkg` plugins land.
- `docs/shell-guide.md` — the authoritative spec this build follows.

## Design system

The shell renderer and the Hub's own UI are styled against Fluent 2 /
Teams-style tokens, hand-declared as CSS custom properties in
`src/renderer/theme.css` (and mirrored locally in
`plugins/builtin/hub/style.css`, since a plugin's own styling is never
shared with the shell's — see shell-guide.md §2, "no enforced visual design
system for a plugin's own interior"). Every value used in component code
references one of these tokens rather than a raw hex/pixel/curve.

## What's intentionally not built

Per shell-guide.md §2: a plugin marketplace or auto-update, any technical
restriction on what a mounted plugin's code can do, a shared UI kit imposed
on plugin authors, and multi-window support. See §4 for the trust model
this all follows from.
