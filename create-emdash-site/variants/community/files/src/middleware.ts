import { defineMiddleware } from "astro:middleware";
import { type Locale, DEFAULT_LOCALE, isLocale } from "./utils/locales";

// One set of page files serves every locale: /ar/about is rewritten to
// /about with `locals.locale = "ar"`, so pages never live under src/pages/ar/.
// Pages read `Astro.locals.locale` and pass it to every EmDash query.
export const onRequest = defineMiddleware(async (context, next) => {
	const segments = context.url.pathname.split("/").filter(Boolean);
	const maybeLocale = segments[0];
	const locale: Locale = isLocale(maybeLocale) ? maybeLocale : DEFAULT_LOCALE;

	context.locals.locale = locale;

	if (isLocale(maybeLocale) && maybeLocale !== DEFAULT_LOCALE) {
		const stripped = "/" + segments.slice(1).join("/");
		return next(new Request(new URL(stripped + context.url.search, context.url), context.request));
	}

	return next();
});
