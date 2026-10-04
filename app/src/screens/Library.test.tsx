import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Library } from "./Library";
import { emptySave, type Save } from "../storage/storage";
import { newRound } from "../engine/round";
import { fixtureCatalog } from "../test/fixtures/catalog";

function saveWithSolved(layerId: string, points: number): Save {
  return {
    ...emptySave(),
    rounds: { [layerId]: { ...newRound(layerId), points, status: "solved" } },
    history: { [layerId]: { layerId, name: "Hospital beds", points, extremes: false, unit: false, numbers: 0 } },
  };
}

test("library hides names until solved", () => {
  render(<Library catalog={fixtureCatalog} save={saveWithSolved("beds", 6)} onOpen={() => {}} />);
  expect(screen.getByText("Hospital beds")).toBeInTheDocument();
  expect(screen.getByText("6 of 10 points")).toBeInTheDocument();
  expect(screen.getByText("Map 2")).toBeInTheDocument();
  expect(screen.queryByText("Median age")).toBeNull();
  expect(screen.queryByText("Map 1")).toBeNull();
});

test("choosing a map opens it", () => {
  const opened: string[] = [];
  render(<Library catalog={fixtureCatalog} save={emptySave()} onOpen={(id) => opened.push(id)} />);
  screen.getByText("Map 3").click();
  expect(opened).toEqual(["rain"]);
});
