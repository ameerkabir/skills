import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPage, checkRobotsTxt, parseHead, parseSitemap, suspiciousSitemapUrl } from "./seo-check.lib.mjs";

const page = (head) => `<!doctype html><html><head>${head}</head><body></body></html>`;
const good = page(`
<title>About — Site</title>
<meta name="description" content="Hello &amp; welcome">
<meta property="og:image" content="https://e.org/i.jpg">
<link rel="canonical" href="https://e.org/about">
<link rel="alternate" hreflang="en" href="https://e.org/about">
<link rel="alternate" href="https://e.org/ar/about" hreflang="ar">
<link rel="alternate" hreflang="x-default" href="https://e.org/about">`);

test("parseHead reads attributes in any order and decodes entities", () => {
	const head = parseHead(good);
	assert.equal(head.title, "About — Site");
	assert.equal(head.description, "Hello & welcome");
	assert.deepEqual(head.canonicals, ["https://e.org/about"]);
	assert.equal(head.alternates.length, 3);
	assert.equal(head.alternates[1].hreflang, "ar");
});

test("a healthy page has no findings", () => {
	assert.deepEqual(checkPage({ url: "https://e.org/about", head: parseHead(good) }), []);
});

test("noindex in the meta tag or the header fails", () => {
	const meta = parseHead(page(`<title>x</title><meta name="robots" content="noindex, nofollow">`));
	assert.ok(checkPage({ url: "https://e.org/", head: meta }).some((f) => f.level === "fail" && /noindex/.test(f.message)));
	const header = checkPage({ url: "https://e.org/", head: parseHead(good.replace("/about", "")), xRobots: "NOINDEX" });
	assert.ok(header.some((f) => f.level === "fail" && /noindex/.test(f.message)));
});

test("canonical problems: elsewhere fails, duplicate and missing warn", () => {
	const elsewhere = parseHead(page(`<title>x</title><link rel="canonical" href="https://e.org/">`));
	assert.ok(checkPage({ url: "https://e.org/ar", head: elsewhere }).some((f) => f.level === "fail" && /elsewhere/.test(f.message)));
	const twice = parseHead(page(`<title>x</title><link rel="canonical" href="https://e.org/a"><link rel="canonical" href="https://e.org/a">`));
	assert.ok(checkPage({ url: "https://e.org/a", head: twice }).some((f) => /2 canonical/.test(f.message)));
	assert.ok(checkPage({ url: "https://e.org/a", head: parseHead(page("<title>x</title>")) }).some((f) => /no canonical/.test(f.message)));
});

test("trailing slashes do not make a canonical 'elsewhere'", () => {
	const head = parseHead(page(`<title>x</title><link rel="canonical" href="https://e.org/a/">`));
	assert.equal(checkPage({ url: "https://e.org/a", head }).some((f) => f.level === "fail"), false);
});

test("hreflang without x-default or self warns; home without Organization data warns", () => {
	const head = parseHead(page(`<title>x</title><link rel="canonical" href="https://e.org"><link rel="alternate" hreflang="ar" href="https://e.org/ar">`));
	const out = checkPage({ url: "https://e.org", head, isHome: true });
	assert.ok(out.some((f) => /x-default/.test(f.message)));
	assert.ok(out.some((f) => /does not include this page/.test(f.message)));
	assert.ok(out.some((f) => /Organization/.test(f.message)));
});

test("JSON-LD types are read", () => {
	const head = parseHead(page(`<script type="application/ld+json">{"@type":"Organization"}</script>`));
	assert.deepEqual(head.jsonLd, ["Organization"]);
});

test("robots.txt: blanket disallow fails, missing sitemap warns", () => {
	assert.equal(checkRobotsTxt("User-agent: *\nDisallow: /\n").some((f) => f.level === "fail"), true);
	assert.equal(checkRobotsTxt("User-agent: *\nAllow: /\nDisallow: /_emdash/\nSitemap: https://e.org/sitemap.xml").length, 0);
	assert.equal(checkRobotsTxt("User-agent: *\nDisallow: /_emdash/").some((f) => /Sitemap/.test(f.message)), true);
});

test("sitemap parsing and the /pages/ hint", () => {
	const idx = parseSitemap(`<sitemapindex><sitemap><loc>https://e.org/sitemap-pages.xml</loc></sitemap></sitemapindex>`);
	assert.equal(idx.isIndex, true);
	assert.deepEqual(idx.locs, ["https://e.org/sitemap-pages.xml"]);
	assert.ok(suspiciousSitemapUrl("https://e.org/pages/about"));
	assert.equal(suspiciousSitemapUrl("https://e.org/about"), null);
	assert.equal(suspiciousSitemapUrl("https://e.org/posts/hello"), null);
});

test("a canonical on another host with the same path warns instead of failing", () => {
	const head = parseHead(page(`<title>x</title><link rel="canonical" href="https://prod.org/about"><link rel="alternate" hreflang="en" href="https://prod.org/about"><link rel="alternate" hreflang="x-default" href="https://prod.org/about">`));
	const out = checkPage({ url: "http://localhost:4321/about", head });
	assert.equal(out.some((f) => f.level === "fail"), false);
	assert.ok(out.some((f) => /canonical host/.test(f.message)));
	assert.equal(out.some((f) => /does not include this page/.test(f.message)), false);
});
