/** Resolved media reference from getSiteSettings() */
export interface MediaReference {
	mediaId: string;
	alt?: string;
	url?: string;
}

export interface SiteIdentitySettings {
	title?: string;
	tagline?: string;
	logo?: MediaReference;
	favicon?: MediaReference;
}

// Last-resort defaults for a fresh DB with no ui_strings/settings yet.
// getSiteSettings() is locale-less, so the Arabic identity comes from the
// `site.title` / `site.tagline` ui_strings rows first.
export const DEFAULTS = {
	en: { title: "%%SITE_NAME_EN%%", tagline: "%%TAGLINE_EN%%" },
	ar: { title: "%%SITE_NAME_AR%%", tagline: "%%TAGLINE_AR%%" },
} as const;

export function resolveSiteIdentity(
	settings?: SiteIdentitySettings,
	locale?: string,
	uiStrings?: Record<string, string>,
) {
	const fallback = locale === "ar" ? DEFAULTS.ar : DEFAULTS.en;
	return {
		siteTitle: uiStrings?.["site.title"] ?? settings?.title ?? fallback.title,
		siteTagline: uiStrings?.["site.tagline"] ?? settings?.tagline ?? fallback.tagline,
		siteLogo: settings?.logo?.url ? settings.logo : null,
		siteFavicon: settings?.favicon?.url ?? null,
	};
}
