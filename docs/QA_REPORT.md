# QA report: Phase 1 (Foundation)

**Date:** 2026-10-15 · **Build:** Next.js 16.4.1 production build · **Verdict:** ready to hand over, with
one known gap (the background worker could not be run locally; see "Not covered").

## Summary

| Area                              | Result                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Automated tests                   | **204 / 204 pass** (105 backend unit, 28 frontend component, 23 integration, 48 end-to-end)        |
| Static checks                     | lint 0 warnings · type-check clean · formatting clean · production build clean                     |
| Accessibility (axe, WCAG 2.1 AA)  | 0 violations on 7 pages in English and Urdu, plus keyboard-only sign-in and phone-width checks     |
| Manual security probes            | 31 probes: 28 pass, 3 were mistakes in the probes themselves, not app bugs (explained below)       |
| Defects found during QA           | **8 found, 8 fixed and re-tested**                                                                 |
| Definition-of-done items in scope | No cross-clinic data leakage: proven. Double booking blocked under concurrency: proven at DB level |

## Test environment

| Item        | Version / setup                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| OS          | Windows 11 Pro 10.0.26200                                                                                |
| Node / pnpm | 24.20.0 / 10.34.7                                                                                        |
| Database    | PostgreSQL 17.11 (native Windows service), databases `clinic` and `clinic_test`                          |
| Redis       | Microsoft Garnet 2.2.2 (Redis-compatible, portable in `.tools/`), used for health and Redis connectivity |
| Browsers    | Playwright Chromium: "Desktop Chrome" and "Pixel 7" (mobile) profiles                                    |
| Data        | `pnpm db:seed`: 2 clinics, 3 branches, 7 doctors, 44 patients, 656 appointments                          |

Docker could not be used: WSL2's "Virtual Machine Platform" is not enabled on this PC.
Memurai (Redis for Windows) failed to install: its installer couldn't create a temp folder, Windows error 5.

## Results by suite

| Suite                  | Files | Tests | Result  | Notes                                                                               |
| ---------------------- | ----- | ----- | ------- | ----------------------------------------------------------------------------------- |
| Backend unit           | 11    | 105   | ✅ pass | tenancy rules, permissions, auth config, crypto, env, idle timeout, redirects, i18n |
| Frontend component     | 4     | 28    | ✅ pass | sign-in (email + OTP), 2FA, nav, language switch, sign-out, token slip              |
| Integration (Postgres) | 2     | 23    | ✅ pass | tenant isolation, exclusion constraint                                              |
| E2E desktop            | 2     | 24    | ✅ pass | production build                                                                    |
| E2E mobile (Pixel 7)   | 2     | 24    | ✅ pass | production build                                                                    |

**Mutation check:** to prove the isolation tests would catch a real leak, tenant scoping was
switched off on purpose. 15 of 18 isolation tests failed, and the remaining 3 are database-level
guards (composite foreign keys, audit trigger) that work independently. Scoping was then
restored and all tests pass again.

**Migration drift check:** `prisma migrate dev` against the migrated database produced an
empty migration, so the schema and the hand-written init migration match.

## Defects found and fixed

| #   | Severity | Defect                                                                                                                                                        | Fix                                                          | Verified by                                                              |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | High     | **Open redirect:** `?next=/\evil.com` passed the post-login check (browsers treat `/\` as `//`).                                                              | New `safeNextPath()` used by sign-in, 2FA and idle sign-out. | 15 unit cases + E2E "open redirects are ignored"                         |
| 2   | Medium   | **Health check failed when two requests arrived while Redis was connecting** (offline queue was disabled).                                                    | Commands queue during connect; 2 s timeout bounds the wait.  | Health E2E run 10× in a row, plus manual Redis-down check (503 in 0.8 s) |
| 3   | Medium   | **Staff couldn't sign out or switch language on phones** (controls were desktop-only).                                                                        | Controls shown on all widths.                                | E2E "switch language and sign out" on Pixel 7                            |
| 4   | Medium   | **2FA sign-in navigated twice:** the form redirected to the app while Better Auth redirected to the code screen.                                              | The form leaves navigation to the 2FA redirect.              | Component test                                                           |
| 5   | Medium   | **Seed created overlapping bookings:** it ignored "buffer before" on the laser service. The DB's double-booking constraint rejected them, so the guard works. | Seed slot arithmetic corrected.                              | Seed runs clean; 595 reservations, no overlaps                           |
| 6   | Low      | **Redis errors were unhandled:** ioredis printed "Unhandled error event" while Redis was down.                                                                | Error listener logs a warning instead.                       | Manual run with Redis stopped                                            |
| 7   | Low      | **Urdu pages rendered English text and numbers in a generic serif:** the font stack put `serif` before the Latin font.                                        | Stack is now Atkinson (Latin), then Nastaliq (Urdu).         | Computed-style check in the browser                                      |
| 8   | Low      | **A self-referencing CSS token** (`--font-urdu: var(--font-urdu)`) would have invalidated the Urdu font variable.                                             | Removed.                                                     | Same check                                                               |

Test-infrastructure fixes, not app bugs:

- E2E timing in dev mode: switched to testing against the production build, as CI does.
- One ambiguous `role="alert"` locator: Next.js has its own route announcer.
- The auth rate limiter blocked E2E runs, because every test signs in from the same IP. This was the limiter working correctly. It is now switchable via `AUTH_RATE_LIMIT=off` for test builds only, and the env check refuses it in a real production deployment.

## Manual security probes (production build, rate limiting on)

| Check                                                                                                                           | Result                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; no `X-Powered-By`                | ✅                                                                                                                                                                                                                             |
| Dev outbox (shows OTP codes) returns 404 in production                                                                          | ✅                                                                                                                                                                                                                             |
| Clinic admin: own clinic 200; other clinic and its sub-pages 404; unknown clinic also 404 (no way to probe which clinics exist) | ✅                                                                                                                                                                                                                             |
| Non-super-admin gets 404 on `/super`; super admin can open it and any clinic                                                    | ✅                                                                                                                                                                                                                             |
| Signed-out staff URL → 307 to sign-in with `next`                                                                               | ✅                                                                                                                                                                                                                             |
| Session cookie is `HttpOnly`, `Secure` (production), `SameSite=Lax`, `__Secure-` prefixed                                       | ✅                                                                                                                                                                                                                             |
| Idle timeout: a stale signed activity cookie → idle sign-out → session revoked **server-side** (`get-session` returns null)     | ✅                                                                                                                                                                                                                             |
| Forged activity cookie is ignored (no forced logout, no bypass)                                                                 | ✅                                                                                                                                                                                                                             |
| Sign-up with `isSuperAdmin: true` creates a normal user                                                                         | ✅                                                                                                                                                                                                                             |
| Sign-in POST from a foreign `Origin` → 403 (CSRF protection)                                                                    | ✅                                                                                                                                                                                                                             |
| Script-tag and SQL-style clinic slugs → 404                                                                                     | ✅                                                                                                                                                                                                                             |
| OTP sends: 4th request in a minute → 429                                                                                        | ✅                                                                                                                                                                                                                             |
| Sign-in: 429 after 10 attempts per minute per IP                                                                                | ✅ (the probe miscounted at first: earlier sign-ins in the same run counted toward the limit, so the 429 came at attempt 11 overall, which is correct)                                                                         |
| `next=` open redirect in page HTML                                                                                              | ✅ (the probe flagged "evil.example" in the HTML. It appears only in the language-switch link, a same-site link that re-validates `next`, and in Next.js's router state. The `next` value the form actually uses is `/en/app`) |
| Health returns 503 within 1 s when Redis is down; database status still reported                                                | ✅                                                                                                                                                                                                                             |

## Accessibility

- axe-core WCAG 2.1 A/AA: **0 violations** on `/en`, `/ur`, `/en/sign-in`, `/ur/sign-in`, `/en/c/shifa-family`, `/ur/c/shifa-family` and the signed-in staff app, on desktop and mobile.
- The skip link is the first Tab stop and moves to the main content.
- Sign-in can be completed with the keyboard only.
- No horizontal scrolling at 360 px wide (English and Urdu).
- Urdu pages: `dir="rtl"`, `lang="ur"`, Nastaliq with 2.1 line height. Email, phone and code inputs stay left-to-right.

## Not covered or known limitations

| Item                                                        | Why                                                                                               | Plan                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Background worker (BullMQ) not run locally**              | Garnet doesn't implement some Redis commands BullMQ's Lua scripts use; real Redis needs Docker    | Runs in CI (GitHub Actions has real Redis). Locally: enable WSL2, then `docker compose up -d`   |
| `docker compose` setup not exercised                        | WSL2 is off                                                                                       | Same as above                                                                                   |
| Email delivery to Mailpit                                   | Mailpit runs under Docker                                                                         | Local `.env` uses `EMAIL_PROVIDER=console`, so emails appear at `/en/dev/outbox`                |
| Google sign-in                                              | No OAuth keys configured (disabled by design without them)                                        | Test when keys are added                                                                        |
| Password reset / email verification screens                 | Email side is wired up; the screens aren't built yet                                              | Phase 4 (admin/staff settings)                                                                  |
| Visual screenshot review                                    | The in-app browser couldn't capture screenshots (window not in front)                             | Layout checked through DOM/computed styles and axe                                              |
| Rate limiting is in-memory                                  | Fine for one server; not shared across instances                                                  | Move to Redis before multi-instance deploy (Phase 10)                                           |
| Idle timeout can be skipped by deleting the activity cookie | Threat model is unattended desk PCs, not a malicious user; the 7-day session expiry still applies | Accepted; revisit with server-side activity tracking in Phase 10                                |
| Dev outbox shows OTP codes in non-production builds         | Needed for local testing                                                                          | Never expose a dev server publicly; production refuses unless `ENABLE_DEV_OUTBOX` is set for CI |

## How to re-run this QA

```bash
pnpm lint && pnpm typecheck && pnpm format:check
pnpm test                 # unit + component
pnpm test:integration     # needs Postgres
pnpm build
E2E_USE_BUILD=1 pnpm test:e2e   # needs seeded DB + Redis
```

On Windows PowerShell, set `$env:E2E_USE_BUILD="1"` before `pnpm test:e2e`.
