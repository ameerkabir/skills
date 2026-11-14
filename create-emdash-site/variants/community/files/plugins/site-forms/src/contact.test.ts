import { describe, expect, it } from "vitest";
import { contactEmail, contactSchema } from "./contact";

describe("contactSchema", () => {
	it("requires name, email and message", () => {
		expect(contactSchema.safeParse({ name: "A", email: "a@example.com", message: "Hi" }).success).toBe(true);
		expect(contactSchema.safeParse({ name: "A", email: "nope", message: "Hi" }).success).toBe(false);
	});
});

describe("contactEmail", () => {
	it("sets reply-to and omits an empty phone line", () => {
		const mail = contactEmail({ name: "A", email: "a@example.com", phone: "", message: "Hi" }, "Site");
		expect(mail.replyTo).toBe("a@example.com");
		expect(mail.subject).toBe("[Site] Contact form: A");
		expect(mail.text).not.toContain("Phone:");
	});
});
