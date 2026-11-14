import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEMBER_ADMIN_FIELDS, MEMBER_FIELDS, buildMemberSchema, toSeedFieldType } from "./member-fields";

const seed = JSON.parse(readFileSync(new URL("../../../seed/seed.json", import.meta.url), "utf8"));
const membersCollection = seed.collections.find((c: { slug: string }) => c.slug === "members");

describe("MEMBER_FIELDS vs seed.json", () => {
	it("declares every form field in the members collection with the matching type", () => {
		const seedFields = new Map<string, { type: string }>(
			membersCollection.fields.map((f: { slug: string; type: string }) => [f.slug, f]),
		);
		for (const field of MEMBER_FIELDS) {
			expect(seedFields.get(field.slug)?.type, field.slug).toBe(toSeedFieldType(field.type));
		}
	});

	it("has no seed fields beyond the form fields and admin-only fields", () => {
		const known = new Set<string>([...MEMBER_FIELDS.map((f) => f.slug), ...MEMBER_ADMIN_FIELDS]);
		const extra = membersCollection.fields.map((f: { slug: string }) => f.slug).filter((s: string) => !known.has(s));
		expect(extra).toEqual([]);
	});

	it("keeps select options in sync", () => {
		for (const field of MEMBER_FIELDS.filter((f) => f.type === "select")) {
			const seedField = membersCollection.fields.find((f: { slug: string }) => f.slug === field.slug);
			expect(seedField.validation.options).toEqual(field.options?.map((o) => o.value));
		}
	});
});

describe("buildMemberSchema", () => {
	const schema = buildMemberSchema();
	const valid = { title: "Amina Yusuf", phone: "07700900000", city: "Leeds" };

	it("accepts the required fields alone", () => {
		expect(schema.safeParse(valid).success).toBe(true);
	});

	it("rejects a missing required field", () => {
		expect(schema.safeParse({ ...valid, title: "" }).success).toBe(false);
	});

	it("treats empty optional strings as absent", () => {
		const result = schema.safeParse({ ...valid, email: "" });
		expect(result.success && result.data.email).toBeUndefined();
	});

	it("rejects a select value outside the options", () => {
		expect(schema.safeParse({ ...valid, gender: "other" }).success).toBe(false);
	});

	it("normalises a date input to an ISO datetime", () => {
		const result = schema.safeParse({ ...valid, date_of_birth: "1990-02-01" });
		expect(result.success && result.data.date_of_birth).toBe("1990-02-01T00:00:00.000Z");
	});

	it("rejects a malformed date", () => {
		expect(schema.safeParse({ ...valid, date_of_birth: "01/02/1990" }).success).toBe(false);
	});

	it("strips unknown keys such as registration_status", () => {
		const result = schema.safeParse({ ...valid, registration_status: "approved" });
		expect(result.success && "registration_status" in result.data).toBe(false);
	});
});
