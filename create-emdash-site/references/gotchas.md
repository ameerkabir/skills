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
- **Entries created by `ctx.content.create` are drafts.** That suits form submissions, which are reviewed in the admin and never rendered publicly.

## i18n and routing
- **Keep `routing: "manual"` plus the middleware rewrite.** Prefix-default strategies 404 the admin. Astro's default strategy needs real `src/pages/ar/` copies of every page. The rewrite serves `/ar/x` from `/x`.
- **List queries don't fall back to the default locale; single-entry queries do.** An untranslated list renders empty in Arabic, so seed both locales.
- **Fonts need `fontProviders.google()`, not a string, and a `<Font cssVariable=... />` in `<head>` for each font.**

## Auth and people
- **Subscriber can read all published content through the API.** `content:read` starts at the lowest role, so a Subscriber account could read `members`. Don't create sub-Contributor accounts on these sites. Members are records, not users.
- **The auth-email origin** comes from `siteUrl`, then `EMDASH_SITE_URL`, then Settings → General Site URL, then the origin recorded at setup. A stale value sends magic links to the wrong host.
- **The CI content token needs `content:read`/`content:write`.** A schema-only token fails `sync-content.mjs`.

## Dev loop
- **Astro 7 `pnpm dev` is a daemon.** Use `npx astro dev logs` and `npx astro dev stop`.
- **Native plugins load once.** Restart the dev server after editing `plugins/*`, or the old route code keeps running.
- **better-sqlite3 binding missing on a new Node major** (CLI commands touching `data.db`): run `npm run install` inside `node_modules/better-sqlite3`.
