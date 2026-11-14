import { strict as assert } from "node:assert";
import { test } from "node:test";
import { classify, parseAnswer, recordKey, recordsToCopy, toCloudflareBody, unquoteTxt } from "./lib.ts";

const D = "example.org.uk";
const rec = (type: string, name: string, line: string) => {
	const r = parseAnswer(type, name, line);
	return { ...r, kind: classify(r, D) };
};

test("parses dig answers", () => {
	assert.deepEqual(parseAnswer("MX", D, "10 mx1.privateemail.com."), { type: "MX", name: D, content: "mx1.privateemail.com", priority: 10 });
	assert.equal(parseAnswer("SRV", `_autodiscover._tcp.${D}`, "0 0 443 privateemail.com.").content, "0 0 443 privateemail.com");
	assert.equal(unquoteTxt('"v=spf1 include:a" " ~all"'), "v=spf1 include:a ~all");
});

test("classifies Namecheap parking, web, email and other records", () => {
	assert.equal(rec("A", D, "162.255.119.85").kind, "parking");
	assert.equal(rec("CNAME", `www.${D}`, "parkingpage.namecheap.com.").kind, "parking");
	assert.equal(rec("A", D, "203.0.113.7").kind, "web");
	assert.equal(rec("MX", D, "10 mx1.privateemail.com.").kind, "email");
	assert.equal(rec("TXT", D, '"v=spf1 include:spf.privateemail.com ~all"').kind, "email");
	assert.equal(rec("CNAME", `autodiscover.${D}`, "privateemail.com.").kind, "email");
	assert.equal(rec("TXT", `default._domainkey.${D}`, '"v=DKIM1; k=rsa; p=abc"').kind, "email");
	assert.equal(rec("TXT", D, '"google-site-verification=xyz"').kind, "other");
});

test("copies email and other records only", () => {
	const records = [rec("A", D, "162.255.119.85"), rec("A", D, "203.0.113.7"), rec("MX", D, "10 mx.example.com."), rec("TXT", D, '"MS=ms123"')];
	const copied = recordsToCopy({ domain: D, takenAt: "", nameservers: [], records }).map((r) => r.type);
	assert.deepEqual(copied, ["MX", "TXT"]);
});

test("builds Cloudflare bodies", () => {
	assert.deepEqual(toCloudflareBody(rec("MX", D, "10 mx1.privateemail.com.")), { type: "MX", name: D, ttl: 1, content: "mx1.privateemail.com", priority: 10 });
	assert.deepEqual(toCloudflareBody(rec("SRV", `_autodiscover._tcp.${D}`, "0 0 443 privateemail.com.")).data, { priority: 0, weight: 0, port: 443, target: "privateemail.com" });
	assert.equal(toCloudflareBody(rec("TXT", D, '"v=spf1 ~all"')).content, '"v=spf1 ~all"');
	assert.equal(toCloudflareBody(rec("CNAME", `mail.${D}`, "privateemail.com.")).proxied, false);
	assert.deepEqual(toCloudflareBody(rec("CAA", D, '0 issue "letsencrypt.org"')).data, { flags: 0, tag: "issue", value: "letsencrypt.org" });
});

test("keys match across snapshot and served answers", () => {
	assert.equal(recordKey(parseAnswer("MX", D, "10 MX1.privateemail.com.")), recordKey(parseAnswer("MX", D, "10 mx1.privateemail.com")));
});
