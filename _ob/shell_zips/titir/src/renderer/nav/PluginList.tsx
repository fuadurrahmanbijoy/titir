import { useState } from "react";
import { Grid24Regular, Grid24Filled } from "@fluentui/react-icons";
import type { RegistrySnapshot } from "../../main/shared/types";
import "./PluginList.css";

interface Props {
  snapshot: RegistrySnapshot;
}

export default function PluginList({ snapshot }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const enabled = snapshot.plugins.filter((p) => p.enabled);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = enabled.map((p) => p.manifest.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    void window.titir.reorderPlugins(ids);
    setDragId(null);
  }

  return (
    <nav className="plugin-list" aria-label="Installed plugins">
      {enabled.map((p) => {
        const isActive = snapshot.activePluginId === p.manifest.id;
        const Icon = isActive ? Grid24Filled : Grid24Regular;
        return (
          <button
            key={p.manifest.id}
            className={`nav-item${isActive ? " nav-item--active" : ""}`}
            draggable
            onDragStart={() => setDragId(p.manifest.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(p.manifest.id)}
            onClick={() => void window.titir.selectPlugin(p.manifest.id)}
            title={p.manifest.name}
            aria-label={p.manifest.name}
            aria-current={isActive}
          >
            <span className="nav-item__indicator" aria-hidden="true" />
            <span className="nav-item__glyph">
              {p.manifest.icon && /^[\p{Emoji}]/u.test(p.manifest.icon) ? (
                <span className="nav-item__emoji">{p.manifest.icon}</span>
              ) : (
                <Icon />
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
