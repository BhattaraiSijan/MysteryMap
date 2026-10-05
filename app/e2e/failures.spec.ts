import { expect, test } from "@playwright/test";
import { fixtureCatalog, fixtureCountries, skipIntro } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/data/countries.json", (route) => route.fulfill({ json: { version: 1, countries: fixtureCountries } }));
  await skipIntro(page);
});

test("the first visit explains how to play, and the header reopens it", async ({ page }) => {
  await page.route("**/data/catalog.json", (r) => r.fulfill({ json: fixtureCatalog }));
  await page.addInitScript(() => {
    // Forget the intro once, so the reload below behaves like a returning visitor.
    if (!sessionStorage.getItem("intro-cleared")) {
      localStorage.removeItem("mystery-map.intro-seen");
      sessionStorage.setItem("intro-cleared", "1");
    }
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome. Here is how to play." })).toBeVisible();
  await page.getByRole("button", { name: "Start playing" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("heading", { name: "How to play" })).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("catalog fails, then retry works", async ({ page }) => {
  let fail = true;
  await page.route("**/data/catalog.json", (r) => (fail ? r.fulfill({ status: 500 }) : r.fulfill({ json: fixtureCatalog })));
  await page.goto("/");
  await expect(page.getByText("The maps could not be loaded.")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Map 1")).toBeVisible();
});

test("a newer catalog asks for a refresh", async ({ page }) => {
  await page.route("**/data/catalog.json", (r) => r.fulfill({ json: { ...fixtureCatalog, version: 2 } }));
  await page.goto("/");
  await expect(page.getByText("A newer version of the game is available.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
});

test("an unreadable save is set aside", async ({ page }) => {
  await page.route("**/data/catalog.json", (r) => r.fulfill({ json: fixtureCatalog }));
  await page.addInitScript(() => localStorage.setItem("mystery-map.save", "{oops"));
  await page.goto("/");
  await expect(page.getByText("Your saved progress could not be read.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("mystery-map.save.backup"))).toBe("{oops");
  await expect(page.getByText("Map 1")).toBeVisible();
});

test("blocked saving still plays", async ({ page }) => {
  await page.route("**/data/catalog.json", (r) => r.fulfill({ json: fixtureCatalog }));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.goto("/");
  await page.getByText("Map 1").click();
  await page.getByRole("button", { name: /Extremes/ }).click();
  await expect(page.getByText("Points 9")).toBeVisible();
  await expect(page.getByText("This browser is not saving progress. You can still play.")).toBeVisible();
});

test("no graphics support is explained", async ({ page }) => {
  await page.route("**/data/catalog.json", (r) => r.fulfill({ json: fixtureCatalog }));
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await expect(page.getByText("This game needs graphics support that this device does not have.")).toBeVisible();
});
