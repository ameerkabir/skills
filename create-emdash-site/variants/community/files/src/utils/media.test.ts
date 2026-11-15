import { describe, expect, it } from "vitest";
import { extractGalleryPhotos, groupAlbums } from "./media";

const photo = (key: string, alt = "") => ({ id: `id-${key}`, alt, meta: { storageKey: key } });

describe("extractGalleryPhotos", () => {
	it("returns [] for non-arrays", () => {
		expect(extractGalleryPhotos(undefined)).toEqual([]);
		expect(extractGalleryPhotos("x")).toEqual([]);
	});

	it("drops malformed rows and numbers the rest", () => {
		const out = extractGalleryPhotos([
			{ photo: photo("a.jpg") },
			null,
			{ photo: {} },
			{ photo: { id: "x", meta: {} } },
			{ caption: "no photo" },
			{ photo: photo("b.jpg", "alt b"), caption: " Cap ", album: " Day 1 " },
		]);
		expect(out.map((p) => p.src)).toEqual(["/_emdash/api/media/file/a.jpg", "/_emdash/api/media/file/b.jpg"]);
		expect(out.map((p) => p.index)).toEqual([0, 1]);
		expect(out[1]).toMatchObject({ alt: "Cap", caption: "Cap", album: "Day 1" });
	});

	it("falls back to the photo's own alt text", () => {
		expect(extractGalleryPhotos([{ photo: photo("a.jpg", "from media") }])[0]?.alt).toBe("from media");
	});
});

describe("groupAlbums", () => {
	it("groups by album name in first-seen order, unnamed photos together", () => {
		const photos = extractGalleryPhotos([
			{ photo: photo("1"), album: "Food" },
			{ photo: photo("2") },
			{ photo: photo("3"), album: "Food" },
			{ photo: photo("4"), album: "Music" },
		]);
		const albums = groupAlbums(photos);
		expect(albums.map((a) => [a.name, a.photos.length])).toEqual([["Food", 2], ["", 1], ["Music", 1]]);
		expect(albums[0]?.photos.map((p) => p.index)).toEqual([0, 2]);
	});
});
