#!/usr/bin/env node
// HTTP acceptance check against a running site.
//
//   node scripts/smoke.ts                         # http://localhost:4321, reads + test form submissions
//   node scripts/smoke.ts https://example.org     # remote: reads only
//   node scripts/smoke.ts <url> --write           # remote, also submit the forms (creates [test] rows)
//
// Checks every PAGES path in every locale (200, correct lang/dir), the 404
// page, and (when writing) that both forms accept valid input and reject
// invalid input. Exits 1 on any failure.
import {
	FORM_ENDPOINTS,
	LOCALES,
	NOT_FOUND_PATH,
	PAGES,
	SAMPLE_CONTACT,
	SAMPLE_MEMBER,
	checkHtmlElement,
	localePath,
} from "../tests/acceptance.ts";

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith("--")) ?? process.env.BASE_URL ?? "http://localhost:4321").replace(/\/$/, "");
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
const write = args.includes("--write") || (isLocal && !args.includes("--read-only"));

const failures: string[] = [];
let passed = 0;

function record(label: string, problems: string[]): void {
	if (problems.length === 0) {
		passed++;
		console.log(`  ok    ${label}`);
		return;
	}
	for (const problem of problems) {
		failures.push(`${label}: ${problem}`);
	}
	console.log(`  FAIL  ${label}: ${problems.join("; ")}`);
}

async function checkPage(path: string, locale: (typeof LOCALES)[number], expectedStatus: number): Promise<void> {
	const url = base + localePath(locale, path);
	try {
		const res = await fetch(url, { redirect: "manual" });
		const html = await res.text();
		const problems = res.status === expectedStatus ? [] : [`status ${res.status}, expected ${expectedStatus}`];
		if (res.status === expectedStatus) {
			problems.push(...checkHtmlElement(html, locale));
		}
		record(`GET ${localePath(locale, path)}`, problems);
	} catch (err) {
		record(`GET ${localePath(locale, path)}`, [String(err)]);
	}
}

async function post(endpoint: string, body: unknown, expectedStatus: number, label: string): Promise<void> {
	try {
		const res = await fetch(base + endpoint, {
			method: "POST",
			headers: { "content-type": "application/json", origin: base },
			body: JSON.stringify(body),
		});
		const text = await res.text();
		record(`POST ${label}`, res.status === expectedStatus ? [] : [`status ${res.status}, expected ${expectedStatus}: ${text.slice(0, 200)}`]);
	} catch (err) {
		record(`POST ${label}`, [String(err)]);
	}
}

console.log(`Smoke test: ${base}${write ? " (with form submissions)" : " (read-only)"}`);

for (const locale of LOCALES) {
	for (const path of PAGES) {
		await checkPage(path, locale, 200);
	}
	await checkPage(NOT_FOUND_PATH, locale, 404);
}

if (write) {
	await post(FORM_ENDPOINTS.register, SAMPLE_MEMBER, 200, "register (valid)");
	await post(FORM_ENDPOINTS.register, { ...SAMPLE_MEMBER, title: "" }, 400, "register (missing name)");
	await post(FORM_ENDPOINTS.contact, SAMPLE_CONTACT, 200, "contact (valid)");
	await post(FORM_ENDPOINTS.contact, { ...SAMPLE_CONTACT, email: "not-an-email" }, 400, "contact (bad email)");
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
	process.exit(1);
}
