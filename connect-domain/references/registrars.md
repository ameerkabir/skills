# Changing nameservers at the registrar

The user does this in the registrar's dashboard. Changing nameservers is not a transfer: the registration, renewal, billing and any registrar mailbox stay put.

## Namecheap

1. **Domain List** → the domain → **Manage**.
2. **Nameservers**: switch "Namecheap BasicDNS" to **Custom DNS**.
3. Enter the two Cloudflare nameservers, one per row.
4. Click the green ✓ to save.

- Namecheap Private Email keeps working once its records are copied: MX `mx1`/`mx2.privateemail.com`, SPF `include:spf.privateemail.com`, `mail`/`autodiscover`/`autoconfig` CNAMEs, `_autodiscover._tcp` SRV, and the **DKIM TXT at `privateemail._domainkey`**. Only the DKIM record shows on Advanced DNS; the rest are implied by Private Email and don't appear there.
- Namecheap's parking page is an apex A record in `162.255.119.0/24` plus `www` → `parkingpage.namecheap.com`. Both are dropped. Namecheap's "URL Redirect" records also resolve to that range, so recreate any wanted redirect as a Cloudflare redirect rule.
- DNSSEC, if on: **Advanced DNS → DNSSEC** off, before the switch.
- Handover usually takes minutes to an hour; `.uk` can take several hours.

## Other registrars

The setting is usually under the domain's **Nameservers** or **DNS** section, choosing "custom" or "use my own nameservers". Common in the UK: GoDaddy (**Domain → DNS → Nameservers → Change → I'll use my own**), 123-reg (**Manage → Advanced domain settings → Manage nameservers**), IONOS (**Domains → ⚙ → Nameservers → Use custom nameservers**). Turn DNSSEC off first wherever it's on.
