#!/usr/bin/env node
// Audit a live site the way a crawler sees it. No install needed (Node 20+).
//
//   node seo-check.mjs https://example.org [/extra-path ...]
//
// Checks the home page, its other-locale twin (/ar), any extra paths, robots.txt
// and every URL in the sitemap. Exit code 1 if anything fails.
import { checkPage, checkRobotsTxt, parseHead, parseSitemap, suspiciousSitemapUrl } from "./seo-check.lib.mjs";

const [rawBase, ...extra] = process.argv.slice(2);
if (!rawBase) {
	console.error("usage: seo-check.mjs <https://site> [/path ...]");
	process.exit(2);
}
const base = rawBase.replace(/\/+$/, "");
const UA = { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" };

let failures = 0;
const report = (scope, findings) => {
	if (findings.length === 0) console.log(`  ok    ${scope}`);
	for (const { level, message } of findings) {
		if (level === "fail") failures++;
		console.log(`  ${level.toUpperCase().padEnd(5)} ${scope}: ${message}`);
	}
};
const get = (url) => fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(30_000) });

console.log(`\nPages (${base})`);
const paths = [...new Set(["/", "/ar", ...extra])];
for (const path of paths) {
	try {
		const res = await get(base + path);
		if (res.status !== 200) {
			report(path, [{ level: path === "/ar" ? "warn" : "fail", message: `HTTP ${res.status}` }]);
			continue;
		}
		const url = base + (path === "/" ? "" : path);
		report(path, checkPage({ url, head: parseHead(await res.text()), xRobots: res.headers.get("x-robots-tag") ?? "", isHome: path === "/" }));
	} catch (error) {
		report(path, [{ level: "fail", message: String(error.message ?? error) }]);
	}
}

console.log("\nrobots.txt");
try {
	const res = await get(`${base}/robots.txt`);
	report("/robots.txt", res.ok ? checkRobotsTxt(await res.text()) : [{ level: "fail", message: `HTTP ${res.status}` }]);
} catch (error) {
	report("/robots.txt", [{ level: "fail", message: String(error.message ?? error) }]);
}

console.log("\nSitemap");
const seen = new Set();
const urls = [];
async function readSitemap(url, depth = 0) {
	if (seen.has(url) || depth > 2) return;
	seen.add(url);
	if (new URL(url).origin !== base) return report(url, [{ level: "warn", message: `on another host than ${base}: not fetched` }]);
	const res = await get(url);
	if (!res.ok) return report(url.replace(base, ""), [{ level: "fail", message: `HTTP ${res.status}` }]);
	const { isIndex, locs } = parseSitemap(await res.text());
	report(url.replace(base, ""), locs.length === 0 ? [{ level: "warn", message: "lists no URLs" }] : []);
	for (const loc of locs) {
		if (isIndex) await readSitemap(loc, depth + 1);
		else urls.push(loc);
	}
}
try {
	await readSitemap(`${base}/sitemap.xml`);
} catch (error) {
	report("/sitemap.xml", [{ level: "fail", message: String(error.message ?? error) }]);
}
for (const loc of urls) {
	const findings = [];
	try {
		if (new URL(loc).origin !== base) {
			// Not fetched: the sitemap names another host (the configured domain, when auditing a dev or workers.dev URL).
			findings.push({ level: "warn", message: `on ${new URL(loc).origin}, not ${base}: not fetched` });
		} else {
			const res = await get(loc);
			if (res.status !== 200) findings.push({ level: "fail", message: `HTTP ${res.status}` });
		}
		const hint = suspiciousSitemapUrl(loc);
		if (hint) findings.push({ level: "warn", message: hint });
	} catch (error) {
		findings.push({ level: "fail", message: String(error.message ?? error) });
	}
	report(loc.replace(base, "") || "/", findings);
}

console.log(failures === 0 ? "\nNo failures." : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
