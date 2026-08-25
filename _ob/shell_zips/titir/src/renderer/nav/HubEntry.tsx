import { Apps24Regular, Apps24Filled } from "@fluentui/react-icons";
import type { RegistrySnapshot } from "../../main/shared/types";
import "./HubEntry.css";

const HUB_ID = "titir.hub";

interface Props {
  snapshot: RegistrySnapshot;
}

export default function HubEntry({ snapshot }: Props) {
  const isActive = snapshot.activePluginId === HUB_ID;
  const Icon = isActive ? Apps24Filled : Apps24Regular;

  return (
    <div className="hub-slot">
      <button
        className={`nav-item${isActive ? " nav-item--active" : ""}`}
        onClick={() => void window.titir.selectPlugin(HUB_ID)}
        title="Hub"
        aria-label="Hub"
        aria-current={isActive}
      >
        <span className="nav-item__indicator" aria-hidden="true" />
        <span className="nav-item__glyph">
          <Icon />
        </span>
      </button>
    </div>
  );
}
