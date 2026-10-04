import { afterEach, expect, test, vi } from "vitest";
import { hasWebGL } from "./webgl";

afterEach(() => vi.restoreAllMocks());

test("hasWebGL is false when no context can be made", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  expect(hasWebGL()).toBe(false);
});

test("hasWebGL is true when a context can be made", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as never);
  expect(hasWebGL()).toBe(true);
});
