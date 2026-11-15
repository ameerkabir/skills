// Astro-only (imports a Cloudflare virtual module), so it is not unit-tested;
// the logic lives in seo.ts.
import { env } from "cloudflare:workers";
import { siteOrigin } from "./seo";

/** The public origin: EMDASH_SITE_URL from wrangler.jsonc when set, else the request's. */
export function getSiteOrigin(requestOrigin: string): string {
	return siteOrigin((env as { EMDASH_SITE_URL?: string }).EMDASH_SITE_URL, requestOrigin);
}
