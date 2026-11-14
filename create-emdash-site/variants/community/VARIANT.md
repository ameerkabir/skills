# Community variant

A bilingual community-organisation site: hero home page, about, services, news, contact form, and a members registration form. Baseline: written against EmDash **1.5** / Astro 7 on the `cloudflare:starter` scaffold.

## Brief tokens

`.emdash/site-brief.json` → `tokens`. Every key below needs a value before `apply-overlay.mjs` will run.

| Token | Example |
| --- | --- |
| `SITE_NAME_EN` / `SITE_NAME_AR` | `Leeds Somali Community` / `الجالية الصومالية في ليدز` |
| `TAGLINE_EN` / `TAGLINE_AR` | one line each |
| `DOMAIN` | `example.org` (no scheme) |
| `ACCENT` | `#0f766e` |
| `EMDASH_VERSION` | the installed `emdash` version, e.g. `1.5.0` |

The rest of the brief (non-token) records: `projectName`, `pages` (the default set below plus extras), `memberFields` (slugs added or removed from the default list), `emailFrom`, `contactTo`, `github: { repo, visibility }`.

## Default pages

The overlay ships all of these pages, tested together. Adapt them to the brief; don't rewrite them.

| Page | Route | Source |
| --- | --- | --- |
| Home | `/` | `homepage` entry `home`: hero (kicker, heading, body, `hero_image`), 3 intro cards, latest 3 `posts`, CTA → `/register` |
| About | `/about` | `pages` via the scaffold's `[slug].astro` |
| Services | `/services` | `services` ordered by `sort_order`, as `.card-grid` cards |
| News | `/posts`, `/posts/[slug]` | `posts`; category/tag archives from the scaffold |
| Contact | `/contact` | form → `site-forms/contact` |
| Join | `/register`, `/register/success` | form rendered from `MEMBER_FIELDS` → `site-forms/register` |
| 404 | `/404` | `404.*` ui_strings, link home |

To add an extra page from the brief:
- If it's static, add a `pages` entry served by `[slug].astro`. Seed it in en + ar, add it to both locales of the `primary` menu and to `PAGES` in `tests/acceptance.ts`, and you're done.
- If it needs structured content, give it its own collection and page file, following `services.astro`.

To drop a page, remove all of these:
- its route file
- its collection and its seed content
- its menu items, in both locales
- its `ui_strings` keys
- its `PAGES` entry in `tests/acceptance.ts`, and any e2e test that visits it

## Config edits (scaffold files, edit in place)

The overlay doesn't replace these because the scaffold's versions move with each EmDash release.

- **`astro.config.mjs`**
  - `i18n: { defaultLocale: DEFAULT_LOCALE, locales: [...SUPPORTED_LOCALES], routing: "manual", fallback: { ar: "en" } }`, imported from `./src/utils/locales.ts`.
  - `fonts`: two `fontProviders.google()` entries bound to `--font-body` (e.g. Inter) and `--font-arabic` (e.g. Noto Sans Arabic, `subsets: ["arabic"]`).
  - `emdash({ ..., plugins: [cloudflareEmail({ from: { email: emailFrom, name: SITE_NAME_EN } }), siteFormsPlugin({ contactTo, siteName: SITE_NAME_EN, rateLimit: process.env.NODE_ENV === "production" })] })`, importing `cloudflareEmail` from `@emdash-cms/cloudflare/plugins` and `siteFormsPlugin` from `site-forms`.
- **`wrangler.jsonc`**
  - `name` = projectName, and `d1_databases[0].database_name` = projectName.
  - `r2_buckets[0].bucket_name` = `<projectName>-media`.
  - `send_email: [{ name: "EMAIL" }]`.
  - `vars: { EMDASH_SITE_URL: "https://<DOMAIN>" }`.
  - `routes: [{ pattern: DOMAIN, custom_domain: true }]`.
- **`package.json`**
  - `name` = projectName, `emdash.label` = SITE_NAME_EN.
  - Dependencies: add `"site-forms": "workspace:*"` and `zod`.
  - Dev dependencies: add `vitest`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-astro`, `astro-eslint-parser`, `@playwright/test`.
  - Scripts: `lint` (`eslint .`), `lint:fix`, `test` (`vitest run`), `sync-schema`, `dev:up` (`node scripts/dev-up.ts`), `smoke` (`node scripts/smoke.ts`), `test:e2e` (`playwright test`).
- **`tsconfig.json`**: add `"tests"`, `"scripts/**/*.ts"` and `"playwright.config.ts"` to `include`.
- **`.gitignore`**: add `test-results/` and `playwright-report/`.
- **`pnpm-workspace.yaml`**: add `packages: ["plugins/*"]`.
- **Scaffold pages**: replace `resolveStarterSiteIdentity` with `resolveSiteIdentity` (from the overlay's `src/utils/site-identity.ts`) everywhere.

## Page conventions

When you add or change a page, keep these. Every page:
1. Reads `const locale = Astro.locals.locale` and `const t = await getUiStrings(locale)`.
2. Passes `locale` to every `getEmDashCollection` / `getEmDashEntry` / `getMenu` call.
3. Wraps every internal href in `localizedHref(locale, path)`.
4. Calls `Astro.cache.set(cacheHint)` when it queried content (`if (Astro.cache?.enabled)`).
5. Renders inside `Base`, passing `content={{ collection, id: entry.data.id, slug }}` and `routePrefix` on content pages so the language switcher targets the translation.
6. Reads text as `t["key"] ?? "English fallback"`; every new key gets an en + ar `ui_strings` seed pair.

Forms are a `<form data-endpoint=...>` with `data-msg-*` attributes. `src/scripts/form-submit.ts` posts the form as JSON and shows the matching notice; a `429` maps to `form.rate_limited`. Submissions land as **draft** entries, which staff review in the admin.

## Members form

`plugins/site-forms/src/member-fields.ts` is the single source of truth: labels (en/ar), types, required flags, select options. Apply the brief's `memberFields` changes there **and** in the `members` collection in `seed/seed.json` together. `plugins/site-forms/src/member-fields.test.ts` goes red on any drift. The register page maps over `MEMBER_FIELDS` (imported from `site-forms/member-fields`) to render inputs, using `label[locale]` and `dir`.

## Acceptance

`tests/acceptance.ts` is the single source of truth: `PAGES`, the form endpoints and the sample submissions. Two TypeScript runners read it (Node runs `.ts` directly):

- **`pnpm smoke [url]`** (`scripts/smoke.ts`): every `PAGES` path in every locale returns 200 with the right `<html lang dir>`; an unknown path 404s in the right locale; each form accepts valid input (200) and rejects invalid input (400). Against localhost it submits the forms; against any other URL it is read-only unless given `--write`. CI runs it on the dev server, and read-only on production after each deploy.
- **`pnpm test:e2e`** (Playwright, desktop + mobile): contact notice, register → success page in both locales, browser validation, hero CTA, language switcher round trip, `/ar` links keep their prefix, every menu link resolves.

Test submissions are titled `[test] …`; delete them in the admin. Staff checks the drafts in the admin (Members, Contact messages) by hand once.
