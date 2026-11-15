# EmDash gotchas

Each one has cost real debugging time. Check the matching entry before you dig.

## Schema and seed
- **`title` is not automatic.** A collection without an explicit `title` field has no title column. Every collection in the seed declares one.
- **Seed edits don't migrate a live DB.** The seed applies once at setup. On an existing site, use `scripts/sync-schema.mjs` (CI) or the admin's Content Types.
- **`npx emdash seed` writes to `./data.db`**, a local SQLite file. On a D1 project that is a disconnected database. For a running site use the HTTP CLI instead (`emdash schema create|add-field`, `emdash content create`). Locally, `/_emdash/api/setup/dev-bypass` applies the bundled seed.
- **The CLI can't create `select` fields.** `sync-schema.mjs` skips them with a warning; add them in the admin.
- **Reference fields have no admin picker.** They render as a dead textbox. Use a `select` (fixed options) or a `repeater` instead.
- **`datetime` fields want full ISO.** `YYYY-MM-DD` from `<input type="date">` fails `VALIDATION_ERROR`; the member schema appends `T00:00:00.000Z`.

## Runtime values
- **Boolean fields come back as `0`/`1`**, not `true`/`false`. Never test with `=== true`; coerce with `!!`.
- **`ctx.content.create` auto-slugs from `title` and races.** Two same-name submissions at once throw `SLUG_CONFLICT` (500). The site-forms plugin wraps creates in `retryOnSlugConflict`.
- **Entries created by `ctx.content.create` are drafts.** That suits form submissions, which are reviewed in the admin and never rendered publicly.

## i18n and routing
- **Keep `routing: "manual"` plus the middleware rewrite.** Prefix-default strategies 404 the admin. Astro's default strategy needs real `src/pages/ar/` copies of every page. The rewrite serves `/ar/x` from `/x`.
- **List queries don't fall back to the default locale; single-entry queries do.** An untranslated list renders empty in Arabic, so seed both locales.
- **Fonts need `fontProviders.google()`, not a string, and a `<Font cssVariable=... />` in `<head>` for each font.**

- **`Astro.rewrite("/404")` drops the locale.** The rewrite re-runs the middleware on `/404`, so an Arabic miss renders the English 404. Rewrite to `localizedHref(locale, "/404")`.
- **`getRelativeLocaleUrl` adds a trailing slash** (`/register/`). Match URLs with `\/?$` in tests, and `href^=` in selectors.

## Auth and people
- **Subscriber can read all published content through the API.** `content:read` starts at the lowest role, so a Subscriber account could read `members`. Don't create sub-Contributor accounts on these sites. Members are records, not users.
- **The auth-email origin** comes from `siteUrl`, then `EMDASH_SITE_URL`, then Settings → General Site URL, then the origin recorded at setup. A stale value sends magic links to the wrong host.
- **The CI content token needs `content:read`/`content:write`.** A schema-only token fails `sync-content.mjs`.

## Dev loop
- **Astro 7 `pnpm dev` is a daemon.** Use `npx astro dev logs` and `npx astro dev stop`.
- **The forms rate-limit 5/hour per IP.** Test runs exceed that, so the plugin's `rateLimit` option is on only when `NODE_ENV` is `production`.
- **Native plugins load once.** Restart the dev server after editing `plugins/*`, or the old route code keeps running.
- **better-sqlite3 binding missing on a new Node major** (CLI commands touching `data.db`): run `npm run install` inside `node_modules/better-sqlite3`.

## Search engines and the API
- **A site created through the setup wizard starts in staging**: every page carries `<meta name="robots" content="noindex, nofollow">` until the staging setting is turned off. Google will not index it however long you wait. Check with `emdash-seo-launch`'s `seo-check`.
- **A collection without `urlPattern` is listed in the sitemap at `/<collection>/<slug>`.** For `pages` that is `/pages/about`, a 404. Set `/{slug}` (seed, or `PUT /_emdash/api/schema/collections/pages`).
- **The sitemap only includes collections with SEO enabled** (`hasSeo`) that are `routable`. A collection created by the CLI may lack it; `PUT .../collections/<slug>` with `{"hasSeo":true,"routable":true}`.
- **Content pages built the canonical without the locale prefix**, so `/ar/about` canonicalised to `/about` and Google was told to ignore the Arabic page. The overlay now passes `localizedHref(locale, path)` to `getSeoMeta`.
- **`EmDashHead` already emits the canonical.** A second `<link rel="canonical">` in the layout duplicates it.
- **Write calls need `X-EmDash-Request: 1`** even with a Bearer token, or they fail with `CSRF_REJECTED`. The sync scripts send it.
- **Token scopes.** CI needs schema read/write, content read/write and **menus manage** (the menu-link sync). Avoid the Admin scope.
- **Menus are database content.** A seed edit never reaches a live site; `sync-content.mjs` creates missing menu links, create-only.
- **A repeater's image sub-field stores the whole resolved image object**, with `meta.storageKey`, not a bare media id. `src/utils/media.ts` reads it defensively.
- **First `pnpm dev:up` can time out or exit** while Vite re-optimises dependencies. Stop and start it once before suspecting the code. Under 8 parallel Playwright workers the dev server can also make form tests flake; `--workers=1` or `2` is steadier (all pass serially).

