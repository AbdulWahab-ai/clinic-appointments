# Clinic Appointments

Online appointment booking for clinics in Pakistan. Patients book, reschedule and cancel
visits; staff run schedules, the daily queue and walk-ins. It's multi-clinic, with
multiple branches and doctors per clinic, and in English and Urdu.

The product spec is in [SPEC.md](SPEC.md) and the architecture notes are in [CLAUDE.md](CLAUDE.md).

## Run it locally

Needs Node 24+, pnpm 10 and Docker Desktop. No paid accounts: SMS, WhatsApp, payments and
video all have mock implementations.

```bash
cp .env.example .env          # then set BETTER_AUTH_SECRET and FIELD_ENCRYPTION_KEYS
docker compose up -d          # Postgres, Redis, Mailpit
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev                      # http://localhost:3000
pnpm worker                   # background jobs, in a second terminal
```

The commands for generating the two secrets are next to them in `.env.example`.

| What                     | Where                                   |
| ------------------------ | --------------------------------------- |
| App                      | http://localhost:3000                   |
| Demo clinic booking page | http://localhost:3000/en/c/shifa-family |
| Staff sign-in            | http://localhost:3000/en/sign-in        |
| Emails (Mailpit)         | http://localhost:8025                   |
| Mock SMS and OTP codes   | http://localhost:3000/en/dev/outbox     |
| Health check             | http://localhost:3000/api/health        |

Every seeded account uses the password in `SEED_PASSWORD` (default `Demo-Clinic-2026!`).
Try `admin@shifa.test`, `reception@shifa.test` or `dr.ayesha@shifa.test`. The full list is in CLAUDE.md.

## Tests

```bash
pnpm test               # unit tests
pnpm test:integration   # against the clinic_test database
pnpm test:e2e           # Playwright, against a seeded dev database
```

## Environment variables

Every variable is documented in [.env.example](.env.example) and validated at startup by
[src/env.ts](src/env.ts). The app refuses to start in production with placeholder secrets.

## Deployment

The target is a VPS running Docker: one image, started as the web app or as the worker.
The Dockerfile and deployment guide arrive in Phase 10.
