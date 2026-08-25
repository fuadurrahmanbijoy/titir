import React from "react";
import type { PluginSnapshotEntry } from "../../main/shared/types";

const ICON_SIZE = 24; // §5.2 — nav rail icons

export function PluginList({
  plugins,
  activePluginId,
  onSelect,
  onReorder
}: {
  plugins: PluginSnapshotEntry[];
  activePluginId: string | null;
  onSelect: (pluginId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const visible = plugins.filter((p) => p.enabled);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = visible.map((p) => p.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    onReorder(ids);
    setDragId(null);
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--spacingS)",
        paddingTop: "var(--spacingM)"
      }}
    >
      {visible.map((plugin) => {
        const isActive = plugin.id === activePluginId;
        return (
          <button
            key={plugin.id}
            title={plugin.name}
            aria-label={plugin.name}
            draggable
            onDragStart={() => setDragId(plugin.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(plugin.id)}
            onClick={() => onSelect(plugin.id)}
            style={{
              position: "relative",
              width: 48,
              height: 48,
              border: "none",
              borderRadius: "var(--borderRadiusMedium)",
              background: isActive ? "var(--colorSubtleBackgroundHover)" : "transparent",
              color: isActive ? "var(--colorBrandForeground1)" : "var(--colorNeutralForegroundOnBrand)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: ICON_SIZE,
              transitionProperty: "background-color",
              transitionDuration: "var(--durationFast)",
              transitionTimingFunction: "var(--curveEasyEase)"
            }}
          >
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  left: -8,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: "var(--borderRadiusSmall)",
                  background: "var(--colorBrandBackground)"
                }}
              />
            )}
            {plugin.icon ?? "\u{1F9E9}"}
            {(plugin.state === "crashed" || plugin.state === "mount-failed") && (
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: "var(--borderRadiusCircular)",
                  background: "var(--colorStatusDangerBackground3)"
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
