import { defineConfig, devices } from "@playwright/test";
import { resolveBaseUrl } from "./tests/dev-server.ts";

// Runs against this project's running dev server (`pnpm dev:up`), or
// BASE_URL. Resolved once here; workers inherit it through the env.
process.env.BASE_URL = resolveBaseUrl();

export default defineConfig({
	testDir: "tests/e2e",
	fullyParallel: true,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		baseURL: process.env.BASE_URL,
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
});
