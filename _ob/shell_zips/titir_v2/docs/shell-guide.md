# TiTir — Shell Guide

**Version:** 1.0
**Project:** TiTir
**Author:** Bijoy
**Mascot:** PuFi

---

## 0. Document Governance & Versioning

### 0.1 Versioning Scheme

This document uses **major.minor** versioning, incremented on every published revision.

- **Major** increments on a reversed or replaced decision — a change to the trust model, the capability model, or any rule a prior version stated as final.
- **Minor** increments on additions, new sections, or refinements that do not reverse a standing decision.

### 0.2 The Replacement Rule

Every revision replaces the affected clause in full. This document never contains historical framing — no "previously X, now Y," no changelog prose inside a clause, no strikethroughs. At any version, this document reads as if it were written from nothing, at that version. A separate, external changelog may exist outside this file; nothing inside it narrates its own history.

### 0.3 Update Triggers

A version bump is required for: a changed constant, schema, or enum; a reversed or newly resolved decision; a newly closed ambiguity. A version bump is not required for typo or formatting fixes.

### 0.4 Cross-Document Consistency

A shared fact — a constant, a schema, a channel, a state — has exactly one authoritative document. Every other document references it by section number rather than restating its value. When a shared fact changes, every document referencing it is updated in the same revision pass.

### 0.5 Authority Hierarchy

This document — the Shell Guide — is authoritative over the shell's own implementation. The Plugin Guide is authoritative over the plugin-author-facing contract, but restates nothing from this document as a competing definition; where the two describe the same fact, this document wins.

### 0.6 Requirement Tags

Every rule in this document carries exactly one tag:

| Tag | Meaning |
|---|---|
| **MANDATORY** | Enforced by the shell in code. Violating it blocks an install, blocks a mount, or is structurally impossible. |
| **RECOMMENDED** | Not enforced. Advisable practice; ignoring it does not block anything, but produces a worse or less reliable result. |
| **FREE** | The shell has no opinion and no stake. Neither compliance nor deviation has any consequence, technical or otherwise. |
| **UNGOVERNED** | Technically possible and technically granted, but deliberately not checked, scoped, or verified by the shell. Distinct from FREE: the shell does not merely lack an opinion here — it has consciously chosen not to gate a capability that carries real consequence. |

Every rule below states its tag. A rule with no tag is an error in this document, not an implied default.

---

## 1. Purpose & Philosophy

TiTir is a desktop host application that loads, launches, and displays independently-built plugins. It does not, itself, do very much.

> **TiTir is a collection of apps, not one app.**

Concretely:

- TiTir ships with no built-in functionality beyond installing, launching, arranging, and switching between plugins.
- A plugin is built and packaged entirely independently of TiTir's own source. TiTir is never recompiled to gain a plugin.
- Plugins are installed at runtime by handing TiTir a package file. No restart, no rebuild.
- Each plugin runs in its own process. One plugin crashing cannot crash another, or the shell.
- Once installed, a plugin runs as a trusted program with real access to the machine it's running on. TiTir does not sandbox a plugin's own code from the operating system — see §4.
- The person gets exactly one way to move between plugins: a fixed navigation column on one side of the window, a content area on the other, always showing whichever plugin is currently selected.

The shell's job is to manage the *lifecycle* of a plugin — install it, register it, mount it, show it, hide it, relaunch it, uninstall it. The shell's job is explicitly **not** to police what a plugin's code does once it is running. §4 states this boundary precisely.

---

## 2. Scope

**In scope for v1:**

- The host application: window, navigation column, content area, plugin install/mount/switch/uninstall.
- A runtime plugin-installation mechanism (drag-and-drop or file-picker of a `.titirpkg` file).
- The fixed set of shell-mediated channels in §12.
- One built-in plugin, the **Hub**, responsible for install/uninstall/enable/reorder of every other plugin.
- Crash isolation and manual recovery per plugin (§15).
- A one-time, install-time capability disclosure step (§4).

**Explicitly out of scope for v1** (do not build; do not leave a TODO implying it's coming):

- A plugin marketplace, remote discovery, or auto-update for plugins.
- Any technical restriction of what a mounted plugin's code can do on the machine it runs on. Capability declarations (§4, §7) are disclosed to the person, never enforced against the plugin's actual behavior.
- Any shared UI kit, component library, or state-management contract imposed on plugin authors.
- Any enforced visual design system for a plugin's own interior.
- Multi-window support. TiTir is single-window in v1.

---

## 3. Tech Stack & Runtime Requirements

**MANDATORY — Dependency Freshness.** Every dependency in this section is the latest stable release at time of setup, and is kept there. Before every release: run the outdated-check and audit commands (§19); upgrade anything behind; treat any dependency flagged deprecated, unmaintained, or carrying a known high/critical vulnerability as a release blocker, not a backlog item. Never pin a dependency to an old version as a standing policy — the version numbers below are a snapshot at time of writing, not a ceiling.

| Concern | Decision | Tag |
|---|---|---|
| Runtime | Electron, latest stable (devDependency) | MANDATORY |
| Language | TypeScript, `strict: true`, throughout `src/` | MANDATORY |
| Renderer bundler | Vite, latest stable — shell renderer only | MANDATORY |
| Main/preload build | `tsc`, compiled straight to CommonJS | MANDATORY |
| Plugin package format | `.titirpkg` — a zip archive, required layout (§7) | MANDATORY |
| Zip extraction | `yauzl`, latest stable | MANDATORY |
| IPC/config schema validation | `zod`, latest stable | MANDATORY |
| Shell UI framework | React, latest stable major, TSX — scoped to the shell's own navigation column and idle state (§11) only | MANDATORY |
| Package manager | npm | MANDATORY |
| Window type | Frameless `BrowserWindow`, custom-drawn chrome (§16) | MANDATORY |

**Why Electron specifically.** The trust model in §4 requires a plugin's own preload script to hold real Node access — real `fs`, real `child_process`, real `net`. That capability is a defining feature of Electron's process model. An alternative host (e.g., a Rust-mediated capability broker) would reintroduce exactly the kind of per-call mediation this project has deliberately moved away from. Electron is not a legacy choice here; it is the direct consequence of §4.

**Why `yauzl` specifically.** `yauzl` exposes zip entries one at a time during extraction. This is what makes the path-safety check in §8 possible at all — every entry's resolved target path is checked *before that entry is written to disk*. A whole-archive-in-memory extractor cannot offer this guarantee without reading the entire archive first.

**Why `tsc` alone for main/preload, no bundler.** One tool, one failure mode. A separate fast-transpiler (esbuild, swc) would still require a `tsc --noEmit` pass to catch type errors, since fast transpilers do not type-check — meaning two tools doing the work of one, for a codebase small enough that build time has never been a measured problem.

**Rule — the shell renderer may use React; nothing else changes.** React is confined to the shell's own navigation column and idle/empty state (`src/renderer/`). It never touches a plugin's DOM. Main and preload (shell's own) stay plain TypeScript compiled by `tsc` alone; they never import React.

`package.json` skeleton:

```json
{
  "name": "titir",
  "version": "0.1.0",
  "description": "A thin desktop host for independently-built plugins with real system capability",
  "main": "dist/main/index.js",
  "private": true,
  "scripts": {
    "build:main": "tsc -p tsconfig.json",
    "build:renderer": "vite build",
    "build": "npm run build:main && npm run build:renderer",
    "start": "npm run build && electron .",
    "audit:deps": "npm outdated; npm audit --audit-level=high"
  },
  "dependencies": {
    "yauzl": "latest",
    "zod": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "electron": "latest",
    "typescript": "latest",
    "vite": "latest",
    "@vitejs/plugin-react": "latest",
    "@types/node": "latest",
    "@types/yauzl": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest"
  }
}
```

Resolve `"latest"` to concrete pinned versions at `npm install` time and commit `package-lock.json`. Do not leave `"latest"` as a literal range in a committed lockfile-backed install — resolve once, then let `npm outdated`/`npm audit` (§19) be the mechanism that keeps versions current going forward, not an unpinned range.

`tsconfig.json` — **main and preload only:**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "CommonJS",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/main/**/*.ts"]
}
```

`tsconfig.renderer.json` — type-checking only (Vite transforms/emits and does not type-check; this config is what catches renderer type errors):

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

`dist/main/` mirrors `src/main/` file-for-file. `dist/renderer/` is Vite's own output — hashed `index.html` plus assets — and is not a 1:1 mirror of `src/renderer/`.

---

## 4. Trust Model

**MANDATORY — this section is the single authoritative statement of what TiTir defends and what it does not. Every security-adjacent rule elsewhere in this document points back here rather than re-deriving its own posture.**

### 4.1 The Boundary

TiTir defends:

- The **install pipeline** — a malformed or maliciously-crafted `.titirpkg` cannot write outside its own install directory, and cannot half-install (§8).
- **Crash isolation** — one plugin's process dying cannot crash another plugin's process or the shell's own process (§15).
- **Structural correctness** — a plugin missing a required manifest field, a duplicate `id`, or a missing `entry`/`preload` file is refused before it is ever registered (§7, §8).

TiTir does **not** defend:

- The person's machine from what an installed plugin's code actually does once it is running. A mounted plugin has real access to the file system, to spawning processes, and to the network, exactly as any other program installed on that machine would.
- Against a plugin author who declares one set of capabilities and writes code that does something else. Declaration is disclosure, not enforcement — see §4.3.

**Trust is established once: at the moment the person chooses to install a given plugin.** Everything after that moment is between the person and that plugin's author, not between the person and TiTir.

### 4.2 Why This Model, Not Sandboxing

A sandboxed, capability-delegated model — where the shell executes every privileged operation on a plugin's behalf through a checked IPC channel — keeps the shell in the business of implementing and indefinitely maintaining a growing proxy for every operating-system capability a plugin might ever need. That is a gatekeeper role. TiTir's stated purpose (§1) is a manager, not a gatekeeper: install, launch, arrange, display. Granting real capability directly to a plugin's own code, once, at install, is what keeps the shell's own surface area fixed and small for the life of the project.

### 4.3 Capability Declaration

A manifest declares what a plugin **claims** to do, using a closed enum:

```ts
export type Capability = "filesystem" | "process" | "network" | "system_info";
```

| Capability | Covers |
|---|---|
| `filesystem` | Reading or writing files/directories via Node's `fs` from the plugin's own preload. |
| `process` | Spawning or controlling other processes via `child_process`. |
| `network` | Raw sockets or Node-level networking (`net`, `dgram`) — **not** ordinary `fetch`/`XMLHttpRequest` from the plugin's own page, which is a standard web-platform capability available to any page regardless of declaration and requires no capability entry. |
| `system_info` | OS/hardware details beyond what the standard web platform already exposes (e.g. `os.cpus()`, `os.totalmem()`). |

- **MANDATORY** — `capabilities` is a required manifest field (§7) if the plugin's preload uses any Node built-in beyond `electron` itself. It must be a non-empty array drawn only from the enum above; an unrecognized string fails manifest validation (§8).
- **MANDATORY** — the install flow renders every declared capability to the person and requires an explicit confirmation click before the install proceeds. Declining cancels the install; nothing is written or registered.
- **UNGOVERNED** — declaring a capability, or omitting one, changes nothing about what the shell technically grants. Every mounted plugin's preload runs under the identical `sandbox: false` environment described in §5, regardless of what its manifest declares. The shell never inspects, restricts, or verifies a plugin's actual runtime behavior against its declaration. The field exists to inform the person, not to scope the plugin.

### 4.4 What This Means for "Permissions" as a Concept

There is no technical permission system in TiTir v1. There is a disclosure step. Do not build, and do not describe to a person, any UI or behavior implying that unchecking a capability, or a plugin declaring fewer capabilities, results in that plugin having less actual access. It does not.

---

## 5. Process & Runtime Model

One main process, one shell renderer, and N plugin renderers, inside a single OS window.

```
┌──────────────────────────────────────────────────────────────┐
│  OS Window (frameless, custom chrome)                        │
│  ┌───────────┐┌─────────────────────────────────────────┐   │
│  │ Nav column││  Content area                            │   │
│  │ (§11)     ││  active plugin: bounds                   │   │
│  │           ││    {x: NAV_WIDTH, y: 0,                  │   │
│  │           ││     w: winW - NAV_WIDTH, h: winH}        │   │
│  │           ││  every inactive plugin: bounds            │   │
│  │           ││    {x: 0, y: 0, w: 0, h: 0}               │   │
│  └───────────┘└─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

- **Main process** — owns the single `BrowserWindow`, the plugin registry, install/uninstall, every `ipcMain` handler in §12, and the lifecycle of each plugin's view.
- **Shell renderer** — loads `dist/renderer/index.html`. Paints the navigation column and idle/empty state only, as a small React tree. Never renders plugin content, never reaches into a plugin's DOM.
- **Plugin renderers** — one `WebContentsView` per mounted plugin, attached via `win.contentView.addChildView(view)`. Not an `<iframe>`, not a `<webview>` tag. Each has its own dedicated preload, loaded fresh at mount. This includes the built-in Hub (§7.4) — a real mounted view like any other plugin, not part of the shell renderer.

### 5.1 View Security Settings — Every Plugin View, No Exceptions

| Setting | Value | Tag | Why |
|---|---|---|---|
| `contextIsolation` | `true` | MANDATORY | The plugin's *page* JS runs in a world separate from its preload's own variables. A plugin author must deliberately call `contextBridge.exposeInMainWorld` to hand the page anything — nothing leaks across by accident. This is retained even though the preload itself has full capability (below); it is a structural safety net against unintentional exposure, not a trust boundary against the plugin author. |
| `sandbox` | `false` | MANDATORY | The preload script runs with full Node access — real `fs`, `child_process`, `net`, and any pure-JS or native-binding npm package the plugin author bundled with it. This is the direct implementation of §4: real capability, granted once, at mount. |
| `nodeIntegration` | `false` | MANDATORY | The plugin's *page* itself never gets a raw `require`. Any Node capability the page uses must be deliberately exposed by that plugin's own preload via `contextBridge` — same mechanism as `contextIsolation`, same reasoning: a floor against accidental exposure, not a barrier the plugin author cannot choose to cross by exposing whatever they want. |

**Read this precisely:** the *page* stays exactly as constrained as before. What changed is the *preload* — previously sandboxed (no native bindings, no `fs`), now unsandboxed (full Node). A plugin author decides what capability, if any, to expose from preload to page via `contextBridge`. This gives every plugin author real system capability without removing the one structural guard (`contextIsolation`) that prevents a plugin's own *page* script from accidentally reaching into preload's scope.

**MANDATORY — a plugin never runs code inside the shell's own main process.** All real capability a plugin holds lives inside its own preload, which is part of that plugin's renderer process, not the shell's main process. A plugin cannot register its own `ipcMain` handler, cannot reach another plugin's `contextBridge` surface, and cannot reach the shell renderer's.

---

## 6. Directory Structure

```
titir/
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.renderer.json
├── vite.config.ts
├── README.md
├── .gitignore
│
├── docs/
│   ├── shell-guide.md            This document.
│   └── plugin-guide.md           The plugin-author-facing counterpart.
│
├── src/
│   ├── main/
│   │   ├── index.ts                  Boot window, wire IPC, register the
│   │   │                             built-in Hub plugin
│   │   ├── window/
│   │   │   ├── shell-window.ts         BrowserWindow creation, debounced
│   │   │   │                           geometry persistence
│   │   │   └── window-controls.ts      ipcMain handlers for
│   │   │                               window:minimize/maximize/close
│   │   ├── plugins/
│   │   │   ├── manifest-schema.ts      validateManifest(json) -> Result<Manifest>
│   │   │   ├── capabilities.ts         Capability enum, disclosure-flow
│   │   │   │                           helpers (§4)
│   │   │   ├── plugin-registry.ts      In-memory registry + persisted
│   │   │   │                           order/enabled state; per-plugin
│   │   │   │                           transition lock (§18); emits
│   │   │   │                           change events (§10)
│   │   │   ├── plugin-installer.ts     Extract .titirpkg + path-safety
│   │   │   │                           check + manifest validation +
│   │   │   │                           register (§8); serialized behind
│   │   │   │                           the install queue (§18)
│   │   │   ├── plugin-loader.ts        Creates a WebContentsView for a
│   │   │   │                           plugin, applies §5.1 settings,
│   │   │   │                           wires its preload
│   │   │   ├── lifecycle.ts            mount/show/hide/unmount/relaunch,
│   │   │   │                           bounds math (§9)
│   │   │   └── plugin-manager.ts       Facade — every plugin-related IPC
│   │   │                               call is routed through this
│   │   ├── ipc/
│   │   │   ├── channels.ts             Every ipcMain.handle for
│   │   │   │                           titir:*/window:*/dialog:*
│   │   │   ├── schemas.ts              zod schemas for every channel
│   │   │   │                           payload (§12)
│   │   │   ├── errors.ts               The ErrorCode enum and Result<T>
│   │   │   │                           type (§13)
│   │   │   └── broadcast.ts            Pushes titir:pluginsChanged to
│   │   │                               the shell renderer (§10)
│   │   ├── store/
│   │   │   └── config-store.ts         Flat-JSON persistence at
│   │   │                               `<userData>/titir.config.json`;
│   │   │                               single-writer queue (§18);
│   │   │                               corrupt-file recovery (§9.4)
│   │   ├── shared/
│   │   │   ├── constants.ts            Cross-process layout constants
│   │   │   │                           (NAV_WIDTH, TITLEBAR_HEIGHT)
│   │   │   └── types.ts                Shared type defs (Manifest,
│   │   │                               ShellConfig, Capability,
│   │   │                               IpcChannelMap, Result<T>)
│   │   └── preload/
│   │       └── shell-preload.ts        contextBridge for the shell's own
│   │                                   renderer only
│   │
│   └── renderer/
│       ├── index.html                Only HTML the main window itself
│       │                             loads directly
│       ├── main.tsx                  React root — Vite entry point
│       ├── App.tsx                   Top-level error boundary, idle/
│       │                             empty state, crash toast (§15)
│       └── nav/
│           ├── NavColumn.tsx          Composes the three stacked regions
│           │                          described in §11
│           ├── WindowControlsRow.tsx  minimize/maximize/close + drag
│           │                          region (§16)
│           ├── PluginList.tsx         Icon list, drag-reorder;
│           │                          subscribes to
│           │                          titir:pluginsChanged (§10)
│           └── HubEntry.tsx           Fixed bottom slot for the built-in
│                                      Hub plugin (§7.4)
│
└── plugins/
    ├── builtin/
    │   └── hub/                      Shipped with TiTir; written in
    │       ├── manifest.json         TypeScript like the rest of the
    │       ├── preload.ts            core, since it is TiTir's own code,
    │       ├── index.html            not a third-party package. Its
    │       ├── style.css             manifest id is `titir.hub`.
    │       └── renderer.ts
    └── installed/                    Every runtime-installed plugin
        └── <plugin-id>/              lands here, nowhere else.
            ├── manifest.json
            ├── preload.js            Plugin authors ship compiled JS —
            ├── index.html            any source language and build
            └── ...                  tool is the plugin author's own
                                      choice, made before packaging.
```

**MANDATORY — `dist/main/` and `dist/renderer/` are siblings, both directly under `dist/`.** A file at `src/main/window/shell-window.ts` compiles to `dist/main/window/shell-window.js`, whose `__dirname` at runtime is `dist/main/window` — two levels below `dist/`. Loading the shell's own `index.html` from there requires `path.join(__dirname, "../../renderer/index.html")`, never `"../renderer/index.html"`. A file directly in `src/main/` (e.g. `index.ts`) needs only `../renderer/`. Get this wrong and the window loads a blank page with no error beyond a failed local-resource load in the console.

`plugins/` is never compiled by TiTir's own build. Every plugin, including the built-in Hub, ships already-built JS/HTML/CSS.

---

## 7. Plugin Package Format & Manifest Schema

A plugin is a single `.titirpkg` file — a zip archive with a required internal layout:

```
my-plugin.titirpkg  (zip archive)
├── manifest.json
├── index.html        (or whatever path manifest.entry points to)
├── preload.js         (or whatever path manifest.preload points to)
└── ...                any other assets the plugin needs
```

### 7.1 Required Manifest Fields — MANDATORY

| Field | Type | Notes |
|---|---|---|
| `id` | string | Lowercase, alphanumeric plus `.`/`-`, matching `^[a-z0-9.-]+$`. Must be unique among currently installed plugins. The `titir.*` prefix is reserved. |
| `name` | string | Shown in the navigation column's tooltip and the Hub's plugin list. |
| `version` | string | Free-form; semver recommended, not parsed or compared by the shell. |
| `entry` | string | Path, relative to package root, to the HTML entry point. |
| `preload` | string | Path, relative to package root, to the already-compiled preload script (`.js`). |

### 7.2 Conditionally Required Field — MANDATORY

| Field | Type | Notes |
|---|---|---|
| `capabilities` | `Capability[]` | Required, non-empty, if the preload imports anything beyond `electron`. See §4.3 for the enum and disclosure behavior. Omit entirely only if the preload's only import is `electron` itself. |

### 7.3 Optional Manifest Fields — MANDATORY schema, OPTIONAL presence

| Field | Type | Notes |
|---|---|---|
| `icon` | string | Single emoji or inline monochrome SVG using `currentColor`. Defaults to a generic fallback glyph if omitted. |
| `summary` | string | One-line description shown in the Hub's plugin list. |
| `minShellVersion` | string | UNGOVERNED — never checked against the running shell version in v1. |

**Unrecognized fields — FREE.** Anything added to `manifest.json` beyond the fields above is not read by the shell. It does not fail validation and appears nowhere in shell chrome.

**TypeScript interface** (`src/main/shared/types.ts`):

```ts
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
```

**What the manifest never declares — MANDATORY.** Window bounds, lifecycle hooks, IPC channels beyond the one shared channel (§12), or scoped/restricted versions of a capability. A capability is granted in full or not declared at all — there is no partial grant (e.g., "filesystem read-only") in v1.

### 7.4 The Built-In Hub — MANDATORY

The Hub is not installed through §8's pipeline. It ships with TiTir's own source (`plugins/builtin/hub/`), is compiled alongside the shell, and is unconditionally registered and mounted on every boot, independent of `titir.config.json`. Its manifest `id` is `titir.hub`. It is not an entry in `plugins[]` (§10) — it has no `enabled`/`order` to persist, because neither is ever changeable for it. It cannot be disabled, reordered, or uninstalled by the person using the app. It does not declare `capabilities` — it is TiTir's own code, not a third-party plugin, and its access to the registry comes from the exclusive `titir:*` channels in §12, not from §4's capability model.

---

## 8. Plugin Installation Pipeline

**MANDATORY, exact order, every step enforced in code:**

1. **Path-safety extraction.** `plugin-installer.ts` opens the zip with `yauzl` and, for every entry, resolves its absolute target path inside `plugins/installed/<id>/` *before writing a single byte*. Any entry that would resolve outside that directory (a zip-slip pattern) causes the **entire** install to be refused. This runs before `manifest.json` is even read.
2. **Manifest validation** against §7's schema, via `zod`.
3. **Invalid → refused.** A missing required field, malformed `id`, `titir.*`-prefixed `id`, a duplicate `id`, or an unrecognized value inside `capabilities` all refuse the install with a specific `ErrorCode` (§13). Any already-extracted files are deleted. There is no partial-install state.
4. **Valid → path existence check.** The files named by `entry` and `preload` are confirmed to exist at those exact relative paths inside the extracted directory.
5. **Capability disclosure.** If `capabilities` is present and non-empty, the person is shown every declared capability and must explicitly confirm before the install proceeds (§4.3). Declining refuses the install and deletes the extracted files, identical to step 3's cleanup.
6. **Registration.** The plugin is added to `plugin-registry.ts`'s in-memory registry and to `plugins[]` (§10) with `enabled: true` and the next available `order`. `acknowledgedCapabilities` (§10) is recorded from what was disclosed and confirmed in step 5.
7. **Broadcast.** The registry emits a change event; the main process pushes `titir:pluginsChanged` to the shell renderer. The new icon appears immediately — no window reload.

**Uninstall** is the reverse: unmount if mounted (§9), remove from the registry and `plugins[]`, delete `plugins/installed/<id>/` from disk. The same broadcast fires.

Every install and uninstall runs through the single-writer install queue specified in §18 — concurrent install requests never race each other's disk writes.

---

## 9. Plugin Runtime Lifecycle

```
 registered ──(icon clicked)──▶ mounted ──▶ visible ⇄ hidden
     │                              │
     │                              ├──(preload throws synchronously)──▶ mount-failed
     │                              └──(renderer process gone)──▶ crashed ──(relaunch, manual)──▶ mounted
     │
     └──(uninstall)──▶ unregistered
```

| State | Meaning | Tag |
|---|---|---|
| `registered` | Known to the registry; manifest validated; no view exists yet. | — |
| `mounted` | A `WebContentsView` exists; preload has run to completion without throwing. | — |
| `visible` | Mounted, bounds fill the content area (§11). | — |
| `hidden` | Mounted, bounds zeroed. The process keeps running. | — |
| `mount-failed` | The preload threw synchronously during its own execution, before the entry HTML ever loaded. The view is torn down; the registry entry is untouched. | MANDATORY — see §9.2 |
| `crashed` | The renderer process died (`render-process-gone`). The view is torn down; the registry entry is untouched. | — |
| `unregistered` | Removed from the registry; files deleted. | — |

### 9.1 Guarantees — MANDATORY

- A plugin is never mounted before its icon is first clicked.
- A mounted plugin is never destroyed except on crash, mount-failure, or explicit uninstall — background work keeps running while `hidden`.
- A crash or mount-failure tears down exactly that one plugin's view. Every other plugin and the shell are unaffected.
- Every state transition is push-based. `titir:pluginsChanged` fires the instant install, uninstall, enable/disable, or reorder happens. `PluginList.tsx` and the Hub's own list view subscribe once, on mount, and re-render from the snapshot. Neither ever polls. `titir:getSnapshot` exists solely as a one-shot bootstrap call for populating initial state before any change event has arrived — never call it on a timer.

### 9.2 `mount-failed` — MANDATORY, exact behavior

Distinct from `crashed`. A preload that throws during its own top-level execution never reaches the point where the entry HTML loads — this is a setup failure, not a runtime crash, and is reported to the shell renderer with a distinct reason so the crash toast (§15) can read "Failed to start" rather than "Crashed." The view is discarded identically to a crash; the registry entry is untouched; Relaunch retries the exact mount sequence from the top.

### 9.3 Relaunch — MANDATORY, exact numbers

Relaunch is **always** a manual, person-initiated action — clicking the toast's Relaunch button (§15). There is no automatic retry loop in v1. The Relaunch action is debounced: once clicked, the button is disabled for **2000ms** before it can be clicked again for that same `pluginId`, preventing a rapid-click loop against a plugin that fails immediately on every mount attempt.

### 9.4 Corrupt Configuration Recovery — MANDATORY, exact behavior

If `titir.config.json` fails to parse as valid JSON, or fails `ShellConfig` schema validation (§10) on boot: the corrupt file is renamed to `titir.config.json.corrupt-<unix-timestamp>` in the same directory, a fresh default `ShellConfig` is written in its place, and boot continues. This is logged at startup. The shell never fails to boot because of a corrupt config file; it never silently discards the corrupt file either — it is preserved, renamed, alongside the fresh default.

---

## 10. Persisted Configuration Schema

`<userData>/titir.config.json` is the only thing that survives a restart. It rehydrates `plugin-registry.ts` on boot; manifests themselves are always re-read fresh from each plugin's own `manifest.json` on disk.

```json
{
  "window": { "width": 1200, "height": 800, "x": null, "y": null },
  "activePluginId": null,
  "plugins": [
    {
      "id": "string",
      "enabled": true,
      "order": 0,
      "acknowledgedCapabilities": []
    }
  ]
}
```

`src/main/shared/types.ts`:

```ts
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
```

| Field | Notes | Tag |
|---|---|---|
| `window` | Debounce-written on resize/move by `shell-window.ts`. | MANDATORY |
| `activePluginId` | Restored on next boot if the plugin still exists in the registry; otherwise `null`. | MANDATORY |
| `plugins[].id` | Matches a manifest `id`. | MANDATORY |
| `plugins[].enabled` | A disabled plugin stays registered but does not appear in the navigation column. | MANDATORY |
| `plugins[].order` | Drag-reorder position. | MANDATORY |
| `plugins[].acknowledgedCapabilities` | A permanent audit record of exactly what was disclosed and confirmed at install time (§8, step 5). Never re-derived from the current manifest — if a plugin author changes `capabilities` in a later version, this field only updates on a fresh install (§17 of the Plugin Guide: there is no in-place update). | MANDATORY |

**Decision — the Hub is not an entry in `plugins[]`** (§7.4).

---

## 11. Navigation Column & Content Area — Structural Contract

**MANDATORY, load-bearing for main-process bounds math. Unrelated to §4 — this is layout geometry, not a security or trust rule, and does not change with the capability model.**

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
│                │  shell's own idle/empty state instead.        │
└───────────────┴─────────────────────────────────────────────┘
```

`NAV_WIDTH = 72` (pixels), defined once in `src/main/shared/constants.ts`, consumed by the shell renderer so the value used for bounds math and the value used for the visual column width can never drift apart.

**The navigation column is itself divided into three stacked regions, top to bottom, never side by side:**

1. **Window controls row** — top, fixed height `TITLEBAR_HEIGHT = 40`. Houses the three custom window-control buttons and the window's entire drag handle (§16). Always present, never scrolls.
2. **Plugin list** — middle, fills remaining vertical space between the controls row and the pinned Hub slot. A vertically scrollable, drag-reorderable list of icons, one per enabled, installed plugin, in `plugins[].order` order. Clicking an icon mounts (if not already mounted) and shows that plugin, hiding whichever was previously shown.
3. **Hub slot** — bottom, fixed height, pinned flush to the bottom edge. Exactly one icon, for the Hub. Never part of the scrollable list, never reorderable, never removable.

**Content area rule.** At any moment, exactly one plugin (or none) is `visible`. The visible plugin's bounds: `{ x: NAV_WIDTH, y: 0, w: windowWidth - NAV_WIDTH, h: windowHeight }`. Every other mounted-but-not-visible plugin: `{ x: 0, y: 0, w: 0, h: 0 }` — zeroed, not detached, so it keeps running in the background per the `hidden` state (§9). When no plugin has ever been clicked, the content area shows the shell's own idle/empty state — the one and only piece of "content" the shell renderer itself ever draws inside the content area.

**Resize behavior.** On every window resize, the main process recomputes and re-applies the currently-visible plugin's bounds using the formula above. `NAV_WIDTH` never changes with window size.

---

## 12. Capability & IPC Contract

Two entirely separate tracks of capability exist. Conflating them is the single most common source of confusion in this document — read both halves before writing any code.

### 12.1 Track One — Shell-Mediated IPC (MANDATORY)

These channels exist because the underlying operation is architecturally main-process-only in Electron (a native dialog, control of the single `BrowserWindow`), or because it manages the registry itself — **not** because of any residual sandboxing philosophy. Every payload is validated against a `zod` schema in `schemas.ts` before any handler logic runs, and every response follows the `Result<T>` shape in §13.

| Channel | Direction | Caller | Payload → Response |
|---|---|---|---|
| `titir:installPlugin` | renderer → main | Hub only | `{ packagePath: string }` → `Result<{ pluginId: string }>` |
| `titir:uninstallPlugin` | renderer → main | Hub only | `{ pluginId: string }` → `Result<void>` |
| `titir:setPluginEnabled` | renderer → main | Hub only | `{ pluginId: string; enabled: boolean }` → `Result<void>` |
| `titir:reorderPlugins` | renderer → main | Hub only | `{ orderedIds: string[] }` → `Result<void>` |
| `titir:getSnapshot` | renderer → main | Hub + shell renderer | `{}` → `Result<RegistrySnapshot>` (one-shot bootstrap only, §9.1) |
| `dialog:openFile` | renderer → main | Any plugin | `{ properties: string[]; filters?: { name: string; extensions: string[] }[] }` → `Result<{ canceled: boolean; filePaths: string[] }>` |
| `window:minimize` | renderer → main | Shell renderer only | `{}` → `Result<void>` |
| `window:maximize` | renderer → main | Shell renderer only | `{}` → `Result<void>` |
| `window:close` | renderer → main | Shell renderer only | `{}` → `Result<void>` |
| `titir:pluginCrashed` | main → renderer | Shell renderer | `{ pluginId: string; reason: "crashed" \| "mount-failed" }` |
| `titir:pluginsChanged` | main → renderer | Shell renderer | `{ reason: "installed" \| "uninstalled" \| "enabled-changed" \| "reordered"; snapshot: RegistrySnapshot }` |

**MANDATORY** — `titir:*` management channels are wired only into the Hub's preload. A third-party plugin's own preload never receives them; calling one from a non-Hub plugin fails, not because of a runtime permission check, but because the channel is structurally never exposed on that plugin's `window` object in the first place.

**`dialog:openFile` returns a path string, not file contents.** A plugin using it for the OS picker's path, and then needing the file's actual bytes, reads them directly via its own Node `fs` access (Track Two) — not through a second IPC round-trip.

### 12.2 Track Two — Direct Plugin Capability (UNGOVERNED)

Everything a plugin's preload can do with the Node access granted by `sandbox: false` (§5.1) — reading/writing files, spawning processes, opening raw sockets, loading native-binding npm packages — happens entirely inside that plugin's own process. **No IPC channel is involved, and none needs to be built.** This is the direct implementation of §4: capability is granted once, at mount, not mediated per call.

A plugin author's own custom communication between their `entry` page and their own `preload.js` — however they choose to shape it — is **FREE**. The shell has no opinion on it and never sees it.

---

## 13. Error Contract

**MANDATORY — every shell-mediated operation (Track One, §12.1) returns this exact shape. No exceptions, no bare-string errors, no unhandled promise rejections crossing the IPC boundary.**

```ts
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

`message` is a human-readable string safe to show directly in shell chrome or the Hub's UI. `code` is a stable, machine-checkable identifier a caller can branch on without parsing `message`.

### 13.1 Error Code Taxonomy — MANDATORY, closed list

| Code | Meaning |
|---|---|
| `INSTALL_ZIP_SLIP` | A zip entry resolved outside the target install directory. |
| `INSTALL_INVALID_MANIFEST` | Schema validation failed — missing/malformed required field. |
| `INSTALL_RESERVED_PREFIX` | `id` begins with `titir.`. |
| `INSTALL_DUPLICATE_ID` | `id` matches an already-installed plugin. |
| `INSTALL_MISSING_ENTRY_FILE` | `entry` or `preload` path does not exist in the extracted package. |
| `INSTALL_INVALID_CAPABILITY` | A value in `capabilities` is not in the closed enum (§4.3). |
| `INSTALL_DISCLOSURE_DECLINED` | The person declined the capability disclosure step. |
| `MOUNT_PRELOAD_FAILED` | The preload threw synchronously; state transitions to `mount-failed` (§9.2). |
| `UNINSTALL_NOT_FOUND` | `pluginId` does not exist in the registry. |
| `IPC_INVALID_PAYLOAD` | Payload failed its `zod` schema before reaching handler logic. |
| `IPC_UNAUTHORIZED_CALLER` | A non-Hub plugin attempted a `titir:*` management channel — should be structurally unreachable; this code exists for defense-in-depth logging only. |
| `CONFIG_CORRUPT` | `titir.config.json` failed to parse or validate on boot (§9.4) — logged, not surfaced as a blocking error to the person. |
| `DIALOG_CANCELED` | Not an error — `dialog:openFile` returns `{ ok: true, data: { canceled: true, filePaths: [] } }`, never an `ok: false` result, for a person-initiated cancel. |

Adding a new code is a minor version bump (§0.1) to this document; removing or renaming one is a major version bump.

---

## 14. Resource Ownership & Teardown

**MANDATORY — states what the shell guarantees; UNGOVERNED — everything beyond that guarantee.**

- **MANDATORY** — the shell guarantees that ending a plugin's process (on hide-then-later-uninstall, crash, or explicit uninstall) terminates that `WebContentsView`'s own renderer process.
- **UNGOVERNED** — a plugin that spawned a child process via `process` capability, opened a file handle, or held a socket is solely responsible for closing/terminating those before its own process ends. The shell does not track, does not enumerate, and does not clean up a plugin's external handles or child processes.
- **UNGOVERNED** — a hard crash (§9, `crashed` state) that leaves an orphaned child process behind is an accepted consequence of the trust model in §4, not a defect to design around. Document this plainly to plugin authors (Plugin Guide) rather than implying the shell will ever reap a plugin's own children.

---

## 15. Crash Handling & Recovery

**MANDATORY:**

- Detected via the plugin view's `render-process-gone` event on its `WebContents`.
- On crash: the view is torn down immediately; the registry entry is kept exactly as it was — a crash never deregisters a plugin. `titir:pluginCrashed` is sent with `{ pluginId, reason: "crashed" }`. A `mount-failed` (§9.2) sends the same channel with `reason: "mount-failed"`.
- The shell renderer shows a toast with a plugin-scoped Relaunch action, debounced per §9.3. Clicking it re-triggers the mount sequence (§9) for that `pluginId` only — every other plugin, mounted or not, is unaffected.
- No in-memory plugin state ever survives a crash. A plugin needing its state to survive must persist it itself, from its own page, via `localStorage`/`IndexedDB`, or via its own direct Node `fs` capability if `filesystem` is declared (§4.3) — TiTir provides no automatic state snapshotting.

---

## 16. Window Chrome & Drag Region

**MANDATORY:**

- The `BrowserWindow` is frameless; native OS chrome is disabled entirely.
- The window-controls row (`WindowControlsRow.tsx`, height `TITLEBAR_HEIGHT`, §11) owns both the three custom control buttons and the window's entire drag region.
- The row's background carries `-webkit-app-region: drag`; each of the three buttons individually carries `-webkit-app-region: no-drag` so a click registers as a click instead of starting a window drag. No IPC channel is involved in the drag itself — it is native OS-level window movement, driven purely by CSS, spanning only `NAV_WIDTH` pixels rather than the full window width.
- In practice: click-and-hold anywhere in the row except the three buttons to move the window; click a button to trigger its `window:*` IPC channel (§12.1).
- Window geometry (`width`, `height`, `x`, `y`) is debounce-persisted to `titir.config.json` on every resize and move, and restored on next boot.

---

## 17. Security & Reliability Hardening

Additions layered on top of §4 and §5. None of these change what a plugin author is allowed to do inside their own preload's Node access — they harden the install pipeline, the shell-mediated channels, and the shell's own process against malformed input and its own bugs.

- **MANDATORY — Zip-slip protection on install.** Specified fully in §8, step 1. Runs before manifest validation, so a malicious archive is rejected before any of its content is trusted enough to be parsed as JSON.
- **MANDATORY — Schema-validated shell-mediated IPC.** Every `ipcMain.handle` in `channels.ts` (§12.1) parses its payload against the matching `zod` schema before touching it. A malformed payload returns `IPC_INVALID_PAYLOAD` (§13) and never reaches filesystem or process-level code.
- **MANDATORY — Content-Security-Policy on the shell renderer.** The shell renderer ships a restrictive CSP meta tag (`default-src 'self'`; no remote script execution) in its own `index.html`.
- **RECOMMENDED — Content-Security-Policy on a plugin's own renderer.** Given §4/§5, a page-level CSP is not a trust boundary between the shell and the plugin — the plugin's own preload already has full Node capability regardless. It remains a genuinely useful practice for a plugin author who wants to reduce their *own* page's exposure to injected remote script (e.g. if the plugin renders untrusted third-party content inside itself). Documented in the Plugin Guide as good practice, never checked by the shell.
- **MANDATORY — ASAR integrity on packaged builds.** Production builds enable Electron's ASAR integrity check, validating the packaged `app.asar` against a build-time hash at launch and refusing to run a tampered package. Packaging-time setting, not source code.
- **MANDATORY — A top-level React error boundary in `App.tsx`.** The shell renderer is the one renderer a person can never "relaunch" the way a crashed plugin can (§15) — if it throws during render, there is no chrome left to show a relaunch button in. `App.tsx` wraps its tree in an error boundary that falls back to a minimal, dependency-free retry UI written in plain DOM (no React required to render the fallback), so a bug in the navigation column cannot take the entire shell down to a blank window.
- **MANDATORY — Dependency hygiene.** Cross-reference to §3: `npm run audit:deps` runs before every release; any dependency with a known high/critical vulnerability, or flagged deprecated, blocks that release until resolved.

---

## 18. Concurrency & Race Conditions

**MANDATORY — every rule below exists to make a specific class of race structurally impossible, not merely unlikely.**

- **Single-writer install/uninstall queue.** `plugin-installer.ts` processes install and uninstall requests through a strictly serialized, promise-chained queue — one operation completes fully (through registration/deregistration and broadcast) before the next begins. Two simultaneous `.titirpkg` drops can never write to `plugins/installed/` concurrently, and an uninstall can never race an install of the same `id`.
- **Per-plugin transition lock.** `plugin-registry.ts` holds a lock keyed by `pluginId` for the duration of any lifecycle transition (mount, unmount, relaunch, uninstall). A second transition request for the same `pluginId` while one is in flight is queued behind it, never run concurrently against the same plugin's state.
- **Single-writer config store.** Every write to `titir.config.json` — window geometry, `activePluginId`, `plugins[]` changes — passes through one serialized writer in `config-store.ts`. Concurrent writers producing a torn or half-written config file is structurally impossible because there is only ever one writer in flight.

---

## 19. Build & Run

```bash
npm install
npm run build      # tsc for main/preload, then Vite for the renderer
npm start           # build, then launch electron .
```

`npm run audit:deps` runs before every release (§3, §17) — reports outdated dependencies and flags any package with a known high/critical vulnerability.

---

## 20. Definition of Done

Each subsystem below is complete only when every line is checked. This is the exit condition for building against this document — not a suggestion.

**Installer (`plugin-installer.ts`)**
- [ ] Zip-slip check runs entry-by-entry, before any write, before manifest parsing.
- [ ] Every refusal path (§8, steps 3, 5) deletes already-extracted files and leaves zero trace.
- [ ] Every install/uninstall passes through the single-writer queue (§18).
- [ ] Every failure returns a `Result<T>` with the correct `ErrorCode` (§13) — no thrown exceptions escape to the IPC boundary.

**Lifecycle Manager (`lifecycle.ts`, `plugin-registry.ts`)**
- [ ] `mount-failed` and `crashed` are distinct states with distinct handling (§9.2).
- [ ] Relaunch is manual-only, debounced at exactly 2000ms per `pluginId` (§9.3).
- [ ] Corrupt config is renamed and replaced with defaults on boot, never causes a boot failure (§9.4).
- [ ] Every lifecycle transition acquires the per-plugin lock (§18) before mutating state.

**Capability & Disclosure (`capabilities.ts`)**
- [ ] `capabilities` is required and non-empty whenever a preload imports beyond `electron`; validated against the closed enum.
- [ ] The disclosure UI blocks install until explicit confirmation; declining refuses cleanly.
- [ ] `acknowledgedCapabilities` is written to `plugins[]` at registration and never silently re-derived from a later manifest read.
- [ ] Every plugin view, regardless of declared capabilities, receives identical `sandbox: false` / `contextIsolation: true` / `nodeIntegration: false` settings (§5.1) — no per-plugin branching on declared capability.

**Shell-Mediated IPC (`channels.ts`, `schemas.ts`)**
- [ ] Every channel in §12.1 has a `zod` schema and is validated before handler logic runs.
- [ ] Every response follows `Result<T>` exactly (§13).
- [ ] `titir:*` management channels are wired only into the Hub's preload — confirmed by inspecting what `shell-preload.ts`/Hub's own preload actually exposes, not by a runtime check.

**Shell Renderer (`App.tsx`, `NavColumn.tsx`)**
- [ ] Top-level error boundary with a plain-DOM fallback, no React dependency in the fallback path.
- [ ] `NAV_WIDTH`/`TITLEBAR_HEIGHT` are imported from `shared/constants.ts`, never a second hardcoded literal anywhere in renderer code.
- [ ] `PluginList.tsx` subscribes to `titir:pluginsChanged` once; zero polling anywhere in the renderer tree.

**Config Store (`config-store.ts`)**
- [ ] All writes pass through the single serialized writer (§18).
- [ ] Window geometry writes are debounced, not written on every intermediate resize event.
- [ ] Schema-validated on every read at boot, with the §9.4 recovery path exercised and tested, not merely described.

---

## 21. Glossary

| Term | Definition |
|---|---|
| **Shell** | The main process plus the shell renderer — TiTir's own code, as distinct from any plugin. |
| **Plugin** | An independently-built package (`.titirpkg`) installed at runtime and given its own process. |
| **Hub** | The one built-in plugin, shipped with the shell's own source, responsible for install/uninstall/enable/reorder of every other plugin. |
| **Manifest** | `manifest.json` at a plugin package's root — the shell's only source of truth about what a plugin is and where to load it from. |
| **Capability** | A declared category of real system access (`filesystem`, `process`, `network`, `system_info`) a plugin's preload may use. Disclosed to the person at install; never technically enforced (§4.3). |
| **Mount** | The act of creating a `WebContentsView` and running a plugin's preload for the first time, triggered only by the first click on its icon. |
| **Registry** | The in-memory (and partially persisted) record of every installed plugin's state, owned by `plugin-registry.ts`. |
| **Disclosure** | The install-time step showing declared capabilities and requiring explicit confirmation before an install proceeds. |
| **UNGOVERNED** | A requirement tag (§0.6) for capability the shell technically grants but deliberately does not check, scope, or verify. |

---

*Shell Guide maintained for TiTir. PuFi has opinions about none of this and offers no warranty, implied or otherwise.*
