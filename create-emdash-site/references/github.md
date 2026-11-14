# GitHub: repo, CI, project board

Run from the new site's directory. `gh auth status` must show a logged-in account with the `repo` and `project` scopes. If `project` is missing, ask the user to run `! gh auth refresh -s project`.

## Repo and push

```bash
git add -A && git commit -m "feat: scaffold <SITE_NAME_EN> from create-emdash-site (<variant>)"
gh repo create <owner>/<repo> --<visibility> --source . --push
```

The overlay already ships `.github/workflows/ci.yml`:
- **ci job:** runs lint, typecheck and test on every push and PR. It goes green on the first push.
- **acceptance job:** starts the dev server on a fresh local D1 (`pnpm dev:up`), then runs `pnpm smoke` and `pnpm test:e2e`. On failure it prints the dev logs and uploads Playwright traces.
- **deploy job:** needs both. It syncs schema and content, deploys, then runs a read-only `pnpm smoke` against production. It is gated on the repo variable `DEPLOY_ENABLED == "true"`, so it stays skipped until the Cloudflare side exists.

Confirm the first run with `gh run watch`.

## Project board

```bash
gh project create --owner <owner> --title "<SITE_NAME_EN> launch" --format json   # note .number and .url
gh project link <number> --owner <owner> --repo <owner>/<repo>
```

Create one issue per item below with `gh issue create --repo <owner>/<repo> --title ... --body ...`, then add each issue to the board with `gh project item-add <number> --owner <owner> --url <issue-url>`. Each body contains the exact commands from `cloudflare.md`, with this site's values filled in.

1. Create the D1 database and R2 bucket, and put the D1 `database_id` into `wrangler.jsonc`.
2. Set Worker secrets (`EMDASH_ENCRYPTION_KEY`), then do the first manual deploy and setup at `https://<DOMAIN>/_emdash/admin`.
3. Onboard `<emailFrom>`'s domain for Cloudflare Email Sending, then send a test email from Settings → Email.
4. Point DNS / the custom domain at the Worker.
5. Create an EmDash API token (schema + content read/write scopes) and add the GitHub secrets: `EMDASH_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Then `gh variable set DEPLOY_ENABLED --body true`.
6. Replace the sample content: homepage hero image and text, About, Services, the first news post. Do this in both languages.
7. Invite staff as EmDash users (Contributor or above). Members never get accounts.

## Secrets list to print

| Secret / variable | Where | Source |
| --- | --- | --- |
| `EMDASH_TOKEN` | GitHub secret | Admin → Settings → API tokens (schema + content scopes) |
| `CLOUDFLARE_API_TOKEN` | GitHub secret | Cloudflare dashboard, "Edit Cloudflare Workers" template plus D1 edit |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub secret | `npx wrangler whoami` |
| `DEPLOY_ENABLED` | GitHub variable | `true` once items 1–5 are done |
| `EMDASH_ENCRYPTION_KEY` | Worker secret | value in the local `.env` (back it up) |
