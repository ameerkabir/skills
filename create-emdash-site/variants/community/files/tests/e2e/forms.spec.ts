import { expect, test } from "@playwright/test";
import { SAMPLE_CONTACT, SAMPLE_MEMBER } from "../acceptance.ts";

test("contact form sends a message and shows the success notice", async ({ page }) => {
	await page.goto("/contact");
	await page.locator('input[name="name"]').fill(SAMPLE_CONTACT.name);
	await page.locator('input[name="email"]').fill(SAMPLE_CONTACT.email);
	await page.locator('textarea[name="message"]').fill(SAMPLE_CONTACT.message);
	await page.locator('button[type="submit"]').click();
	await expect(page.locator("[data-notice]")).toHaveClass(/notice--success/);
});

test("register form creates a member and lands on the success page", async ({ page }) => {
	await page.goto("/register");
	await page.locator('input[name="title"]').fill(SAMPLE_MEMBER.title);
	await page.locator('input[name="phone"]').fill(SAMPLE_MEMBER.phone);
	await page.locator('input[name="city"]').fill(SAMPLE_MEMBER.city);
	await page.locator('input[name="date_of_birth"]').fill(SAMPLE_MEMBER.date_of_birth);
	await page.locator('button[type="submit"]').click();
	await expect(page).toHaveURL(/\/register\/success\/?$/);
});

test("Arabic register form is right-to-left and stays in Arabic after submit", async ({ page }) => {
	await page.goto("/ar/register");
	await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
	await page.locator('input[name="title"]').fill(SAMPLE_MEMBER.title);
	await page.locator('input[name="phone"]').fill(SAMPLE_MEMBER.phone);
	await page.locator('input[name="city"]').fill(SAMPLE_MEMBER.city);
	await page.locator('button[type="submit"]').click();
	await expect(page).toHaveURL(/\/ar\/register\/success\/?$/);
});

test("browser validation blocks an empty register submission", async ({ page }) => {
	await page.goto("/register");
	await page.locator('button[type="submit"]').click();
	await expect(page).toHaveURL(/\/register\/?$/);
	await expect(page.locator('input[name="title"]')).toHaveJSProperty("validity.valueMissing", true);
});
