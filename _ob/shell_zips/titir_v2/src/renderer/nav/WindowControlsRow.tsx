import React from "react";

const BUTTON_STYLE: React.CSSProperties = {
  WebkitAppRegion: "no-drag",
  width: 20,
  height: 20,
  borderRadius: "var(--borderRadiusSmall)",
  border: "none",
  background: "transparent",
  color: "var(--colorNeutralForegroundOnBrand)",
  opacity: 0.85,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  transitionProperty: "background-color",
  transitionDuration: "var(--durationFast)",
  transitionTimingFunction: "var(--curveEasyEase)"
} as React.CSSProperties;

/**
 * §16 — this row owns both the three custom control buttons and the
 * window's entire drag region. The row's own background carries the drag
 * app-region; each button individually opts back out to no-drag so a click
 * registers as a click. Spans exactly NAV_WIDTH (72px), never the full
 * window width — see design_guide_v1 §3.7 for the fixed-dark nav rail.
 */
export function WindowControlsRow() {
  return (
    <div
      style={
        {
          height: 40, // TITLEBAR_HEIGHT
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          background: "var(--colorNeutralBackgroundStatic)",
          WebkitAppRegion: "drag"
        } as React.CSSProperties
      }
    >
      <div style={{ display: "flex", gap: 4 }}>
        <button
          aria-label="Minimize"
          style={BUTTON_STYLE}
          onClick={() => window.titirShell.window.minimize()}
        >
          &#8211;
        </button>
        <button
          aria-label="Maximize or restore"
          style={BUTTON_STYLE}
          onClick={() => window.titirShell.window.maximize()}
        >
          &#9633;
        </button>
        <button
          aria-label="Close"
          style={{ ...BUTTON_STYLE, color: "var(--colorStatusDangerBackground3)" }}
          onClick={() => window.titirShell.window.close()}
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
