#!/usr/bin/env node
// Start this project's dev server in the background (unless it's already
// running), wait for it, and complete first-run setup with sample content
// via the dev bypass. Prints the URL; `pnpm smoke` and `pnpm test:e2e` find
// it themselves. Picks the next free port when 4321 is taken by another
// site. Stop it with `npx astro dev stop`.
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { projectDevUrl } from "../tests/dev-server.ts";

function portIsFree(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = createServer()
			.once("error", () => resolve(false))
			.once("listening", () => server.close(() => resolve(true)))
			.listen(port);
	});
}

async function answers(url: string): Promise<boolean> {
	try {
		return (await fetch(url + "/", { signal: AbortSignal.timeout(5000) })).status < 500;
	} catch {
		return false;
	}
}

let base = projectDevUrl();
if (!base) {
	let port = 4321;
	while (!(await portIsFree(port))) {
		port++;
	}
	const started = spawnSync("npx", ["astro", "dev", "--background", "--port", String(port)], { stdio: "inherit" });
	if (started.status !== 0) {
		process.exit(started.status ?? 1);
	}
	base = projectDevUrl() ?? `http://localhost:${port}`;
}

const deadline = Date.now() + 120_000;
while (!(await answers(base))) {
	if (Date.now() > deadline) {
		console.error(`Dev server did not answer at ${base} within 120s. See: npx astro dev logs`);
		process.exit(1);
	}
	await new Promise((resolve) => setTimeout(resolve, 1000));
}

// Idempotent: applies the seed with sample content on a fresh database,
// otherwise just signs in the dev admin.
const setup = await fetch(`${base}/_emdash/api/setup/dev-bypass?redirect=/`, { redirect: "manual" });
if (setup.status >= 400) {
	console.error(`Dev bypass failed with ${setup.status}: ${await setup.text()}`);
	process.exit(1);
}
console.log(`Dev server ready at ${base}`);
