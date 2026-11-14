#!/usr/bin/env node
// Redirect www.<domain> to https://<domain> (301, path and query kept).
// Adds a proxied placeholder AAAA for www when the zone has no www record,
// then merges a rule into the zone's redirect phase. The phase PUT replaces
// the whole rule list, so existing rules are read first and kept.
//
//   node www-redirect.ts <domain> [--dry-run]
import { cf } from "./lib.ts";

const [domain, ...rest] = process.argv.slice(2);
if (!domain) {
	console.error("usage: www-redirect.ts <domain> [--dry-run]");
	process.exit(2);
}
const dryRun = rest.includes("--dry-run") ? ["--dry-run"] : [];
const www = `www.${domain}`;
const PHASE = "http_request_dynamic_redirect";
const REF = "www_to_apex";

const records = cf(["dns", "records", "list", "-z", domain]) as { name: string; type: string }[];
if (!records.some((r) => r.name === www)) {
	cf(["dns", "records", "create", "-z", domain, ...dryRun, "--body", JSON.stringify({ type: "AAAA", name: www, content: "100::", proxied: true, ttl: 1 })]);
	console.log(`[${dryRun.length ? "dry-run" : "create"}] AAAA ${www} 100:: (proxied placeholder so the redirect rule sees the request)`);
} else {
	console.log(`[skip]   ${www} already has a DNS record; it must be proxied for the rule to apply`);
}

type Rule = { ref?: string; [k: string]: unknown };
let rules: Rule[] = [];
try {
	rules = ((cf(["rulesets", "account-rulesets", "phases", "get", PHASE, "-z", domain]) as { rules?: Rule[] }).rules ?? []).map(
		({ id: _id, version: _v, last_updated: _l, ...rule }) => rule,
	);
} catch {
	// No entrypoint yet: the zone has no redirect rules.
}
if (rules.some((r) => r.ref === REF)) {
	console.log(`[skip]   redirect rule "${REF}" already present`);
	process.exit(0);
}
rules.push({
	ref: REF,
	description: `www.${domain} → ${domain}`,
	expression: `(http.host eq "${www}")`,
	action: "redirect",
	action_parameters: {
		from_value: {
			status_code: 301,
			target_url: { expression: `concat("https://${domain}", http.request.uri.path)` },
			preserve_query_string: true,
		},
	},
});
cf(["rulesets", "account-rulesets", "phases", "update", PHASE, "-z", domain, ...dryRun, "--body", JSON.stringify({ rules })]);
console.log(`[${dryRun.length ? "dry-run" : "update"}] ${PHASE}: ${rules.length} rule(s), "${REF}" added`);
