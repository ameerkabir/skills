import { z } from "zod";

export const contactSchema = z.object({
	name: z.string().trim().min(1).max(200),
	email: z.email().max(254),
	phone: z.string().trim().max(50).optional().or(z.literal("")),
	message: z.string().trim().min(1).max(5000),
	/** Honeypot: hidden in the form, so only bots fill it. */
	website: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export function contactEmail(input: ContactInput, siteName: string) {
	return {
		subject: `[${siteName}] Contact form: ${input.name}`,
		text: [
			`Name: ${input.name}`,
			`Email: ${input.email}`,
			input.phone ? `Phone: ${input.phone}` : null,
			"",
			input.message,
		]
			.filter((line) => line !== null)
			.join("\n"),
		replyTo: input.email,
	};
}
