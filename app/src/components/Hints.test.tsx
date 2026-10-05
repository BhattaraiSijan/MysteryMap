import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Hints } from "./Hints";
import { newRound } from "../engine/round";

test("the info button explains the hints and their costs", () => {
  render(
    <Hints state={newRound("beds")} extremes={null} unit={null} nameOf={(c) => c} numberArmed={false} message={null}
      onBuyExtremes={() => {}} onBuyUnit={() => {}} onArmNumber={() => {}} />,
  );
  expect(screen.queryByText(/three countries with the highest/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "How hints work" }));
  expect(screen.getByText(/three countries with the highest/)).toBeInTheDocument();
  expect(screen.getByText(/Costs 3 points, once/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Extremes/ })).toHaveAttribute("title", expect.stringContaining("Costs 1 point"));
});
