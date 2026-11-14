import { getRelativeLocaleUrl } from "astro:i18n";

// Separate from locales.ts because astro.config.mjs imports that file before
// the `astro:i18n` virtual module exists.

/**
 * Locale-prefix an internal path ("/posts" -> "/ar/posts"). Menu items and
 * card links are stored unprefixed, so every internal href goes through this
 * or navigation silently drops back to the default locale. Admin routes and
 * external URLs pass through unchanged.
 */
export function localizedHref(locale: string | undefined | null, url: string | undefined | null): string {
	if (!url || !locale || !url.startsWith("/") || url.startsWith("/_emdash")) {
		return url ?? "#";
	}
	return getRelativeLocaleUrl(locale, url);
}
