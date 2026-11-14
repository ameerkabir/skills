import { definePlugin, PluginRouteError } from "emdash";
import type { PluginDescriptor } from "emdash";
import { buildMemberSchema } from "./member-fields";
import { contactEmail, contactSchema } from "./contact";
import { allowSubmission } from "./rate-limit";
import { retryOnSlugConflict } from "./slug-retry";

// Public form endpoints for the site's own pages:
//   POST /_emdash/api/plugins/site-forms/register  -> a `members` entry
//   POST /_emdash/api/plugins/site-forms/contact   -> a `contact_messages` entry + email
// Entries are created through ctx.content, so they appear in the admin with
// no raw SQL against EmDash's tables.

const ID = "site-forms";
const VERSION = "1.0.0";
const CAPABILITIES = ["content:write", "email:send"] as const;

export interface SiteFormsOptions {
	contactTo?: string;
	siteName?: string;
	/** Per-IP submission limit. Pass `process.env.NODE_ENV === "production"` so local test runs aren't throttled. */
	rateLimit?: boolean;
}

export function siteFormsPlugin(options: SiteFormsOptions = {}): PluginDescriptor {
	return { id: ID, version: VERSION, format: "native", entrypoint: "site-forms", capabilities: [...CAPABILITIES], options };
}

export function createPlugin(options: SiteFormsOptions = {}) {
	const memberSchema = buildMemberSchema();
	const limited = (ctx: { kv: Parameters<typeof allowSubmission>[0]; requestMeta: { ip: string | null } }, form: string) =>
		options.rateLimit !== false && allowSubmission(ctx.kv, form, ctx.requestMeta.ip).then((ok) => !ok);

	return definePlugin({
		id: ID,
		version: VERSION,
		capabilities: [...CAPABILITIES],
		routes: {
			register: {
				public: true,
				handler: async (ctx) => {
					const parsed = memberSchema.safeParse(ctx.input);
					if (!parsed.success) {
						throw PluginRouteError.badRequest("VALIDATION_FAILED", parsed.error.issues.map((i) => i.path.join(".")));
					}
					if (await limited(ctx, "register")) {
						throw new PluginRouteError("RATE_LIMITED", "Too many submissions", 429);
					}
					const entry = await retryOnSlugConflict(() => ctx.content!.create!("members", { ...parsed.data, registration_status: "pending" }));
					return { ok: true, id: entry.id };
				},
			},
			contact: {
				public: true,
				handler: async (ctx) => {
					const parsed = contactSchema.safeParse(ctx.input);
					if (!parsed.success) {
						throw PluginRouteError.badRequest("VALIDATION_FAILED", parsed.error.issues.map((i) => i.path.join(".")));
					}
					const { website, ...input } = parsed.data;
					if (website) {
						return { ok: true };
					}
					if (await limited(ctx, "contact")) {
						throw new PluginRouteError("RATE_LIMITED", "Too many submissions", 429);
					}
					const { name, ...fields } = input;
					await retryOnSlugConflict(() => ctx.content!.create!("contact_messages", { title: name, ...fields }));
					if (options.contactTo && ctx.email) {
						try {
							await ctx.email.send({ to: options.contactTo, ...contactEmail(input, options.siteName ?? ctx.site.name) });
						} catch (err) {
							ctx.log.warn("[site-forms] contact notification failed", { error: String(err) });
						}
					}
					return { ok: true };
				},
			},
		},
	});
}

export default createPlugin;
