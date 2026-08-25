# TiTir — Plugin Guide

**Version:** 1.0
**Project:** TiTir
**Author:** Bijoy
**Mascot:** PuFi

This is the single document a plugin-building session needs. You do
not need TiTir's own source code, and you do not need the Shell Guide.
Everything required to design, build, package, disclose, and ship a
plugin that TiTir will accept and run — as a fully compliant plugin —
is here. (§24 adds a short, optional excerpt of the Shell Guide purely
for orientation — nothing in it is required reading, and it introduces
no requirement beyond what's already stated in this document.)

---

## 0. Document Governance & Versioning

### 0.1 Versioning Scheme

This document uses **major.minor** versioning, incremented on every
published revision.

- **Major** increments on a reversed or replaced decision — a change
  to the capability model, the manifest schema, or any rule a prior
  version stated as final.
- **Minor** increments on additions, new sections, or refinements that
  do not reverse a standing decision.

### 0.2 The Replacement Rule

Every revision replaces the affected clause in full. This document
never contains historical framing — no "previously X, now Y," no
changelog prose inside a clause, no strikethroughs. At any version,
this document reads as if it were written from nothing, at that
version. A separate, external changelog may exist outside this file;
nothing inside it narrates its own history.

### 0.3 Update Triggers

A version bump is required for: a changed manifest field, capability,
or error code; a reversed or newly resolved decision; a newly closed
ambiguity. A version bump is not required for typo or formatting
fixes.

### 0.4 Cross-Document Consistency

A shared fact — a constant, a schema, a channel, a state — has exactly
one authoritative document. This document references those facts by
section number against the Shell Guide rather than restating their
values as a competing definition. When a shared fact changes, this
document is updated in the same revision pass as the Shell Guide.

### 0.5 Authority Hierarchy

This document — the Plugin Guide — is authoritative over the
plugin-author-facing contract: what you must build, declare, and ship
for TiTir to accept and run your plugin. `titir_shell_guide.md` is
authoritative over the shell's own implementation. Where the two
describe the same fact, the Shell Guide wins.

### 0.6 Requirement Tags

Every rule in this document carries exactly one tag, identical in
meaning to the Shell Guide's own tag set:

| Tag | Meaning |
|---|---|
| **MANDATORY** | Enforced by the shell in code. Skip it and your plugin is refused at install, refuses to mount, or is structurally prevented from working. Not a style suggestion. |
| **RECOMMENDED** | Not enforced. Advisable practice; ignoring it does not block anything, but produces a worse or less reliable result — treat it as the default you deviate from only with a stated reason, not as optional polish. |
| **FREE** | The shell has no opinion and no stake. Neither compliance nor deviation has any consequence, technical or otherwise. |
| **UNGOVERNED** | Technically granted, but deliberately not checked, scoped, or verified by the shell. Distinct from FREE: this isn't the shell lacking an opinion — it's the shell consciously not gating a capability that carries real consequence. Read every UNGOVERNED rule as "this is real and it is on you." |

A rule with no tag is an error in this document, not an implied
default. Follow every MANDATORY item below and the result is, by
definition, a compliant, working TiTir plugin.

---

## 1. What a Plugin Is — MANDATORY shape

A plugin is a folder, zipped into a file with the `.titirpkg`
extension, containing at minimum:

```
your-plugin/
  manifest.json     ← MANDATORY, see §3
  preload.js         ← MANDATORY, compiled JS (see §11)
  index.html          ← MANDATORY, your entry point
  (anything else: css, js, images, native modules, a bundled dist/,
   etc. — FREE)
```

This package is handed to TiTir through the built-in **Hub** plugin —
drag the `.titirpkg` file onto the Hub's interface, or pick it via the
Hub's own file dialog. The Hub is pinned to the bottom of the
navigation column and is TiTir's sole app-management plugin. There is
no other install path; your own plugin cannot install itself or
another plugin (§12.1).

---

## 2. Trust Model — What This Means for Your Plugin

**MANDATORY to understand before writing a single line of code — this
section governs everything else in this document.**

### 2.1 What You're Actually Being Given

Once a person installs your plugin, it runs as a **trusted program
with real access to the machine it's running on**. TiTir does not
sandbox your plugin's code from the operating system. Your
`preload.js` has genuine Node access — real `fs`, real
`child_process`, real `net`, real native-binding npm packages — the
same access any other program installed on that machine has. See §11
for the exact mechanics.

### 2.2 What This Means for What You Build

- You do not need to route filesystem, process, or low-level network
  work through the shell. There is no capability-broker IPC channel
  for any of it, and none needs to exist (§12.2) — you call Node APIs
  directly, in your own preload, in your own process.
- You are responsible for using that access correctly: closing file
  handles, terminating child processes you spawn, and not leaking
  resources. The shell tracks none of this on your behalf (§16).
- Trust is established once, at the moment the person installs your
  plugin — through the capability disclosure step in §4. Everything
  after that moment is between the person and you, not between the
  person and TiTir.

### 2.3 What Stays Constrained

Two structural guards remain, unconditionally, on every plugin view —
not because the shell distrusts your preload's *capability*, but as a
floor against *accidental* exposure inside your own code:

- `contextIsolation: true` — your page's own JS runs in a world
  separate from your preload's variables. Nothing crosses to the page
  automatically; you deliberately hand it whatever you choose via
  `contextBridge.exposeInMainWorld`.
- `nodeIntegration: false` — your page itself never gets a raw
  `require`. Any Node-backed capability your page uses must be
  something your own preload explicitly exposed.

Full detail, including the exact settings table, is in §11.

---

## 3. The Manifest Contract — MANDATORY

`manifest.json` sits at the root of your package. This is the single
schema the shell validates; nothing outside this section's tables is
checked or trusted.

### 3.1 Required Fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Matches `^[a-z0-9.-]+$`. Must be unique among currently installed plugins. The `titir.*` prefix is reserved for TiTir's own built-in plugins (the Hub's id is `titir.hub`) — using it fails validation. See §17 for the naming convention this document uses for new plugins. |
| `name` | string | Shown in the navigation column's tooltip and the Hub's plugin list. See §17 for the display-name convention. |
| `version` | string | Free-form; semver recommended, not parsed or compared by the shell. See §20 for what this field does and does not do. |
| `entry` | string | Path, relative to the package root, to your HTML entry point. |
| `preload` | string | Path, relative to the package root, to your **compiled** preload script — plain `.js` (§11). |

### 3.2 Conditionally Required Field

| Field | Type | Notes |
|---|---|---|
| `capabilities` | `Capability[]` | **Required and non-empty if your preload imports anything beyond `electron` itself.** Omit entirely only if your preload's sole import is `electron`. Drawn from the closed enum in §4 — an unrecognized value fails validation with `INSTALL_INVALID_CAPABILITY` (§5, §13). This is the single field that tells the person what scope your plugin claims — get it right. |

### 3.3 Optional Fields

| Field | Type | Notes |
|---|---|---|
| `icon` | string | A single emoji glyph, or inline monochrome SVG markup using `currentColor`. Shown in the navigation column. Defaults to a generic fallback glyph if omitted. See §18 — this is the one visual choice worth getting right, because it's the only part of your plugin rendered outside your own view. |
| `summary` | string | One-line description shown in the Hub's plugin list. |
| `minShellVersion` | string | **UNGOVERNED** — never checked against the running shell version in v1. Declaring it does not gate install or mount against a mismatched shell. Don't build a feature that assumes it does. |

**Unrecognized fields — FREE.** Anything you add to `manifest.json`
beyond the fields above is not read by the shell. It does not fail
validation and does not appear anywhere in shell chrome. Don't build a
feature that depends on the shell reading a custom manifest key — it
never will.

### 3.4 TypeScript Interface

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

### 3.5 Example

```json
{
  "id": "dev.bijoyexample.filesync",
  "name": "File Sync",
  "version": "1.0.0",
  "entry": "index.html",
  "preload": "preload.js",
  "capabilities": ["filesystem", "network"],
  "icon": "⇅",
  "summary": "Watch a local folder and mirror it to a remote endpoint."
}
```

### 3.6 What the Manifest Never Declares

You do not declare window bounds, lifecycle hooks, or IPC channels
here. Bounds and visibility are entirely the shell's job (§7). Your
renderer-to-preload contract, beyond the one shared channel in §12.1,
is entirely your own business. A capability is granted **in full or
not declared at all** — there is no partial or scoped grant (e.g.
"filesystem read-only") in v1; do not build a plugin whose safety
story depends on one existing.

**You never persist your own enabled/order state.** Whether you're
enabled and where you sit in the navigation list is tracked and
restored by the shell itself, automatically, across restarts. Don't
build a settings toggle for this inside your own plugin.

---

## 4. Capability Declaration & Disclosure — Your Plugin's Scope

**MANDATORY where stated, UNGOVERNED where stated — read every line,
this is the section that determines what your plugin is allowed to
claim and what actually happens when it does.**

### 4.1 The Closed Enum

```ts
export type Capability = "filesystem" | "process" | "network" | "system_info";
```

| Capability | Covers |
|---|---|
| `filesystem` | Reading or writing files/directories via Node's `fs` from your preload. |
| `process` | Spawning or controlling other processes via `child_process`. |
| `network` | Raw sockets or Node-level networking (`net`, `dgram`) from your preload — **not** ordinary `fetch`/`XMLHttpRequest` from your own page, which is a standard web-platform capability available to any page regardless of declaration and requires no capability entry here. |
| `system_info` | OS/hardware details beyond what the standard web platform already exposes (e.g. `os.cpus()`, `os.totalmem()`). |

**MANDATORY** — `capabilities` is required and non-empty in your
manifest the moment your preload's imports go beyond `electron`
itself. An unrecognized string anywhere in the array fails validation
outright (`INSTALL_INVALID_CAPABILITY`, §13) — the whole install is
refused, not just that entry.

### 4.2 What Declaring a Capability Actually Buys You

**MANDATORY** — the install flow renders every capability you declare
to the person, in full, and requires an explicit confirmation click
before your install proceeds (§5, step 5). Declining refuses the
install and deletes the extracted files — your plugin simply does not
end up installed.

**UNGOVERNED** — this is the part to read twice: declaring a
capability, or omitting one, changes **nothing** about what the shell
technically grants your preload. Every mounted plugin's preload runs
under the identical `sandbox: false` settings in §11, regardless of
what its manifest declares. The shell never inspects, restricts, or
verifies your plugin's actual runtime behavior against its
declaration. The field exists to inform the person about your
plugin's claimed scope — it does not scope your plugin.

**Practical consequence:** a plugin that declares no capabilities but
whose preload nonetheless calls `require('fs')` will not be
technically blocked from doing so — but it will have lied to the
person about its own scope, in a field that exists specifically so
they don't have to guess. Declare accurately. This is a trust
relationship with the person using your plugin, not a technical gate
you can quietly route around.

### 4.3 What This Means for "Permissions" as a Concept

There is no technical permission system in TiTir v1. There is a
disclosure step. Do not build, and do not describe to a person inside
your own plugin's UI, any behavior implying that declaring fewer
capabilities results in your plugin having less actual access. It does
not — see §4.2.

### 4.4 Accessibility of Your Plugin's Scope, at a Glance

Because `capabilities` is the one field a person sees *before*
committing to install, treat it as the primary way your plugin
communicates what it can reach:

- If your plugin only talks to its own page via `fetch` and never
  touches `fs`/`child_process`/`net` from preload, omit `capabilities`
  entirely — this is itself a meaningful, accurate signal of narrow
  scope.
- If your plugin needs `filesystem` and `network`, declare both, even
  if one is used only occasionally — an under-declared plugin isn't
  blocked by anything (§4.2), but it does mislead the person reading
  the disclosure screen.
- Never declare a capability you don't use "just in case." The
  disclosure list is read by a person deciding whether to trust you;
  pad it and that decision is made on bad information.

---

## 5. The Install-Time Contract — MANDATORY, exact sequence

This is precisely what happens between your `.titirpkg` file landing
on disk and your plugin appearing in the navigation column. Every step
is enforced by the shell; none can be skipped, reordered, or opted out
of from inside your own plugin code. Every install and uninstall runs
through the shell's single-writer install queue — two simultaneous
drops never race each other's disk writes, and this is entirely the
shell's concern, not something your plugin needs to account for.

1. **Path-safety extraction.** The shell opens your zip and, entry by
   entry, resolves what each file's target path on disk would be
   *before writing anything*. If a single entry would resolve outside
   your plugin's own install directory (a "zip-slip" pattern), the
   **entire** install is refused immediately with `INSTALL_ZIP_SLIP` —
   nothing is written, and this runs before your `manifest.json` is
   even opened.
2. **Manifest parsing and validation** against §3's schema.
3. **Invalid → refused.** A missing required field
   (`INSTALL_INVALID_MANIFEST`), a `titir.*`-prefixed `id`
   (`INSTALL_RESERVED_PREFIX`), a duplicate `id`
   (`INSTALL_DUPLICATE_ID`), or an unrecognized `capabilities` value
   (`INSTALL_INVALID_CAPABILITY`) all refuse the install with that
   specific error code (§13). Any already-extracted files are deleted.
   Your plugin does not half-exist in any state.
4. **Valid → path existence check.** The files named by `entry` and
   `preload` are confirmed to exist, at those exact relative paths,
   inside your extracted package. A miss here is
   `INSTALL_MISSING_ENTRY_FILE`.
5. **Capability disclosure.** If `capabilities` is present and
   non-empty, the person is shown every declared capability and must
   explicitly confirm before install proceeds (§4.2). Declining is
   `INSTALL_DISCLOSURE_DECLINED` — the extracted files are deleted
   identically to step 3.
6. **Registration.** Only now does your plugin start to exist as far
   as TiTir is concerned — added to the shell's registry, enabled by
   default, placed at the end of the navigation list.
   `acknowledgedCapabilities` is recorded from exactly what was
   disclosed and confirmed in step 5 — this becomes a permanent audit
   record (§9). Nothing of yours is running yet.
7. **Immediate visibility.** Your icon appears in the navigation
   column right away. No restart of TiTir is ever required.

If a step above isn't satisfied, your plugin is not installed. There
is no partial-install, no "installed but broken" state to design
around.

---

## 6. The Mount & Handshake Contract — MANDATORY, exact sequence

Installation and mounting are two different moments, and the gap
between them can be arbitrarily long. This is the exact sequence that
happens the first time (and only the first time) the person clicks
your icon:

1. **A real content view is created for you** — not an `<iframe>`, not
   a `<webview>` tag, a genuine separate renderer process attached to
   the main window.
2. **Fixed security settings are applied before anything of yours
   loads** — `contextIsolation: true`, `sandbox: false`,
   `nodeIntegration: false` (§11). These are not configurable from
   inside your manifest or your own code.
3. **Your `preload.js` executes.** This is the handshake moment — the
   point where your code first has access to real Node capability
   (§11) and to `contextBridge`/`ipcRenderer` (§12). If your preload
   throws synchronously during this top-level execution, the mount
   attempt is a **`mount-failed`**, not a crash — see §9.2 — and your
   `entry` HTML never loads at all.
4. **Your `entry` HTML then loads inside that view**, only if step 3
   completed without throwing. From this point forward, everything is
   entirely your own JS/CSS/DOM. The shell injects nothing into your
   page, reads nothing from your DOM, and never touches it again for
   the rest of the session.

No other handshake exists. There is no "onMount," "onShow," "onReady,"
or similar lifecycle callback the shell calls into your code. Your
`preload.js` executing to completion is the only signal you ever get
that you've become active.

---

## 7. Visibility & Bounds — MANDATORY, exact numbers

Every time the person switches which plugin is active, the shell
repositions views by changing bounds — it never mounts or unmounts
anything as part of switching (§10).

- **Navigation column width is a fixed constant: `72` pixels.** It
  never changes with window size.
- **When you are the active plugin**, your bounds are set to:
  `{ x: 72, y: 0, width: windowWidth - 72, height: windowHeight }`.
- **When any other plugin becomes active**, your bounds are set to:
  `{ x: 0, y: 0, width: 0, height: 0 }`. You are not unmounted, paused,
  or destroyed — your process keeps running with zero screen space.
  See §10 for what this means for background work.
- **You cannot detect this transition.** No `visibilitychange`-style
  event, no IPC message, is sent to tell you your bounds just changed.
  If your plugin needs to behave differently while effectively hidden,
  infer it yourself — the shell gives you no signal.
- **You never receive or request your own bounds.** There is no API
  call that returns "how big am I right now" — build your internal
  layout responsive to whatever space CSS reports.

---

## 8. What You Are Guaranteed — MANDATORY

Build against these without checking at runtime — they will not
change underneath you within v1:

- A rectangle of screen space, sized and positioned per §7, whenever
  you are the active plugin.
- Total isolation from every other plugin's `contextBridge` surface,
  DOM, and in-memory state — and from the shell's own chrome. Real
  system capability (§2, §11) does not weaken this; it is a separate
  axis entirely (§4.4 of the Shell Guide, §10 below).
- Survival while hidden — any in-progress work (timers, network
  requests, a spawned child process) keeps running exactly as if you
  were visible.
- Crash and mount-failure isolation — if your renderer process dies,
  or your preload throws at mount, only your own view is torn down.
  The shell and every other plugin, mounted or not, are completely
  unaffected, and the person is offered a Relaunch action scoped
  specifically to your plugin (§15).

---

## 9. Lifecycle States — informational

A useful mental model, not something you implement against directly —
every transition is driven by the person using the app, never by a
timer or schedule.

```
 registered ──(icon clicked)──▶ mounted ──▶ visible ⇄ hidden
     │                              │
     │                              ├──(preload throws synchronously)──▶ mount-failed
     │                              └──(renderer process gone)──▶ crashed ──(relaunch, manual)──▶ mounted
     │
     └──(uninstall)──▶ unregistered
```

| State | Meaning | What triggers it |
|---|---|---|
| `registered` | Manifest validated, capabilities disclosed and confirmed, your icon is in the navigation column, nothing of yours is running | Successful install (§5) |
| `mounted` | Your content view exists, your `preload.js` ran to completion without throwing | First click on your icon, ever |
| `visible` | Mounted, bounds fill the content area | You are the active plugin |
| `hidden` | Mounted, bounds zeroed, process still running | Person switches to a different plugin |
| `mount-failed` | Your preload threw synchronously — your `entry` never loaded (§9.2) | A synchronous throw during preload's own top-level execution |
| `crashed` | Renderer process died, view torn down, registry entry kept | Renderer process crash |
| `unregistered` | Removed from the registry, files deleted from disk | Uninstall |

### 9.1 `mount-failed` vs. `crashed`

These are deliberately distinct. `mount-failed` means your `entry`
HTML never got the chance to load — a setup failure inside your own
preload, reported with `MOUNT_PRELOAD_FAILED` (§13) so the crash toast
reads "Failed to start" rather than "Crashed" (§15). `crashed` means
your renderer process was running and then died. Both are recovered
identically — a manual, person-clicked Relaunch re-runs the mount
sequence (§6) from the top — but write your own error handling with
the distinction in mind: a `mount-failed` plugin's page-level state
(anything held only in your `entry`'s JS) never existed in the first
place, since the page never loaded.

### 9.2 Practical Implications

- You never receive any call before the person clicks your icon for
  the first time — do not schedule startup work that assumes it runs
  earlier.
- Once `mounted`, you stay mounted (only toggling `visible`/`hidden`)
  until a crash, a mount-failure, or an uninstall. Don't re-run
  one-time setup logic every time you become visible again — there is
  no event to hook for that (§7).
- A `crashed` or `mount-failed` plugin returns to `mounted` on
  relaunch, not back to `registered` — the person clicks Relaunch,
  they do not reinstall you, and `acknowledgedCapabilities` (§4) is
  never re-disclosed on a relaunch.

---

## 10. Isolation & Independence — MANDATORY guarantees

- Switching the active plugin never unmounts, pauses, or destroys any
  *other* mounted plugin. Only bounds change. Your background work — a
  download, a websocket, a spawned process, a timer — keeps running
  exactly as if you were still visible.
- Each plugin runs in its own real, process-backed view. One plugin
  crashing, hanging, or leaking memory has no structural effect on any
  other plugin or on the shell itself — though see §16 for what real
  system capability means for what a *badly behaved* plugin can still
  do to the machine, which is a different question from shell-level
  crash isolation.
- You cannot reach another plugin's `contextBridge` surface, storage,
  or in-memory state under any circumstance, and no other plugin can
  reach yours — this holds regardless of what capabilities either
  plugin declared.
- Once mounted, you are never destroyed for the rest of the session —
  only shown or hidden. Do not write logic that assumes
  re-initialization each time you're shown again.

---

## 11. Technical Requirements — MANDATORY, read this before writing any code

### 11.1 Security Settings Are Fixed by the Shell, Not by You

Every plugin view gets exactly these three settings, applied before
your preload runs (§6):

| Setting | Value | What it means for you |
|---|---|---|
| `contextIsolation` | `true` | Your page's JS runs in a world separate from your preload's own variables. Nothing crosses to the page by accident — you must deliberately call `contextBridge.exposeInMainWorld` to hand the page anything. |
| `sandbox` | `false` | Your preload has **real Node access** — `fs`, `child_process`, `net`, and any pure-JS or native-binding npm package you bundle with it. This is the direct consequence of §2's trust model: real capability, granted once, at mount. |
| `nodeIntegration` | `false` | Your page itself never gets a raw `require`. Any Node-backed capability your page uses must be something your own preload explicitly exposed via `contextBridge`. |

None of these three is a default you can override — no field in your
manifest, no code in your preload, changes them.

### 11.2 What Real Preload Capability Means in Practice

Your preload script runs in a **full Node.js context**, not a
restricted one. You have:

- `require('electron')` — `contextBridge`, `ipcRenderer`. Always
  works, always available regardless of declared capabilities.
- `require('fs')`, `require('child_process')`, `require('net')`, or any
  other Node built-in — works, provided you declared the matching
  capability (§4) so the person was told about it. Nothing technically
  blocks an undeclared call (§4.2) — but declare it anyway; this is
  the entire point of the disclosure step.
- Any third-party npm package, including ones backed by native
  bindings, bundled alongside your compiled preload.

**This has a direct consequence for persistence.** Because your
preload can genuinely touch the filesystem, you have two equally valid
ways to persist plugin state across a hide/show cycle, a crash, or a
restart:

- Standard browser storage (`localStorage`, `sessionStorage`,
  `IndexedDB`) called directly from your own **page** — works
  regardless of any declared capability, since these are ordinary Web
  Platform APIs unaffected by `contextIsolation` or `sandbox`.
- Direct `fs` writes from your **preload**, if you've declared
  `filesystem` — a legitimate first-class option now, not a
  workaround. See §14 for the file-reading case specifically.

Pick whichever fits your plugin; neither is more "correct" than the
other in v1.

### 11.3 Ship Compiled JavaScript

The shell loads whatever plain JS sits at your `entry`/`preload`
paths — it has no TypeScript compiler, no bundler, no JSX transform of
its own. Writing TypeScript, JSX, or using a frontend framework inside
your own plugin is entirely FREE — but you must compile and bundle
everything down to plain JS/HTML/CSS **before** zipping. A manifest
pointing at a `.ts`/`.tsx` file fails install validation outright
(`INSTALL_MISSING_ENTRY_FILE`, §5) — `entry` and `preload` must
resolve to files directly loadable as-is.

### 11.4 Identity and Paths

- **Your `id` is permanent for the life of that install.** It is how
  the shell tells your plugin apart from every other one, and —
  because duplicate ids are refused at install (§5) — it is also why
  there is no in-place update mechanism (§20).
- **`entry` and `preload` paths must exist in the zip exactly as
  declared.** A missing file at either path fails install-time
  validation (§5, step 4).

---

## 12. The Capability & IPC Contract

Two entirely separate tracks exist. Conflating them is the single
easiest way to misunderstand your own plugin's scope — read both
before writing any code that talks to the shell or to your own
operating system.

### 12.1 Track One — Shell-Mediated IPC (MANDATORY)

These channels exist because the underlying operation is
architecturally main-process-only in Electron (a native dialog,
control of the single `BrowserWindow`), or because it manages the
shell's own registry — **not** because of any sandboxing philosophy.
Every payload you send is validated against a schema before any
handler logic runs, and every response follows the `Result<T>` shape
in §13.

| Channel | Direction | Caller | Payload → Response |
|---|---|---|---|
| `dialog:openFile` | renderer → main | Any plugin | `{ properties: string[]; filters?: { name: string; extensions: string[] }[] }` → `Result<{ canceled: boolean; filePaths: string[] }>` |
| `titir:installPlugin` | renderer → main | Hub only | Not exposed to your preload — see §16. |
| `titir:uninstallPlugin` | renderer → main | Hub only | Not exposed to your preload — see §16. |
| `titir:setPluginEnabled` | renderer → main | Hub only | Not exposed to your preload — see §16. |
| `titir:reorderPlugins` | renderer → main | Hub only | Not exposed to your preload — see §16. |
| `titir:getSnapshot` | renderer → main | Hub + shell renderer | Not exposed to your preload — see §16. |

**`dialog:openFile` returns a path string, not file contents.** If you
need the native OS picker's *path* for display, or to hand to your own
`fs` call, this is the right channel. If you need the file's actual
bytes, read them yourself — either via direct `fs` access (§14, if
`filesystem` is declared) or via the browser File API (§14, if it
isn't). Don't expect a second IPC round-trip to hand you contents;
none exists.

```js
// in your preload.js
const { contextBridge, ipcRenderer } = require('electron');

async function pickFilePath() {
  const res = await ipcRenderer.invoke('dialog:openFile', {
    properties: ['openFile'],
    filters: [{ name: 'Text', extensions: ['txt'] }]
  });
  if (!res.ok) return null;
  if (res.data.canceled) return null;
  return res.data.filePaths[0];
}

contextBridge.exposeInMainWorld('myPlugin', { pickFilePath });
```

This is the only shell-mediated channel every plugin is expected to
know about. Everything else about how your own renderer and preload
talk to each other is entirely up to you — FREE.

### 12.2 Track Two — Direct Plugin Capability (UNGOVERNED)

Everything your preload can do with the Node access granted by
`sandbox: false` (§11) — reading/writing files, spawning processes,
opening raw sockets, loading native-binding npm packages — happens
entirely inside your own process. **No IPC channel is involved, and
none needs to be built.** This is the direct implementation of §2:
capability is granted once, at mount, not mediated per call.

Your own custom communication between your `entry` page and your own
`preload.js` — however you choose to shape it — is entirely **FREE**.
The shell has no opinion on it and never sees it.

---

## 13. Error Contract — MANDATORY

Every shell-mediated operation (Track One, §12.1) returns this exact
shape:

```ts
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

`message` is a human-readable string safe to show directly in your own
UI. `code` is a stable, machine-checkable identifier you can branch on
without parsing `message`. Design your own error handling around
`code`, never around matching substrings in `message`.

### 13.1 Error Codes Relevant to a Plugin Author

| Code | When you'll see it | Where |
|---|---|---|
| `INSTALL_ZIP_SLIP` | A zip entry in your package resolves outside its install directory | Install (§5) |
| `INSTALL_INVALID_MANIFEST` | A required manifest field (§3.1) is missing or malformed | Install (§5) |
| `INSTALL_RESERVED_PREFIX` | Your `id` begins with `titir.` | Install (§5) |
| `INSTALL_DUPLICATE_ID` | Your `id` matches an already-installed plugin | Install (§5) |
| `INSTALL_MISSING_ENTRY_FILE` | `entry` or `preload` doesn't exist in the extracted package | Install (§5) |
| `INSTALL_INVALID_CAPABILITY` | A value in your `capabilities` array isn't in the closed enum (§4.1) | Install (§5) |
| `INSTALL_DISCLOSURE_DECLINED` | The person declined your capability disclosure | Install (§5) |
| `MOUNT_PRELOAD_FAILED` | Your preload threw synchronously — `mount-failed` state (§9) | Mount (§6) |
| `DIALOG_CANCELED` | Not an error — `dialog:openFile` returns `{ ok: true, data: { canceled: true, filePaths: [] } }` for a person-initiated cancel | Runtime (§12.1) |

A handful of additional codes (`UNINSTALL_NOT_FOUND`,
`IPC_INVALID_PAYLOAD`, `IPC_UNAUTHORIZED_CALLER`, `CONFIG_CORRUPT`)
exist for completeness of the shell's own error taxonomy but describe
conditions your own plugin code cannot trigger or observe — they're
documented in the Shell Guide, not repeated here.

---

## 14. Reading Files — MANDATORY guidance, two valid paths

You now have two legitimate ways to get a file's actual contents,
depending on whether you've declared `filesystem` (§4):

**If you declared `filesystem`** — read it directly, from your
preload, with real `fs` access, and hand the result to your page
however you've wired your own `contextBridge` surface:

```js
// in your preload.js — requires "capabilities": ["filesystem"]
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs/promises');

contextBridge.exposeInMainWorld('myPlugin', {
  async readTextFile(absolutePath) {
    return fs.readFile(absolutePath, 'utf-8');
  },
  async pickFilePath() {
    const res = await ipcRenderer.invoke('dialog:openFile', {
      properties: ['openFile']
    });
    if (!res.ok || res.data.canceled) return null;
    return res.data.filePaths[0];
  }
});
```

**If you didn't declare `filesystem`** — use the standard browser File
API, directly in your `entry` page, no preload involvement required:

```html
<input type="file" id="picker" accept=".txt" />
<script>
  document.getElementById('picker').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const text = await file.text(); // full file contents, no Node access needed
    console.log(text);
  });
</script>
```

Both are equally legitimate. Choose based on whether your plugin
already has a reason to declare `filesystem` for other work — don't
declare it solely to read one file the File API would have handled
without asking for broader scope than you need (§4.4).

---

## 15. Crash & Mount-Failure Behavior — MANDATORY, from your plugin's perspective

- If your renderer process dies, your view is torn down immediately.
  Your registry entry is untouched — you are not uninstalled by a
  crash.
- If your preload throws synchronously during its own execution, the
  same teardown happens, reported as `mount-failed` rather than
  `crashed` (§9.1) — your `entry` HTML never got a chance to load.
- The person sees a Relaunch action scoped specifically to your
  plugin. It is **manual only** — there is no automatic retry — and
  **debounced at exactly 2000ms** per plugin, so a plugin that fails
  immediately on every attempt can't be rapid-clicked into a tight
  loop. Clicking it re-runs the mount sequence in §6 from the top.
- **No in-memory state survives a crash or mount-failure, ever.**
  Anything that matters must already be persisted — via
  `localStorage`/`IndexedDB` from your page, or via direct `fs` writes
  from your preload if `filesystem` is declared (§11.2, §14) — before
  the failure happens, not held only in a JavaScript variable.

---

## 16. What You Must Never Assume — MANDATORY boundaries

- You cannot resize, move, or reposition the shell window.
- You cannot change your own bounds within the content area. Need
  internal sub-layout — panes, an internal sidebar of your own? Build
  it with your own CSS/DOM inside the space you're given.
- You cannot detect your own visibility via any event — none is sent
  (§7). Infer it yourself if you need to know.
- You get no shell chrome inside your own view — no window controls,
  no navigation column, no idle-state branding. Only the shell's own
  renderer ever draws those, outside your view entirely.
- `titir:installPlugin`, `titir:uninstallPlugin`,
  `titir:setPluginEnabled`, `titir:reorderPlugins`, and
  `titir:getSnapshot` are wired into the Hub plugin's preload only.
  This is a structural fact, not a runtime permission check: your own
  preload never receives them, so calling one from your code fails
  because the channel simply isn't on your `window` object.
- Real Node capability (§11) does not change the previous point.
  Having `fs`/`child_process`/`net` access does not grant you access
  to any `titir:*` management channel — those are two unrelated axes
  (Track One vs. Track Two, §12).
- **The shell does not track, enumerate, or clean up anything you open
  with your real system capability.** If `process` is declared and you
  spawn a child process, closing or terminating it before your own
  process ends is entirely your responsibility (§2.2). A hard crash
  that orphans a child process you spawned is an accepted consequence
  of the trust model, not a shell defect — the shell will never reap
  your children for you. The same applies to open file handles and
  sockets. Design your own teardown accordingly.
- Don't assume a `minShellVersion` you declare is ever checked against
  anything — it isn't, in v1 (§3.3).
- You cannot get your own icon pinned outside the ordinary,
  drag-reorderable navigation list — the fixed bottom position is
  exclusive to the built-in Hub.
- Declaring a capability does not scope what you can technically do,
  and omitting one does not restrict it either (§4.2) — never build
  correctness or safety logic that assumes the shell enforces your own
  declaration.

---

## 17. Naming Conventions — RECOMMENDED, treat as the standard

Your `id` is global across every plugin installed on a given machine
and effectively permanent for that install, since there is no rename
path (§11.4, §20). The shell only blocks the `titir.*` prefix and
exact duplicates at install time (§5) — it does not reserve any
namespace on your behalf.

**`id` — reverse-domain style, lowercase.** Use
`<tld>.<owner>.<plugin>`, e.g. `dev.bijoyexample.filesync` or
`com.acmecorp.notes`. This is RECOMMENDED, not enforced — but treat it
as the standard, not a suggestion: a bare `notes` is legal and
functional, but collides easily with another author's plugin of the
same name on the same machine, and reads as unfinished in the Hub's
plugin list next to properly namespaced entries. There is no cost to
doing this correctly and a real cost to not.

**`name` — Title Case, concise, no version numbers or taglines baked
in.** This is what the person actually reads in the tooltip and the
Hub's list — "File Sync," not "file-sync-plugin" or "FileSync v2 —
Now With Cloud!" Put anything beyond the plugin's identity in
`summary` (§3.3), not `name`.

**`summary` — one sentence, states what the plugin does, not how good
it is.** "Watch a local folder and mirror it to a remote endpoint," not
"The best file syncing tool for TiTir!"

Consistency across your own `id`/`name`/`summary` — and, per §18,
your icon — is what makes a navigation column full of third-party
plugins read as one coherent system rather than a pile of
unrelated experiments. Hold yourself to this standard even though
none of it blocks an install.

---

## 18. Icon & Presentation — RECOMMENDED, and one MANDATORY reference

TiTir does not require your plugin's internal UI to match any shell
design system — your look, your layout, your framework choice inside
your own view are all entirely FREE (§2 of the Shell Guide keeps any
enforced visual system explicitly out of scope). That said, treat the
guidance below as the default you follow, not a menu you sample from —
deviate only with a stated reason.

**Your icon (`manifest.json`'s `icon` field) is the one visual choice
worth getting exactly right**, because it's the only part of your
plugin rendered *outside* your own view, inside the shell's navigation
column, sitting next to every other installed plugin's icon:

- A single emoji glyph, or inline monochrome SVG markup using
  `currentColor` so it adapts if the shell's own theming ever changes.
- Must read clearly at the small size the navigation column renders
  icons at — a single, simple glyph. Multiple colors, fine detail, or
  a wordmark will not be legible there.
- If you omit it, the shell substitutes a generic fallback glyph and
  your plugin installs and mounts exactly as normal — but a navigation
  column full of generic fallbacks becomes hard to tell apart once
  more than a couple of plugins are installed.

**Follow `titir_visual_guide.md` strictly, everywhere it applies to
your plugin.** It is a separate, shared reference — color tokens, type
scale, spacing, the icon-sizing math this section's advice is built
on, component specs, and PuFi's mascot-usage rules — that both this
guide and the Shell Guide point to as the one coherent source of
design decisions on TiTir. Concretely:

- Your `icon` glyph: size and legibility rules per the visual guide's
  icon-sizing math — don't eyeball a size that "looks about right."
- Your plugin's interior UI (Part B of the visual guide — spacing
  unit, type scale, color tokens, radius scale, button/input specs,
  motion timing): adopt it as your default and hold to it
  consistently across your own plugin's screens, the same way you'd
  hold to one spacing scale rather than mixing arbitrary values.
  Diverge only for a stated reason (a game with its own art direction,
  an embedded third-party app) — not because a value wasn't
  immediately at hand.
- **Never use PuFi's mascot mark inside your own plugin's UI.** It
  appears in exactly one place in all of TiTir — the shell's own idle
  state — regardless of how visually FREE your interior otherwise is.
  Using it inside your own view misrepresents your plugin's content as
  part of the shell itself.

None of this is technically enforced — the tag on this whole section
is RECOMMENDED, and using it changes nothing about whether your plugin
installs or mounts. But it is the standard this guide holds every
plugin author to, and the reason to deviate should be a real one you
could state out loud, not an unexamined default.

---

## 19. Packaging — MANDATORY structure, FREE tooling

```bash
cd your-plugin/
zip -r ../your-plugin.titirpkg manifest.json preload.js index.html [...other files]
```

Then: open the Hub → Install Plugin… → pick the `.titirpkg` file. How
you arrive at that final folder of plain files — hand-written, a
bundler, a full TypeScript/framework build pipeline, native modules
bundled alongside your compiled preload — is entirely FREE, as long as
what ends up zipped satisfies §1, §3, and §11.

---

## 20. Updating a Plugin — MANDATORY mechanism

There is **no in-place overwrite** in v1. Because duplicate `id`s are
refused at install time (§3, §5), installing a new package with the
same `id` as an already-installed plugin does not update it — it
fails with `INSTALL_DUPLICATE_ID`.

**To ship an update:**

1. Uninstall the existing plugin (via the Hub) — this removes its
   registry entry and deletes its files from disk.
2. Install the new `.titirpkg`, using the **same `id`** and a
   **higher `version`** string.

A different `id` is a new, separate plugin — not an update to an
existing one — regardless of how similar its `name` or contents are.
There is no shell-side mechanism that migrates or preserves anything
across this uninstall/reinstall cycle automatically. If your plugin's
own data needs to survive an update, it must already be sitting in
`localStorage`/`IndexedDB`, or on disk via your own `fs` writes if
`filesystem` was declared — neither is deleted by uninstalling the
plugin that wrote it, since browser storage belongs to the renderer's
origin and a direct file write belongs to wherever on disk you put it,
not to the shell's plugin registry.

**Note on `acknowledgedCapabilities`:** a person's disclosure
confirmation from their original install is never silently re-derived
from a newer manifest. If your update changes what capabilities you
declare, the person sees and confirms the new disclosure only on the
fresh install that follows the uninstall in step 1 — not automatically
against the version they already had running.

---

## 21. Minimal Working Example — FREE starting point

The smallest legal plugin that demonstrates the capability model: a
preload that discloses `filesystem`, reads a file the person picks,
and a page that shows its contents. Copy this, zip it, install it,
then build outward.

`manifest.json`

```json
{
  "id": "dev.bijoyexample.hello",
  "name": "Hello",
  "version": "1.0.0",
  "entry": "index.html",
  "preload": "preload.js",
  "capabilities": ["filesystem"],
  "icon": "👋"
}
```

`preload.js`

```js
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs/promises');

contextBridge.exposeInMainWorld('hello', {
  platform: process.platform,

  async pickAndReadFile() {
    const res = await ipcRenderer.invoke('dialog:openFile', {
      properties: ['openFile']
    });
    if (!res.ok || res.data.canceled) return null;
    const path = res.data.filePaths[0];
    return { path, contents: await fs.readFile(path, 'utf-8') };
  }
});
```

`index.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: sans-serif; padding: 2rem; }
      pre { white-space: pre-wrap; background: #f5f5f5; padding: 1rem; }
    </style>
  </head>
  <body>
    <h1>Hello from your plugin 👋</h1>
    <p>Running on: <span id="platform"></span></p>
    <button id="open">Open a file</button>
    <pre id="contents"></pre>
    <script>
      document.getElementById('platform').textContent = window.hello.platform;
      document.getElementById('open').addEventListener('click', async () => {
        const result = await window.hello.pickAndReadFile();
        if (result) {
          document.getElementById('contents').textContent =
            `${result.path}\n\n${result.contents}`;
        }
      });
    </script>
  </body>
</html>
```

Zip these three files at the package root (§19), install via the Hub —
you'll see the capability disclosure screen list `filesystem` before
the install completes — and it should appear in the navigation column
immediately, with real file access already wired.

---

## 22. Common Install & Runtime Failures — troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Install refused, `INSTALL_INVALID_MANIFEST` | A required field (§3.1) is missing, or `id` doesn't match `^[a-z0-9.-]+$` | Check all five required fields are present and `id` uses only lowercase letters, digits, `.`, and `-` |
| Install refused, `INSTALL_RESERVED_PREFIX` or `INSTALL_DUPLICATE_ID` | Your `id` starts with `titir.`, or matches an already-installed plugin | Rename your `id` — this is also the update case; see §20 |
| Install refused, `INSTALL_ZIP_SLIP`, no manifest-related detail | A zip entry resolves outside your package's own directory, often from a zipping tool that preserves absolute or `../`-containing paths | Rebuild the zip from inside `your-plugin/` itself, referencing only relative filenames (§19) |
| Install refused, `INSTALL_INVALID_CAPABILITY` | A string in `capabilities` isn't `filesystem`/`process`/`network`/`system_info` | Fix the value, or remove `capabilities` entirely if your preload only imports `electron` (§4.1) |
| Install refused, `INSTALL_DISCLOSURE_DECLINED` | The person saw your capability list and declined | Not a bug — nothing to fix in your code; confirm your declared list matches what you actually need (§4.4) |
| Install succeeds, but the icon shows a mount failure instead of your UI | Your preload threw synchronously on its own top-level execution — `mount-failed`, `MOUNT_PRELOAD_FAILED` (§9.1) | Check for a `require()` of a package that isn't actually bundled, or a top-level error in your preload's own code, before your `contextBridge.exposeInMainWorld` call ever runs |
| Install succeeds, but the icon never opens on first click | `entry` or `preload` in the manifest doesn't match the actual file in the package | Confirm both paths are relative, exact, and `preload` resolves to compiled, plain `.js` |
| Your plugin opens, but `window.yourKey` is `undefined` in your page | `contextBridge.exposeInMainWorld` was never called, or your page script runs before your preload finished | Add a `console.log` at the very top of `preload.js` to confirm it's running, then confirm it isn't throwing before reaching your `exposeInMainWorld` call |
| `require('fs')` (or another Node built-in) throws inside your preload despite `sandbox: false` | The specific call is fine technically, but check you actually declared the matching capability (§4) — an undeclared capability isn't technically blocked, so a throw here is more likely a bundling issue: a native-binding dependency wasn't correctly packaged alongside your compiled preload | Confirm the module is actually present in your zipped package, not only in your local `node_modules` at build time |
| Data your plugin wrote disappears after a crash or restart | State was held only in a JS variable, never written to `localStorage`/`IndexedDB`, and never written to disk via `fs` | Persist anything that matters via one of the two paths in §14/§11.2 before the failure happens |
| "Update" doesn't apply / install fails with the new zip | Trying to install over an existing `id` directly | Uninstall the old version first, then install the new one (§20) |

---

## 23. Resource Ownership & Teardown — UNGOVERNED, your responsibility

This section exists because §16 states the boundary briefly; this
restates it as a checklist, since it's the single most common way a
capability-holding plugin causes lasting harm without ever technically
misbehaving:

- **UNGOVERNED** — if you spawn a child process (`process`
  capability), you are solely responsible for terminating it before
  your own process ends. The shell does not enumerate or track your
  child processes.
- **UNGOVERNED** — if you open a file handle or a socket (`filesystem`
  or `network` capability), close it yourself. The shell does not
  clean these up on your behalf, including on a normal hide/unmount.
- **UNGOVERNED** — a hard crash (§9, `crashed` state) that leaves an
  orphaned child process or an unclosed handle behind is an accepted
  consequence of the trust model (§2), not a defect the shell will
  ever fix by reaping your children for you. Design your own teardown
  logic — a `beforeunload`-equivalent inside your page, or explicit
  cleanup calls exposed from your preload — assuming the shell will
  never do it.

---

## 24. Pre-Flight Checklist — Definition of Done

Before you zip, confirm every line is true. This is the exit condition
for a plugin that will install cleanly, disclose accurately, and never
fail in a way this document didn't already warn you about — not a
suggestion.

**Manifest (§3, §4)**
- [ ] `manifest.json` sits at the package root with all five required
      fields (`id`, `name`, `version`, `entry`, `preload`).
- [ ] `id` matches `^[a-z0-9.-]+$`, does not start with `titir.`, and
      is not already used by a plugin you still have installed for
      testing.
- [ ] `id` follows the reverse-domain convention in §17.
- [ ] `capabilities` is present and accurate if your preload imports
      anything beyond `electron` — every value is from the closed enum
      (§4.1), and nothing is declared that isn't actually used.
- [ ] `entry` and `preload` are relative paths that exist, exactly as
      written, inside the zip.
- [ ] `preload` points to compiled, plain JavaScript — no `.ts`/`.tsx`.

**Code correctness (§9, §11)**
- [ ] Nothing in `preload.js` throws synchronously before your
      `contextBridge.exposeInMainWorld` call — verified by actually
      installing and mounting it, not just reading the code.
- [ ] Every Node built-in or native-binding package your preload uses
      is genuinely bundled inside the zipped package, not only present
      in your local build environment.
- [ ] Anything your plugin needs to survive a hide, a crash, or a
      restart is written to `localStorage`/`IndexedDB`, or to disk via
      declared `filesystem` access — never held only in memory.

**Boundaries (§16, §23)**
- [ ] Nothing in your code assumes shell chrome inside your own view,
      another plugin's state, an unmount-on-switch behavior, or a
      visibility event.
- [ ] Nothing in your code calls or depends on `titir:installPlugin`,
      `titir:uninstallPlugin`, `titir:setPluginEnabled`,
      `titir:reorderPlugins`, or `titir:getSnapshot` — they are not
      exposed to you.
- [ ] If you declared `process`, `filesystem`, or `network`, you have
      explicit teardown logic for whatever you spawn or open — not an
      assumption the shell will clean it up.

**Presentation (§17, §18)**
- [ ] `name` and `summary` follow §17's conventions.
- [ ] `icon` is a single legible glyph or SVG, sized per the visual
      guide, or intentionally omitted.
- [ ] Your interior UI follows `titir_visual_guide.md` by default, or
      you have a stated reason for deviating.
- [ ] PuFi's mascot mark appears nowhere inside your own plugin's UI.

**Shipping (§19, §20)**
- [ ] If this is meant to replace an already-installed version, you've
      planned for uninstall-then-reinstall, not an in-place overwrite,
      and confirmed your `version` string increased.

All checked → it's a compliant, working TiTir plugin.

---

## 25. About the Shell — Context Only, Not Required Reading

Everything MANDATORY for building a plugin is already stated earlier
in this document — you do not need to read this section, and nothing
here adds a new requirement. It exists only because a plugin session
is never handed the Shell Guide alongside this document, and a short
excerpt can make some of the rules above click faster if you're
curious *why* they exist.

`titir_shell_guide.md` is the shell-author-facing counterpart to this
guide. In short, it describes:

- **What TiTir is, structurally.** One main process, one shell
  renderer (navigation column + idle state only, in React), and one
  `WebContentsView` per mounted plugin — including the built-in Hub,
  mounted like any other plugin, not baked into the shell renderer.
- **Why your preload has real capability.** §4 of that document lays
  out the trust model this guide's §2 summarizes: TiTir manages
  lifecycle, it does not mediate every operation a plugin might ever
  need — that's a deliberate rejection of a growing, indefinitely
  maintained capability-broker role for the shell.
- **How install and mount are implemented on the shell's side** — the
  same path-safety check, manifest validation, disclosure step, and
  registration sequence in this guide's §5 and §6, from the
  perspective of the `plugin-installer.ts`/`plugin-loader.ts` code
  that runs them, plus concurrency guarantees (a single-writer install
  queue, a per-plugin transition lock) that make certain races
  structurally impossible.
- **What's explicitly out of scope for v1** on the shell side —
  notably, a plugin marketplace, any *technical* restriction on what a
  mounted plugin's code can do, and any shared UI kit or state-
  management contract imposed on plugin authors.

None of that changes anything you build. If you're only ever going to
build plugins, stop here — the rest of this document already told you
everything that's enforced.

---

## 26. Visual & Presentation Guide — Shared Resource

A separate file, `titir_visual_guide.md`, holds the shared visual
reference — color tokens, the full type scale, spacing and radius
scales, component specs, the icon-legibility math §18's advice is
built on, and PuFi's mascot-usage rules. It is referenced from both
this guide and the Shell Guide so the shell's own navigation-column
rendering and any plugin author who wants to visually align with TiTir
draw from one shared source instead of two documents drifting apart
independently.

Nothing in that file is technically enforced by the shell — see §18
above and §2 of the Shell Guide. §18 of this guide already states how
seriously to treat it in practice: as the standard you follow by
default, not a resource you sample from when convenient.

---

*Plugin Guide maintained for TiTir. PuFi has reviewed nothing in this
document and offers no warranty, implied or otherwise.*
