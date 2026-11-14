import { z } from "zod";

// Single source of truth for the members registration form. The register
// page renders inputs from MEMBER_FIELDS, the plugin validates submissions
// with buildMemberSchema(), and member-fields.test.ts fails if seed/seed.json's
// `members` collection drifts from this list. To add or drop a field, edit
// this array and the seed together.
//
// `title` is the member's full name: EmDash collections need an explicit
// `title` field, and the admin list shows it.

export type MemberFieldType = "string" | "text" | "email" | "tel" | "date" | "select";

export interface Localized {
	en: string;
	ar: string;
}

export interface MemberField {
	slug: string;
	type: MemberFieldType;
	required: boolean;
	label: Localized;
	options?: { value: string; label: Localized }[];
	/** Render the input right-to-left regardless of page locale (e.g. an Arabic-name field). */
	dir?: "rtl" | "ltr";
}

export const MEMBER_FIELDS: MemberField[] = [
	{ slug: "title", type: "string", required: true, label: { en: "Full name", ar: "الاسم الكامل" } },
	{ slug: "full_name_ar", type: "string", required: false, label: { en: "Full name (Arabic)", ar: "الاسم الكامل بالعربية" }, dir: "rtl" },
	{ slug: "email", type: "email", required: false, label: { en: "Email", ar: "البريد الإلكتروني" } },
	{ slug: "phone", type: "tel", required: true, label: { en: "Phone", ar: "رقم الهاتف" } },
	{ slug: "date_of_birth", type: "date", required: false, label: { en: "Date of birth", ar: "تاريخ الميلاد" } },
	{
		slug: "gender",
		type: "select",
		required: false,
		label: { en: "Gender", ar: "الجنس" },
		options: [
			{ value: "male", label: { en: "Male", ar: "ذكر" } },
			{ value: "female", label: { en: "Female", ar: "أنثى" } },
			{ value: "prefer_not_to_say", label: { en: "Prefer not to say", ar: "أفضل عدم الإجابة" } },
		],
	},
	{ slug: "city", type: "string", required: true, label: { en: "City", ar: "المدينة" } },
	{ slug: "address", type: "text", required: false, label: { en: "Address", ar: "العنوان" } },
];

/** Fields EmDash manages on every member row, never set from the public form. */
export const MEMBER_ADMIN_FIELDS = ["registration_status", "notes"] as const;

function fieldSchema(field: MemberField): z.ZodTypeAny {
	let base: z.ZodTypeAny;
	switch (field.type) {
		case "email":
			base = z.email().max(254);
			break;
		case "date":
			// <input type="date"> sends YYYY-MM-DD; EmDash datetime fields need full ISO.
			base = z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/, "date")
				.transform((v) => `${v}T00:00:00.000Z`);
			break;
		case "select": {
			const values = (field.options ?? []).map((o) => o.value);
			base = z.enum(values as [string, ...string[]]);
			break;
		}
		case "text":
			base = z.string().trim().max(2000);
			break;
		default:
			base = z.string().trim().max(200);
	}
	if (field.required) {
		return base instanceof z.ZodString ? base.min(1) : base;
	}
	return base.optional().or(z.literal("").transform(() => undefined));
}

export function buildMemberSchema(fields: MemberField[] = MEMBER_FIELDS) {
	return z.object(Object.fromEntries(fields.map((f) => [f.slug, fieldSchema(f)])));
}

/** The seed field `type` each form field type is stored as. */
export function toSeedFieldType(type: MemberFieldType): string {
	switch (type) {
		case "date":
			return "datetime";
		case "select":
			return "select";
		case "text":
			return "text";
		default:
			return "string";
	}
}
