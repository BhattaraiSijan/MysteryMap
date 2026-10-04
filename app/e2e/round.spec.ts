import { expect, test } from "@playwright/test";
import { GLOBE_ENABLED } from "../src/map/flags";
import { openMap1AndBuyJapan, pickCountry, useFixtureData } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await useFixtureData(page);
});

test("a full round, then a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Map 1").click();
  await expect(page.getByText("Points 10")).toBeVisible();
  await expect(page.getByText("A count for every 1,000 people.")).toHaveCount(0);
  await expect(page.getByText("Hospital beds")).toHaveCount(1); // the option button only
  await expect(page.locator("canvas")).toBeVisible();

  await page.getByRole("button", { name: /Extremes/ }).click();
  await expect(page.getByText("Points 9")).toBeVisible();
  await expect(page.getByText(/^Highest:/)).toBeVisible();
  await expect(page.getByText(/^Lowest:/)).toBeVisible();

  await page.getByRole("button", { name: /A number/ }).click();
  await expect(page.getByText("Now choose a country on the map.")).toBeVisible();
  await pickCountry(page, "Japan");
  await expect(page.getByText("Points 8")).toBeVisible();
  await expect(page.getByText("Japan: highest group, value 13.05")).toBeVisible();

  await page.getByRole("button", { name: /A number/ }).click();
  await pickCountry(page, "Japan");
  await expect(page.getByText("You already have that number. Choose another country.")).toBeVisible();
  await pickCountry(page, "Palestine");
  await expect(page.getByText("There is no data for Palestine. Choose another country.")).toBeVisible();
  await expect(page.getByText("Palestine: no data")).toBeVisible();
  await expect(page.getByText("Points 8")).toBeVisible();

  await page.getByRole("button", { name: /The unit/ }).click();
  await expect(page.getByText("Points 5")).toBeVisible();
  await expect(page.getByText("A count for every 1,000 people.")).toBeVisible();
  await page.getByRole("button", { name: /Median age/ }).click();
  await expect(page.getByText("Points 2")).toBeVisible();
  await expect(page.getByText("Not that one. Find a country that this guess cannot explain.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Median age/ })).toBeDisabled();
  await page.getByRole("button", { name: /Hospital beds/ }).click();
  await expect(page.getByRole("heading", { name: "It shows Hospital beds." })).toBeVisible();
  await expect(page.getByText("You finished with 2 of 10 points.")).toBeVisible();
  await expect(page.getByText("Points 2")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Hospital beds")).toBeVisible();
  await expect(page.getByText("2 of 10 points")).toBeVisible();
  await expect(page.getByText("Map 2")).toBeVisible();

  // A solved map reopened from the library is a fresh attempt: no reveal, the best score shown.
  await page.getByText("Hospital beds").click();
  await expect(page.getByRole("heading", { name: "It shows Hospital beds." })).toHaveCount(0);
  await expect(page.getByText("Your best so far: 2 of 10 points", { exact: false })).toBeVisible();
  await expect(page.getByText("Points 10")).toBeVisible();
  await pickCountry(page, "Japan");
  await expect(page.getByText("Japan: highest group")).toBeVisible();
  await expect(page.getByText("13.05")).toHaveCount(0);

  // Next and previous move through the maps by number.
  await page.getByRole("button", { name: "Next map →" }).click();
  await expect(page.getByRole("heading", { name: "Map 2" })).toBeVisible();
  await page.getByRole("button", { name: "← Previous map" }).click();
  await expect(page.getByRole("heading", { name: "Map 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "← Previous map" })).toBeDisabled();
});

test("switching view mid-round keeps the round", async ({ page }) => {
  test.skip(!GLOBE_ENABLED);
  await openMap1AndBuyJapan(page);
  await page.getByRole("button", { name: "Globe" }).click();
  await expect(page.locator("[data-view=globe]")).toBeVisible();
  await expect(page.locator("[data-view=globe] canvas")).toBeVisible();
  await expect(page.getByText("Japan: highest group, value 13.05")).toBeVisible();
  await expect(page.getByText("Points 9")).toBeVisible();
  await page.reload();
  await page.getByText("Map 1").click();
  await expect(page.locator("[data-view=globe]")).toBeVisible();
  await expect(page.getByText("Points 9")).toBeVisible();
  await page.getByRole("button", { name: "Flat map" }).click();
  await expect(page.locator("[data-view=flat]")).toBeVisible();
});

test("a resize keeps the round", async ({ page }) => {
  await openMap1AndBuyJapan(page);
  await page.setViewportSize({ width: 740, height: 360 });
  await expect(page.getByText("Points 9")).toBeVisible();
  await expect(page.getByText("Japan: highest group, value 13.05")).toBeVisible();
});

test("no sideways scroll on the phone", async ({ page }, info) => {
  test.skip(info.project.name !== "phone");
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByText("Map 1").click();
  await expect(page.locator("canvas")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("the map reports the country under the pointer", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await page.getByText("Map 1").click();
  const map = page.locator("[data-view=flat]");
  await expect(map.locator("canvas")).toBeVisible();
  await expect(page.getByText("Point at or tap a country to see its name.")).toBeVisible();
  // Sweep across the map until a country is reported.
  const box = (await map.boundingBox())!;
  let found = false;
  for (let fx = 0.1; fx <= 0.9 && !found; fx += 0.05) {
    for (let fy = 0.2; fy <= 0.8 && !found; fy += 0.1) {
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(30);
      found = (await page.locator(".readout").textContent())?.includes("group") ?? false;
    }
  }
  expect(found).toBe(true);
});
