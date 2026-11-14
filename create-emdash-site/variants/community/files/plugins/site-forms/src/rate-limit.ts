// Fixed-window rate limit for the public form routes, stored in plugin KV
// (no migration or extra table). Keyed by a SHA-256 of the client IP so KV
// never holds a raw address.

export const MAX_PER_WINDOW = 5;
export const WINDOW_MS = 60 * 60 * 1000;

export interface RateState {
	count: number;
	windowStart: number;
}

/** Pure transition: returns the next state, or null when the caller is over the limit. */
export function nextRateState(prev: RateState | null, now: number): RateState | null {
	if (!prev || now - prev.windowStart >= WINDOW_MS) {
		return { count: 1, windowStart: now };
	}
	if (prev.count >= MAX_PER_WINDOW) {
		return null;
	}
	return { count: prev.count + 1, windowStart: prev.windowStart };
}

export async function hashIp(ip: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Kv {
	get<T>(key: string): Promise<T | null>;
	set(key: string, value: unknown): Promise<void>;
}

export async function allowSubmission(kv: Kv, route: string, ip: string | null, now = Date.now()): Promise<boolean> {
	const key = `rate:${route}:${await hashIp(ip ?? "unknown")}`;
	const next = nextRateState(await kv.get<RateState>(key), now);
	if (!next) {
		return false;
	}
	await kv.set(key, next);
	return true;
}
