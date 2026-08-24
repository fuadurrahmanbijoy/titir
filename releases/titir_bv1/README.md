# TiTir Shell

Electron + TypeScript + React shell for TiTir, with persistent light/dark themes and a built-in Hub plugin.

## Run

```powershell
pnpm install
pnpm approve-builds
pnpm start
```

Approve the `electron` and `esbuild` build scripts when pnpm asks.

## Built-in Hub

Hub is a real mounted plugin (`titir.hub`) and is opened automatically on first launch. It provides:

- `.titirpkg` file-picker installation
- drag-and-drop installation
- manifest validation and duplicate-ID rejection
- install error reporting
- enable/disable installed plugins
- launch/open installed plugins
- uninstall plugins
- installed-plugin metadata and permission badges
- refresh and persistent light/dark theme control

Installed plugins live under Electron's user-data directory; they are not written into the source tree.

## Test package

`examples/hello-plugin.titirpkg` is included so the Hub installation flow can be tested immediately.

The runtime follows the supplied TiTir specification: the shell uses a 72px navigation column, plugins use isolated `WebContentsView` instances, and `.titirpkg` packages are extracted with path-safety checks.

## Built-in Plugin Manager

TiTir includes a built-in `titir.hub` plugin displayed as **Plugin Manager** in the fixed bottom navigation slot. It is always available and cannot be disabled, reordered, or uninstalled. It can install `.titirpkg` packages by file picker or drag-and-drop, and manage installed plugins.
