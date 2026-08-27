# Interventia Lead Engine V0

Interventia is a single-organisation lead marketplace for Pestora (pest
control), Drenora (drains), and Movira (moving). External brand landing pages
send leads to one Next.js app. Eligible partners see non-sensitive lead
details, purchase leads with a prepaid euro wallet, and reveal contact details
after purchase. Admins supervise partners, wallets, leads, and refunds.

V0 does not include public signup, SaaS multi-tenancy, CRM workflows, partner
self-management, Stripe Connect, bulk import/export, analytics dashboards,
an admin partner-creation wizard, or full photo Storage upload/rendering.
There is one app, database, auth system, wallet engine, and purchase engine;
brands and services are data rows rather than application forks.

## Local setup

Use Node.js 22, then start Supabase and apply the migrations and seed:

```bash
nvm use 22
supabase start
supabase db reset
cp .env.example .env.local
# Fill .env.local from `supabase status`.
npm install
node --env-file=.env.local scripts/seed-browser.mjs
npm run dev
```

Open <http://127.0.0.1:3000>. `supabase db reset` applies the SQL migrations
and seed. `scripts/seed-browser.mjs` is a local service-role helper that
creates/updates browser users, eligibility, wallet data, and sample leads. It
requires `SEED_ADMIN_PASSWORD` and `SEED_PARTNER_PASSWORD` (choose your own,
local only) and accepts optional `SEED_ADMIN_EMAIL` / `SEED_PARTNER_EMAIL`.
Never commit real credentials or secrets.

After the API tests, rerun `npm run check:test-residue` to verify that no
Phase 4 fixture remains and that `ABC Pest Control` is the only partner.

## Environment variables

Every variable in `.env.example` is listed here:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for browser, server, and scripts. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key used by browser and RLS-bound server clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for ingestion, Stripe crediting, and local seed/cleanup scripts. |
| `SUPABASE_DB_URL` | Postgres connection string for database integration tests. |
| `STRIPE_SECRET_KEY` | Server-only Stripe API key for Checkout sessions. |
| `STRIPE_WEBHOOK_SECRET` | Server-only secret for raw Stripe webhook signature verification. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public Stripe configuration for browser integrations. |
| `PESTORA_INGESTION_SECRET` | Server-only Pestora lead-ingestion secret. |
| `DRENORA_INGESTION_SECRET` | Server-only Drenora lead-ingestion secret. |
| `MOVIRA_INGESTION_SECRET` | Server-only Movira lead-ingestion secret. |
| `NEXT_PUBLIC_APP_URL` | Public base URL for Stripe Checkout redirects. |
| `SEED_ADMIN_PASSWORD` | Local-only password for the seeded admin browser user. |
| `SEED_PARTNER_PASSWORD` | Local-only password for the seeded partner browser user. |
| `SEED_ADMIN_EMAIL` | Optional override for the seeded admin email. |
| `SEED_PARTNER_EMAIL` | Optional override for the seeded partner email. |

The example file has names and one-line comments only. Tests use throwaway
in-process values and do not need live Stripe keys.

## Creating users and partners

There is no public signup or admin partner-creation wizard in V0. Use a
service-role SQL/script job. The local browser seed is a copy-pasteable
example:

```bash
node --env-file=.env.local scripts/seed-browser.mjs
```

Create an Auth user with the Supabase Auth admin API, then make it an admin:

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-uuid>';
```

For a partner, create an Auth user first (its profile is created by the
database trigger), then insert the partner and all eligibility rows. The
partner insert trigger creates its zero-balance wallet:

```sql
insert into public.partners
  (profile_id, company_name, contact_name, email, status)
values
  ('<auth-user-uuid>', 'Example Services', 'Contact Person',
   'partner@example.invalid', 'active')
returning id;

insert into public.partner_brand_memberships (partner_id, brand_id)
values ('<partner-uuid>', '<brand-uuid>');
insert into public.partner_services (partner_id, service_id)
values ('<partner-uuid>', '<service-uuid>');
insert into public.partner_postcodes (partner_id, brand_id, postal_code)
values ('<partner-uuid>', '<brand-uuid>', '1000');
update public.partner_wallets
set balance_cents = 10000
where partner_id = '<partner-uuid>';
```

The Auth user/profile, partner row, active brand membership, service
eligibility, covered postal code, and wallet are required to buy leads.

## Lead ingestion

External landing-page projects call `POST /api/leads` with the
`x-interventia-secret` header:

```json
{
  "brand": "pestora",
  "service": "cockroaches",
  "postal_code": "1000",
  "city": "Bruxelles",
  "description": "Description facultative",
  "name": "Client Example",
  "phone": "+32470000000",
  "email": "client@example.invalid",
  "full_address": "Rue Exemple 1, 1000 Bruxelles",
  "photos": ["https://example.invalid/photo.jpg"],
  "extra_data": {"property_type": "house"},
  "consent_at": "2026-01-01T12:00:00.000Z",
  "privacy_version": "2026-01"
}
```

Brand and service are slugs. The secret is checked before database access,
using the matching `PESTORA_INGESTION_SECRET`, `DRENORA_INGESTION_SECRET`, or
`MOVIRA_INGESTION_SECRET`, with a constant-time comparison. Both rows must be
active. Postal codes are trimmed, spaces removed, and validated as four
digits. Unknown fields and protected fields (`price_cents`, `status`,
`partner_id`, buyer, and purchase fields) are rejected. Price is derived from
the service row.

Success is `201` with only `{ "id", "price_cents", "status" }`. Invalid or
missing secrets return `401 INVALID_SECRET`; validation returns `400`;
unknown rows return `404 UNKNOWN_BRAND` or `404 UNKNOWN_SERVICE`; unexpected
errors return `500`. Error bodies use
`{ "error": "<CODE>", "message": "...", "details": ... }` where applicable.

Example (replace the placeholder with the secret held by the landing-page
backend):

```bash
curl -i -X POST http://127.0.0.1:3000/api/leads \
  -H 'content-type: application/json' \
  -H 'x-interventia-secret: replace-with-pestora-secret' \
  --data-raw '{
    "brand":"pestora",
    "service":"cockroaches",
    "postal_code":"1000",
    "city":"Bruxelles",
    "name":"Client Example",
    "phone":"+32470000000",
    "description":"Fourmis dans la cuisine.",
    "consent_at":"2026-01-01T12:00:00.000Z",
    "privacy_version":"2026-01"
  }'
```

Photos use the count-only path: URL/base64 entries are accepted and counted,
but V0 does not upload to private Storage or create `lead_photos` rows.
Partner views expose only the count.

## Stripe top-ups

Top-ups are exactly €100, €250, or €500 (`10000`, `25000`, or `50000` cents).
`POST /api/stripe/checkout` authenticates the partner, validates the allowlist,
creates Checkout, and attaches partner ID and amount cents as metadata. It
uses `NEXT_PUBLIC_APP_URL` for success and cancel URLs.

With Stripe keys available, forward local events:

```bash
stripe listen --forward-to http://127.0.0.1:3000/api/stripe/webhook
```

Put the printed signing secret in `STRIPE_WEBHOOK_SECRET`. The webhook reads
the raw body, verifies `stripe-signature`, and credits only a verified paid
EUR Checkout session. It never credits from a success URL. The unique event
ID and database function make replays return `200` without a second credit.

Tests do not call Stripe or require live keys. Vitest creates Stripe-signed
test payloads with a test webhook secret and exercises the real webhook and
wallet-credit path. Non-actionable signed events return `200`; signature or
parse failures return `400`; wallet-credit failures return `500` for retry.

## Purchase guarantees and error codes

The `purchase_lead` database function locks the lead row, checks active
eligibility (brand, service, and postal code), rejects suspended partners,
checks integer-cent balance, and atomically creates one purchase, debits one
wallet, writes one ledger row, marks the lead sold, and returns the purchase.
Concurrent buyers cannot both win. Contact PII is exposed only after a
successful, non-refunded purchase.

Purchase errors:

| Code | Meaning |
| --- | --- |
| `P0001` | Lead unavailable/already sold. |
| `P0002` | Insufficient wallet balance. |
| `P0003` | Partner not eligible. |
| `P0004` | Partner suspended. |

Admin errors:

| Code | Meaning |
| --- | --- |
| `A0001` | Admin authorization required. |
| `A0002` | Reason required. |
| `A0003` | Purchase not found. |
| `A0004` | Wallet not found. |
| `A0005` | Insufficient balance for an admin operation. |
| `A0006` | Invalid amount. |
| `A0007` | Stripe event required. |

## Localization

The application supports `fr-BE` and `nl-BE` without `/fr` or `/nl` routes.
The explicit locale cookie wins, then browser preference; French Belgian is
the fallback. Dictionaries are in `lib/i18n/locales/`. The French dictionary
derives the typed translation dot-path union, and tests enforce identical
keys in both dictionaries.

Add the same nested key with natural Belgian French and Dutch copy to both
locale files, then use `t(locale, "group.key")`. Do not hardcode UI copy or
choose language from the brand.

## Security model

RLS protects database reads and writes. Partner Server Components use the
RLS-bound server client, so eligibility and PII access are enforced by the
database and not only by the UI. Contact PII is gated behind a successful
non-refunded purchase. The server-only service-role client is used for the
ingestion transaction, Stripe webhook crediting, and specifically
admin-gated operations where RLS cannot serve the operation; it is never used
for partner portal data. Per-brand ingestion secrets are server-side and sent
only in `x-interventia-secret`. Every Server Action authenticates and
authorizes internally.

## Adding brands or services

Add active brand and service rows with their slugs, names, localized service
names, brand host/logo/accent data, and integer-cent service price. Add the
brand's ingestion secret mapping and `.env.example` entry, then configure
partner memberships, service eligibility, and postal-code coverage. Existing
routes resolve rows and need no per-brand route or component fork.

## Deployment notes

Set all required `.env.example` variables in the deployment environment,
including server-only Supabase and Stripe values, per-brand ingestion
secrets, and `NEXT_PUBLIC_APP_URL`. Apply migrations and seed only intended
environment data. Configure Stripe to send events to:

```text
https://<your-host>/api/stripe/webhook
```

Use that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`; keep
service-role and ingestion secrets out of bundles, logs, and source control.
