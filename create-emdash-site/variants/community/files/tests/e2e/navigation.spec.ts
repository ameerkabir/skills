import { expect, test } from "@playwright/test";

async function openMenuIfCollapsed(page: import("@playwright/test").Page): Promise<void> {
	const toggle = page.locator(".nav-toggle");
	if (await toggle.isVisible()) {
		await toggle.click();
		await expect(page.locator("#site-menu")).toBeVisible();
	}
}

test("home page shows the hero and links to registration", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator(".hero h1")).toBeVisible();
	await expect(page.locator('.hero a[href^="/register"]')).toBeVisible();
});

// getRelativeLocaleUrl adds a trailing slash, hence the optional `/` in URL patterns.
test("language switcher moves between English and Arabic", async ({ page }) => {
	await page.goto("/about");
	await openMenuIfCollapsed(page);
	await page.locator(".lang-switcher").click();
	await expect(page).toHaveURL(/\/ar\/about\/?$/);
	await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

	await openMenuIfCollapsed(page);
	await page.locator(".lang-switcher").click();
	await expect(page).toHaveURL(/(?<!\/ar)\/about\/?$/);
	await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("internal links keep the Arabic prefix", async ({ page }) => {
	await page.goto("/ar");
	await openMenuIfCollapsed(page);
	const hrefs = await page.locator("#site-menu a.site-nav__link, #site-menu a.site-nav__cta").evaluateAll((links) =>
		links.map((a) => a.getAttribute("href") ?? ""),
	);
	expect(hrefs.length).toBeGreaterThan(0);
	for (const href of hrefs) {
		expect(href, href).toMatch(/^\/ar(\/|$)/);
	}
});

test("every primary menu link resolves", async ({ page, request }) => {
	await page.goto("/");
	const hrefs = await page.locator("#site-menu a").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
	for (const href of hrefs.filter((h) => h.startsWith("/"))) {
		expect((await request.get(href)).status(), href).toBe(200);
	}
});

test("footer carries the builder credit in each language", async ({ page }) => {
	await page.goto("/");
	const en = await page.locator(".site-footer__credit").textContent();
	await page.goto("/ar");
	const ar = await page.locator(".site-footer__credit").textContent();
	expect(en?.trim()).toBeTruthy();
	expect(ar?.trim()).toBeTruthy();
	expect(ar).not.toBe(en);
});
