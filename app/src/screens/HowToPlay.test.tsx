import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { HowToPlay } from "./HowToPlay";

test("the rules name every cost and the close button works", () => {
  const onClose = vi.fn();
  render(<HowToPlay onClose={onClose} firstVisit />);
  expect(screen.getByRole("heading", { name: /how to play/i })).toBeInTheDocument();
  expect(screen.getByText(/\(1 point\)/)).toBeInTheDocument();
  expect(screen.getByText(/\(3 points\)/)).toBeInTheDocument();
  expect(screen.getByText(/A wrong one costs 3 points/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Start playing" }));
  expect(onClose).toHaveBeenCalled();
});
