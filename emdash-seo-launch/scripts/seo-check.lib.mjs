// Pure helpers for seo-check.mjs: parsing and judging, no network.

const attr = (tag, name) => {
	const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
	return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
};

const decode = (value) =>
	value.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Pull the search-relevant tags out of a page's HTML. */
export function parseHead(html) {
	const tags = (name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => m[0]);
	const metas = tags("meta");
	const links = tags("link");
	const meta = (key, value) =>
		metas.filter((t) => (attr(t, "name") ?? attr(t, "property"))?.toLowerCase() === key).map((t) => decode(attr(t, value) ?? ""));
	const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
	const jsonLd = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap((m) => {
		try {
			const data = JSON.parse(m[1]);
			return (Array.isArray(data) ? data : [data]).map((d) => d["@type"]).flat().filter(Boolean);
		} catch {
			return ["(invalid JSON-LD)"];
		}
	});
	return {
		title: title ? decode(title.trim()) : null,
		description: meta("description", "content")[0] ?? null,
		robots: meta("robots", "content").map((v) => v.toLowerCase()),
		ogImage: meta("og:image", "content")[0] ?? null,
		canonicals: links.filter((t) => attr(t, "rel")?.toLowerCase() === "canonical").map((t) => attr(t, "href") ?? ""),
		alternates: links
			.filter((t) => attr(t, "rel")?.toLowerCase() === "alternate" && attr(t, "hreflang"))
			.map((t) => ({ hreflang: attr(t, "hreflang"), href: attr(t, "href") ?? "" })),
		jsonLd,
	};
}

const strip = (url) => url.replace(/\/+$/, "");
const parts = (url) => {
	try {
		const u = new URL(url);
		return { origin: u.origin, path: strip(u.pathname) };
	} catch {
		return { origin: "", path: strip(url) };
	}
};

/**
 * Judge one page. Returns [{ level: "fail" | "warn", message }]. `url` is the
 * page that was fetched; `xRobots` its X-Robots-Tag header, if any.
 */
export function checkPage({ url, head, xRobots = "", isHome = false }) {
	const out = [];
	const fail = (message) => out.push({ level: "fail", message });
	const warn = (message) => out.push({ level: "warn", message });

	const blocked = [...head.robots, xRobots.toLowerCase()].find((v) => v.includes("noindex"));
	if (blocked) fail(`noindex: "${blocked}". Google will not index this page`);

	if (head.canonicals.length === 0) warn("no canonical link");
	else if (head.canonicals.length > 1) warn(`${head.canonicals.length} canonical links (should be one)`);
	else {
		const canonical = parts(head.canonicals[0]);
		const page = parts(url);
		if (canonical.path !== page.path) fail(`canonical points elsewhere: ${head.canonicals[0]} (page is ${url})`);
		else if (canonical.origin !== page.origin) {
			warn(`canonical host is ${canonical.origin}, not ${page.origin}: expected when auditing a dev or workers.dev URL, wrong if this is production`);
		}
	}

	if (head.alternates.length > 0) {
		const here = parts(url).path;
		if (!head.alternates.some((a) => parts(a.href).path === here)) warn("hreflang set does not include this page itself");
		if (!head.alternates.some((a) => a.hreflang === "x-default")) warn("hreflang set has no x-default");
	}
	if (!head.title) fail("no <title>");
	if (!head.description) warn("no meta description");
	if (!head.ogImage) warn("no og:image (no preview image when shared)");
	if (isHome && !head.jsonLd.some((t) => ["Organization", "NGO", "LocalBusiness"].includes(t))) {
		warn("no Organization structured data on the home page");
	}
	return out;
}

export function checkRobotsTxt(text) {
	const out = [];
	let agent = "";
	let blocksAll = false;
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.replace(/#.*/, "").trim();
		const [key, ...rest] = line.split(":");
		const value = rest.join(":").trim();
		if (/^user-agent$/i.test(key)) agent = value;
		if (/^disallow$/i.test(key) && agent === "*" && value === "/") blocksAll = true;
	}
	if (blocksAll) out.push({ level: "fail", message: "robots.txt disallows everything (Disallow: / for *)" });
	if (!/^sitemap:/im.test(text)) out.push({ level: "warn", message: "robots.txt has no Sitemap line" });
	return out;
}

export function parseSitemap(xml) {
	const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decode(m[1]));
	return { isIndex: /<sitemapindex\b/i.test(xml), locs };
}

/** Sitemap URLs that look like an unconfigured collection URL pattern. */
export function suspiciousSitemapUrl(loc) {
	return /\/pages\/[^/]+\/?$/.test(new URL(loc).pathname) ? "looks like /pages/<slug>: the collection probably has no urlPattern" : null;
}
