---
name: connect-domain
description: Connect a domain registered at Namecheap (or another registrar) to a Cloudflare Worker site by moving only its DNS to Cloudflare, keeping registration, billing and email where they are. Use when a site needs its custom domain, or a deploy fails with "Can't infer zone from route" (10082).
---

# Connect a domain to a Cloudflare Worker

The domain stays **registered** at the registrar (billing, renewal, mailbox). Only its **nameservers** move to Cloudflare, which is what Worker custom domains require. The risk in this move is silent breakage: an email record that didn't come across. So every step ends on a check, and the snapshot is the source of truth. `SKILL_DIR` is this skill's directory; the scripts run on Node 24 with no install.

Inputs: the domain, and the site's directory (with its `wrangler.jsonc`).

## 1. Preflight

```bash
dig +short NS <domain>      # empty → misspelt or unregistered: confirm the spelling with the user
dig +short DS <domain>      # non-empty → DNSSEC is on: the user turns it off at the registrar first
cf auth whoami              # not authenticated → ask the user to run `! cf auth login`
```

Install `cf` with `npm install --global cf` if it's missing. Wrangler's login can't create zones, so `cf` does the zone and DNS work, and wrangler keeps the deploy.

**Done when** the domain has nameservers, no DS record, and `cf` is authenticated on the account that owns the Worker.

## 2. Snapshot the current DNS

```bash
node SKILL_DIR/scripts/dns-snapshot.ts <domain> --out <site>/docs/dns-<domain>.json
```

DNS can't be listed, so the script probes the apex plus the usual web and mail hosts and classifies each record: `email` and `other` get copied; `web` (apex/`www`) is replaced by the Worker; `parking` is dropped. Show the user the printed table and ask them to compare it with the registrar's DNS page (Namecheap: **Domain List → Manage → Advanced DNS**). Re-run with `--extra host1,host2` for anything the probe missed. If a `web` record is a live site rather than parking, stop: the user decides what replaces it.

**Done when** the user has confirmed the snapshot matches the registrar's list. Commit the snapshot; it's the rollback reference.

## 3. Create the zone and copy the records

```bash
cf zones list --name <domain>                          # reuse an existing zone
cf zones create --name <domain> --account-id <id> --type full
node SKILL_DIR/scripts/dns-import.ts <snapshot> --dry-run
node SKILL_DIR/scripts/dns-import.ts <snapshot>
node SKILL_DIR/scripts/dns-compare.ts <snapshot>       # asks Cloudflare's assigned nameserver
```

Imports are DNS-only (never proxied) and skip records already in the zone, so re-running is safe. A MISS straight after an import is usually propagation inside Cloudflare: re-run the compare once before investigating.

**Done when** `dns-compare.ts` exits 0, and you have the two nameservers from `cf zones get -z <domain>` (`name_servers`).

## 4. Hand the nameservers to the user

The user switches the nameservers at the registrar; follow `references/registrars.md` for the exact clicks. Give them the two Cloudflare nameservers verbatim, and say plainly that registration, billing and the mailbox don't move.

**Done when** the user says they've saved the change.

## 5. Wait for the zone to go active

```bash
cf zone activate -z <domain>     # once: asks Cloudflare to re-check now (rate-limited)
cf zones get -z <domain>         # poll `status` until "active"
```

Poll every few minutes with Monitor rather than sleeping; most registrars hand over within an hour, `.uk` can take several. While pending, both sets of nameservers serve the same email records, so mail keeps flowing.

**Done when** `status` is `active` and `dig +short NS <domain> @1.1.1.1` returns the Cloudflare nameservers.

## 6. Attach the Worker

In `wrangler.jsonc`:
- `routes: [{ "pattern": "<domain>", "custom_domain": true }]`
- `"workers_dev": true` (wrangler turns workers.dev off once `routes` exist)
- the site's public URL variable (EmDash: `vars.EMDASH_SITE_URL`) = `https://<domain>`, and the CI `EMDASH_URL` to match

The custom domain refuses a hostname that already has records: delete any apex A/AAAA/CNAME left in the zone first. Then deploy (`pnpm run deploy`) and add the `www` redirect:

```bash
node SKILL_DIR/scripts/www-redirect.ts <domain>
cf zones settings edit always_use_https -z <domain> --body '{"value":"on"}'   # http:// → https://
```

**Done when** the deploy finishes without a `10082` or custom-domain error, and `curl -sI https://<domain>` returns 200.

## 7. Email sending (sites that send mail)

When the site sends from this domain through Cloudflare Email Sending, onboard the domain for sending (the `cloudflare-email-service` skill has the steps). Onboarding adds its own DNS records. Keep exactly **one** SPF TXT at the apex: merge any new `include:` into the existing record.

**Done when** onboarding shows verified and `dns-compare.ts <snapshot>` still exits 0 (it flags a second SPF record).

## 8. Verify end to end

```bash
node SKILL_DIR/scripts/dns-compare.ts <snapshot> --public    # email records via 1.1.1.1
curl -sI https://<domain> | head -1                          # 200
curl -sI https://www.<domain> | grep -i -E "^(HTTP|location)" # 301 → https://<domain>/
curl -sI http://<domain> | grep -i -E "^(HTTP|location)"      # 301 → https://<domain>/
```

Status `000` straight after activation means the edge certificate isn't issued yet (see gotchas): wait for it rather than changing anything.

**Done when** all four pass. Report: the zone ID, the nameservers, the record count copied, the live URL, and anything that still needs the user (DNSSEC re-enable, email onboarding, admin invites now that the site URL is live).

Rollback: set the registrar back to its own DNS (Namecheap: **BasicDNS**) and check its records against the snapshot. Cloudflare's zone can stay pending harmlessly or be deleted.

Pitfalls this skill has already hit are in `references/gotchas.md`; read it when a step fails.
