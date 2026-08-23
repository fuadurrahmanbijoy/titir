# TiTir — Plugin Guide

**Project:** TiTir · **Author:** Bijoy · **Mascot:** PuFi

This is the only document a plugin-building session needs. You do not
need TiTir's own source code, and you do not need the shell
specification. Everything required to design, build, package, and ship
a plugin that TiTir will accept and run correctly — as a fully legal
plugin — is here.

Every requirement below is labeled:

- **MANDATORY** — the shell enforces this. Skip it and your plugin is
  refused at install, refuses to mount, or misbehaves at runtime. Not a
  style suggestion.
- **RECOMMENDED** — not enforced by the shell. You're on your own if
  you ignore it, but nothing rejects your plugin over it.
- **FREE** — entirely your call. The shell has no opinion whatsoever.

Follow every MANDATORY item in this document and the result is, by
definition, a legal, working TiTir plugin. That is the whole contract.

---

## 1. What a Plugin Is — MANDATORY shape

A plugin is a folder, zipped into a file with the `.titirpkg`
extension, containing at minimum:

```
your-plugin/
  manifest.json     ← MANDATORY, see §2
  preload.js         ← MANDATORY, compiled JS (see §5, §9)
  index.html          ← MANDATORY, your entry point
  (anything else: css, js, images, a bundled dist/, etc. — FREE)
```

This package is handed to TiTir through the built-in **Hub** plugin —
drag the `.titirpkg` file onto the Hub's interface, or pick it via the
Hub's own file dialog. The Hub is pinned to the bottom of the
navigation column and is TiTir's app-management plugin. Nothing else
installs a plugin; there is no other install path, and your own plugin
cannot install itself or another plugin.

---

## 2. The Manifest Contract — MANDATORY

`manifest.json` sits at the root of your package. This is the single
schema the shell validates; nothing outside this table is checked or
trusted.

**Required fields**

| Field | Type | Requirement | Notes |
|---|---|---|---|
| `id` | string | MANDATORY | Lowercase, alphanumeric plus `.`/`-`. Must be unique among **currently installed** plugins. The `titir.*` prefix is reserved for TiTir's own built-in plugins (the Hub's id is `titir.hub`) — using that prefix fails validation. See §14 for a naming convention that avoids collisions with other authors. |
| `name` | string | MANDATORY | Shown in the navigation column's tooltip and in the Hub's plugin list. |
| `version` | string | MANDATORY | Free-form string; semver is recommended but not parsed or compared by the shell. See §17 for what this field does and does not do. |
| `entry` | string | MANDATORY | Path, relative to the package root, to your HTML entry point. |
| `preload` | string | MANDATORY | Path, relative to the package root, to your **compiled** preload script — plain `.js` (see §5, §9). |

**Optional fields**

| Field | Type | Requirement | Notes |
|---|---|---|---|
| `icon` | string | OPTIONAL | Shown in the navigation column. See §15 for format rules. If omitted, the shell substitutes a generic fallback glyph — install and mount are unaffected either way. |
| `summary` | string | OPTIONAL | One-line description, shown in the Hub's plugin list. |
| `permissions` | string[] | OPTIONAL | Informational only in v1 — displayed in the Hub's plugin list, not technically enforced. See §13. |
| `minShellVersion` | string | OPTIONAL | Informational only in v1 — never checked against the running shell version. |

**Example**

```json
{
  "id": "com.example.downloader",
  "name": "Downloader",
  "version": "1.0.0",
  "entry": "index.html",
  "preload": "preload.js",
  "icon": "⬇",
  "summary": "Fetch and save files from a URL.",
  "permissions": ["network:fetch"]
}
```

**Unrecognized fields are ignored, not rejected.** Anything you add to
`manifest.json` beyond the fields in the two tables above is simply not
read by the shell. It does not fail validation and it does not appear
anywhere in shell chrome. Don't build a feature that depends on the
shell reading a custom manifest key — it never will.

**What the manifest never declares.** You do not declare window
bounds, lifecycle hooks, or IPC channels here. Bounds and visibility
are entirely the shell's job (§6). Your IPC surface, beyond the one
shared channel in §10, is entirely your own preload's job. The
manifest answers exactly two questions: what are you, and where do I
load you from.

**You never persist your own enabled/order state.** Whether you're
enabled and where you sit in the navigation list is tracked and
restored by the shell itself, automatically, across restarts. Don't
build a settings toggle for this inside your own plugin — that's the
Hub's job, not yours, and nothing in your manifest or your own storage
can override it.

---

## 3. The Install-Time Contract — MANDATORY, exact sequence

This is precisely what happens between your `.titirpkg` file landing on
disk and your plugin appearing in the navigation column. Every step is
enforced by the shell; none can be skipped, reordered, or opted out of
from inside your own plugin code.

1. **Path-safety extraction.** The shell opens your zip and, entry by
   entry, resolves what each file's target path on disk would be
   *before writing anything*. If a single entry would resolve outside
   your plugin's own install directory (for example, a maliciously or
   accidentally crafted entry name containing `../` sequences), the
   **entire** install is refused immediately — nothing is written, and
   this check runs before your `manifest.json` is even opened.
2. **Manifest parsing and validation** against the table in §2.
3. **Invalid → refused.** A missing required field, a malformed `id`,
   a `titir.*`-prefixed `id`, or an `id` that collides with an already-
   installed plugin all result in a specific, immediate install
   failure. Any already-extracted files are deleted. Your plugin does
   not half-exist in any state — it either fully installs or leaves no
   trace.
4. **Valid → path existence check.** The files named by `entry` and
   `preload` are confirmed to exist, at those exact relative paths,
   inside your extracted package.
5. **Registration.** Only now does your plugin start to exist as far
   as TiTir is concerned — added to the shell's plugin registry,
   enabled by default, placed at the end of the navigation list.
   Nothing of yours is running yet.
6. **Immediate visibility.** Your icon appears in the navigation column
   right away. No restart of TiTir is ever required for a newly
   installed plugin to show up.

If a step above isn't satisfied, your plugin is not installed. There is
no partial-install, no "installed but broken" state to design around.

---

## 4. The Mount & Handshake Contract — MANDATORY, exact sequence

Installation and mounting are two different moments, and the gap
between them can be arbitrarily long — a plugin can sit installed and
untouched for the entire life of the app. This is the exact,
non-negotiable sequence that happens the first time (and only the
first time) the person clicks your icon:

1. **A real content view is created for you** — not an `<iframe>`, not
   a `<webview>` tag, a genuine separate renderer process attached to
   the main window.
2. **Fixed security settings are applied to that view before anything
   of yours loads** — `contextIsolation: true`, `sandbox: true`,
   `nodeIntegration: false`. These are not configurable from inside
   your own manifest or your own code; no field you add anywhere
   changes them. See §9 for exactly what this means for what your code
   can and cannot do.
3. **Your `preload.js` executes first**, guaranteed to run and finish
   before your `entry` HTML's own `<script>` tags begin executing. This
   is the actual handshake moment — it is the only point where your
   code has access to anything beyond standard web-platform APIs
   (`contextBridge`, `ipcRenderer` — both explained in §9 and §10), and
   it is where you must set up whatever object your page will read off
   `window`.
4. **Your `entry` HTML then loads inside that view.** From this point
   forward, everything is entirely your own JS/CSS/DOM. The shell
   injects nothing into your page, reads nothing from your DOM, and
   never touches it again for the rest of the session.

No other handshake exists. If a step isn't listed above, it is not part
of how TiTir talks to your plugin — in particular, there is no
"onMount," "onShow," "onReady," or similar lifecycle callback the shell
calls into your code. Your `preload.js` executing is the only signal
you ever get that you've become active.

---

## 5. Visibility & Bounds — MANDATORY, exact numbers

Every time the person switches which plugin is active, the shell
repositions views by changing bounds — it never mounts or unmounts
anything as part of switching (see §12).

- **Navigation column width is a fixed constant: `72` pixels.** It
  never changes with window size.
- **When you are the active plugin**, your view's bounds are set to:
  `{ x: 72, y: 0, width: windowWidth - 72, height: windowHeight }`.
- **When any other plugin becomes active**, your bounds are set to:
  `{ x: 0, y: 0, width: 0, height: 0 }`. You are not unmounted, paused,
  or destroyed — your process keeps running with zero screen space.
  See §12 for what this means for background work.
- **You cannot detect this transition.** No `visibilitychange`-style
  event, no IPC message, nothing is sent to tell you your bounds just
  became zero or just became the full content area. If your plugin
  needs to behave differently while effectively hidden, you must infer
  it yourself — the shell gives you no signal (see §13).
- **You never receive or request your own bounds.** There is no API
  call that returns "how big am I right now" — build your internal
  layout to be responsive to whatever space CSS reports, since you have
  no other way to know it.

---

## 6. What You Are Guaranteed — MANDATORY

Build against these without checking at runtime — they will not change
underneath you within v1:

- A rectangle of screen space, sized and positioned per §5, whenever
  you are the active plugin.
- Total isolation from every other plugin's code, DOM, and
  `contextBridge` surface — and from the shell's own chrome.
- Survival while hidden — any in-progress work (timers, network
  requests, audio) keeps running exactly as if you were visible.
- Crash isolation — if your renderer process dies, only your own view
  is torn down. The shell and every other plugin, mounted or not, are
  completely unaffected, and the person is offered a "Relaunch" action
  scoped to your plugin specifically (§12).

---

## 7. Lifecycle States — informational

A useful mental model, not something you need to implement against
directly — all transitions are driven by the person using the app,
never by a timer or schedule.

| State | Meaning | What triggers it |
|---|---|---|
| `registered` | Manifest validated, your icon is in the navigation column, nothing of yours is running | Successful install (§3) |
| `mounted` | Your content view exists, your `preload.js` has run | First click on your icon, ever |
| `visible` | Mounted, bounds fill the content area | You are the active plugin |
| `hidden` | Mounted, bounds zeroed, process still running | Person switches to a different plugin |
| `crashed` | Renderer process died, view torn down, registry entry kept | Renderer process crash |
| `unregistered` | Removed from the registry, files deleted from disk | Uninstall |

Practical implications:

- You never receive any call before the person clicks your icon for
  the first time — do not schedule startup work that assumes it runs
  earlier.
- Once `mounted`, you stay mounted (only toggling between `visible` and
  `hidden`) until a crash or an uninstall. Don't re-run one-time setup
  logic every time you become visible again — there is no event to
  hook for that anyway (§5).
- A `crashed` plugin returns to `mounted` on relaunch, not back to
  `registered` — the person clicks "Relaunch," they do not reinstall
  you.

---

## 8. Isolation & Independence — MANDATORY guarantees

- Switching the active plugin never unmounts, pauses, or destroys any
  *other* mounted plugin. Only bounds change. Your background work — a
  download, a websocket, a timer — keeps running exactly as if you were
  still visible.
- Each plugin runs in its own real, process-backed view. One plugin
  crashing, hanging, or leaking memory has no effect on any other
  plugin or on the shell itself.
- You cannot reach another plugin's `contextBridge` surface, storage,
  or in-memory state under any circumstance, and no other plugin can
  reach yours.
- Once mounted, you are never destroyed for the rest of the session —
  only shown or hidden. Do not write logic that assumes
  re-initialization each time you're shown again.

---

## 9. Technical Requirements — MANDATORY, read this before writing any code

**Security settings are fixed by the shell, not by you.** Every plugin
view gets `contextIsolation: true`, `sandbox: true`,
`nodeIntegration: false` (§4). None of these is a default you can
override — no field in your manifest, no code in your preload, changes
them.

**What `sandbox: true` actually means for your `preload.js` — this is
the part that most differs from a "normal" Electron app, and it is the
single most important technical fact in this document:**

Your preload script does **not** run in a full Node.js context. It
runs in Electron's sandboxed preload environment, where you have:

- `require('electron')` — for `contextBridge` and `ipcRenderer`. This
  always works.
- A small set of pure-JavaScript, no-native-binding built-ins the
  sandbox polyfills (`events`, `timers`, `url` among them), plus a
  restricted `process` object exposing a handful of read-only
  properties such as `process.platform`.

You **do not** have, and any attempt to use will fail or throw:

- `require('fs')`, `require('child_process')`, `require('net')`, or any
  other Node built-in backed by a native binding.
- Any third-party npm package that itself depends on native Node APIs,
  even if you `require` it successfully in your own build tooling
  before packaging — it will not function inside the sandboxed preload
  at runtime.

**This has a direct, mandatory consequence for persistence.** Because
your preload cannot touch the filesystem, and there is no shell-
provided IPC channel for generic file reads/writes (§10 lists the only
one that exists), anything you need to survive a crash, a hide/show
cycle, or an app restart must be persisted using **standard,
sandbox-unaffected browser storage APIs called directly from your own
page** (not your preload) — `localStorage`, `sessionStorage`, or
`IndexedDB`. These are ordinary Web Platform APIs, not Node APIs, and
are fully available in your `entry` page regardless of
`contextIsolation` or `sandbox`. This is the correct, MANDATORY-in-
practice approach for any plugin that needs to remember anything.

**Ship compiled JavaScript.** The shell loads whatever plain JS sits at
your `entry`/`preload` paths — it has no TypeScript compiler, no
bundler, no JSX transform of its own. Writing TypeScript, JSX, or using
React inside your own plugin is entirely FREE — but you must compile
and bundle everything down to plain JS/HTML/CSS **before** zipping. A
manifest pointing at a `.ts` or `.tsx` file fails install validation
outright (§2, §3) — `entry` and `preload` must resolve to files that
are directly loadable as-is.

**Your `id` is permanent for the life of that install.** It is how the
shell tells your plugin apart from every other one, and — because
duplicate ids are refused at install (§3) — it is also why there is no
in-place update mechanism in v1 (§17).

**`entry` and `preload` paths must exist in the zip exactly as
declared.** A missing file at either path fails install-time validation
(§3, step 4).

---

## 10. The One Shared Channel — MANDATORY, exact usage

`dialog.showOpenDialog` only runs in Electron's main process, so the
shell exposes exactly one IPC utility that any plugin's preload may
call, regardless of what other channels you build for your own
internal use:

```js
// in your preload.js
const { contextBridge, ipcRenderer } = require('electron');

async function pickFilePath() {
  const res = await ipcRenderer.invoke('dialog:openFile', {
    properties: ['openFile'],
    filters: [{ name: 'Text', extensions: ['txt'] }]
  });
  if (res.canceled) return null;
  return res.filePaths[0]; // an absolute path string, nothing more
}

contextBridge.exposeInMainWorld('myPlugin', { pickFilePath });
```

**Read this carefully: `dialog:openFile` returns a path string, not
file contents.** Because your preload has no filesystem access (§9),
receiving a path back does not, by itself, let you read what's in that
file. Use it when you need the native OS picker's *path* for display,
for constructing a URL, or for passing along to some other system —
not as a way to load a file's bytes into your plugin.

This is the only channel every plugin is expected to know about.
Everything else about how your own renderer and preload talk to each
other is entirely up to you.

---

## 11. Reading a File's Actual Contents — MANDATORY workaround, given §9

Since there is no filesystem bridge available to a sandboxed preload,
and `dialog:openFile` alone only returns a path, the correct way for a
plugin to let someone open a file **and read what's inside it** is to
skip IPC entirely and use the standard browser File API, directly in
your `entry` page — no preload involvement required:

```html
<input type="file" id="picker" accept=".txt" />
<script>
  document.getElementById('picker').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const text = await file.text(); // full file contents, no IPC needed
    console.log(text);
  });
</script>
```

This works identically whether `sandbox` is `true` or `false`, because
reading a user-selected `File`/`Blob` object is a standard web platform
capability that has nothing to do with Node's `fs` module. Use
`dialog:openFile` (§10) only when you specifically need the native OS
dialog's look and feel and only need the resulting path; use
`<input type="file">` (or the equivalent File System Access API calls)
whenever you actually need the file's contents.

---

## 12. Crash Behavior — MANDATORY, from your plugin's perspective

- If your renderer process dies, your view is torn down immediately.
  Your registry entry is untouched — you are not uninstalled by a
  crash.
- The person sees a "Relaunch" action scoped specifically to your
  plugin. Clicking it re-runs the exact mount sequence in §4 from the
  top — a fresh `WebContentsView`, your `preload.js` runs again, your
  `entry` loads again.
- **No in-memory state survives a crash, ever.** Anything that matters
  must already be sitting in `localStorage`/`IndexedDB` (§9) before the
  crash happens, not held only in a JavaScript variable.

---

## 13. What You Must Never Assume — MANDATORY boundaries

- You cannot resize, move, or reposition the shell window.
- You cannot change your own bounds within the content area. Need
  internal sub-layout — panes, an internal sidebar of your own? Build
  it with your own CSS/DOM inside the space you're given; never by
  trying to touch view bounds, which you have no API to reach anyway.
- You cannot detect your own visibility via any event — none is sent
  (§5). If you need to know, you have to infer it from your own
  render/interaction state.
- You get no shell chrome inside your own view — no window controls, no
  navigation column, no idle-state branding. Only the shell's own
  renderer ever draws those, and it draws them outside your view
  entirely.
- `titir:installPlugin`, `titir:uninstallPlugin`,
  `titir:setPluginEnabled`, and `titir:reorderPlugins` are wired into
  the Hub plugin's preload only, by convention — not by an enforced,
  technical permission system in v1. Don't build a plugin whose
  correctness depends on calling any of these; they simply are not
  exposed on your `window` object, because your own preload never
  received them.
- Don't assume any declared `permissions` entry in your manifest (§2)
  does anything beyond being displayed as text in the Hub's plugin
  list — nothing about your actual runtime capability is gated by it.
- Don't assume a `minShellVersion` you declare is ever checked against
  anything — it isn't, in v1.
- You cannot get your own icon pinned outside the ordinary,
  drag-reorderable navigation list — the fixed bottom position is
  exclusive to the built-in Hub, not a placement any manifest can
  request.

---

## 14. Choosing Your `id` — RECOMMENDED convention

Your `id` is global across every plugin installed on a given machine
and effectively permanent for that install, since there is no rename
path (§9, §17). The shell only blocks the `titir.*` prefix and exact
duplicates at install time (§3) — it does not reserve any namespace on
your behalf, so a short, common word like `notes` or `downloader` can
collide with someone else's plugin on the same machine.

**FREE to ignore, but strongly recommended:** use a reverse-domain-
style id, e.g. `com.yourname.downloader` rather than bare
`downloader`. It costs nothing, makes collisions with other authors
unlikely, and reads clearly in the Hub's plugin list. A bare
`downloader` is just as legal, provided it's unique on that machine at
install time.

---

## 15. Icon & Presentation — RECOMMENDED, narrow in scope

TiTir does not ask your plugin's internal UI to match any shell design
system — your look, your layout, your framework choice inside your own
view are all entirely FREE. Exactly one visual choice is worth getting
right, because it's the only part of your plugin rendered *outside*
your own view, inside the shell's navigation column:

**Your icon (`manifest.json`'s `icon` field) — RECOMMENDED, never
install-blocking**

- A single emoji glyph, or inline monochrome SVG markup using
  `currentColor` so it adapts automatically if the shell's own theming
  ever changes.
- Must read clearly at the small size the navigation column renders
  icons at — a single, simple glyph. Multiple colors, fine detail, or a
  wordmark will not be legible there.
- If you omit it, the shell substitutes a generic fallback glyph and
  your plugin installs and mounts exactly as normal — a navigation
  column full of generic fallbacks just becomes hard to tell apart once
  more than a couple of plugins are installed, which is the only reason
  to bother.

Everything else — your fonts, your color palette inside your own view,
your internal layout, whether you use a framework — is entirely FREE
and entirely invisible to the shell.

---

## 16. Packaging — MANDATORY structure, FREE tooling

```bash
cd your-plugin/
zip -r ../your-plugin.titirpkg manifest.json preload.js index.html [...other files]
```

Then: open the Hub → Install Plugin… → pick the `.titirpkg` file. How
you arrive at that final folder of plain files — hand-written, a
bundler, a full TypeScript/React build pipeline — is entirely FREE, as
long as what ends up zipped satisfies §1 and §9.

---

## 17. Updating a Plugin — MANDATORY mechanism

There is **no in-place overwrite** in v1. Because duplicate `id`s are
refused at install time (§2, §3), installing a new package with the
same `id` as an already-installed plugin does not update it — it
fails.

**To ship an update:**

1. Uninstall the existing plugin (via the Hub) — this removes its
   registry entry and deletes its files from disk.
2. Install the new `.titirpkg`, using the **same `id`** and a **higher
   `version`** string.

A different `id` is a new, separate plugin — not an update to an
existing one — regardless of how similar its `name` or contents are.
There is no shell-side mechanism that migrates or preserves anything
across this uninstall/reinstall cycle automatically; if your plugin
needs its own data to survive an update, that data must already be
sitting in `localStorage`/`IndexedDB` (§9), which is not deleted by
uninstalling the plugin that wrote it, since it belongs to the
renderer's origin, not to the shell's plugin registry.

---

## 18. Minimal Working Example — FREE starting point

The smallest possible legal plugin: a preload that exposes nothing but
the platform string, and a page that says hello. Copy this, zip it,
install it, then build outward.

`manifest.json`

```json
{
  "id": "com.example.hello",
  "name": "Hello",
  "version": "1.0.0",
  "entry": "index.html",
  "preload": "preload.js",
  "icon": "👋"
}
```

`preload.js`

```js
const { contextBridge } = require('electron');

// process.platform is one of the handful of properties the sandboxed
// preload's polyfilled `process` object exposes — see §9.
contextBridge.exposeInMainWorld('hello', {
  platform: process.platform
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
    </style>
  </head>
  <body>
    <h1>Hello from your plugin 👋</h1>
    <p id="platform"></p>
    <script>
      document.getElementById('platform').textContent =
        `Running on: ${window.hello.platform}`;
    </script>
  </body>
</html>
```

Zip these three files at the package root (§16), install via the Hub,
and it should appear in the navigation column immediately with a
working `contextBridge` call already wired — no restart, no manual
refresh.

---

## 19. Common Install & Runtime Failures — troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Install refused immediately, "invalid manifest" | A required field (§2) is missing, or `id` doesn't match `[a-z0-9.-]+` | Check all five required fields are present and `id` uses only lowercase letters, digits, `.`, and `-` |
| Install refused, "reserved prefix" or "id already exists" | Your `id` starts with `titir.`, or an already-installed plugin has the exact same `id` | Rename your `id` — this is also the update failure case; see §17 |
| Install refused with no manifest-related detail at all | A zip entry resolves outside your package's own directory (a zip-slip pattern) — often unintentional, from a zipping tool that preserves absolute or `../`-containing paths | Rebuild the zip from inside `your-plugin/` itself, referencing only relative filenames, as shown in §16 |
| Install succeeds, but the icon never opens / errors on first click | `entry` or `preload` in the manifest doesn't match the actual file in the package, or `preload` still points at a `.ts`/`.tsx` file | Confirm both paths are relative, exact, and that `preload` resolves to compiled, plain `.js` |
| Your plugin opens, but `window.yourKey` is `undefined` in your page | `contextBridge.exposeInMainWorld` was never called, or your page script runs before it — check that you're not accidentally relying on `require('fs')` or another native module inside preload, which will throw silently under the sandbox (§9) | Add a `console.log` at the very top of `preload.js` to confirm it's running at all, then confirm every `require()` inside it is limited to `electron` and pure-JS built-ins |
| Data your plugin wrote disappears after a crash or restart | State was held only in a JS variable, not written to `localStorage`/`IndexedDB` | Persist anything that matters via browser storage APIs directly in your page (§9), not via preload/IPC |
| "Update" doesn't apply / install fails with the new zip | Trying to install over an existing `id` directly | Uninstall the old version first, then install the new one (§17) |

---

## 20. Mandatory Pre-Flight Checklist

Before you zip, confirm every line is true:

- [ ] `manifest.json` sits at the package root with all five required
      fields (`id`, `name`, `version`, `entry`, `preload`).
- [ ] `id` is lowercase, alphanumeric plus `.`/`-`, does not start with
      `titir.`, and is not already used by a plugin you still have
      installed for testing.
- [ ] `entry` and `preload` are relative paths that exist, exactly as
      written, inside the zip.
- [ ] `preload` points to compiled, plain JavaScript — no `.ts`/`.tsx`.
- [ ] Nothing inside `preload.js` calls `require('fs')`,
      `require('child_process')`, or any other native-binding module —
      it will throw at runtime under `sandbox: true` (§9).
- [ ] Anything your plugin needs to survive a hide, a crash, or a
      restart is written to `localStorage`/`IndexedDB` from your page,
      not held only in memory and not attempted via a filesystem write
      from preload.
- [ ] If you need to read a file's actual contents, you're using
      `<input type="file">` or the File API (§11), not assuming
      `dialog:openFile` (§10) hands you more than a path string.
- [ ] Nothing in your code assumes shell chrome inside your own view,
      another plugin's state, an unmount-on-switch behavior, or a
      visibility event.
- [ ] Nothing in your code calls or depends on `titir:installPlugin`,
      `titir:uninstallPlugin`, `titir:setPluginEnabled`, or
      `titir:reorderPlugins` — they are not exposed to you.
- [ ] If this is meant to replace an already-installed version, you've
      planned for uninstall-then-reinstall (§17), not an in-place
      overwrite.

All checked → it's a legal, working TiTir plugin.

---

*Plugin Guide maintained for TiTir. PuFi has reviewed nothing in this
document and offers no warranty, implied or otherwise.*
