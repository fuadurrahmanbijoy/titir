import React from "react";
import { HUB_PLUGIN_ID } from "../../main/shared/constants";

/**
 * §11 — bottom, fixed height, pinned flush to the bottom edge. Exactly one
 * icon, for the Hub. Never part of the scrollable list, never reorderable,
 * never removable (§7.4).
 */
export function HubEntry({ isActive, onSelect }: { isActive: boolean; onSelect: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "var(--spacingM) 0",
        borderTop: "var(--strokeWidthThin) solid rgba(255,255,255,0.12)"
      }}
    >
      <button
        aria-label="Hub"
        title="Hub"
        onClick={onSelect}
        style={{
          position: "relative",
          width: 48,
          height: 48,
          border: "none",
          borderRadius: "var(--borderRadiusMedium)",
          background: isActive ? "var(--colorSubtleBackgroundHover)" : "transparent",
          color: isActive ? "var(--colorBrandForeground1)" : "var(--colorNeutralForegroundOnBrand)",
          cursor: "pointer",
          fontSize: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
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
        {"\u2699"}
      </button>
    </div>
  );
}

export { HUB_PLUGIN_ID };
