import { describe, expect, it } from "vitest";
import { isLocalUrl, parseDevStatus } from "./dev-server.ts";

describe("parseDevStatus", () => {
	it("reads the URL from a running server's status line", () => {
		const out = '{"message":"Dev server running at http://localhost:4322 (pid 37230, uptime 12s, background)"}';
		expect(parseDevStatus(out)).toBe("http://localhost:4322");
	});

	it("returns null when nothing is running", () => {
		expect(parseDevStatus('{"message":"No dev server is running."}')).toBeNull();
	});
});

describe("isLocalUrl", () => {
	it("tells local from remote", () => {
		expect(isLocalUrl("http://localhost:4321")).toBe(true);
		expect(isLocalUrl("http://127.0.0.1:4321/")).toBe(true);
		expect(isLocalUrl("https://example.org")).toBe(false);
	});
});
