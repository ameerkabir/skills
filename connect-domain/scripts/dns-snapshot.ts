#!/usr/bin/env node
// Record what the domain's current nameservers serve, before anything moves.
//
//   node dns-snapshot.ts <domain> [--extra host1,host2] [--out file.json]
//
// Probes the apex plus common web/mail hosts, DMARC, DKIM selectors and mail
// SRV records (DNS can't be listed, so `--extra` adds hosts seen on the
// registrar's DNS page). Each record is classified:
//   email   : MX, SPF/DMARC/DKIM, mail hosts: must be copied
//   other   : verification TXT, CAA, other hosts: copied
//   web     : apex/www A/AAAA/CNAME: replaced by the Worker, not copied
//   parking : registrar parking/redirect: dropped
// Exits 1 when the domain doesn't resolve or DNSSEC is on.
import { writeFileSync } from "node:fs";
import { classify, dig, lookupAll, stripDot, type Snapshot } from "./lib.ts";

const args = process.argv.slice(2);
const domain = args[0]?.toLowerCase();
const flag = (name: string) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};
if (!domain || domain.startsWith("--")) {
	console.error("usage: dns-snapshot.ts <domain> [--extra host1,host2] [--out file.json]");
	process.exit(2);
}

const nameservers = dig("NS", domain).map(stripDot).sort();
if (nameservers.length === 0) {
	console.error(`${domain} has no nameservers: it is misspelt or not registered. Confirm the spelling with the user.`);
	process.exit(1);
}
if (dig("DS", domain).length > 0) {
	console.error(`${domain} has DNSSEC on (a DS record at the registry). Turn DNSSEC off at the registrar and wait until \`dig +short DS ${domain}\` is empty before changing nameservers, or the domain stops resolving.`);
	process.exit(1);
}

const extra = (flag("--extra") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
const records = lookupAll(domain, nameservers[0], extra).map((r) => ({ ...r, kind: classify(r, domain) }));
const snapshot: Snapshot = { domain, takenAt: new Date().toISOString(), nameservers, records };

console.error(`${domain} @ ${nameservers.join(", ")}`);
for (const r of records) {
	console.error(`  ${r.kind.padEnd(8)} ${r.type.padEnd(5)} ${r.name}  ${r.priority ?? ""} ${r.content}`.replace(/  +$/, ""));
}
console.error(`${records.length} records; copy: ${records.filter((r) => r.kind === "email" || r.kind === "other").length}`);

const json = JSON.stringify(snapshot, null, 2) + "\n";
const out = flag("--out");
if (out) {
	writeFileSync(out, json);
	console.error(`Saved ${out}`);
} else {
	process.stdout.write(json);
}
