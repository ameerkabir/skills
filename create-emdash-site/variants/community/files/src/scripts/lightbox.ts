// Photo lightbox for event galleries. Thumbnails are `[data-lightbox-index]`
// buttons; the viewer is the `<dialog id="lightbox">` the page renders. The
// photo list comes from each thumbnail's own <img>, so no data is inlined.
const dialog = document.querySelector<HTMLDialogElement>("#lightbox");
const image = dialog?.querySelector<HTMLImageElement>("[data-lightbox-image]");
const caption = dialog?.querySelector<HTMLElement>("[data-lightbox-caption]");
const thumbs = [...document.querySelectorAll<HTMLButtonElement>("[data-lightbox-index]")].sort(
	(a, b) => Number(a.dataset.lightboxIndex) - Number(b.dataset.lightboxIndex),
);

if (dialog && image && caption && thumbs.length > 0) {
	let current = 0;

	const show = (index: number): void => {
		current = (index + thumbs.length) % thumbs.length;
		const thumb = thumbs[current];
		const full = thumb?.dataset.full ?? "";
		image.src = full;
		image.alt = thumb?.dataset.alt ?? "";
		caption.textContent = thumb?.dataset.caption ?? "";
		caption.hidden = !thumb?.dataset.caption;
	};

	for (const thumb of thumbs) {
		thumb.addEventListener("click", () => {
			show(Number(thumb.dataset.lightboxIndex));
			dialog.showModal();
		});
	}
	dialog.querySelector("[data-lightbox-close]")?.addEventListener("click", () => dialog.close());
	dialog.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => show(current - 1));
	dialog.querySelector("[data-lightbox-next]")?.addEventListener("click", () => show(current + 1));
	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	});
	dialog.addEventListener("keydown", (event) => {
		// Arrows follow reading direction in RTL, so "next" is the left arrow there.
		const rtl = getComputedStyle(dialog).direction === "rtl";
		if (event.key === "ArrowRight") {
			show(current + (rtl ? -1 : 1));
		} else if (event.key === "ArrowLeft") {
			show(current + (rtl ? 1 : -1));
		}
	});
}
