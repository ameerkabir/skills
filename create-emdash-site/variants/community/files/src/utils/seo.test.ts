import { describe, expect, it } from "vitest";
import { canonicalUrl, localeAlternates, organizationJsonLd, siteOrigin } from "./seo";

describe("siteOrigin", () => {
	it("prefers the configured URL and trims trailing slashes", () => {
		expect(siteOrigin("https://example.org/", "http://localhost:4321")).toBe("https://example.org");
		expect(siteOrigin(undefined, "http://localhost:4321")).toBe("http://localhost:4321");
		expect(siteOrigin("  ", "http://localhost:4321")).toBe("http://localhost:4321");
	});
});

describe("canonicalUrl", () => {
	it("drops the trailing slash but keeps the locale prefix", () => {
		expect(canonicalUrl("https://e.org", "/about/")).toBe("https://e.org/about");
		expect(canonicalUrl("https://e.org", "/ar/about")).toBe("https://e.org/ar/about");
		expect(canonicalUrl("https://e.org", "/")).toBe("https://e.org");
	});
});

describe("localeAlternates", () => {
	it("returns each locale plus x-default from either locale's path", () => {
		const want = [
			{ hreflang: "en", href: "https://e.org/services" },
			{ hreflang: "ar", href: "https://e.org/ar/services" },
			{ hreflang: "x-default", href: "https://e.org/services" },
		];
		expect(localeAlternates("https://e.org", "/services/")).toEqual(want);
		expect(localeAlternates("https://e.org", "/ar/services")).toEqual(want);
	});

	it("handles the home page", () => {
		expect(localeAlternates("https://e.org", "/ar")[1]).toEqual({ hreflang: "ar", href: "https://e.org/ar" });
		expect(localeAlternates("https://e.org", "/")[0]).toEqual({ hreflang: "en", href: "https://e.org" });
	});
});

describe("organizationJsonLd", () => {
	it("omits optional fields that are missing", () => {
		const ld = organizationJsonLd({ origin: "https://e.org", nameEn: "A", nameAr: "ب", description: "d" });
		expect(ld).toMatchObject({ "@type": "Organization", name: "A", alternateName: "ب", url: "https://e.org" });
		expect("logo" in ld).toBe(false);
		expect("email" in ld).toBe(false);
	});
});
