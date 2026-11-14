import { describe, expect, it, vi } from "vitest";

const getEmDashCollection = vi.fn();
vi.mock("emdash", () => ({ getEmDashCollection: (...args: unknown[]) => getEmDashCollection(...args) }));

const { getUiStrings } = await import("./ui-strings");

describe("getUiStrings", () => {
	it("maps key/text entries into a Record", async () => {
		getEmDashCollection.mockResolvedValue({
			entries: [
				{ data: { key: "register.submit", text: "Submit registration" } },
				{ data: { key: "members.title", text: "Members" } },
			],
		});

		const t = await getUiStrings("en");
		expect(t).toEqual({
			"register.submit": "Submit registration",
			"members.title": "Members",
		});
	});

	it("filters out entries with a non-string key or text", async () => {
		getEmDashCollection.mockResolvedValue({
			entries: [
				{ data: { key: "ok.key", text: "ok text" } },
				{ data: { key: 42, text: "bad key" } },
				{ data: { key: "bad.text", text: null } },
			],
		});

		const t = await getUiStrings("en");
		expect(t).toEqual({ "ok.key": "ok text" });
	});

	it("passes the locale through to the collection query", async () => {
		getEmDashCollection.mockResolvedValue({ entries: [] });
		await getUiStrings("ar");
		expect(getEmDashCollection).toHaveBeenCalledWith("ui_strings", { locale: "ar" });
	});
});
