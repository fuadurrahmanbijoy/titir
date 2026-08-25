import "./WindowControlsRow.css";

interface TrafficLightProps {
  color: string;
  hoverColor: string;
  label: string;
  onClick: () => void;
  glyph: JSX.Element;
}

function TrafficLight({ color, hoverColor, label, onClick, glyph }: TrafficLightProps) {
  return (
    <button
      className="traffic-light"
      style={{ ["--tl-color" as string]: color, ["--tl-hover" as string]: hoverColor }}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span className="traffic-light__glyph">{glyph}</span>
    </button>
  );
}

export default function WindowControlsRow() {
  return (
    <div className="window-controls-row">
      <div className="traffic-lights">
        <TrafficLight
          color="#FF5F57"
          hoverColor="#FF3B30"
          label="Close"
          onClick={() => void window.titir.window.close()}
          glyph={
            <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
              <path d="M0.75 0.75L5.25 5.25M5.25 0.75L0.75 5.25" stroke="#4D0000" strokeWidth="1" strokeLinecap="round" />
            </svg>
          }
        />
        <TrafficLight
          color="#FEBC2E"
          hoverColor="#FFAA00"
          label="Minimize"
          onClick={() => void window.titir.window.minimize()}
          glyph={
            <svg width="6" height="2" viewBox="0 0 6 2" fill="none">
              <path d="M0.5 1H5.5" stroke="#985700" strokeWidth="1" strokeLinecap="round" />
            </svg>
          }
        />
        <TrafficLight
          color="#28C840"
          hoverColor="#1FAE35"
          label="Maximize"
          onClick={() => void window.titir.window.maximize()}
          glyph={
            <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
              <path d="M1 5L5 1M5 1H2M5 1V4" stroke="#0B4F17" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
