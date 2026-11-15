// A `repeater` field's `image` sub-field stores the full resolved image object
// the admin's media picker produces (same shape as a top-level `image` field),
// not a bare media id. These helpers turn gallery rows into renderable photos
// and group them into albums. Malformed rows are dropped, never thrown on, so
// one bad row can't take down a page.

export interface GalleryPhoto {
	src: string;
	alt: string;
	caption: string;
	/** Album name, or "" when the row has none. */
	album: string;
	/** Position across the whole gallery; the lightbox uses it. */
	index: number;
}

export interface Album {
	/** "" for photos that were not given an album name. */
	name: string;
	photos: GalleryPhoto[];
}

interface StoredPhoto {
	id?: unknown;
	alt?: unknown;
	meta?: { storageKey?: unknown };
}

function text(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

export function extractGalleryPhotos(gallery: unknown): GalleryPhoto[] {
	if (!Array.isArray(gallery)) {
		return [];
	}
	const photos: GalleryPhoto[] = [];
	for (const row of gallery) {
		if (!row || typeof row !== "object") {
			continue;
		}
		const { photo, caption, album } = row as { photo?: unknown; caption?: unknown; album?: unknown };
		if (!photo || typeof photo !== "object") {
			continue;
		}
		const { id, alt, meta } = photo as StoredPhoto;
		const storageKey = meta?.storageKey;
		if (typeof id !== "string" || typeof storageKey !== "string" || !storageKey) {
			continue;
		}
		const cap = text(caption);
		photos.push({
			src: `/_emdash/api/media/file/${encodeURIComponent(storageKey)}`,
			alt: cap || text(alt),
			caption: cap,
			album: text(album),
			index: photos.length,
		});
	}
	return photos;
}

/** Group photos by album name, keeping the order albums first appear in. */
export function groupAlbums(photos: GalleryPhoto[]): Album[] {
	const albums = new Map<string, Album>();
	for (const photo of photos) {
		const existing = albums.get(photo.album);
		if (existing) {
			existing.photos.push(photo);
		} else {
			albums.set(photo.album, { name: photo.album, photos: [photo] });
		}
	}
	return [...albums.values()];
}
