import { describe, expect, it } from "vitest";
import { MAX_PER_WINDOW, WINDOW_MS, allowSubmission, hashIp, nextRateState } from "./rate-limit";

describe("nextRateState", () => {
	it("starts a window on first use", () => {
		expect(nextRateState(null, 1000)).toEqual({ count: 1, windowStart: 1000 });
	});

	it("blocks once the window is full", () => {
		expect(nextRateState({ count: MAX_PER_WINDOW, windowStart: 0 }, 10)).toBeNull();
	});

	it("resets after the window expires", () => {
		expect(nextRateState({ count: MAX_PER_WINDOW, windowStart: 0 }, WINDOW_MS)).toEqual({ count: 1, windowStart: WINDOW_MS });
	});
});

describe("allowSubmission", () => {
	it("stores only a hashed key and blocks the sixth call", async () => {
		const store = new Map<string, unknown>();
		const kv = {
			get: async <T>(k: string) => (store.get(k) as T) ?? null,
			set: async (k: string, v: unknown) => {
				store.set(k, v);
			},
		};
		for (let i = 0; i < MAX_PER_WINDOW; i++) {
			expect(await allowSubmission(kv, "contact", "1.2.3.4", 0)).toBe(true);
		}
		expect(await allowSubmission(kv, "contact", "1.2.3.4", 0)).toBe(false);
		expect([...store.keys()]).toEqual([`rate:contact:${await hashIp("1.2.3.4")}`]);
	});
});
