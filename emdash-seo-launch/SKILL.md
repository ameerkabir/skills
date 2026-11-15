---
name: emdash-seo-launch
description: Take a deployed EmDash site live in search: find why Google isn't indexing it (noindex from staging, a wrong sitemap, bad canonicals), fix it, verify in Google Search Console and get pages indexed. Use when a user says Google isn't showing their site, after a first deploy of a create-emdash-site project, or to audit a live site's SEO.
---

# Take an EmDash site live in search

A site created through EmDash's setup wizard starts in **staging**: every page carries `noindex, nofollow`, so Google ignores it however long you wait. The rest of this skill is the sitemap, canonical and Search Console work that follows. `SKILL_DIR` is this skill's directory; the audit script needs only Node 20+, no install.

Inputs: the production URL (`https://<domain>`). Never ask the user to paste an API token into the chat: they type it into their own terminal (step 4).

## 1. Audit what a crawler sees

```bash
node SKILL_DIR/scripts/seo-check.mjs https://<domain> /about /services
```

It fetches as Googlebot and checks, for the home page, `/ar` and the extra paths: `noindex` (tag or `X-Robots-Tag`), exactly one canonical that points at the page itself, hreflang with a self entry and `x-default`, title, description, `og:image`, Organization data on the home page; then `robots.txt` and that **every sitemap URL returns 200**. `FAIL` lines block indexing; `WARN` lines are improvements.

**Done when** you have the list of FAIL/WARN lines and know which step below fixes each.

## 2. Turn staging off

`noindex` on every page means staging. The setting is `staging` in the site settings (EmDash's own docs call it "until it goes live"; an absent value means live). The user turns it off in the admin (`/_emdash/admin` → Settings: look for a staging / go-live control). If they cannot find it, the API equivalent is `POST /_emdash/api/settings` with `{"staging":false}` and a token with Settings Manage; the shape comes from EmDash's settings schema and was not exercised against a live site when this skill was written, so confirm with step 1.

**Done when** `seo-check` shows no `noindex` on the home page.

## 3. Make the sitemap list real URLs

EmDash builds sitemap URLs from each collection's `urlPattern`, and only for collections with SEO on and routable. A collection with no pattern is listed as `/<collection>/<slug>`: for `pages` that is `/pages/about`, a 404. Fix with the user's token (step 4):

```bash
curl -X PUT https://<domain>/_emdash/api/schema/collections/pages \
  -H "Authorization: Bearer $TOKEN" -H "X-EmDash-Request: 1" -H "Content-Type: application/json" \
  -d '{"urlPattern":"/{slug}"}'
```

Repeat for every public collection that is missing from `/sitemap.xml` or listed wrongly, with `{"hasSeo":true,"routable":true,"urlPattern":"/<route>/{slug}"}` (e.g. `/services/{slug}`). A collection appears only once it has a published entry. Without `X-EmDash-Request: 1` the call fails with `CSRF_REJECTED`. `create-emdash-site`'s `sync-schema.mjs` applies a seed `urlPattern` the same way in CI.

**Done when** `seo-check` reports every sitemap URL as 200 and no `/pages/<slug>` hint.

## 4. API token (for steps 3 and CI)

In the admin: **Settings → API tokens**. For one token that serves both the commands above and CI, tick **Schema Read, Schema Write, Content Read, Content Write, Menus Manage**; not Admin. Set a long expiry and note the date: CI fails silently when it lapses. The token is shown once.

The user loads it into their own shell without echoing it (zsh prints no prompt for a bare `read -s`):

```zsh
read -rs "TOKEN?Paste your token, then press Enter: "; echo
echo ${#TOKEN}      # a few dozen = stored; 0 = run the read line again
```

and stores it for CI with `echo "$TOKEN" | gh secret set EMDASH_TOKEN --repo <owner>/<repo>`, then `unset TOKEN`. Run all of this in one terminal window; the variable lives only there.

## 5. Google Search Console

The user does these; you give the steps and read back what they see.

1. Add a **Domain property** (`<domain>`) and verify it with the DNS TXT record Search Console shows (add it in the Cloudflare DNS tab). Confirm with `dig +short TXT <domain>`. Leave the record in place.
2. **Sitemaps**: submit `https://<domain>/sitemap.xml`, the sitemap *file*. A page URL typed there (e.g. `/ar`) just shows "1 error", and a stray trailing dot (`sitemap.xml.`) 404s. "Couldn't fetch" on a fresh submission is normal for a day or two; `Success` with a discovered-pages count is the goal. Failed entries are harmless; if there is no Remove option, leave them.
3. **URL inspection** (top search bar, not the sitemap box): paste each key page and click **Request indexing**: `/ar`, `/about`, `/services`, `/contact`. The home page often indexes first on its own.
4. Read the result honestly:
   - *URL is on Google / Page is indexed*: done.
   - *Discovered – currently not indexed*: Google has found it and not crawled it yet. Normal for days to a couple of weeks on a new site. Do not request again; re-inspect in a few days.
   - *Crawled – currently not indexed*: Google looked and declined, usually thin or placeholder content. Fix the content (step 6), then request once.

**Done when** the home page shows as indexed and the sitemap shows `Success`. Ranking for the organisation's own name takes longer and competes with other listings of that name; don't promise a date.

## 6. Content readiness

Thin pages are the usual reason Google holds pages back. Look for the overlay's placeholder text on the live site (`grep` the page HTML for the seed strings, e.g. "Describe this service", "in the admin") and list what to replace, in every language. Ask the user to add real content, and suggest a few links to the site from places that already rank (a social page, a fundraising page).

## 7. Re-check

A week later, re-run step 1 and ask the user for the Search Console **Indexing → Pages** report. Anything excluded has a reason; read it before changing anything.

Pitfalls found while writing this are in `create-emdash-site/references/gotchas.md` (Search engines and the API).
