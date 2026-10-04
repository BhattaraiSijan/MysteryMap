import type { Page } from "@playwright/test";
import { fixtureCatalog } from "../src/test/fixtures/catalog";
import { fixtureCountries } from "../src/test/fixtures/countries";

export { fixtureCatalog, fixtureCountries };

/** Every test plays against the fixture data, never the real layers. */
export async function useFixtureData(page: Page) {
  await page.route("**/data/catalog.json", (route) => route.fulfill({ json: fixtureCatalog }));
  await page.route("**/data/countries.json", (route) => route.fulfill({ json: { version: 1, countries: fixtureCountries } }));
}

/** Fills the "Find a country" combobox and chooses the match. */
export async function pickCountry(page: Page, name: string) {
  const box = page.getByRole("combobox", { name: "Find a country" });
  await box.fill(name);
  await page.getByRole("option", { name, exact: true }).click();
}

export async function openMap1AndBuyJapan(page: Page) {
  await page.goto("/");
  await page.getByText("Map 1").click();
  await page.getByRole("button", { name: /A number/ }).click();
  await pickCountry(page, "Japan");
  await page.getByText("Points 9").waitFor();
}
