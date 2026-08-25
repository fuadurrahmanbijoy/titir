import WindowControlsRow from "./WindowControlsRow";
import PluginList from "./PluginList";
import HubEntry from "./HubEntry";
import type { RegistrySnapshot } from "../../main/shared/types";
import "./NavColumn.css";

interface Props {
  snapshot: RegistrySnapshot;
}

export default function NavColumn({ snapshot }: Props) {
  return (
    <aside className="nav-column">
      <WindowControlsRow />
      <PluginList snapshot={snapshot} />
      <HubEntry snapshot={snapshot} />
    </aside>
  );
}
