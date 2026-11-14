import { describe, expect, it, vi } from "vitest";
import { retryOnSlugConflict } from "./slug-retry";

const conflict = Object.assign(new Error("Slug already exists"), { code: "SLUG_CONFLICT" });

describe("retryOnSlugConflict", () => {
	it("retries a slug conflict and returns the later success", async () => {
		const create = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValueOnce("ok");
		await expect(retryOnSlugConflict(create)).resolves.toBe("ok");
		expect(create).toHaveBeenCalledTimes(2);
	});

	it("gives up after the attempt limit", async () => {
		const create = vi.fn().mockRejectedValue(conflict);
		await expect(retryOnSlugConflict(create, 3)).rejects.toBe(conflict);
		expect(create).toHaveBeenCalledTimes(3);
	});

	it("rethrows other errors immediately", async () => {
		const other = Object.assign(new Error("boom"), { code: "VALIDATION_ERROR" });
		const create = vi.fn().mockRejectedValue(other);
		await expect(retryOnSlugConflict(create)).rejects.toBe(other);
		expect(create).toHaveBeenCalledTimes(1);
	});
});
