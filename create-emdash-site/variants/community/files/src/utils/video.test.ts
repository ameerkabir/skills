import { describe, expect, it } from "vitest";
import { extractVideos, parseVideoUrl } from "./video";

describe("parseVideoUrl", () => {
	it("rebuilds YouTube links as privacy-friendly embeds", () => {
		const want = { kind: "iframe", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" };
		expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5")).toEqual(want);
		expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual(want);
		expect(parseVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toEqual(want);
		expect(parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toEqual(want);
	});

	it("rebuilds Vimeo links", () => {
		const want = { kind: "iframe", src: "https://player.vimeo.com/video/123456" };
		expect(parseVideoUrl("https://vimeo.com/123456")).toEqual(want);
		expect(parseVideoUrl("https://player.vimeo.com/video/123456?h=abc")).toEqual(want);
	});

	it("uses <video> for direct files and a link for other https URLs", () => {
		expect(parseVideoUrl("https://cdn.example.org/a.mp4")).toEqual({ kind: "file", src: "https://cdn.example.org/a.mp4" });
		expect(parseVideoUrl("https://example.org/page")).toEqual({ kind: "link", href: "https://example.org/page" });
	});

	it("never iframes an arbitrary host and rejects unsafe input", () => {
		expect(parseVideoUrl("https://evil.example/embed/dQw4w9WgXcQ")).toEqual({ kind: "link", href: "https://evil.example/embed/dQw4w9WgXcQ" });
		expect(parseVideoUrl("https://www.youtube.com/watch?v=short")).toEqual({ kind: "link", href: "https://www.youtube.com/watch?v=short" });
		for (const bad of ["javascript:alert(1)", "http://youtu.be/dQw4w9WgXcQ", "data:text/html,x", "", "not a url", 5, undefined]) {
			expect(parseVideoUrl(bad)).toBeNull();
		}
	});
});

describe("extractVideos", () => {
	it("keeps valid rows with trimmed titles and skips the rest", () => {
		const out = extractVideos([{ url: "https://youtu.be/dQw4w9WgXcQ", title: " Highlights " }, { url: "nope" }, null]);
		expect(out).toHaveLength(1);
		expect(out[0]?.title).toBe("Highlights");
		expect(extractVideos(undefined)).toEqual([]);
	});
});
