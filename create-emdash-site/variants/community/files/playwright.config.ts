import { defineConfig, devices } from "@playwright/test";

// Runs against an already-running site: `pnpm dev:up` locally and in CI.
// Set BASE_URL to point elsewhere.
export default defineConfig({
	testDir: "tests/e2e",
	fullyParallel: true,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		baseURL: process.env.BASE_URL ?? "http://localhost:4321",
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
});
