---
name: create-emdash-site
description: Scaffold a new EmDash CMS site on the latest release from a variant (community: bilingual en/ar home, about, services, news, contact, member registration), then set up its GitHub repo, CI/CD and project board.
disable-model-invocation: true
---

# Create an EmDash site

You build a new site in five moves: interview → scaffold → overlay → adapt → ship. A **variant** is a folder under `variants/` with a `VARIANT.md` (its brief tokens, pages, config edits and acceptance) and a `files/` overlay. This skill's own directory is `SKILL_DIR` below.

Variants: `community`. When the user asks for something no variant covers, start from the nearest one and say which.

## 1. Interview

Read `SKILL_DIR/variants/<variant>/VARIANT.md` first, then ask with AskUserQuestion. Offer defaults; batch up to four questions per call:

- variant, project directory/name (kebab-case: it becomes the Worker, D1 and repo name)
- organisation name and tagline, in English **and** Arabic
- production domain
- pages: the variant's default set; which to drop, which extras to add
- member form fields: keep the default list, plus additions and removals
- accent colour; sender email (on a domain onboarded for Cloudflare Email Sending); the address that receives contact-form mail
- GitHub repo name and visibility

**Done when** every token in VARIANT.md's table has a value. Write those values as `.emdash/site-brief.json` in the new project once it exists (shape: `variants/<variant>/brief.example.json`).

## 2. Scaffold on the latest EmDash

```bash
npm create emdash@latest <dir> -- --template cloudflare:starter --pm pnpm --yes
```

Record the installed `emdash` version from `<dir>/node_modules/emdash/package.json` as the `EMDASH_VERSION` token. If its major or minor is above VARIANT.md's baseline, `search_docs` each API the overlay leans on and note any breaking change before you continue:
- i18n routing
- native plugin `definePlugin` routes, `ctx.content.create` and `ctx.kv`
- `cloudflareEmail`
- the seed format

Then `git init` and commit the bare scaffold, so the overlay shows as one reviewable diff.

## 3. Apply the overlay

```bash
node SKILL_DIR/scripts/apply-overlay.mjs SKILL_DIR/variants/<variant> <dir>
```

It refuses to run while any token lacks a value. Then make every edit in VARIANT.md's **Config edits** section and run `pnpm install`.

**Done when** `grep -rn "%%" <dir> --exclude-dir=node_modules` prints nothing and `pnpm test` is green.

## 4. Adapt to the brief

Apply the brief's page and member-field changes, as VARIANT.md describes. Every new page follows its page conventions. Then bring the site up:

```bash
pnpm dev                                    # Astro 7 runs this as a daemon; `npx astro dev stop` to stop
curl -s "http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/"   # setup + sample content
npx emdash types
```

Restart the dev server after any change under `plugins/`: native plugins load once at startup.

**Done when** every route and POST in VARIANT.md's **Acceptance** list passes against the dev server, and `pnpm lint && pnpm typecheck && pnpm test && pnpm build` is **green**.

## 5. Ship to GitHub

Follow `references/github.md`: create the repo, push, create the project board with its setup issues, and print the secrets list. Everything Cloudflare-side (D1/R2 creation, secrets, first deploy, domain, email onboarding) goes on the board, with the commands from `references/cloudflare.md`, for the user to run. Their production account is theirs to touch.

**Done when** the push succeeded, and the board URL and the secrets list have been printed.

## Hand-off

Report back with:
- the local path and the repo URL
- the board URL
- the `EMDASH_VERSION`
- any deviation from the brief
- the first three board items

Pitfalls this skill has already paid for are in `references/gotchas.md`; read it when something behaves unexpectedly.
