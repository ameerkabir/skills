import { describe, expect, it } from "vitest";
import { resolveSiteIdentity } from "./site-identity";

describe("resolveSiteIdentity", () => {
	it("prefers ui_strings over settings", () => {
		const result = resolveSiteIdentity(
			{ title: "Settings Title", tagline: "Settings Tagline" },
			"en",
			{ "site.title": "CMS Title", "site.tagline": "CMS Tagline" },
		);
		expect(result.siteTitle).toBe("CMS Title");
		expect(result.siteTagline).toBe("CMS Tagline");
	});

	it("falls back to settings when ui_strings has no value", () => {
		const result = resolveSiteIdentity({ title: "Settings Title", tagline: "Settings Tagline" }, "en", {});
		expect(result.siteTitle).toBe("Settings Title");
		expect(result.siteTagline).toBe("Settings Tagline");
	});

	it("falls back to per-locale defaults when nothing else is set", () => {
		expect(resolveSiteIdentity(undefined, "en", {}).siteTitle).toBe("%%SITE_NAME_EN%%");
		expect(resolveSiteIdentity(undefined, "ar", {}).siteTitle).toBe("%%SITE_NAME_AR%%");
	});

	it("returns the logo only when it has a resolved url", () => {
		const withUrl = resolveSiteIdentity({ logo: { mediaId: "1", url: "https://example.com/logo.png" } }, "en", {});
		expect(withUrl.siteLogo).toEqual({ mediaId: "1", url: "https://example.com/logo.png" });
		expect(resolveSiteIdentity({ logo: { mediaId: "1" } }, "en", {}).siteLogo).toBeNull();
	});

	it("resolves the favicon url only when one is set", () => {
		expect(resolveSiteIdentity({ favicon: { mediaId: "2", url: "/icon.jpeg" } }, "en", {}).siteFavicon).toBe("/icon.jpeg");
		expect(resolveSiteIdentity({}, "en", {}).siteFavicon).toBeNull();
	});
});
