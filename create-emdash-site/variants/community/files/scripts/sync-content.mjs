#!/usr/bin/env node
// Create-only sync for curated, production-intended content (seed.json's
// content block is dev-only demo data and is never read here). Each item is
// looked up by slug + locale and left alone if it exists, so an admin's later
// edits are never overwritten. Safe to run on every deploy.
//
// Gotcha: `content delete` is a soft delete that keeps the slug reserved, so
// if an admin trashes an item listed here the next run fails with "Slug
// already exists". Restore or purge it by hand.
//
// Usage: EMDASH_URL=https://example.com EMDASH_TOKEN=... node scripts/sync-content.mjs
// The token needs content:read + content:write scopes (schema-only tokens fail).

import { execFileSync } from "node:child_process";

function emdash(args) {
	const url = process.env.EMDASH_URL;
	if (!url) {
		throw new Error("EMDASH_URL is required");
	}
	return execFileSync("npx", ["emdash", ...args, "--url", url, "--json"], { encoding: "utf8", env: process.env });
}

function getOrNull(collection, slug, locale) {
	try {
		return JSON.parse(emdash(["content", "get", collection, slug, "--locale", locale]));
	} catch {
		return null;
	}
}

function create(collection, data, slug, locale, translationOf) {
	const args = ["content", "create", collection, "--data", JSON.stringify(data), "--slug", slug, "--locale", locale];
	if (translationOf) {
		args.push("--translation-of", translationOf);
	}
	return JSON.parse(emdash(args));
}

// Curated items: { collection, slug, en: data, ar?: data }. Add real content here.
const ITEMS = [];

for (const item of ITEMS) {
	let source = getOrNull(item.collection, item.slug, "en");
	if (!source) {
		console.log(`[create] ${item.collection}/${item.slug} (en)`);
		source = create(item.collection, item.en, item.slug, "en");
	}
	if (item.ar && !getOrNull(item.collection, item.slug, "ar")) {
		console.log(`[create] ${item.collection}/${item.slug} (ar)`);
		create(item.collection, item.ar, item.slug, "ar", source.id ?? source.data?.id);
	}
}

console.log(`Content sync complete (${ITEMS.length} curated items).`);
