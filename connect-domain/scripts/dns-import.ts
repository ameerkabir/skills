#!/usr/bin/env node
// Copy a snapshot's email + other records into the domain's Cloudflare zone,
// DNS-only. Records already in the zone are skipped, so re-running is safe.
//
//   node dns-import.ts <snapshot.json> [--dry-run]
import { readFileSync } from "node:fs";
import { cf, recordKey, recordsToCopy, stripDot, toCloudflareBody, unquoteTxt, type Snapshot } from "./lib.ts";

const [file, ...rest] = process.argv.slice(2);
if (!file) {
	console.error("usage: dns-import.ts <snapshot.json> [--dry-run]");
	process.exit(2);
}
const dryRun = rest.includes("--dry-run");
const snapshot = JSON.parse(readFileSync(file, "utf8")) as Snapshot;

interface CfRecord {
	type: string;
	name: string;
	content?: string;
	priority?: number;
	data?: { priority: number; weight: number; port: number; target: string };
}
const existing = new Set(
	(cf(["dns", "records", "list", "-z", snapshot.domain]) as CfRecord[]).map((r) =>
		recordKey({
			type: r.type,
			name: stripDot(r.name),
			priority: r.type === "MX" ? r.priority : undefined,
			content:
				r.type === "SRV" && r.data
					? `${r.data.priority} ${r.data.weight} ${r.data.port} ${stripDot(r.data.target)}`
					: r.type === "TXT"
						? unquoteTxt(r.content ?? "")
						: stripDot(r.content ?? ""),
		}),
	),
);

let failed = 0;
for (const record of recordsToCopy(snapshot)) {
	const label = `${record.type} ${record.name} ${record.content}`;
	if (record.type !== "CAA" && existing.has(recordKey(record))) {
		console.log(`[skip]   ${label} (already in zone)`);
		continue;
	}
	const args = ["dns", "records", "create", "-z", snapshot.domain, "--body", JSON.stringify(toCloudflareBody(record))];
	if (dryRun) {
		args.push("--dry-run");
	}
	try {
		cf(args);
		console.log(`[${dryRun ? "dry-run" : "create"}] ${label}`);
	} catch (err) {
		failed++;
		console.log(`[FAIL]   ${label}: ${(err as { stderr?: string }).stderr?.trim() || String(err)}`);
	}
}
process.exit(failed > 0 ? 1 : 0);
