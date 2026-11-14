/**
 * Single source of truth for the site's locales, imported by astro.config.mjs
 * (i18n block), middleware.ts and LanguageSwitcher.astro. Keep this file free
 * of `astro:*` imports: astro.config.mjs loads it before virtual modules exist.
 */
export const SUPPORTED_LOCALES = ["en", "ar"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Endonym shown in the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", ar: "العربية" };

const RTL_LOCALES: readonly string[] = ["ar", "fa", "he", "ur"];

export function isLocale(value: string | undefined): value is Locale {
	return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: string | undefined): boolean {
	return !!locale && RTL_LOCALES.includes(locale);
}

export function otherLocale(locale: Locale): Locale {
	const idx = SUPPORTED_LOCALES.indexOf(locale);
	return SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length];
}

/** "/ar/about" -> "/about"; paths without a locale prefix are returned unchanged. */
export function stripLocalePrefix(pathname: string): string {
	const segments = pathname.split("/").filter(Boolean);
	if (isLocale(segments[0])) {
		return "/" + segments.slice(1).join("/");
	}
	return pathname || "/";
}
