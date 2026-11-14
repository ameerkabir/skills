#!/usr/bin/env node
// Copy a variant's overlay files onto a freshly scaffolded EmDash site,
// substituting %%TOKEN%% placeholders from the site brief.
//
//   node apply-overlay.mjs <variant-dir> <site-dir>
//
// Reads <site-dir>/.emdash/site-brief.json ({ "tokens": { "SITE_NAME_EN": ... } }).
// Files named `*.append` are appended to the target (once; skipped if already
// present). Every other file is written, replacing any scaffold file at that path.
// Nothing is written if any token used by the overlay lacks a value.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const [variantDir, siteDir] = process.argv.slice(2);
if (!variantDir || !siteDir) {
	console.error("usage: apply-overlay.mjs <variant-dir> <site-dir>");
	process.exit(2);
}

const filesDir = join(variantDir, "files");
const brief = JSON.parse(readFileSync(join(siteDir, ".emdash", "site-brief.json"), "utf8"));
const tokens = brief.tokens ?? {};

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

const TOKEN = /%%([A-Z0-9_]+)%%/g;
const plan = [];
const missing = new Set();

for (const src of walk(filesDir)) {
	const rel = relative(filesDir, src);
	const text = readFileSync(src, "utf8").replace(TOKEN, (match, key) => {
		if (tokens[key] === undefined || tokens[key] === "") {
			missing.add(key);
			return match;
		}
		return String(tokens[key]);
	});
	plan.push({ rel, text });
}

if (missing.size > 0) {
	console.error(`Missing token values in site-brief.json: ${[...missing].join(", ")}`);
	process.exit(1);
}

for (const { rel, text } of plan) {
	const isAppend = rel.endsWith(".append");
	const target = join(siteDir, isAppend ? rel.slice(0, -".append".length) : rel);
	mkdirSync(dirname(target), { recursive: true });
	if (isAppend) {
		const marker = text.trim().split("\n")[0];
		if (existsSync(target) && readFileSync(target, "utf8").includes(marker)) {
			console.log(`[skip]     ${relative(siteDir, target)} (already appended)`);
			continue;
		}
		appendFileSync(target, text);
		console.log(`[append]   ${relative(siteDir, target)}`);
		continue;
	}
	console.log(`${existsSync(target) ? "[replace] " : "[add]     "} ${relative(siteDir, target)}`);
	writeFileSync(target, text);
}
