import React from "react";
import { WindowControlsRow } from "./WindowControlsRow";
import { PluginList } from "./PluginList";
import { HubEntry, HUB_PLUGIN_ID } from "./HubEntry";
import type { RegistrySnapshot } from "../../main/shared/types";

const NAV_WIDTH = 72;

export function NavColumn({ onPluginShown }: { onPluginShown: () => void }) {
  const [snapshot, setSnapshot] = React.useState<RegistrySnapshot>({ plugins: [], activePluginId: null });

  // §9.1 — titir:getSnapshot is a one-shot bootstrap call, never polled.
  // titir:pluginsChanged is subscribed to exactly once, here, on mount.
  React.useEffect(() => {
    let cancelled = false;
    window.titirShell.getSnapshot().then((result) => {
      if (!cancelled && result.ok) setSnapshot(result.data);
    });
    const unsubscribe = window.titirShell.onPluginsChanged((event) => {
      setSnapshot(event.snapshot);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function select(pluginId: string) {
    const result = await window.titirShell.showPlugin(pluginId);
    if (result.ok) onPluginShown();
  }

  async function reorder(orderedIds: string[]) {
    // Optimistic local reorder; the authoritative snapshot arrives via
    // titir:pluginsChanged once the main process persists it (§9.1).
    setSnapshot((prev) => ({
      ...prev,
      plugins: orderedIds
        .map((id) => prev.plugins.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    }));
    // Reorder is issued from the Hub's own preload in the real plugin
    // flow (§12.1 — titir:reorderPlugins is Hub-only); the shell renderer
    // only reflects the resulting snapshot.
  }

  return (
    <div
      style={{
        width: NAV_WIDTH,
        minWidth: NAV_WIDTH,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--colorNeutralBackgroundStatic)"
      }}
    >
      <WindowControlsRow />
      <PluginList
        plugins={snapshot.plugins}
        activePluginId={snapshot.activePluginId}
        onSelect={select}
        onReorder={reorder}
      />
      <HubEntry isActive={snapshot.activePluginId === HUB_PLUGIN_ID} onSelect={() => select(HUB_PLUGIN_ID)} />
    </div>
  );
}
