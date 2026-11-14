// Which local dev server belongs to *this* project. `astro dev status` is
// scoped to the project directory, so it can't confuse this site with
// another EmDash site already running on port 4321.
import { execFileSync } from "node:child_process";

/** The URL in `astro dev status` output, or null when no server is running. */
export function parseDevStatus(output: string): string | null {
	return output.match(/running at (https?:\/\/[^\s()"\\]+)/)?.[1]?.replace(/\/$/, "") ?? null;
}

export function projectDevUrl(): string | null {
	try {
		const out = execFileSync("npx", ["astro", "dev", "status"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
		return parseDevStatus(out);
	} catch {
		return null;
	}
}

export function isLocalUrl(url: string): boolean {
	return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
}

/**
 * The base URL to test: BASE_URL when set, else this project's dev server.
 * A local BASE_URL that isn't this project's server is refused, so test
 * submissions never land in another site's database.
 */
export function resolveBaseUrl(explicit = process.env.BASE_URL): string {
	const own = projectDevUrl();
	const base = (explicit ?? own)?.replace(/\/$/, "");
	if (!base) {
		throw new Error("No dev server is running for this project. Start one with `pnpm dev:up`.");
	}
	if (isLocalUrl(base) && base !== own) {
		throw new Error(
			`${base} is not this project's dev server (${own ?? "none running"}); another site may be on that port. Run \`pnpm dev:up\` and use the URL it prints.`,
		);
	}
	return base;
}
