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

test("library never shows a layer name, solved or not, since every map can be replayed", () => {
  render(<Library catalog={fixtureCatalog} save={saveWithSolved("beds", 6)} onOpen={() => {}} />);
  expect(screen.queryByText("Hospital beds")).toBeNull();
  expect(screen.queryByText("Median age")).toBeNull();
  expect(screen.getByText("Map 1")).toBeInTheDocument();
  expect(screen.getByText(/^6 of 10 points/)).toBeInTheDocument();
  expect(screen.getByText("Map 2")).toBeInTheDocument();
});

test("library shows the attempt count and colours the card by score", () => {
  const save = saveWithSolved("beds", 6);
  save.history.beds.attempts = 3;
  render(<Library catalog={fixtureCatalog} save={save} onOpen={() => {}} />);
  expect(screen.getByText("6 of 10 points · best of 3 · Good")).toBeInTheDocument();
  const card = screen.getByRole("button", { name: /Map 1/ });
  expect(card.dataset.scoreBand).toBe("warning");
});

test("choosing a map opens it", () => {
  const opened: string[] = [];
  render(<Library catalog={fixtureCatalog} save={emptySave()} onOpen={(id) => opened.push(id)} />);
  screen.getByText("Map 3").click();
  expect(opened).toEqual(["rain"]);
});
