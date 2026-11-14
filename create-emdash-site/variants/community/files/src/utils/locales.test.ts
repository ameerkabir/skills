import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES, isLocale, isRtl, otherLocale, stripLocalePrefix } from "./locales";

describe("isLocale", () => {
	it("accepts every supported locale and rejects others", () => {
		for (const locale of SUPPORTED_LOCALES) {
			expect(isLocale(locale)).toBe(true);
		}
		expect(isLocale("xx")).toBe(false);
		expect(isLocale(undefined)).toBe(false);
	});
});

describe("isRtl", () => {
	it("flags Arabic as right-to-left", () => {
		expect(isRtl("ar")).toBe(true);
		expect(isRtl("en")).toBe(false);
	});
});

describe("otherLocale", () => {
	it("cycles through the supported locales", () => {
		const first = SUPPORTED_LOCALES[0];
		expect(SUPPORTED_LOCALES).toContain(otherLocale(first));
		expect(otherLocale(first)).not.toBe(first);
	});
});

describe("config invariants", () => {
	it("has a label for every locale and a supported default", () => {
		expect(isLocale(DEFAULT_LOCALE)).toBe(true);
		for (const locale of SUPPORTED_LOCALES) {
			expect(LOCALE_LABELS[locale]).toBeTruthy();
		}
	});
});

describe("stripLocalePrefix", () => {
	it("removes a leading locale segment only", () => {
		expect(stripLocalePrefix("/ar/about")).toBe("/about");
		expect(stripLocalePrefix("/ar")).toBe("/");
		expect(stripLocalePrefix("/about")).toBe("/about");
		expect(stripLocalePrefix("/")).toBe("/");
	});
});
