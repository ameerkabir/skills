# Gotchas

- **`Can't infer zone from route ... [code: 10082]`** on `wrangler deploy`: the custom domain isn't an active zone in this account. Either the domain is misspelt (check `wrangler.jsonc`, app config and CI for the same spelling) or the nameservers haven't moved yet. The Worker itself still uploaded.
- **"No URLs enabled" in the dashboard:** `routes` turns off `workers.dev` by default. Set `"workers_dev": true` to keep a public URL while the zone is pending.
- **Wrangler's OAuth login has no zone or DNS scope.** Use `cf` (its own login) for zones, DNS and rules.
- **`cf` resolves a domain name passed to `-z`**, so zone IDs are optional.
- **Mail records must be DNS-only.** A proxied MX target or mail CNAME breaks mail; the import never proxies.
- **One SPF record per name.** Email Sending onboarding, or a second mail provider, adds its own; merge the `include:`s into one TXT.
- **DNSSEC on at the registrar plus new nameservers = domain stops resolving.** `dns-snapshot.ts` refuses to run while a DS record exists.
- **The redirect phase PUT replaces every rule in the phase.** `www-redirect.ts` reads the existing rules and appends; don't PUT a single rule by hand.
- **A redirect rule only sees proxied traffic.** `www` needs a proxied record (the script adds `AAAA 100::`).
- **Custom domains refuse a hostname with existing records.** Delete leftover apex A/AAAA/CNAME records before the first deploy with `routes`.
- **Auth emails use the site URL.** For EmDash, `EMDASH_SITE_URL` set to the domain means magic links point there: hold staff invites until the domain is live.
