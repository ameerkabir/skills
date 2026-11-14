/** Form fields → JSON body: trims strings and drops empty optional values. */
export function formPayload(entries: Iterable<[string, FormDataEntryValue]>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of entries) {
		if (typeof value === "string" && value.trim() !== "") {
			out[key] = value.trim();
		}
	}
	return out;
}

export type SubmitOutcome = "ok" | "rate_limited" | "error";

export function submitOutcome(status: number): SubmitOutcome {
	if (status >= 200 && status < 300) {
		return "ok";
	}
	return status === 429 ? "rate_limited" : "error";
}
