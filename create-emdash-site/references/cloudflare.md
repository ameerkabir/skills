# Cloudflare: resources, secrets, first deploy

These go in board issues for the user to run. Fill in this site's names.

```bash
npx wrangler login
npx wrangler d1 create <projectName>                    # copy database_id into wrangler.jsonc d1_databases[0]
npx wrangler r2 bucket create <projectName>-media
npx wrangler secret put EMDASH_ENCRYPTION_KEY           # paste the value from .env; losing it makes plugin secrets unreadable
npx wrangler email sending enable <sender-domain>       # adds SPF/DKIM; the From address must be on this domain
pnpm run deploy                                         # astro build && wrangler deploy
```

After the first deploy, open `https://<DOMAIN>/_emdash/admin`, complete setup and register a passkey. Passkeys are bound to their domain, so a localhost passkey won't work in production.

- **Sessions** use the `SESSION` KV binding. The Cloudflare adapter adds it on build; deploy creates it.
- **Images** use the `IMAGES` binding, which the adapter enables for production.
- **Auth email links** use `EMDASH_SITE_URL` from `wrangler.jsonc` `vars`. If the domain changes, update the var or use Settings → General → Change domain.
- **Sandboxed (registry) plugins** need `worker_loaders` on a paid Workers plan. The variant uses only native plugins.

Schema changes after launch: edit `seed/seed.json`, push, and CI's `sync-schema.mjs` adds the missing collections and fields. `select` fields are skipped by the CLI, so add those in the admin.
- **`Can't infer zone from route ... [code: 10082]`** on deploy: the Worker uploaded, but the custom domain in `wrangler.jsonc` `routes` isn't a zone in this Cloudflare account. Either the domain is misspelt (check `DOMAIN` everywhere: `wrangler.jsonc`, `astro.config.mjs`, `ci.yml`), or its nameservers still point at the registrar. Add the site in the Cloudflare dashboard, switch the nameservers at the registrar, wait for the zone to be active, and redeploy.
