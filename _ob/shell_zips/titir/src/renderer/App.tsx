import { Component, useEffect, useState, type ReactNode } from "react";
import NavColumn from "./nav/NavColumn";
import type { RegistrySnapshot } from "../main/shared/types";

declare global {
  interface Window {
    titir: {
      installPlugin: (packagePath: string) => Promise<unknown>;
      uninstallPlugin: (pluginId: string) => Promise<unknown>;
      setPluginEnabled: (pluginId: string, enabled: boolean) => Promise<unknown>;
      reorderPlugins: (orderedIds: string[]) => Promise<unknown>;
      getSnapshot: () => Promise<{ ok: true; data: RegistrySnapshot } | { ok: false; error: unknown }>;
      selectPlugin: (pluginId: string) => Promise<unknown>;
      onPluginsChanged: (cb: (payload: { reason: string; snapshot: RegistrySnapshot }) => void) => () => void;
      onPluginCrashed: (cb: (payload: { pluginId: string; reason: "crashed" | "mount-failed" }) => void) => () => void;
      window: {
        minimize: () => Promise<unknown>;
        maximize: () => Promise<unknown>;
        close: () => Promise<unknown>;
      };
    };
  }
}

/**
 * The shell renderer is the one renderer a person can never "relaunch" the
 * way a crashed plugin can — if it throws during render, there is no chrome
 * left to show a retry button in. On catch, this bypasses React entirely
 * and writes a plain-DOM fallback directly, so a bug in the nav column
 * cannot take the whole shell down to a blank window (Shell Guide §17).
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    const root = document.getElementById("root");
    if (!root) return;
    root.innerHTML = `
      <div style="
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        height:100%; gap:12px; font-family: -apple-system, 'Segoe UI', sans-serif;
        color:#242424; background:#ffffff;">
        <div style="font-size:20px; font-weight:600;">TiTir hit a problem</div>
        <div style="font-size:14px; color:#616161;">The navigation shell needs to restart.</div>
        <button id="titir-retry-btn" style="
          background:#0f6cbd; color:#ffffff; border:none; border-radius:4px;
          padding:8px 16px; font-size:14px; font-weight:600; cursor:pointer;">
          Retry
        </button>
      </div>`;
    document.getElementById("titir-retry-btn")?.addEventListener("click", () => window.location.reload());
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface CrashToast {
  pluginId: string;
  reason: "crashed" | "mount-failed";
}

function IdleState() {
  return (
    <div className="idle-state">
      <div className="idle-state__mark" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="38" height="38" rx="8" stroke="#D1D1D1" strokeWidth="2" />
          <path d="M13 20h14M20 13v14" stroke="#616161" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="idle-state__title">Pick something from the left</div>
      <div className="idle-state__subtitle">Your installed plugins show up in the navigation column.</div>
    </div>
  );
}

function CrashBanner({ toast, onRelaunch, onDismiss }: { toast: CrashToast; onRelaunch: () => void; onDismiss: () => void }) {
  const message = toast.reason === "crashed" ? "This plugin crashed." : "This plugin failed to load.";
  return (
    <div className="crash-toast" role="alert">
      <span>{message}</span>
      <button className="crash-toast__relaunch" onClick={onRelaunch}>
        Relaunch
      </button>
      <button className="crash-toast__dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export default function App() {
  const [snapshot, setSnapshot] = useState<RegistrySnapshot>({ activePluginId: null, plugins: [] });
  const [toast, setToast] = useState<CrashToast | null>(null);

  useEffect(() => {
    let unsubscribed = false;
    window.titir.getSnapshot().then((res) => {
      if (!unsubscribed && res.ok) setSnapshot(res.data);
    });
    const offChanged = window.titir.onPluginsChanged((payload) => setSnapshot(payload.snapshot));
    const offCrashed = window.titir.onPluginCrashed((payload) => setToast(payload));
    return () => {
      unsubscribed = true;
      offChanged();
      offCrashed();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="shell">
        <NavColumn snapshot={snapshot} />
        <main className="content-area">
          {snapshot.activePluginId === null && <IdleState />}
          {toast && (
            <CrashBanner
              toast={toast}
              onRelaunch={() => {
                void window.titir.selectPlugin(toast.pluginId);
                setToast(null);
              }}
              onDismiss={() => setToast(null)}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
