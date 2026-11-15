#!/usr/bin/env node
// Idempotent, additive schema sync: creates any collection or field declared
// in seed/seed.json that is missing on a live EmDash site, via the `emdash
// schema` CLI (REST under the hood). Never touches content, menus, or
// settings: seed content is dev-only demo data.
//
// Usage: EMDASH_URL=https://example.com EMDASH_TOKEN=... node scripts/sync-schema.mjs
// Re-running with no seed changes is a no-op.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEED_PATH = fileURLToPath(new URL("../seed/seed.json", import.meta.url));

// CLI field types the `emdash schema add-field` command can create.
// Anything else (e.g. `select`) is skipped with a warning: add it in the admin.
const CLI_CREATABLE_TYPES = new Set([
	"string",
	"text",
	"number",
	"integer",
	"boolean",
	"datetime",
	"image",
	"reference",
	"portableText",
	"json",
]);

// Types the CLI's --type validator rejects but the REST fields endpoint
// accepts. `repeater` also needs `validation.subFields`, which the CLI can't pass.
const REST_CREATABLE_TYPES = new Set(["repeater"]);

function emdash(args) {
	const url = process.env.EMDASH_URL;
	if (!url) {
		throw new Error("EMDASH_URL is required");
	}
	const out = execFileSync("npx", ["emdash", ...args, "--url", url, "--json"], {
		encoding: "utf8",
		env: process.env,
	});
	return JSON.parse(out);
}

async function createFieldViaRest(collectionSlug, field) {
	const url = process.env.EMDASH_URL;
	const token = process.env.EMDASH_TOKEN;
	if (!token) {
		throw new Error(
			`EMDASH_TOKEN is required to create field "${collectionSlug}.${field.slug}" (type "${field.type}") via the REST API`,
		);
	}
	const body = {
		slug: field.slug,
		label: field.label,
		type: field.type,
		required: field.required ?? false,
	};
	if (field.translatable !== undefined) {
		body.translatable = field.translatable;
	}
	if (field.validation) {
		body.validation = field.validation;
	}
	if (field.description) {
		body.description = field.description;
	}
	const res = await fetch(`${url}/_emdash/api/schema/collections/${collectionSlug}/fields`, {
		method: "POST",
		// X-EmDash-Request is EmDash's CSRF marker; writes without it get CSRF_REJECTED.
		headers: { "Content-Type": "application/json", "X-EmDash-Request": "1", Authorization: `Bearer ${token}` },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(
			`Failed to create field "${collectionSlug}.${field.slug}" via REST: ${res.status} ${text}`,
		);
	}
}

function loadSeedCollections() {
	const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
	return seed.collections ?? [];
}

async function syncCollection(seedCollection, existingCollections) {
	const slug = seedCollection.slug;
	const remote = existingCollections.find((c) => c.slug === slug);

	if (!remote) {
		console.log(`[create] collection "${slug}"`);
		const args = [
			"schema",
			"create",
			slug,
			"--label",
			seedCollection.label,
		];
		if (seedCollection.labelSingular) {
			args.push("--label-singular", seedCollection.labelSingular);
		}
		if (seedCollection.description) {
			args.push("--description", seedCollection.description);
		}
		emdash(args);
	} else {
		console.log(`[skip] collection "${slug}" already exists`);
		await syncUrlPattern(seedCollection, remote);
	}

	await syncFields(slug, seedCollection.fields ?? []);
}

// The sitemap and hreflang tags build public URLs from a collection's
// urlPattern. Without one EmDash assumes /<collection>/<slug>, which is wrong
// for `pages` (served at /<slug>). Existing collections only get a pattern
// the seed declares and the site lacks; an admin's own choice is never changed.
async function syncUrlPattern(seedCollection, remote) {
	if (!seedCollection.urlPattern || remote.urlPattern) {
		return;
	}
	const token = process.env.EMDASH_TOKEN;
	if (!token) {
		throw new Error(`EMDASH_TOKEN is required to set the URL pattern on "${seedCollection.slug}"`);
	}
	console.log(`  [update] collection "${seedCollection.slug}" urlPattern -> ${seedCollection.urlPattern}`);
	const res = await fetch(`${process.env.EMDASH_URL}/_emdash/api/schema/collections/${seedCollection.slug}`, {
		method: "PUT",
		// X-EmDash-Request is EmDash's CSRF marker; writes without it get CSRF_REJECTED.
		headers: { "Content-Type": "application/json", "X-EmDash-Request": "1", Authorization: `Bearer ${token}` },
		body: JSON.stringify({ urlPattern: seedCollection.urlPattern }),
	});
	if (!res.ok) {
		throw new Error(`Failed to set urlPattern on "${seedCollection.slug}": ${res.status} ${await res.text()}`);
	}
}

async function syncFields(collectionSlug, seedFields) {
	const remote = emdash(["schema", "get", collectionSlug]);
	const existingSlugs = new Set((remote.fields ?? []).map((f) => f.slug));

	for (const field of seedFields) {
		if (existingSlugs.has(field.slug)) {
			console.log(`  [skip] field "${collectionSlug}.${field.slug}" already exists`);
			continue;
		}
		if (REST_CREATABLE_TYPES.has(field.type)) {
			console.log(`  [create] field "${collectionSlug}.${field.slug}" (${field.type}, via REST)`);
			await createFieldViaRest(collectionSlug, field);
			continue;
		}
		if (!CLI_CREATABLE_TYPES.has(field.type)) {
			console.warn(
				`  [manual] field "${collectionSlug}.${field.slug}" has type "${field.type}", ` +
					"which the emdash CLI can't create (e.g. select) -- add it via the admin UI.",
			);
			continue;
		}
		console.log(`  [create] field "${collectionSlug}.${field.slug}" (${field.type})`);
		const args = [
			"schema",
			"add-field",
			collectionSlug,
			field.slug,
			"--type",
			field.type,
		];
		if (field.label) {
			args.push("--label", field.label);
		}
		if (field.required) {
			args.push("--required", field.required);
		}
		emdash(args);
	}
}

async function main() {
	const collections = loadSeedCollections();
	const existingCollections = emdash(["schema", "list"]);

	for (const collection of collections) {
		await syncCollection(collection, existingCollections);
	}

	console.log("Schema sync complete.");
}

await main();
