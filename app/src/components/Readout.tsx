import { GROUP_WORDS } from "../map/colors";

export type ReadoutProps = {
  country: string | null;
  group?: number;
  value?: number;
  solved: boolean;
  definition: string | null;
};

/** Whole numbers get thousands separators; fractions keep up to three decimals, as the catalog gives them. */
export function formatValue(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString("en-GB");
  return String(parseFloat(value.toFixed(3)));
}

export function readoutText({ country, group = 0, value, solved, definition }: ReadoutProps): string {
  if (!country) return "Point at or tap a country to see its name.";
  if (group === 0 || (solved && value === undefined)) return `${country}: no data`;
  if (solved && value !== undefined) return `${country}: ${formatValue(value)}${definition ? ` (${definition})` : ""}`;
  const word = GROUP_WORDS[group];
  if (value !== undefined) return `${country}: ${word} group, value ${formatValue(value)}`;
  return `${country}: ${word} group`;
}

export function Readout(props: ReadoutProps) {
  return (
    <p className="readout" aria-live="polite">
      {readoutText(props)}
    </p>
  );
}
