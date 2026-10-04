import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Readout } from "./Readout";

test.each([
  [{ group: 4 }, "Japan: high group"],
  [{ group: 4, value: 13.05 }, "Japan: high group, value 13.05"],
  [{ group: 0 }, "Japan: no data"],
])("readout while playing", (props, text) => {
  render(<Readout country="Japan" solved={false} definition="Beds per 1,000 people" {...props} />);
  expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
});

test("readout once solved", () => {
  render(<Readout country="Japan" solved group={5} value={13.05} definition="Beds per 1,000 people" />);
  expect(screen.getByText("Japan: 13.05 (Beds per 1,000 people)", { exact: false })).toBeInTheDocument();
});

test("readout with nothing picked", () => {
  render(<Readout country={null} solved={false} definition={null} />);
  expect(screen.getByText("Point at or tap a country to see its name.")).toBeInTheDocument();
});

test("solved readout with no data", () => {
  render(<Readout country="Palestine" solved group={0} definition="Beds" />);
  expect(screen.getByText("Palestine: no data")).toBeInTheDocument();
});
