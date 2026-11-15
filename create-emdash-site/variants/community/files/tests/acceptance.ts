// Single source of truth for what "the site works" means. scripts/smoke.ts
// (HTTP checks) and tests/e2e (browser checks) both read this list. When a
// page is added to or dropped from the site, edit PAGES here.
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isRtl } from "../src/utils/locales.ts";
import type { Locale } from "../src/utils/locales.ts";

export const LOCALES: readonly Locale[] = SUPPORTED_LOCALES;

/** Unprefixed paths that must render 200 in every locale. */
export const PAGES = [
	"/",
	"/about",
	"/services",
	"/services/advice",
	"/events",
	"/events/community-gathering",
	"/posts",
	"/posts/welcome",
	"/contact",
	"/register",
	"/register/success",
	"/category/events",
] as const;

export const NOT_FOUND_PATH = "/this-page-does-not-exist";

export const FORM_ENDPOINTS = {
	register: "/_emdash/api/plugins/site-forms/register",
	contact: "/_emdash/api/plugins/site-forms/contact",
} as const;

/** Marked so test rows are easy to spot and delete in the admin. */
export const SAMPLE_MEMBER = { title: "[test] Amina Yusuf", phone: "07700900000", city: "Leeds", date_of_birth: "1990-02-01" };
export const SAMPLE_CONTACT = { name: "[test] Visitor", email: "visitor@example.com", message: "Automated acceptance check." };

export function localePath(locale: Locale, path: string): string {
	if (locale === DEFAULT_LOCALE) {
		return path;
	}
	return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Problems with a rendered page's <html> element for the given locale; empty when it's right. */
export function checkHtmlElement(html: string, locale: Locale): string[] {
	const tag = html.match(/<html\b[^>]*>/i)?.[0];
	if (!tag) {
		return ["no <html> element"];
	}
	const problems: string[] = [];
	const lang = tag.match(/\blang="([^"]*)"/i)?.[1];
	const dir = tag.match(/\bdir="([^"]*)"/i)?.[1];
	const expectedDir = isRtl(locale) ? "rtl" : "ltr";
	if (lang !== locale) {
		problems.push(`lang="${lang ?? ""}", expected "${locale}"`);
	}
	if (dir !== expectedDir) {
		problems.push(`dir="${dir ?? ""}", expected "${expectedDir}"`);
	}
	return problems;
}
