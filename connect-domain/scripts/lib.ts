// Shared helpers: DNS lookups through `dig`, Cloudflare calls through `cf`,
// and the pure parsing/classification the scripts and tests rely on.
import { execFileSync } from "node:child_process";

export type Kind = "email" | "parking" | "web" | "other";

export interface DnsRecord {
	type: string;
	/** Fully qualified, lower case, no trailing dot. */
	name: string;
	/** Normalised value: no trailing dot; TXT unquoted and joined. */
	content: string;
	priority?: number;
	srv?: { priority: number; weight: number; port: number; target: string };
	kind: Kind;
}

export interface Snapshot {
	domain: string;
	takenAt: string;
	nameservers: string[];
	records: DnsRecord[];
}

const APEX_TYPES = ["A", "AAAA", "MX", "TXT", "CAA"];
const HOST_TYPES = ["A", "AAAA", "MX", "TXT"];

/** Subdomains worth probing: web, common mail hosts, DMARC and DKIM selectors. */
export const PROBE_HOSTS = [
	"www", "mail", "webmail", "smtp", "imap", "pop", "autodiscover", "autoconfig", "ftp", "cpanel", "_dmarc",
	"default._domainkey", "google._domainkey", "selector1._domainkey", "selector2._domainkey", "k1._domainkey",
	"s1._domainkey", "s2._domainkey", "dkim._domainkey", "mail._domainkey", "zoho._domainkey", "protonmail._domainkey",
];
export const PROBE_SRV = ["_autodiscover._tcp", "_submission._tcp", "_imaps._tcp", "_pop3s._tcp", "_sip._tls", "_sipfederationtls._tcp"];

const MAIL_HOST_LABELS = /^(mail|webmail|smtp|imap|pop|autodiscover|autoconfig|_dmarc|_autodiscover|_submission|_imaps|_pop3s)\b/;
const MAIL_TARGETS = /(privateemail\.com|outlook\.com|office365|google\.com|googlemail|zoho|protonmail|mailgun|sendgrid|amazonses|mimecast|messagingengine)/i;
const PARKING = /(^162\.255\.119\.\d+$|parkingpage\.namecheap\.com|sedoparking|parkingcrew|bodis\.com)/i;

export function stripDot(value: string): string {
	return value.trim().replace(/\.$/, "").toLowerCase();
}

/** `"v=spf1 a" "b"` → `v=spf1 ab` (dig splits long TXT values into chunks). */
export function unquoteTxt(line: string): string {
	const parts = [...line.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
	return parts.length > 0 ? parts.join("") : line.trim();
}

/** Parse one `dig +short` answer line for the given type. */
export function parseAnswer(type: string, name: string, line: string): Omit<DnsRecord, "kind"> {
	const base = { type, name: stripDot(name) };
	if (type === "MX") {
		const [priority, host] = line.trim().split(/\s+/);
		return { ...base, content: stripDot(host), priority: Number(priority) };
	}
	if (type === "SRV") {
		const [priority, weight, port, target] = line.trim().split(/\s+/);
		const srv = { priority: Number(priority), weight: Number(weight), port: Number(port), target: stripDot(target) };
		return { ...base, content: `${srv.priority} ${srv.weight} ${srv.port} ${srv.target}`, srv };
	}
	if (type === "TXT") {
		return { ...base, content: unquoteTxt(line) };
	}
	if (type === "CAA") {
		return { ...base, content: line.trim() };
	}
	return { ...base, content: stripDot(line) };
}

export function classify(record: Omit<DnsRecord, "kind">, domain: string): Kind {
	const label = record.name === domain ? "@" : record.name.slice(0, -(domain.length + 1));
	if (PARKING.test(record.content)) {
		return "parking";
	}
	if ((label === "@" || label === "www") && ["A", "AAAA", "CNAME"].includes(record.type)) {
		return "web";
	}
	if (
		record.type === "MX" ||
		record.type === "SRV" ||
		label.includes("_domainkey") ||
		MAIL_HOST_LABELS.test(label) ||
		(record.type === "TXT" && /^v=(spf1|dmarc1|dkim1)/i.test(record.content)) ||
		MAIL_TARGETS.test(record.content)
	) {
		return "email";
	}
	return "other";
}

/** The records an import copies: everything except parking and the web records the Worker replaces. */
export function recordsToCopy(snapshot: Snapshot): DnsRecord[] {
	return snapshot.records.filter((r) => r.kind === "email" || r.kind === "other");
}

/** The JSON body `cf dns records create` takes for a record. DNS-only, automatic TTL. */
export function toCloudflareBody(record: DnsRecord): Record<string, unknown> {
	const body: Record<string, unknown> = { type: record.type, name: record.name, ttl: 1 };
	if (record.type === "MX") {
		return { ...body, content: record.content, priority: record.priority };
	}
	if (record.type === "SRV" && record.srv) {
		return { ...body, data: record.srv };
	}
	if (record.type === "CAA") {
		const [flags, tag, ...value] = record.content.split(/\s+/);
		return { ...body, data: { flags: Number(flags), tag, value: unquoteTxt(value.join(" ")) } };
	}
	if (record.type === "TXT") {
		return { ...body, content: `"${record.content.replace(/"/g, '\\"')}"` };
	}
	return { ...body, content: record.content, proxied: false };
}

/** Stable identity used to compare a snapshot with what a nameserver serves. */
export function recordKey(record: Pick<DnsRecord, "type" | "name" | "content"> & { priority?: number }): string {
	return [record.type, record.name, record.priority ?? "", record.content].join(" ");
}

export function dig(type: string, name: string, server?: string): string[] {
	const args = ["+short", "+time=5", "+tries=2", type, name];
	if (server) {
		args.push(`@${server}`);
	}
	try {
		return execFileSync("dig", args, { encoding: "utf8" })
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith(";"));
	} catch {
		return [];
	}
}

/** Every probed record a nameserver answers for the domain. */
export function lookupAll(domain: string, server: string, extraHosts: string[] = []): Omit<DnsRecord, "kind">[] {
	const found: Omit<DnsRecord, "kind">[] = [];
	for (const type of APEX_TYPES) {
		found.push(...dig(type, domain, server).map((l) => parseAnswer(type, domain, l)));
	}
	for (const host of new Set([...PROBE_HOSTS, ...extraHosts])) {
		const fqdn = `${host}.${domain}`;
		const cname = dig("CNAME", fqdn, server);
		if (cname.length > 0) {
			found.push(...cname.map((l) => parseAnswer("CNAME", fqdn, l)));
			continue;
		}
		for (const type of HOST_TYPES) {
			found.push(...dig(type, fqdn, server).map((l) => parseAnswer(type, fqdn, l)));
		}
	}
	for (const srv of PROBE_SRV) {
		const fqdn = `${srv}.${domain}`;
		found.push(...dig("SRV", fqdn, server).map((l) => parseAnswer("SRV", fqdn, l)));
	}
	return found;
}

export function cf(args: string[]): unknown {
	const out = execFileSync("cf", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	return unwrap(JSON.parse(out));
}

/** `cf` prints the API's `result`, but tolerate the full envelope too. */
export function unwrap(value: unknown): unknown {
	if (value && typeof value === "object" && "result" in value && "success" in value) {
		return (value as { result: unknown }).result;
	}
	return value;
}
