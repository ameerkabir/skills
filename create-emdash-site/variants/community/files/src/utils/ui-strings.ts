import { getEmDashCollection } from "emdash";

/**
 * All site-wide UI microcopy (form labels, gate messages, button text, error
 * copy) lives in the `ui_strings` collection as translatable key→text rows,
 * rather than hardcoded per-locale ternaries scattered across pages. Call
 * once per page/request and look up keys with a literal fallback, e.g.
 * `t["register.submit"] ?? "Submit registration"` — a missing CMS row
 * degrades to the fallback instead of rendering blank.
 */
export async function getUiStrings(
	locale?: string,
): Promise<Record<string, string>> {
	const { entries } = await getEmDashCollection("ui_strings", { locale });
	return Object.fromEntries(
		entries
			.filter((e) => typeof e.data.key === "string" && typeof e.data.text === "string")
			.map((e) => [e.data.key as string, e.data.text as string]),
	);
}
