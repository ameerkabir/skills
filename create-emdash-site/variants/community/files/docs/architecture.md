# %%SITE_NAME_EN%% — architecture

EmDash %%EMDASH_VERSION%% on Astro, deployed to Cloudflare Workers (D1 database `DB`, R2 bucket `MEDIA`, Email Sending binding `EMAIL`). Production: https://%%DOMAIN%%

## Request flow

1. `src/middleware.ts` resolves the locale from the first path segment, sets `Astro.locals.locale`, and rewrites `/ar/*` to the unprefixed page.
2. Pages under `src/pages/` query EmDash with that locale and render inside `src/layouts/Base.astro` (sets `lang`/`dir`, menus, language switcher).
3. Forms POST to `/_emdash/api/plugins/site-forms/{register,contact}`.

## Content model (`seed/seed.json`)

| Collection | Purpose |
| --- | --- |
| `homepage` | One entry per locale (slug `home`): hero, intro cards, CTA |
| `pages` | Static pages such as `/about` |
| `services` | Cards on `/services`, ordered by `sort_order` |
| `posts` | News (`/posts`), with `category` and `tag` taxonomies |
| `ui_strings` | Translatable microcopy keyed by `key` |
| `members` | Registrations from `/register` (admin-only) |
| `contact_messages` | Submissions from `/contact` (admin-only) |

## People

- **EmDash users**: staff who sign in to the admin by passkey or magic link. Invite them from Users; keep them at Contributor or above.
- **Members**: records in `members`, reviewed by staff via `registration_status`. They have no login.

## Config and secrets

| Name | Where | Purpose |
| --- | --- | --- |
| `EMDASH_ENCRYPTION_KEY` | `wrangler secret put` / `.env` | Encrypts plugin secrets; back it up |
| `EMDASH_SITE_URL` | wrangler `vars` | Public origin used in auth emails |
| `EMDASH_TOKEN` | GitHub secret | CI schema/content sync (needs schema + content scopes) |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub secrets | CI deploy |

## Gotchas

See the EmDash notes in `AGENTS.md`. Key ones: boolean fields come back as `0/1` (coerce with `!!`); `select` fields aren't creatable by `sync-schema.mjs` (add them in the admin); seed edits don't migrate a live DB.
