import { describe, expect, it } from "vitest";
import { checkHtmlElement, localePath } from "./acceptance.ts";

describe("localePath", () => {
	it("leaves the default locale unprefixed and prefixes others", () => {
		expect(localePath("en", "/about")).toBe("/about");
		expect(localePath("ar", "/about")).toBe("/ar/about");
		expect(localePath("ar", "/")).toBe("/ar");
	});
});

describe("checkHtmlElement", () => {
	it("accepts matching lang and dir", () => {
		expect(checkHtmlElement('<html lang="ar" dir="rtl" data-x>', "ar")).toEqual([]);
		expect(checkHtmlElement('<html lang="en" dir="ltr">', "en")).toEqual([]);
	});

	it("reports a wrong direction and a missing element", () => {
		expect(checkHtmlElement('<html lang="ar" dir="ltr">', "ar")).toEqual(['dir="ltr", expected "rtl"']);
		expect(checkHtmlElement("<body></body>", "en")).toEqual(["no <html> element"]);
	});
});
