import { describe, expect, it } from "vitest";
import { formPayload, submitOutcome } from "./form-payload";

describe("formPayload", () => {
	it("trims values and drops empty ones", () => {
		expect(formPayload([["name", "  Amina "], ["phone", ""], ["email", "a@example.com"]])).toEqual({
			name: "Amina",
			email: "a@example.com",
		});
	});
});

describe("submitOutcome", () => {
	it("maps HTTP status to an outcome", () => {
		expect(submitOutcome(200)).toBe("ok");
		expect(submitOutcome(429)).toBe("rate_limited");
		expect(submitOutcome(400)).toBe("error");
	});
});
