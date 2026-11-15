// Pure helpers for the search-engine tags Base.astro emits. Kept free of
// `astro:*` and `cloudflare:*` imports so they can be unit-tested.
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, stripLocalePrefix } from "./locales";

/** The public origin: the configured site URL when set, else the request's. */
export function siteOrigin(configured: string | undefined, requestOrigin: string): string {
	return (configured?.trim() || requestOrigin).replace(/\/+$/, "");
}

/** Canonical URL for the current page: no query string, no trailing slash. */
export function canonicalUrl(origin: string, pathname: string): string {
	const path = pathname.replace(/\/+$/, "");
	return `${origin}${path}`;
}

export interface Alternate {
	hreflang: string;
	href: string;
}

/**
 * hreflang alternates for a page that has the same path in every locale
 * (home, services, contact...). Content pages get theirs from EmDash, which
 * knows whether a translation exists.
 */
export function localeAlternates(origin: string, pathname: string): Alternate[] {
	const base = stripLocalePrefix(pathname).replace(/\/+$/, "");
	const url = (locale: string): string =>
		locale === DEFAULT_LOCALE ? `${origin}${base}` : `${origin}/${locale}${base}`;
	return [
		...SUPPORTED_LOCALES.map((locale) => ({ hreflang: locale, href: url(locale) })),
		{ hreflang: "x-default", href: url(DEFAULT_LOCALE) },
	];
}

export function organizationJsonLd(input: {
	origin: string;
	nameEn: string;
	nameAr: string;
	description: string;
	logoUrl?: string | null;
	email?: string;
}): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": `${input.origin}/#organization`,
		name: input.nameEn,
		alternateName: input.nameAr,
		url: input.origin,
		description: input.description,
		...(input.logoUrl ? { logo: input.logoUrl } : {}),
		...(input.email ? { email: input.email } : {}),
	};
}
