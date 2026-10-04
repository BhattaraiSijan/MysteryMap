import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Import boundaries: the engine knows nothing of React, deck.gl or the browser; the map knows nothing of the game. */
const engineForbidden = [
  { group: ["react", "react-dom", "react/*", "react-dom/*"], message: "The engine must not depend on React." },
  { group: ["@deck.gl/*", "d3-geo"], message: "The engine must not depend on the map libraries." },
  { group: ["**/map/**", "**/storage/**", "**/screens/**", "**/components/**"], message: "The engine imports nothing from the app." },
];
const mapForbidden = [
  { group: ["**/engine/**", "**/storage/**"], message: "The map view never imports the engine or the storage module." },
];

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: engineForbidden }],
      "no-restricted-globals": ["error", "window", "document", "localStorage", "fetch", "navigator"],
    },
  },
  {
    files: ["src/map/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: mapForbidden }],
    },
  },
);
