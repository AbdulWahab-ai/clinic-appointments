# Clinic Appointments: project guide for Claude

Multi-tenant clinic booking SaaS for Pakistan (PKR, Asia/Karachi, English + Urdu/RTL).
The full spec is in `SPEC.md`, built phase by phase (section 6). The approved architecture
plan is summarized below. Read `AGENTS.md` too: this Next.js version differs from older
training data, and its docs live in `node_modules/next/dist/docs/`.

**Project location:** `D:\Claude` is the repo root and the only working location. Never use
OneDrive paths.

## Status

| Phase               | State                                                        |
| ------------------- | ------------------------------------------------------------ |
| 1 Foundation        | Done, QA passed (docs/QA_REPORT.md); worker untested locally |
| 2 Scheduling engine | Next                                                         |
| 3–11                | Not started                                                  |

Open decisions (ask before choosing): payment provider (before Phase 6), telehealth
provider (before Phase 7), which data-protection regulations apply (before Phase 10).

## Stack

Next.js 16 (App Router, Turbopack, `src/proxy.ts` instead of middleware) · React 19 ·
TypeScript 6 strict · pnpm 10 · Tailwind 4 + shadcn/ui (new-york) · next-intl 4 ·
PostgreSQL 17 + Prisma 7 (`prisma-client` generator → `src/generated/prisma`, pg driver
adapter, config in `prisma.config.ts`) · Better Auth 1.7 (email/password, phone OTP,
Google, TOTP 2FA) · Redis 7 + BullMQ 6 · Zod 4 · Luxon · pino · Vitest 5 · Playwright.

Versions are pinned exactly (`.npmrc` has `save-exact`). TypeScript stays on 6.x because
typescript-eslint doesn't support TS 7 yet. ESLint stays on 9 for eslint-config-next plugins.

## Commands

```
docker compose up -d          # Postgres, Redis, Mailpit (http://localhost:8025)
pnpm install                  # also runs prisma generate
pnpm db:migrate               # prisma migrate dev
pnpm db:seed                  # wipes + seeds demo data (refuses in production)
pnpm dev                      # web app on :3000
pnpm worker                   # BullMQ worker (separate terminal)
pnpm lint | pnpm typecheck | pnpm format
pnpm test                     # unit + component tests (no services needed)
pnpm test:components          # frontend component tests only (jsdom)
pnpm test:integration         # needs Postgres; uses TEST_DATABASE_URL (clinic_test)
pnpm test:e2e                 # Playwright; needs seeded DB + Redis
                              # set E2E_USE_BUILD=1 after pnpm build to test the prod build
pnpm build
```

End of every phase: lint, typecheck, format:check, all tests, update this file, commit.
Test inventory: `docs/TEST_CASES.md` (update it when adding test files). QA results:
`docs/QA_REPORT.md`.

## Layout

- `src/app/[locale]/…` pages. `c/[clinicSlug]` public clinic, `app/[clinicSlug]` staff app,
  `portal` patients, `super` platform admin, `dev/outbox` mock-message viewer (dev only).
- `src/app/api/…` route handlers: `auth/[...all]` (Better Auth), `health`, `session/idle`.
  `/api/v1` (public REST) arrives in Phase 3/8.
- `src/server/` server-only code. Nothing here imports React components.
  - `db/client.ts`: `systemDb`, the UNSCOPED client. ESLint restricts imports of it.
  - `db/tenant.ts`: `getTenantDb(clinicId)`, the tenant-scoped client (use this).
  - `db/tenant-scope.ts`: pure arg rewriting (unit-tested). `db/tenant-models.ts`: registry.
  - `auth/`: Better Auth config, `getSession()`, staff idle timeout.
  - `authz/`: permission matrix + `can()` / `requirePermission()`.
  - `tenancy/`: `StaffContext`, `getStaffContext(slug)`, `requireStaffContext(slug, locale)`.
  - `providers/`: integration interfaces + mocks, chosen by env in `registry.ts`.
  - `jobs/`: queue names + Zod payload schemas. `src/worker.ts` runs processors.
  - `crypto/fields.ts`: AES-256-GCM field encryption with key rotation.
  - `scheduling/` (Phase 2): pure slot engine, no I/O.
- `src/lib/`: isomorphic helpers (phone, format, clinic settings schema, auth client).
- `src/components/`: UI. `ui/` is shadcn-generated (fix `@/lib/utils` imports if the CLI
  writes `from "cn"`).
- `messages/{en,ur}.json`: all user-facing strings. Add both languages together.
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`.
- `tests/unit`, `tests/integration`, `tests/e2e`, `tests/helpers`.

## Architecture decisions

- **Tenancy:** shared DB, `clinicId` on every tenant row. Request code must use
  `getTenantDb(ctx.clinicId)`, which injects `clinicId` into filters and created rows
  and throws on cross-tenant filters. Limits: nested writes aren't rewritten (pass
  clinicId explicitly), use scalar `clinicId` not `clinic: { connect }`, raw SQL is never
  scoped. Composite FKs `(id, clinicId)` on Appointment/Reservation make cross-clinic
  links impossible at the DB level. **New model with clinicId → add it to
  `tenant-models.ts`** (a unit test enforces this). Postgres RLS is planned for Phase 10.
- **Shared models** (Holiday, FeatureFlag): tenants read their rows plus platform rows
  (`clinicId = null`) and write only their own. AuditLog is strictly tenant-scoped and
  append-only (DB trigger).
- **Context is explicit:** services take a `StaffContext` argument; they never read
  cookies or headers. Call `requirePermission(ctx, perm, { branchId, providerId })`
  at every service entry point. Clinical data (`patient.clinical.view`) is doctors only.
- **Double booking** is prevented by the `Reservation` table's exclusion constraint
  (`EXCLUDE USING gist (providerId =, tstzrange(occupiedStart, occupiedEnd) &&) WHERE NOT
isOverbook`) plus the same on `ResourceReservation`. Holds, appointments and staff
  blocks all live in `Reservation`. Hand-written SQL lives at the end of the init
  migration; Prisma can't express it, so **never** `db push`.
- **Times:** instants are `timestamptz` UTC. Availability rules are wall-clock minutes in
  the branch timezone, expanded with Luxon. Money is integer paisa.
- **Auth:** Better Auth with DB sessions (7 days). Staff have an extra idle timeout: the
  proxy keeps an HMAC-signed `clinic.last_active` cookie on `/…/app/…` requests, and a
  stale one triggers `/api/session/idle`, which revokes the session server-side.
  Phone-only accounts get a placeholder `@phone.clinic.invalid` email.
  Rate limiting uses Better Auth's in-memory store for now (single instance only);
  it moves to Redis before multi-instance deploys (Phase 10).
- **Integrations:** every provider has an interface + mock; mocks write to
  `DevOutboxMessage` (viewable at `/en/dev/outbox`). Email defaults to SMTP → Mailpit.
- **Storage:** local-disk mock (`STORAGE_PROVIDER=local`). MinIO images were pulled from
  Docker Hub, so S3 is only for real deployments (Phase 7).
- **Worker** runs with `tsx --conditions=react-server` so `server-only` imports resolve.
- **i18n:** next-intl, `localePrefix: "always"`, `<html dir>` from `isRtl()`. Use logical
  Tailwind utilities (`ms-`, `me-`, `start-`, `end-`, `border-e`) so RTL works. User
  input fields for phone/email/codes are `dir="ltr"`.

## Design system

Ink `#17242F` on cool paper `#F6F7F4`. Bottle-green `#0E5A43` is the default clinic brand
(each clinic overrides `--brand`; wrap clinic-branded areas in `.brand-scope` so
`--primary` is re-derived). Haldi `#D9971A` is reserved for "now serving"/attention.
Atkinson Hyperlegible Next (Latin) + Noto Nastaliq Urdu (line-height 2.1 for Urdu).
Times, prices and tokens use the `.figures` class (tabular numerals). The signature
element is the token slip (`<TokenSlip>`, `.token-slip`). Keep everything else quiet.
Avoid all-caps labels, middle-dot meta strings and decorative cards.

## Conventions

- Zod-validate every input (actions, route handlers, env, job payloads).
- Never log patient data. Log ids. The pino redact list is a backstop, not a licence.
- Sensitive columns end in `Enc` and go through `crypto/fields.ts` with a context string
  like `appointment:<id>:notes`.
- Copy: plain, sentence case, from the patient's or staff member's point of view; errors
  say what happened and what to do.

## Seed accounts (password = `SEED_PASSWORD`, default `Demo-Clinic-2026!`)

super@platform.test (super admin) · admin@shifa.test · reception@shifa.test (Gulberg
only) · reception.khi@shifa.test (Clifton only) · dr.ayesha@shifa.test, dr.bilal@,
dr.sana@, dr.imran@, dr.hira@, ali.raza@shifa.test (doctors) · patient@shifa.test
(phone +923000099999) · admin@alnoor.test, dr.zara@alnoor.test (second clinic).

## Local environment on this PC (until Docker works)

- Docker needs WSL2's "Virtual Machine Platform" (`wsl --install --no-distribution` as
  admin, then reboot). Until then:
  - **Postgres:** native PostgreSQL 17 Windows service (`postgresql-x64-17`), role/db
    `clinic`/`clinic` and `clinic_test`, `btree_gist` enabled. Same URLs as compose.
  - **Redis:** Microsoft Garnet in `.tools/` (gitignored). Start it with:
    `="D:\Claude\.tools\dotnet"; & D:\Claude\.tools\garnet\net10.0\GarnetServer.exe --port 6379 --bind 127.0.0.1 --lua`
    Garnet is fine for health/rate limiting but **can't run BullMQ** (missing commands in Lua),
    so `pnpm worker` needs real Redis (Docker or CI).
  - **Email:** `.env` uses `EMAIL_PROVIDER=console` (no Mailpit) → mails show at `/en/dev/outbox`.
- Env flags for tests only: `AUTH_RATE_LIMIT=off` (Playwright sets it; refused in real
  production) and `ENABLE_DEV_OUTBOX=true` (prod-build E2E). Never set them in a deployment.

## Known gaps

- Worker (BullMQ) has only been exercised in CI, not locally.
- Password reset / email verification screens aren't built yet (Phase 4).
- Rate limiting is in-memory (single instance) until Phase 10.
- `prisma migrate dev` will create a shadow DB; the hand-written constraints are in
  `prisma/migrations/20261015000000_init/migration.sql`.
