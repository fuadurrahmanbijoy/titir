# TiTir

A thin desktop host application, built to the TiTir Shell Guide (v1.0),
styled to read as a Microsoft Teams–style Fluent 2 desktop app — **light
mode only**.

## What's here

- **Electron + TypeScript** main process: frameless window, IPC (zod-validated,
  `Result<T>` error contract), single-writer config store, zip-slip-safe
  plugin installer, per-plugin lifecycle locks, crash isolation.
- **React + Vite** shell renderer: the navigation column only — window
  controls, the plugin icon list, and the pinned Hub slot. Plugin content
  itself is drawn natively via `WebContentsView`, never React.
- A built-in **Hub** plugin (`plugins/builtin/hub/`) for installing,
  enabling, and reordering every other plugin.

## Visual notes (per the design brief)

- Fluent 2 alias tokens, light theme only (`src/renderer/styles/theme.css`)
  — no `prefers-color-scheme` handling, no dark variants.
- Nav rail uses `colorNeutralBackgroundStatic` (`#333333`) — fixed dark,
  same as the real Teams client, even though the rest of the shell is light.
- Window controls are macOS-style traffic lights, but stacked **vertically**
  inside the nav column's top titlebar row, with the standard hover glyphs.
- Icons are exclusively from `@fluentui/react-icons` (Fluent System Icons),
  24px in the nav rail, with the Regular → Filled swap and brand-colored
  left-edge indicator bar on the active item — Teams' signature nav detail.
- All transitions use token durations/curves (`durationFast`/`curveEasyEase`,
  etc.) and respect `prefers-reduced-motion`.

## Run it

```bash
npm install
npm run build      # tsc for main/preload, then Vite for the renderer
npm start           # build, then launch electron .
```

For iterative renderer work: `npm run dev:renderer` runs Vite's dev server
for the shell UI in isolation (the nav column, idle state, crash toast) —
plugin views themselves only render inside the real Electron window.

## Where things live

See `docs/shell-guide.md` for the authoritative spec this was built against —
directory layout, the trust model (§4), the IPC contract (§12), and the
definition-of-done checklist (§20).

## Known gaps against the full v1 spec

This build focuses on getting the shell — window chrome, nav column, IPC
plumbing, install pipeline, crash handling — functionally correct and
visually right. A few things a production pass would still want:

- The Hub's plugin list has no true drag-reorder UI yet (the nav column's
  own plugin icons do); Hub currently only supports install/enable/uninstall.
- No automated test suite. `npm run typecheck:renderer` and
  `tsc -p tsconfig.json --noEmit` both pass clean as of this build.
- App icon / installer packaging (electron-builder config, `build-resources/`)
  is not wired up — `npm start` runs the unpacked app only.
