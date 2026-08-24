# TiTir — Technical Specification

**Project:** TiTir
**Author:** Bijoy
**Mascot:** PuFi
**Revision:** v2

---

## 0. What This Document Is

This is the complete, self-sufficient build specification for TiTir. It
is written so that a developer with no prior context could scaffold the
entire project from this file alone: every schema, every file path,
every IPC channel, every state transition, and every security rule
named here is a concrete decision, not a placeholder or an example to
be "figured out later." (§19 adds a short, optional excerpt of the
plugin guide purely for orientation — nothing in it is required
reading, and it introduces no new decision beyond what's already stated
in this document.)

Nothing in this document should be read as inspiration — it should be
read as instruction. Where a number, a field name, or a path is given,
that is the value to use, not an illustration of the kind of value to
use.

---

## 1. Core Idea

TiTir is a **desktop host application** that does not, itself, do very
much. What it does is load, isolate, and display **independently-built
plugins** — small, self-contained programs that are installed onto a
running copy of TiTir at runtime, not compiled into it.

The guiding philosophy, stated plainly:

> **TiTir is a collection of apps, not one app.**

Concretely, that means:

- TiTir ships with almost no built-in functionality of its own beyond
  the mechanism for loading, isolating, and switching between plugins.
- A plugin is written, built, and packaged entirely independently of
  TiTir's own source tree. TiTir never needs to be recompiled to gain a
  new plugin.
- Plugins are installed by the person using the app, at runtime, by
  handing TiTir a plugin package file. TiTir extracts it, validates it,
  and makes it available immediately — no restart, no rebuild.
- Every plugin runs in its own isolated environment. One plugin
  misbehaving, crashing, or being poorly written cannot corrupt,
  freeze, or read the state of another plugin, or of TiTir itself.
- TiTir provides a person exactly one consistent way to get from "I
  want to use plugin X" to "I am looking at plugin X's interface":  a
  persistent navigation column on one side of the window, and a content
  area on the other, that always shows whichever plugin is currently
  selected.

Everything else in this document — the process model, the package
format, the IPC contract, the state machine, the security hardening —
exists in service of that idea and nothing more.

---

## 2. Scope & Non-Goals

**In scope for this specification (v1):**

- The host application shell: window, navigation column, content area,
  plugin loading/unloading/switching.
- A runtime plugin-installation mechanism (drag-and-drop or
  file-picker install of a packaged plugin file).
- A minimal, fixed set of capabilities the shell lends to every plugin
  (§12).
- One built-in plugin, the **Hub**, responsible for managing other
  plugins (§6).
- Crash isolation and recovery for individual plugins (§14).

**Explicitly out of scope for v1** (do not build, do not leave TODOs
implying they're coming — if a future revision adds them, it will say
so explicitly):

- A plugin marketplace, remote plugin discovery, or auto-update for
  plugins.
- Enforced, technical permission gating between plugins (v1 has
  informational permission declarations only — see §6).
- Any shared UI kit, component library, or state-management contract
  imposed on plugin authors. A plugin's internal implementation is
  entirely its own business.
- Any *enforced* visual design system (colors, typography, spacing
  scale, animation). This document defines the **structural** layout of
  the navigation column and content area (§10) and nothing about how
  those regions are styled. A separate, non-enforced reference,
  `titir_visual_guide.md`, exists purely as a shared source of design
  tokens the shell's own chrome happens to draw from and that plugin
  authors may optionally draw from too — see §20. It does not change
  anything in scope here.
- Multi-window support. TiTir is a single-window application in v1.

---

## 3. Tech Stack & Runtime Requirements

**Policy: always the latest stable release of every dependency below,
never a version frozen indefinitely.** The exact numbers in this
section are a snapshot at time of writing. Before every release, run
the package manager's outdated-check and audit commands, upgrade
anything behind, and confirm nothing flagged as deprecated or carrying
a known high/critical vulnerability has crept into the dependency tree.

| Concern | Decision |
|---|---|
| Runtime | Electron, latest stable (devDependency) |
| Language | TypeScript, `strict: true`, throughout `src/` |
| Renderer bundler | Vite, latest stable — bundles the shell renderer only |
| Main/preload build | `tsc`, compiled straight to CommonJS |
| Plugin package format | `.titirpkg` — a standard zip archive with a required internal layout (§6) |
| Zip extraction | `yauzl`, latest stable — chosen specifically because it exposes entries one at a time during extraction, which is what the path-safety check in §7 depends on |
| IPC payload validation | `zod`, latest stable |
| Shell UI framework | React, latest stable major, TSX — scoped strictly to the shell's own navigation-column and empty-state rendering (§10). Never used to render plugin content. |
| Package manager | pnpm |
| Window type | Frameless `BrowserWindow`, custom-drawn chrome (§13) |

**Rule — the shell renderer may use React; nothing else changes.**
React is confined to the shell's own navigation column and idle/empty
state. It never touches a plugin's DOM. Main and preload processes stay
plain TypeScript compiled by `tsc` alone; they never import React. This
does not grant plugin authors anything new or take anything away — a
plugin author was always free to write their plugin in React (or
anything else) and compile it down before packaging (§6); that
decision lives entirely inside the plugin's own build step, which is
none of TiTir's concern.

Because JSX requires a transform `tsc` alone does not perform for a
browser bundle, the shell renderer's build step is: `tsc` type-checks
it against `tsconfig.renderer.json` (no-emit), then Vite bundles and
emits it. Main and preload are unaffected — they go through `tsc`
alone, emitting directly to `dist/main/`.

`package.json` skeleton:

```json
{
  "name": "titir",
  "version": "0.1.0",
  "description": "A thin desktop host for independently-built, isolated plugins",
  "main": "dist/main/index.js",
  "private": true,
  "scripts": {
    "build:main": "tsc -p tsconfig.json",
    "build:renderer": "vite build",
    "build": "pnpm run build:main && pnpm run build:renderer",
    "start": "pnpm run build && electron .",
    "audit:deps": "pnpm outdated; pnpm audit --audit-level high"
  },
  "dependencies": {
    "yauzl": "^3.2.0",
    "zod": "^4.4.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "electron": "^38.2.0",
    "typescript": "^5.9.3",
    "vite": "^6.3.0",
    "@vitejs/plugin-react": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/yauzl": "^2.10.3",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0"
  }
}
```

`tsconfig.json` — **main and preload only:**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "CommonJS",
    "lib": ["ES2023"],
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/main/**/*.ts"]
}
```

`tsconfig.renderer.json` — type-checking only (Vite performs the
actual transform/emit and does not type-check, so this config is what
catches renderer type errors):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023", "DOM"],
    "noEmit": true
  },
  "include": ["src/renderer/**/*.ts", "src/renderer/**/*.tsx", "src/main/shared/**/*.ts"]
}
```

`tsconfig.json`'s `include` covers only `src/main/**/*.ts` (main,
preload, and shared code — see the directory tree in §4). The renderer
is compiled separately by Vite, which reads `.tsx` directly and only
consults `tsconfig.renderer.json` for its type-check pass.
`dist/main/` mirrors `src/main/` file-for-file; `dist/renderer/` is
Vite's own output directory and is **not** a 1:1 mirror of
`src/renderer/` — Vite emits hashed bundle files plus an `index.html`.

---

## 4. Process & Runtime Model

One main process, one shell renderer, and N plugin renderers — all
inside a single OS window.

```
┌──────────────────────────────────────────────────────────────┐
│  OS Window (frameless, custom chrome)                        │
│  ┌───────────┐┌─────────────────────────────────────────┐   │
│  │ Nav column││  Content area                            │   │
│  │ (§10)     ││  active plugin: bounds                   │   │
│  │           ││    {x: NAV_WIDTH, y: 0,                  │   │
│  │           ││     w: winW - NAV_WIDTH, h: winH}        │   │
│  │           ││  every inactive plugin: bounds            │   │
│  │           ││    {x: 0, y: 0, w: 0, h: 0}               │   │
│  └───────────┘└─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

- **Main process** — owns the single `BrowserWindow`, the plugin
  registry, install/uninstall, every `ipcMain` handler, and the
  lifecycle of each plugin's content view. Plain TypeScript, compiled
  to `dist/main/`.
- **Shell renderer** — loads `dist/renderer/index.html`. Paints the
  navigation column and the idle/empty state only, as a small React
  tree. Never renders plugin content, never reaches into a plugin's
  DOM.
- **Plugin renderers** — one `WebContentsView` per **mounted** plugin,
  attached to the window via `win.contentView.addChildView(view)`. Not
  an `<iframe>`, not a `<webview>` tag. Each plugin view has its own
  dedicated preload script, loaded fresh at mount time. This includes
  the built-in Hub plugin (§6) — it is a real mounted view like any
  other plugin, not part of the shell renderer.

**View security defaults — every plugin view, no exceptions:**

| Setting | Value | Why |
|---|---|---|
| `contextIsolation` | `true` | A plugin's page JS runs in a world separate from its preload script and cannot reach Node or Electron internals directly. |
| `sandbox` | `true` | The preload script itself runs sandboxed — it can `require('electron')` and use a small set of Node built-ins, but has no access to the filesystem, child processes, or native modules. All privileged work happens in the main process, reached only through the IPC contract in §11. |
| `nodeIntegration` | `false` | The renderer page never gets a raw `require`. |

Full CSP and packaging hardening are specified in §12, not here — this
table is limited to the three foundational `WebContentsView` flags.

**Why `sandbox: true` here specifically:** because plugins are
untrusted third-party code by definition, the preload script — the one
place with any elevated capability at all — is deliberately kept as
thin as possible. A sandboxed preload cannot read or write files, spawn
processes, or load native addons on its own; it can only call
`contextBridge.exposeInMainWorld` to hand the page a small set of
functions that, under the hood, do nothing but `ipcRenderer.invoke` a
channel the main process validates and handles (§11). This means a
plugin's entire capability surface is exactly the IPC channel table in
§11 — nothing more, regardless of what the plugin's own code tries to
do.

---

## 5. Directory Structure

```
titir/
├── package.json
├── tsconfig.json
├── tsconfig.renderer.json
├── vite.config.ts
├── README.md
├── .gitignore
│
├── docs/
│   ├── plugin-guide.md          The single doc a plugin author needs;
│   │                             a plugin-author-facing subset of
│   │                             §6, §11, §12, §16 below.
│   └── visual-guide.md          Shared, non-enforced design tokens
│                                 used optionally by the shell's own
│                                 chrome and by plugin authors (§20).
│
├── src/
│   ├── main/
│   │   ├── index.ts                Boot window, wire IPC, register the
│   │   │                           built-in Hub plugin
│   │   ├── window/
│   │   │   ├── shell-window.ts       BrowserWindow creation, debounced
│   │   │   │                         geometry persistence
│   │   │   └── window-controls.ts    ipcMain handlers for
│   │   │                             window:minimize/maximize/close
│   │   ├── plugins/
│   │   │   ├── manifest-schema.ts    validateManifest(json) -> { ok, errors[] }
│   │   │   ├── plugin-registry.ts    In-memory registry + persisted
│   │   │   │                         order/enabled state; emits
│   │   │   │                         change events (§9)
│   │   │   ├── plugin-installer.ts   Extract .titirpkg + path-safety
│   │   │   │                         check + manifest validation +
│   │   │   │                         register (§7, §12)
│   │   │   ├── plugin-loader.ts      Creates a WebContentsView for a
│   │   │   │                         plugin, wires its preload
│   │   │   ├── lifecycle.ts          mount/show/hide/unmount/relaunch,
│   │   │   │                         bounds math (§8)
│   │   │   └── plugin-manager.ts     Facade — every plugin-related IPC
│   │   │                             call is routed through this
│   │   ├── ipc/
│   │   │   ├── channels.ts           Every ipcMain.handle for
│   │   │   │                         titir:*/window:*/dialog:*
│   │   │   ├── schemas.ts            zod schemas for every channel
│   │   │   │                         payload (§12)
│   │   │   └── broadcast.ts          Pushes titir:pluginsChanged to
│   │   │                             the shell renderer (§9)
│   │   ├── store/
│   │   │   └── config-store.ts       Flat-JSON persistence at
│   │   │                             `<userData>/titir.config.json`
│   │   ├── shared/
│   │   │   ├── constants.ts          Cross-process layout constants
│   │   │   │                         (NAV_WIDTH, TITLEBAR_HEIGHT) —
│   │   │   │                         single source, imported by both
│   │   │   │                         main and renderer
│   │   │   └── types.ts              Shared type defs (Manifest,
│   │   │                             ShellConfig, IpcChannelMap)
│   │   │                             imported by main, preload, and
│   │   │                             renderer alike
│   │   └── preload/
│   │       └── shell-preload.ts      contextBridge for the shell's own
│   │                                 renderer only — distinct from any
│   │                                 plugin's preload
│   │
│   └── renderer/
│       ├── index.html              Only HTML the main window itself
│       │                           loads directly
│       ├── main.tsx                React root — Vite entry point
│       ├── App.tsx                 Top-level error boundary, idle/
│       │                           empty state, crash toast (§14)
│       └── nav/
│           ├── NavColumn.tsx        Composes the three stacked regions
│           │                        described in §10
│           ├── WindowControlsRow.tsx  minimize/maximize/close + drag
│           │                        region (§13)
│           ├── PluginList.tsx       Icon list, drag-reorder;
│           │                        subscribes to
│           │                        titir:pluginsChanged (§9) — never
│           │                        polls, never needs a manual
│           │                        refresh
│           └── HubEntry.tsx         Fixed bottom slot for the built-in
│                                    Hub plugin (§6)
│
└── plugins/
    ├── builtin/
    │   └── hub/                    Shipped with TiTir; written in
    │       ├── manifest.json       TypeScript like the rest of the
    │       ├── preload.ts          core, since it is TiTir's own code,
    │       ├── index.html          not a third-party package. Its
    │       ├── style.css           manifest id is `titir.hub`.
    │       └── renderer.ts
    └── installed/                  Every runtime-installed plugin
        └── <plugin-id>/            lands here, nowhere else.
            ├── manifest.json
            ├── preload.js          Plugin authors ship compiled JS —
            ├── index.html          any source language and build
            └── ...                 tool is the plugin author's own
                                     choice, made before packaging
                                     (§6, §16).
```

**Compiled output layout.** `dist/main/` mirrors `src/main/`
file-for-file via `tsc` (e.g. `src/main/index.ts` →
`dist/main/index.js`). `dist/renderer/` is Vite's own build output — a
hashed `index.html` plus asset files — and is not a 1:1 mirror of
`src/renderer/`. `plugins/` is never compiled by TiTir's own build;
every plugin, including the built-in Hub, ships its own already-built
JS/HTML/CSS.

**Rule — `dist/main/` and `dist/renderer/` are siblings, both directly
under `dist/`.** This matters for every `__dirname`-relative path
written inside `src/main/`. A file at `src/main/window/shell-window.ts`
compiles to `dist/main/window/shell-window.js`, whose `__dirname` at
runtime is `dist/main/window` — two directory levels below `dist/`.
Loading the shell's own `index.html` from there requires
`path.join(__dirname, "../../renderer/index.html")`, **not**
`"../renderer/index.html"` — the latter resolves to the non-existent
`dist/main/renderer/index.html`. The same two-levels-up rule applies to
any file one directory deeper than `src/main/` itself; a file directly
in `src/main/` (e.g. `index.ts`) only needs `../renderer/`. Any file
under `src/main/plugins/` referencing its own compiled preload at
`dist/main/preload/shell-preload.js` is one level up
(`../preload/shell-preload.js`), not two — get this wrong and the
window loads a blank page with no error beyond a failed local-resource
load in the console.

---

## 6. Plugin Package Format & Manifest Schema

A plugin is distributed as a single `.titirpkg` file — an ordinary zip
archive with a required internal layout:

```
my-plugin.titirpkg  (zip archive)
├── manifest.json
├── index.html        (or whatever path manifest.entry points to)
├── preload.js         (or whatever path manifest.preload points to)
└── ...                any other assets the plugin needs
```

**Required manifest fields**, validated at runtime by
`src/main/plugins/manifest-schema.ts`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Lowercase, alphanumeric plus `.`/`-`. Must be unique among installed plugins. The `titir.*` namespace is reserved for built-in plugins — see the Hub's own id below. |
| `name` | string | Shown in the navigation column's tooltip and in the Hub's plugin list. |
| `version` | string | Free-form string; semver is recommended but not enforced. |
| `entry` | string | Path, relative to the package root, to the plugin's HTML entry point. |
| `preload` | string | Path, relative to the package root, to the plugin's **already-compiled** preload script (`.js`). |

**Optional manifest fields:**

| Field | Type | Notes |
|---|---|---|
| `icon` | string | A single emoji or glyph shown in the navigation column. Defaults to a generic placeholder glyph if omitted. |
| `summary` | string | One-line description shown in the Hub's plugin list. |
| `permissions` | string[] | Informational only in v1 — displayed in the Hub's plugin list, not technically enforced. See §16 for what this means in practice. |
| `minShellVersion` | string | Informational only in v1 — not checked against the running TiTir version. |

**On language and build tooling:** TiTir loads whatever plain
JS/HTML/CSS exists at the `entry` and `preload` paths inside the
package. It has no opinion on, and no visibility into, what produced
those files. A plugin author writing TypeScript, JSX, or using any
bundler is expected to compile everything down to plain JS/HTML/CSS
*before* zipping into a `.titirpkg` file. The manifest can never point
at a `.ts` or `.tsx` file — TiTir does not run a compiler on installed
plugin code, ever.

**TypeScript interface** (in `src/main/shared/types.ts`):

```ts
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  preload: string;
  icon?: string;
  summary?: string;
  permissions?: string[];
  minShellVersion?: string;
}
```

**What the manifest never declares:** window bounds, lifecycle hooks,
or IPC channels. Bounds are computed entirely by the shell (§8); a
plugin's own renderer-to-preload contract is that plugin's own
business (§12) and is never described in `manifest.json`.

---

## 7. Plugin Installation

**Trigger:** the person drags a `.titirpkg` file onto the Hub plugin's
interface, or picks one via a file dialog inside the Hub. Either path
ends the same way — the Hub sends the file's path to the main process
over the `titir:installPlugin` channel (§11).

**Install-time sequence, in this exact order:**

1. **Extraction with path-safety checking.** `plugin-installer.ts`
   opens the zip with `yauzl` and, for **every** entry before writing
   anything to disk, resolves what its absolute target path inside
   `plugins/installed/<id>/` would be and rejects the **entire**
   install if any single entry would resolve outside that directory
   (for example, an entry deliberately named
   `../../../../etc/whatever`, a classic "zip-slip" attack). This check
   runs before a single byte is written and before the manifest is even
   read — see §12 for the full rationale.
2. **Manifest validation.** Once extraction succeeds, `manifest.json`
   is parsed and checked against the required/optional field table in
   §6.
3. **Invalid → refused.** If the manifest is missing a required field,
   has the wrong type, or reuses an existing `id`, the install is
   refused with a specific, human-readable error. The already-extracted
   files are deleted. No partial or half-registered plugin is ever left
   behind, and the shell itself never crashes on a malformed package.
4. **Valid → path existence check.** The paths named by `entry` and
   `preload` are confirmed to exist on disk inside the extracted
   directory.
5. **Registration.** The plugin is added to `plugin-registry.ts`'s
   in-memory registry and to the persisted config's `plugins[]` array
   (§9) with `enabled: true` and the next available `order` value.
6. **Broadcast.** The registry immediately emits a change event; the
   main process pushes `titir:pluginsChanged` to the shell renderer
   (§9). The new plugin's icon appears in the navigation column
   immediately — no reload of the window is ever required.

**Uninstall** is the reverse: the plugin is unmounted if currently
mounted (§8), removed from the registry and from `plugins[]`, and its
directory under `plugins/installed/<id>/` is deleted from disk. The
same broadcast in step 6 fires so the icon disappears immediately.

---

## 8. Plugin Runtime Lifecycle

```
 registered ──(icon clicked)──▶ mounted ──▶ visible ⇄ hidden
     │                              │
     │                              └──(renderer process gone)──▶ crashed ──(relaunch)──▶ mounted
     │
     └──(uninstall)──▶ unregistered   (valid from registered or mounted;
                                        a mounted view is torn down first)
```

| State | Meaning |
|---|---|
| `registered` | Known to `plugin-registry.ts`; manifest already validated; no view exists yet. |
| `mounted` | A `WebContentsView` exists for this plugin. Created lazily, on the first time its icon is clicked — never at app startup. |
| `visible` | Mounted, and its bounds are set to fill the content area (§4). |
| `hidden` | Mounted, but bounds are zeroed. The process keeps running in the background. |
| `crashed` | The renderer process died. The view has been torn down; the registry entry is untouched. |
| `unregistered` | Removed from the registry; files deleted from `plugins/installed/<id>/`. |

**Guarantees a plugin author can rely on:**

- A plugin is never mounted before its icon is first clicked — do not
  assume any startup work runs before that.
- A mounted plugin is never destroyed except on crash or an explicit
  uninstall by the person using the app — background work (timers,
  in-progress network requests, etc.) keeps running while `hidden`.
- A crash tears down exactly that one plugin's view. The shell and
  every other plugin are completely unaffected.

**Rule — every transition above is push-based, not poll-based.** The
registry broadcasts `titir:pluginsChanged` (§9) the instant install,
uninstall, enable/disable, or reorder happens in the main process.
`PluginList.tsx` and the Hub's own plugin-list view subscribe to this
once, on mount, and re-render from whatever snapshot arrives. Neither
ever re-fetches on a timer or "just to check." `titir:getSnapshot`
exists solely as a one-shot bootstrap call for populating initial state
right after a renderer first mounts, before any change event has had a
chance to arrive — it is never something to call repeatedly.

---

## 9. Persisted Configuration Schema

`<userData>/titir.config.json` is the only thing that survives a
restart. It rehydrates `plugin-registry.ts` on boot (manifests
themselves are always re-read fresh from each plugin's `manifest.json`
on disk — this file stores only what the shell decided, not manifest
contents).

```json
{
  "window": { "width": 1200, "height": 800, "x": null, "y": null },
  "activePluginId": null,
  "plugins": [
    { "id": "string", "enabled": true, "order": 0 }
  ]
}
```

`src/main/shared/types.ts`:

```ts
export interface ShellConfig {
  window: { width: number; height: number; x: number | null; y: number | null };
  activePluginId: string | null;
  plugins: Array<{ id: string; enabled: boolean; order: number }>;
}
```

| Field | Type | Notes |
|---|---|---|
| `window` | object | Debounce-written on resize/move by `shell-window.ts`. |
| `activePluginId` | string \| null | Restored on next boot if the plugin still exists in the registry; otherwise treated as `null`. |
| `plugins[].id` | string | Matches a manifest `id`. |
| `plugins[].enabled` | boolean | A disabled plugin stays registered but does not appear in the navigation column. |
| `plugins[].order` | number | Drag-reorder position within the navigation column's plugin list. |

**Decision — the Hub is not an entry in `plugins[]`.** The built-in Hub
plugin (§6) has no `enabled`/`order` to persist, because neither is
ever changeable for it — it cannot be disabled, reordered, or
uninstalled by the person using the app. The shell unconditionally
registers and mounts it from `plugins/builtin/hub/` on every boot,
independent of anything in the config file.

---

## 10. Navigation Column & Content Area Specification

This is the entire structural layout of TiTir's window. No colors,
fonts, spacing scale, or motion is specified anywhere in this document
— that is deliberately out of scope (§2), and lives instead, purely as
an optional reference, in `titir_visual_guide.md` (§20). What follows
is only the **structural** relationship between regions and the exact
rules that govern their bounds, because those rules are load-bearing
for the main-process bounds math in §8, not because they're a style
decision.

**The window is divided into exactly two regions, side by side:**

```
┌───────────────┬─────────────────────────────────────────────┐
│  Nav column    │  Content area                                │
│  width:        │  starts at x = NAV_WIDTH                     │
│  NAV_WIDTH     │  width = window width − NAV_WIDTH            │
│  (constant,    │  height = full window height                 │
│  fixed)        │                                                │
│                │  Hosts exactly one plugin's WebContentsView   │
│                │  at a time, sized to exactly fill this        │
│                │  region. When no plugin is active, shows the  │
│                │  shell's own idle/empty state (TiTir's name   │
│                │  and the PuFi mascot mark) instead.            │
└───────────────┴─────────────────────────────────────────────┘
```

`NAV_WIDTH` is a single constant, `72` (pixels), defined once in
`src/main/shared/constants.ts` as `export const NAV_WIDTH = 72;` and
consumed by the shell renderer's layout so the value used for
main-process bounds math and the value used for the visual column width
can never drift apart.

**The navigation column is itself divided into three stacked regions,
top to bottom, never side by side:**

1. **Window controls row** (top, fixed height, constant
   `TITLEBAR_HEIGHT = 40`). Houses the three custom window-control
   buttons (minimize/maximize/close) and doubles as the window's drag
   handle (§13). Always present, always at the very top, never
   scrolls.
2. **Plugin list** (middle, fills all remaining vertical space between
   the window controls row and the pinned Hub slot). A vertically
   scrollable, drag-reorderable list of icons, one per enabled,
   installed plugin, in `plugins[].order` order (§9). Clicking an icon
   mounts (if not already mounted) and shows that plugin, and hides
   whichever plugin was previously shown.
3. **Hub slot** (bottom, fixed height, pinned flush to the bottom edge
   of the window). Exactly one icon, for the built-in Hub plugin. Never
   part of the scrollable list above it, never reorderable, never
   removable.

**Content area rule.** At any moment, exactly one plugin (or none) is
`visible` (§8). The visible plugin's `WebContentsView` bounds are set
to `{ x: NAV_WIDTH, y: 0, w: windowWidth - NAV_WIDTH, h: windowHeight }`.
Every other mounted-but-not-visible plugin has its bounds set to
`{ x: 0, y: 0, w: 0, h: 0 }` — zeroed, not detached, so it keeps
running in the background per the `hidden` state in §8. When no plugin
has ever been clicked yet (fresh install, first launch), the content
area shows the shell renderer's own idle/empty state — this is the one
and only piece of "content" the shell renderer itself is ever allowed
to draw inside the content area, and only when literally nothing else
occupies it.

**Resize behavior.** On every window resize, the main process
recomputes and re-applies the currently-visible plugin's bounds using
the formula above. `NAV_WIDTH` never changes with window size — it is
a fixed constant, not a proportion.

---

## 11. IPC Channel Table

Every channel that crosses the main/renderer boundary, and nothing
else. Typed centrally in `src/main/shared/types.ts` as an
`IpcChannelMap` so preload and handler code share one type instead of
drifting apart independently. Every payload below is additionally
validated at the `ipcMain.handle` boundary against a `zod` schema in
`schemas.ts` before any handler logic runs (§12).

| Channel | Direction | Caller | Payload → Response |
|---|---|---|---|
| `titir:installPlugin` | renderer → main | Hub only | `{ packagePath: string }` → `{ ok: boolean; pluginId?: string; error?: string }` |
| `titir:uninstallPlugin` | renderer → main | Hub only | `{ pluginId: string }` → `{ ok: boolean; error?: string }` |
| `titir:setPluginEnabled` | renderer → main | Hub only | `{ pluginId: string; enabled: boolean }` → `{ ok: boolean }` |
| `titir:reorderPlugins` | renderer → main | Hub only | `{ orderedIds: string[] }` → `{ ok: boolean }` |
| `titir:getSnapshot` | renderer → main | Hub + shell renderer | `{}` → full registry snapshot (one-shot bootstrap only — see the rule in §8) |
| `dialog:openFile` | renderer → main | Any plugin | `{ properties: string[]; filters?: { name: string; extensions: string[] }[] }` → `{ canceled: boolean; filePaths: string[] }` |
| `window:minimize` | renderer → main | Shell renderer only (`WindowControlsRow.tsx`) | `{}` → `void` |
| `window:maximize` | renderer → main | Shell renderer only (`WindowControlsRow.tsx`) | `{}` → `void` |
| `window:close` | renderer → main | Shell renderer only (`WindowControlsRow.tsx`) | `{}` → `void` |
| `titir:pluginCrashed` | main → renderer | Shell renderer (crash toast trigger) | `{ pluginId: string }` |
| `titir:pluginsChanged` | main → renderer | Shell renderer (nav list + Hub's list view) | `{ reason: "installed" \| "uninstalled" \| "enabled-changed" \| "reordered"; snapshot: RegistrySnapshot }` |

`titir:*` management channels are wired only into the Hub plugin's
preload, by convention — not by an enforced permission system in v1.
See §16 for exactly what "by convention, not enforced" means in
practice for a third-party plugin author.

---

## 12. Security & Reliability Hardening

These are additions layered on top of the isolation model already
described in §1 and §4. None of them changes what a plugin author is
allowed to do; they tighten what the shell does to itself and to
untrusted input before a plugin author is ever involved.

- **Zip-slip protection on install.** Already specified in full in §7,
  step 1 — repeated here because it is a security control, not merely
  an install-flow detail. It runs before manifest validation, not
  after, so a malicious archive is rejected before any of its content
  is trusted enough to even be parsed as JSON.
- **Schema-validated IPC boundary.** Every `ipcMain.handle` in
  `channels.ts` parses its incoming payload against the matching `zod`
  schema in `schemas.ts` before touching it. A malformed or unexpected
  payload is rejected with a typed error and never reaches filesystem
  or process-level code. This is what "the shell never crashes on bad
  input" means in practice — for every channel, not only for manifests.
- **Content-Security-Policy on every renderer.** The shell renderer and
  the recommended default for plugin renderers both ship a restrictive
  CSP meta tag (`default-src 'self'`; no remote script execution) in
  their `index.html`. TiTir enforces this for its own shell renderer.
  For plugin renderers it is a strong, documented recommendation in
  `docs/plugin-guide.md`, not a runtime-enforced restriction —
  technically enforcing a CSP on arbitrary third-party plugin HTML is
  future scope, tracked alongside the rest of §16's "not enforced in
  v1" list.
- **ASAR integrity on packaged builds.** Production builds enable
  Electron's ASAR integrity check, which validates the packaged
  `app.asar` against a build-time hash at launch and refuses to run a
  tampered package. This is a packaging-time setting, not a source-code
  change.
- **A top-level React error boundary in `App.tsx`.** The shell renderer
  is the one renderer a person can never "relaunch" the way a crashed
  plugin can (§14) — if it throws during render, there is no chrome
  left to show a relaunch button in. `App.tsx` wraps its whole tree in
  an error boundary that falls back to a minimal, dependency-free retry
  UI written in plain DOM (no React required to render the fallback
  itself), so a bug in one part of the navigation column cannot take
  the entire shell down to a blank window.

---

## 13. Window Chrome

- The `BrowserWindow` is frameless; native OS chrome (titlebar, native
  traffic lights) is disabled entirely.
- The window-controls row at the top of the navigation column
  (`WindowControlsRow.tsx`, height `TITLEBAR_HEIGHT`, §10) owns both
  the three custom control buttons and the window's entire drag region.
- **Dragging happens through that row.** A frameless Electron window
  needs an explicit CSS drag region (`-webkit-app-region: drag`)
  somewhere, since there is no native titlebar to grab. The row's own
  background carries that region; the three control buttons themselves
  are each individually marked `-webkit-app-region: no-drag` so a click
  registers as a click instead of starting a window drag. No IPC
  channel is involved in the drag itself — it is native OS-level window
  movement, driven purely by that CSS, just narrower than a full-width
  titlebar (the row only spans `NAV_WIDTH` pixels, not the full window
  width). In practice: click-and-hold anywhere in the row except the
  three buttons to move the window; click a button to trigger its
  action via the corresponding `window:*` IPC channel (§11).
- Window geometry (`width`, `height`, `x`, `y`) is debounce-persisted
  to `titir.config.json` on every resize and move, and restored on the
  next boot.

---

## 14. Crash Handling

- Detected in the main process via the plugin view's
  `render-process-gone` event on its `WebContents`.
- On crash: the view is torn down immediately, but the registry entry
  is kept exactly as it was — a crash never deregisters a plugin.
  `titir:pluginCrashed` is sent to the shell renderer with the
  `pluginId`.
- The shell renderer shows a toast with a plugin-scoped "Relaunch"
  action. Clicking it re-triggers mount for that specific `pluginId`
  only — every other plugin, mounted or not, is completely unaffected.
- No in-memory plugin state is ever assumed to survive a crash. A
  plugin that needs its state to survive must persist it to disk
  itself, through its own preload's IPC calls — TiTir provides no
  automatic state snapshotting for plugins.

---

## 15. What's Shared Across the Isolation Boundary

By default, nothing is. One deliberate exception exists, forced by
Electron itself, since `dialog.showOpenDialog` only runs in the main
process:

- **`dialog:openFile`** (§11) — every plugin's preload may call this
  one utility. It is the only channel a plugin author should expect to
  use directly, outside of whatever bespoke channels they add for their
  own plugin's internal needs (which are entirely the plugin's own
  business and never appear in this document).

Everything else about a plugin's own renderer-to-preload contract
belongs to that plugin — including whether its author writes it in
JavaScript, TypeScript, or ships React/TSX compiled down to plain JS
before packaging. TiTir does not care what produced the file at the
`entry`/`preload` paths, only that a working file exists there.

---

## 16. Known Boundaries a Plugin Must Never Assume

- Cannot resize, move, or reposition the window.
- Cannot change its own bounds within the content area — sub-layout
  inside the space it is given is the plugin's own CSS/DOM problem,
  entirely.
- Cannot detect its own visibility via a pushed event — none is sent in
  v1. A hidden plugin has no way to know it has been hidden other than
  the absence of user interaction.
- Cannot reach another plugin's `contextBridge` surface, or the shell
  renderer's.
- Cannot rely on `titir:*` management channels being reachable — they
  are wired into the Hub's preload only, by convention (§6, §11), not
  by a technical permission system in v1. A third-party plugin that
  tries to call one anyway will find it simply isn't exposed on its own
  `window` object, because its own preload never received it.
- Gets no shell chrome — no window controls, no plugin list, no idle
  state — inside its own view. This includes the Hub itself: its
  pinned position and icon are navigation-column-side rendering the
  shell does on its behalf, not something the Hub draws inside its own
  content-area view.
- Cannot get itself pinned to the bottom of the navigation column or
  otherwise placed outside the ordinary scrollable plugin list — that
  placement is exclusive to the one built-in `titir.hub` plugin (§6),
  not a capability any manifest can request.
- Cannot ship `.ts`/`.tsx` source directly inside its package — TiTir
  only ever loads compiled JS/HTML/CSS from the paths its manifest
  declares (§6). A plugin author's own toolchain ends before the
  `.titirpkg` file is zipped.
- Cannot assume its own package's internal file paths are protected by
  anything beyond the zip-slip check in §7/§12 — that check protects
  the *host filesystem* during extraction, not the plugin's own
  internal file layout once extracted, which remains the plugin
  author's own responsibility.
- Cannot assume a declared `permissions` entry in its manifest (§6)
  does anything technically — in v1 it is displayed to the person in
  the Hub's plugin list and nothing more. Do not build a plugin whose
  correctness depends on a permission actually being enforced.

---

## 17. Build & Run

```bash
pnpm install
pnpm run build      # tsc for main/preload, then Vite for the renderer
pnpm start           # build, then launch electron .
```

`pnpm run audit:deps` should be run before every release — it reports
outdated dependencies and flags any package with a known high/critical
vulnerability, per the stack policy in §3.

---

## 18. Reading Order for New Contributors

1. This document — full shape, schemas, and channel list, start to
   finish.
2. `docs/plugin-guide.md` — the plugin-author-facing subset of §6,
   §11, §12, and §16, phrased for someone building *a* plugin, not the
   shell itself. §19 below is a shorter substitute if you only need
   orientation, not the full document.
3. `docs/visual-guide.md` — optional, shared design tokens (§20). Skip
   it entirely if you're only touching structural/behavioral code; it
   changes nothing enforced by this specification.
4. Main-process source under `src/main/`, only if changing the shell's
   own behavior rather than building a plugin.

---

## 19. About the Plugin Guide — Context Only, Not Required Reading

Everything decided for the shell in this specification stands on its
own — you do not need to read this section to build or modify TiTir
itself, and nothing here changes a schema, path, or IPC channel defined
earlier. It exists only because a shell-development session is never
handed the plugin guide alongside this specification, and a short
excerpt of what that document contains can help when reasoning about
plugin-author-facing behavior (install refusal messages, error text,
the Hub's own UI copy) without opening the full guide.

The plugin guide (`titir_plugin_guide.md`) is the plugin-author-facing
counterpart to this specification. In short, it describes:

- **The same contract as §6, §7, §11, §16, and §12 here, phrased as
  rules for someone who only sees the outside of the system.** It uses
  a three-tier labeling convention — MANDATORY (shell-enforced),
  RECOMMENDED (not enforced, but advisable), and FREE (no shell
  opinion at all) — attached to every requirement so a plugin author
  can tell at a glance what will actually block an install versus what
  is merely good practice.
- **A package format walkthrough** matching §6 exactly: `manifest.json`
  at the root, an `entry` HTML file, a compiled `preload.js`, zipped as
  `.titirpkg`.
- **A troubleshooting table** mapping common install/runtime failures
  (invalid manifest, reserved `id` prefix, zip-slip rejection, a
  preload that still points at `.ts`) back to the specific validation
  step in this specification's §7 that produced them.
- **A pre-flight checklist** a plugin author is expected to run through
  before zipping, so most install refusals never reach the shell's
  error-reporting path in the first place.

None of that changes anything about how the shell itself is built. If
you're only ever going to work on TiTir's own source, stop here — the
rest of this document already told you everything that's decided.

---

## 20. Visual & Presentation Guide — Shared, Optional Resource

A separate file, `titir_visual_guide.md`, holds the shared visual
reference — color tokens, type scale, the icon-legibility math the
plugin guide's icon-presentation section builds its advice on, and
PuFi's mascot-usage rules for the idle/empty state (§10). It is
referenced from both this specification and the plugin guide so the
shell's own navigation-column/idle-state rendering and any plugin
author who wants to visually align with TiTir draw from one shared
source instead of two documents drifting apart independently.

This is explicitly **not** part of what's in scope for v1 per §2 — the
shell renderer's use of the tokens in that file is an implementation
choice for `NavColumn.tsx`/`App.tsx` to make consistently, not a
technically-enforced system, and nothing there is validated against a
plugin at install or mount time.

---

*Specification maintained for TiTir. PuFi approves, in the manner of a
mascot who has never once read a technical document.*
