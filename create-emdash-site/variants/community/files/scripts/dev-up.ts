#!/usr/bin/env node
// Start the dev server in the background (if it isn't already up), wait
// for it, and complete first-run setup with sample content via the dev
// bypass. Used by the skill's acceptance step and by CI before
// `pnpm smoke` / `pnpm test:e2e`. Stop it with `npx astro dev stop`.
import { spawnSync } from "node:child_process";

const base = (process.env.BASE_URL ?? "http://localhost:4321").replace(/\/$/, "");
const port = new URL(base).port || "4321";

async function isUp(): Promise<boolean> {
	try {
		const res = await fetch(base + "/", { signal: AbortSignal.timeout(5000) });
		return res.status < 500;
	} catch {
		return false;
	}
}

if (!(await isUp())) {
	const started = spawnSync("npx", ["astro", "dev", "--background", "--port", port], { stdio: "inherit" });
	if (started.status !== 0) {
		process.exit(started.status ?? 1);
	}
	const deadline = Date.now() + 120_000;
	while (!(await isUp())) {
		if (Date.now() > deadline) {
			console.error(`Dev server did not answer at ${base} within 120s. See: npx astro dev logs`);
			process.exit(1);
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

// Idempotent: applies the seed with sample content on a fresh database,
// otherwise just signs in the dev admin.
const setup = await fetch(`${base}/_emdash/api/setup/dev-bypass?redirect=/`, { redirect: "manual" });
if (setup.status >= 400) {
	console.error(`Dev bypass failed with ${setup.status}: ${await setup.text()}`);
	process.exit(1);
}
console.log(`Dev server ready at ${base}`);
