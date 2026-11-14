#!/usr/bin/env node
// Check that a nameserver serves every record the import should have copied.
//
//   node dns-compare.ts <snapshot.json>              # against the zone's Cloudflare nameservers
//   node dns-compare.ts <snapshot.json> --public     # against 1.1.1.1 (after the switch)
//   node dns-compare.ts <snapshot.json> --server X
//
// Exits 1 on any missing or different record, or more than one SPF record.
import { readFileSync } from "node:fs";
import { cf, dig, parseAnswer, recordKey, recordsToCopy, type Snapshot } from "./lib.ts";

const [file, ...rest] = process.argv.slice(2);
if (!file) {
	console.error("usage: dns-compare.ts <snapshot.json> [--public | --server <ns>]");
	process.exit(2);
}
const snapshot = JSON.parse(readFileSync(file, "utf8")) as Snapshot;
const serverFlag = rest.indexOf("--server");
const server = rest.includes("--public")
	? "1.1.1.1"
	: serverFlag >= 0
		? rest[serverFlag + 1]
		: (cf(["zones", "get", "-z", snapshot.domain]) as { name_servers: string[] }).name_servers[0];

const groups = new Map<string, Set<string>>();
for (const r of recordsToCopy(snapshot)) {
	const id = `${r.type} ${r.name}`;
	groups.set(id, (groups.get(id) ?? new Set()).add(recordKey(r)));
}

let problems = 0;
let matched = 0;
for (const [id, expected] of groups) {
	const [type, name] = id.split(" ");
	const served = new Set(dig(type, name, server).map((l) => recordKey(parseAnswer(type, name, l))));
	const missing = [...expected].filter((k) => !served.has(k));
	if (missing.length === 0) {
		matched++;
		console.log(`match  ${id}`);
	} else {
		problems++;
		console.log(`MISS   ${id}: expected ${missing.join(" | ")}; served ${[...served].join(" | ") || "nothing"}`);
	}
}

const spf = dig("TXT", snapshot.domain, server).filter((l) => /v=spf1/i.test(l));
if (spf.length > 1) {
	problems++;
	console.log(`SPF    ${spf.length} SPF records at the apex; merge them into one (receivers reject mail otherwise): ${spf.join(" | ")}`);
}
console.log(`\n${server}: ${matched}/${groups.size} record sets match`);
process.exit(problems > 0 ? 1 : 0);
