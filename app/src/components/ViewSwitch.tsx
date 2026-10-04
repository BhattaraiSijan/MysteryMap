export type ViewSwitchProps = {
  view: "flat" | "globe";
  onChange: (view: "flat" | "globe") => void;
};

export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div className="view-switch" role="group" aria-label="Map view">
      <button type="button" aria-pressed={view === "flat"} onClick={() => onChange("flat")}>
        Flat map
      </button>
      <button type="button" aria-pressed={view === "globe"} onClick={() => onChange("globe")}>
        Globe
      </button>
    </div>
  );
}
