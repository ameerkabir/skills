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

// Menu links that must exist on a live site. Menus are database content, so a
// seed edit never reaches an existing site. Create-only: a link whose URL is
// already in the menu is left exactly where the admin put it.
const MENU_LINKS = [
	{
		menu: "primary",
		url: "/events",
		after: "/services",
		labels: { en: "Events", ar: "الفعاليات" },
	},
];

function authHeaders() {
	// X-EmDash-Request is EmDash's CSRF marker; writes without it get CSRF_REJECTED.
	const headers = { "Content-Type": "application/json", "X-EmDash-Request": "1" };
	if (process.env.EMDASH_TOKEN) {
		headers.Authorization = `Bearer ${process.env.EMDASH_TOKEN}`;
	}
	// Local testing only: the dev server authenticates with a session cookie.
	if (process.env.EMDASH_COOKIE) {
		headers.Cookie = process.env.EMDASH_COOKIE;
	}
	return headers;
}

async function menuApi(method, path, body) {
	const res = await fetch(`${process.env.EMDASH_URL}/_emdash/api/menus/${path}`, {
		method,
		headers: authHeaders(),
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		throw new Error(`${method} menus/${path} failed: ${res.status} ${await res.text()}`);
	}
	return (await res.json()).data;
}

async function syncMenuLink({ menu, url, after, labels }) {
	for (const [locale, label] of Object.entries(labels)) {
		const query = `?locale=${locale}`;
		const current = await menuApi("GET", `${menu}${query}`);
		const items = [...current.items].sort((a, b) => a.sortOrder - b.sortOrder);
		if (items.some((item) => item.customUrl === url)) {
			continue;
		}
		console.log(`[create] ${menu} menu link ${url} (${locale})`);
		const created = await menuApi("POST", `${menu}/items${query}`, { type: "custom", customUrl: url, label });
		const anchor = items.findIndex((item) => item.customUrl === after);
		const position = anchor === -1 ? items.length : anchor + 1;
		const order = [...items.slice(0, position), created, ...items.slice(position)];
		await menuApi("POST", `${menu}/reorder${query}`, {
			items: order.map((item, index) => ({ id: item.id, parentId: item.parentId ?? null, sortOrder: index })),
		});
	}
}

for (const link of MENU_LINKS) {
	await syncMenuLink(link);
}

console.log(`Content sync complete (${ITEMS.length} curated items, ${MENU_LINKS.length} menu links).`);
