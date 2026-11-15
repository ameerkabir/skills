// Turns an editor-entered video URL into something safe to render. Only
// YouTube and Vimeo are ever put in an iframe (rebuilt as their embed URL, so
// the editor can paste a normal watch link); direct files use <video>; any
// other https URL becomes a plain link. Everything else is dropped.

export type VideoSource =
	| { kind: "iframe"; src: string }
	| { kind: "file"; src: string }
	| { kind: "link"; href: string };

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const YOUTUBE_ID = /^[\w-]{11}$/;
const VIMEO_ID = /^\d+$/;
const FILE_EXT = /\.(mp4|webm|ogg)$/i;

export function parseVideoUrl(input: unknown): VideoSource | null {
	if (typeof input !== "string") {
		return null;
	}
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return null;
	}
	if (url.protocol !== "https:") {
		return null;
	}
	const host = url.hostname.toLowerCase();
	const parts = url.pathname.split("/").filter(Boolean);

	let youtubeId: string | undefined;
	if (host === "youtu.be") {
		youtubeId = parts[0];
	} else if (YOUTUBE_HOSTS.has(host)) {
		youtubeId = url.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0] ?? "") ? parts[1] : undefined);
	}
	if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
		return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
	}

	if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
		const id = parts.find((part) => VIMEO_ID.test(part));
		if (id) {
			return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
		}
	}

	if (FILE_EXT.test(url.pathname)) {
		return { kind: "file", src: url.href };
	}
	return { kind: "link", href: url.href };
}

export interface VideoEntry {
	title: string;
	source: VideoSource;
}

/** Extract renderable videos from the `videos` repeater rows. */
export function extractVideos(videos: unknown): VideoEntry[] {
	if (!Array.isArray(videos)) {
		return [];
	}
	const entries: VideoEntry[] = [];
	for (const row of videos) {
		if (!row || typeof row !== "object") {
			continue;
		}
		const { url, title } = row as { url?: unknown; title?: unknown };
		const source = parseVideoUrl(url);
		if (source) {
			entries.push({ title: typeof title === "string" ? title.trim() : "", source });
		}
	}
	return entries;
}
