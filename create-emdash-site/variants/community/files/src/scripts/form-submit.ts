import { formPayload, submitOutcome } from "../utils/form-payload";

// Progressive enhancement for <form data-endpoint> forms: POST JSON, then
// either redirect (data-success-href) or show the matching data-msg-* notice.
for (const form of document.querySelectorAll<HTMLFormElement>("form[data-endpoint]")) {
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const notice = form.querySelector<HTMLElement>("[data-notice]");
		const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
		if (button) {
			button.disabled = true;
		}
		let outcome: "ok" | "rate_limited" | "error";
		try {
			const res = await fetch(form.dataset.endpoint!, {
				method: "POST",
				headers: { "content-type": "application/json", "x-emdash-request": "1" },
				body: JSON.stringify(formPayload(new FormData(form).entries())),
			});
			outcome = submitOutcome(res.status);
		} catch {
			outcome = "error";
		}
		if (outcome === "ok" && form.dataset.successHref) {
			window.location.href = form.dataset.successHref;
			return;
		}
		if (button) {
			button.disabled = false;
		}
		if (notice) {
			notice.hidden = false;
			notice.className = `notice notice--${outcome === "ok" ? "success" : "error"}`;
			notice.textContent = form.dataset[outcome === "ok" ? "msgOk" : outcome === "rate_limited" ? "msgRateLimited" : "msgError"] ?? "";
		}
		if (outcome === "ok") {
			form.reset();
		}
	});
}
