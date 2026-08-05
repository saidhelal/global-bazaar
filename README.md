# Orbit Market

Bilingual (English / Arabic) multi-vendor marketplace: a pnpm-workspace monorepo
with a React 19 storefront, an Express 5 REST API, and PostgreSQL via Drizzle ORM.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind 4, Radix UI, wouter, TanStack Query |
| Backend | Node 22+, Express 5, pino, JWT, bcrypt |
| Database | PostgreSQL 18, Drizzle ORM (23 tables) |
| Payments | Stripe, Paymob, MyFatoorah, cash on delivery |
| Object storage | Amazon S3 (presigned upload and read URLs) |
| Build | Vite (web), esbuild (API), TypeScript project references |
| Tooling | pnpm workspaces with a version catalog |

## Repository layout

```
artifacts/
  api-server/       Express REST API (74+ endpoints)
  orbit-market/     Customer storefront and dashboards
  mockup-sandbox/   Component sandbox
lib/
  db/               Drizzle schema, migrations helper, local Postgres runner
  api-spec/         OpenAPI document and orval codegen
  api-zod/          Generated Zod validators
  api-client-react/ Generated React Query client
deploy/             Nginx site template
docs/               Deployment, local development, migration notes
```

Boundaries are enforced by the compiler through TypeScript project references:
applications depend on libraries, never the reverse.

## Quick start

Requires Node 22+ and pnpm 11. No system PostgreSQL is needed — a project-local
instance runs from `lib/db/.pgdata`.

```bash
pnpm install
cp .env.example .env          # then set JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

pnpm --filter @workspace/db run pg          # terminal 1 — database on :5433
pnpm --filter @workspace/db run push:local  # once — create the schema
pnpm --filter @workspace/api-server run dev # terminal 2 — API on :5176
```

```powershell
# terminal 3 — storefront on :5175
cd artifacts\orbit-market
$env:PORT="5175"; $env:BASE_PATH="/"
pnpm run dev
```

Open <http://localhost:5175/>. Full walkthrough: [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

> Vite reads `PORT`, `BASE_PATH` and `VITE_*` from the shell, not from the
> repo-root `.env` — its project root is `artifacts/orbit-market`.

## Common commands

| Command | Location | Purpose |
|---|---|---|
| `pnpm run typecheck` | root | Type-check every package |
| `pnpm run build` | root | Type-check, then build all packages |
| `pnpm run pg` | `lib/db` | Start the project-local PostgreSQL |
| `pnpm run push:local` | `lib/db` | Apply the Drizzle schema |

## Payments

Charges run through a `PaymentProvider` abstraction, so adding a gateway needs
no route, service or schema change. `payment_transactions` is an append-only
ledger — balances are derived by summing entries, never stored, so figures
reconcile against gateway statements.

Order totals are always computed server-side by `PricingService` from the
catalogue; prices supplied by a client are rejected. Webhooks are
signature-verified, amount-checked and idempotent.

Vendor earnings accrue into escrow when payment is confirmed and are released
for payout on delivery.

## Deployment

Targets Ubuntu on AWS EC2 with pnpm, PM2 and Nginx. CI runs install, type check,
build and artifact verification on every push; deployment to EC2 runs from
`main` once the repository secrets are configured.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for provisioning, environment
variables, CI secrets, operations and rollback.

## Configuration

Every variable the code reads is documented in [.env.example](.env.example).
`.env` is git-ignored and must never be committed.

Before any public deployment:

1. Generate a fresh `JWT_SECRET` — never reuse one that has appeared in git history.
2. Set `CORS_ORIGINS`; while unset the API reflects any origin.
3. Keep `NODE_ENV=production`, which disables the `/api/seed` endpoint.

## Known limitations

- Image upload requires an S3 bucket (`S3_BUCKET`, `S3_REGION`); while unset the
  upload endpoints answer 503 and external image URLs are unaffected.
- Refunds are automated for Stripe; Paymob and MyFatoorah refunds are completed
  in each provider's own dashboard and stay `processing` until then.
- The schema is applied with `drizzle-kit push`, so there is no migration
  history — back up before any schema change.
- There is no automated test suite; CI gates on type checking and the build.

## License

MIT
