import React from "react";
import { NavColumn } from "./nav/NavColumn";
import type { PluginCrashedEvent } from "../main/shared/types";

/**
 * §17 — the shell renderer is the one renderer nobody can "relaunch" the
 * way a crashed plugin can (§15): if it throws during render, there is no
 * chrome left to show a relaunch button in. So the fallback here is written
 * in plain DOM, with zero React dependency, so a bug inside NavColumn can
 * never take the whole shell down to a blank, un-recoverable window.
 */
class ShellErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[App] shell renderer crashed:", error);
    const root = document.getElementById("root");
    if (!root) return;
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif;color:#fff;background:#292929;";

    const msg = document.createElement("div");
    msg.textContent = "TiTir hit a problem and needs to restart.";

    const button = document.createElement("button");
    button.textContent = "Restart";
    button.style.cssText =
      "padding:8px 16px;border-radius:4px;border:none;background:#0f6cbd;color:#fff;cursor:pointer;font-size:14px;";
    button.addEventListener("click", () => window.location.reload());

    wrap.appendChild(msg);
    wrap.appendChild(button);
    root.appendChild(wrap);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function IdleState() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--colorNeutralForeground3)",
        fontSize: 16
      }}
    >
      Select a plugin to get started.
    </div>
  );
}

function CrashToast({ event, onRelaunch }: { event: PluginCrashedEvent; onRelaunch: (id: string) => void }) {
  const label = event.reason === "mount-failed" ? "Failed to start" : "Crashed";
  return (
    <div
      style={{
        position: "absolute",
        bottom: "var(--spacingXL)",
        left: "calc(72px + var(--spacingXL))",
        background: "var(--colorNeutralBackground2)",
        color: "var(--colorNeutralForeground1)",
        border: "var(--strokeWidthThin) solid var(--colorNeutralStroke1)",
        borderRadius: "var(--borderRadiusMedium)",
        boxShadow: "var(--shadow16)",
        padding: "var(--spacingM) var(--spacingL)",
        display: "flex",
        alignItems: "center",
        gap: "var(--spacingM)",
        zIndex: 1000
      }}
    >
      <span>
        {label}: <strong>{event.pluginId}</strong>
      </span>
      <button
        onClick={() => onRelaunch(event.pluginId)}
        style={{
          background: "var(--colorBrandBackground)",
          color: "var(--colorNeutralForegroundOnBrand)",
          border: "none",
          borderRadius: "var(--borderRadiusMedium)",
          padding: "var(--spacingS) var(--spacingM)",
          cursor: "pointer"
        }}
      >
        Relaunch
      </button>
    </div>
  );
}

export function App() {
  const [hasActivePlugin, setHasActivePlugin] = React.useState(false);
  const [crashEvent, setCrashEvent] = React.useState<PluginCrashedEvent | null>(null);
  const [relaunchDisabled, setRelaunchDisabled] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = window.titirShell.onPluginCrashed((event) => {
      setCrashEvent(event);
    });
    return unsubscribe;
  }, []);

  const handleRelaunch = React.useCallback(async (pluginId: string) => {
    if (relaunchDisabled) return;
    setRelaunchDisabled(true);
    await window.titirShell.relaunchPlugin(pluginId);
    setCrashEvent(null);
    // §9.3 — 2000ms debounce is enforced main-process-side; this local
    // disable just prevents a rapid-click spam of the same toast button.
    setTimeout(() => setRelaunchDisabled(false), 2000);
  }, [relaunchDisabled]);

  return (
    <ShellErrorBoundary>
      <div style={{ display: "flex", height: "100%", position: "relative" }}>
        <NavColumn onPluginShown={() => setHasActivePlugin(true)} />
        <div style={{ flex: 1, position: "relative" }}>{!hasActivePlugin && <IdleState />}</div>
        {crashEvent && <CrashToast event={crashEvent} onRelaunch={handleRelaunch} />}
      </div>
    </ShellErrorBoundary>
  );
}
