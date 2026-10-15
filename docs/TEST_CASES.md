# Test case inventory

Every automated test file in the project, grouped by layer, with the cases it contains.
Planned files for later phases are listed at the end so coverage gaps are visible.

| Layer               | Runner                               | Command                 | Needs            | Files | Tests               |
| ------------------- | ------------------------------------ | ----------------------- | ---------------- | ----- | ------------------- |
| Backend unit        | Vitest (node)                        | `pnpm test`             | nothing          | 11    | 105                 |
| Frontend component  | Vitest (jsdom) + Testing Library     | `pnpm test:components`  | nothing          | 4     | 28                  |
| Backend integration | Vitest (node)                        | `pnpm test:integration` | Postgres         | 2     | 23                  |
| End-to-end          | Playwright, desktop Chrome + Pixel 7 | `pnpm test:e2e`         | seeded DB, Redis | 2     | 24 × 2 devices = 48 |

`pnpm test` runs the unit and component projects together (133 tests). Last full run: all
204 automated tests passed. See [QA_REPORT.md](QA_REPORT.md).

---

## Backend: unit tests (`tests/unit/`)

### `tenant-scope.test.ts`: tenant isolation rules (pure)

#### Reads

1. `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy` each inject `clinicId` (6 cases)
2. Adds a tenant filter when the query has none
3. Throws when a query filters on another clinic's id
4. An `OR` naming another clinic can't escape the top-level tenant filter
5. Shared models (Holiday, FeatureFlag) also return platform rows (`clinicId = null`)
6. Shared models can ask for platform rows only

#### Writes

1. `create` stamps the tenant's `clinicId`
2. `createMany` stamps every row
3. Creating a row for another clinic throws
4. Using the `clinic` relation instead of scalar `clinicId` throws
5. `update`, `updateMany`, `delete`, `deleteMany` are filtered to the tenant (4 cases)
6. Updates can't move a row to another clinic
7. Shared-model writes never touch platform rows
8. `upsert` scopes both `where` and `create`
9. Unknown Prisma operations fail closed

### `tenant-models.test.ts`: tenant model registry

1. Every model in `schema.prisma` is classified exactly once
2. Every model with a required `clinicId` is a tenant model
3. Every model with an optional `clinicId` is scoped (shared or strict)
4. Only optional-`clinicId` models are marked shared
5. Global models really have no `clinicId`

### `permissions.test.ts`: role permission matrix and `can()` / `requirePermission()`

1. The matrix references only known permissions
2. Clinical content is visible to doctors only (not admin or reception)
3. Settings, staff, reports and audit are admin-only
4. Reception can book and take payments but can't manage services
5. Branch scoping: own branch allowed
6. Branch scoping: other branches blocked
7. Branch scoping: an empty branch list means all branches
8. A doctor can update their own appointments and availability
9. A doctor can't update another doctor's appointments, or make untargeted checks
10. A doctor without a provider profile doesn't match `providerId: null`
11. `requirePermission` throws a 403 `ForbiddenError`
12. Super admins pass every check

### `auth-config.test.ts`: security-relevant auth settings (added in QA)

1. Auth endpoints are rate limited by default: OTP 3/min, sign-in 10/min, TOTP 10/min
2. Rate limiting can't be turned off in a real production deployment
3. Minimum password length is at least 10
4. Phone OTP and TOTP 2FA plugins are enabled
5. Sign-up can't set the super admin flag
6. Secure cookies only in production

### `safe-redirect.test.ts`: post-login redirect safety (added in QA)

1. Internal paths with query and hash are kept (3 cases)
2. Rejected: empty, absolute URLs, `//evil`, `/\evil`, `\\evil`, `javascript:`, relative paths, CRLF injection, encoded backslash (12 cases)

### `idle.test.ts`: staff idle timeout

1. Active within the timeout window
2. Expired after the window
3. A missing cookie counts as a fresh start
4. Forged, re-signed or malformed cookies are ignored
5. Timestamps from the future are ignored
6. Timestamp round-trips through encode/decode

### `crypto.test.ts`: field-level encryption (AES-256-GCM)

1. Round-trips Urdu and English text; ciphertext doesn't contain plaintext
2. A fresh IV is used every time
3. Ciphertext moved to another row/column context fails to decrypt
4. Tampered ciphertext is rejected
5. Old keys still decrypt after rotation, and rows get flagged for re-encryption
6. Bad key specs are rejected (empty, short key, no key)
7. Unknown key versions and malformed payloads are rejected

### `env.test.ts`: environment validation

1. Defaults are applied
2. All problems are listed at once
3. Short secrets and wrong-size keys are rejected
4. Placeholder secrets are refused in production
5. Google credentials must come as a pair
6. Empty strings are treated as unset; booleans parse

### `phone.test.ts`: Pakistani phone normalization

1. Eight accepted formats normalize to E.164 (`03001234567`, `0300-1234567`, `+92 300…`, `0092…`, foreign `+44…`, …)
2. Six invalid inputs are rejected (empty, letters, too short, bad PK prefix, leading zero after +)
3. Masking keeps only the country code and last 4 digits

### `format.test.ts`: money, time and clinic settings

1. Paisa formats as rupees with no `.00` when whole
2. Decimals are kept when needed
3. Times render in the branch timezone, not the server's
4. Empty clinic settings get defaults
5. Stored settings are kept and invalid ones rejected

### `i18n.test.ts`: translations (added in QA)

1. Urdu has exactly the same keys as English
2. No translation is empty
3. `{placeholders}` match between languages
4. Urdu strings are in Urdu script
5. Every `t("key")` used in `src/` exists in the message files (the scan must check 30+ keys)

## Frontend: component tests (`tests/components/`, added in QA)

### `sign-in-form.test.tsx`: sign-in screen

#### Email

1. Valid credentials call Better Auth and redirect to `next`
2. Wrong password shows "don't match" and stays on the page
3. Accounts with 2FA are left to the 2FA redirect (no double navigation)
4. HTTP 429 shows the rate-limit message
5. Email and password inputs stay `dir="ltr"` on Urdu pages

#### Phone OTP

1. The selected tab is marked with `aria-selected`
2. An invalid number is rejected on the client, with no request sent
3. The number is normalized to E.164 and the confirmation masks it
4. A correct code signs in and redirects
5. A wrong or expired code shows an error
6. Sending codes too often shows the rate-limit message
7. Switching tabs clears the error

### `two-factor-form.test.tsx`: TOTP screen

1. A correct code verifies and redirects to `next`
2. A wrong code shows an error and stays on the page
3. The input is numeric, `autocomplete="one-time-code"`, max length 6

### `navigation.test.tsx`: staff nav, language switch, sign-out

#### StaffNav

1. Sections are listed in order (Today, Calendar, Queue, Patients, Settings)
2. Today is current only on the clinic root
3. Nested pages highlight their section
4. Links point at the current clinic's sections
5. The nav landmark is labelled, and items are translated in Urdu

#### LocaleSwitcher

1. English pages offer "اردو" (with `lang="ur"`) linking to the same page in Urdu
2. Urdu pages offer "English"
3. The query string (e.g. `?next=`) is preserved

#### SignOutButton

1. Signs out, routes to sign-in and refreshes server data

### `token-slip.test.tsx`: token slip

1. Shows the label and number
2. Announced as one labelled group to screen readers
3. Switches between waiting and serving states
4. Accepts string tokens such as `A-12`

## Backend: integration tests (`tests/integration/`, real Postgres)

### `tenant-isolation.test.ts`: no cross-clinic leakage (definition of done)

#### Reads

1. A tenant lists only its own patients and appointments
2. Another clinic's patient, appointment, provider, branch and service can't be fetched by id via `findUnique` / `findFirst` (5 cases)
3. Relation filters can't reach another clinic's rows
4. Naming another clinic's id explicitly throws

#### Writes

1. Can't update another clinic's patient (`update` throws, `updateMany` affects 0 rows)
2. Can't delete another clinic's appointment
3. Created rows are stamped with the tenant
4. Creating rows for another clinic throws
5. The database rejects an appointment linking clinic A to clinic B's patient (composite FK)
6. The database rejects an appointment with another clinic's provider

#### Shared models

1. Tenants see national holidays and their own, not other clinics'
2. Tenants can't delete national holidays

#### Audit log

1. Rows are append-only (update and delete blocked by a DB trigger)
2. Audit rows are invisible to other clinics

### `reservation-constraint.test.ts`: double-booking guarantee (definition of done)

1. Overlapping reservations for one provider are rejected
2. Back-to-back slots are allowed (half-open ranges)
3. Overbook rows may overlap
4. Empty or inverted ranges are rejected
5. Of 25 simultaneous overlapping inserts, exactly one succeeds

## End-to-end: Playwright (`tests/e2e/`, desktop and mobile)

### `foundation.spec.ts`: core flows

1. `/api/health` reports database and Redis ok
2. `/` redirects to `/en`
3. Urdu pages render with `dir="rtl"` and `lang="ur"`
4. The public clinic page lists branches and doctors
5. Clinic admin signs in and lands in the staff app with the right role
6. Receptionist signs in and lands in the staff app
7. Doctor signs in and lands in the staff app
8. Staff can switch to Urdu and sign out, on desktop and phone (added in QA)
9. A branch-restricted receptionist sees their role (added in QA)
10. Open redirects in `next=` are ignored (added in QA)
11. Staff of one clinic get a 404 for another clinic's staff app
12. Signed-out visitors are redirected to sign-in with `next`
13. A wrong password shows a specific error
14. Phone OTP: the code arrives in the dev outbox, verifies, and the patient lands in the portal

### `accessibility.spec.ts`: WCAG 2.1 AA (added in QA)

1. No axe violations on `/en`, `/ur`, `/en/sign-in`, `/ur/sign-in`, `/en/c/shifa-family`, `/ur/c/shifa-family` (6 cases)
2. No axe violations in the signed-in staff app
3. The skip link is the first focus stop and jumps to main content
4. Sign-in works with the keyboard alone
5. No sideways scrolling at 360 px wide on the main pages

---

## Planned test files (later phases)

| Phase   | File                                                                        | Covers                                                                              |
| ------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1 (gap) | `tests/integration/worker.test.ts`                                          | BullMQ heartbeat job runs; needs real Redis (Docker/CI)                             |
| 2       | `tests/unit/scheduling/slots.test.ts`                                       | weekly rules, multiple shifts, step grid, min notice, horizon                       |
| 2       | `tests/unit/scheduling/overrides.test.ts`                                   | ADD / REPLACE / BLOCK, leave, holidays, precedence                                  |
| 2       | `tests/unit/scheduling/timezones.test.ts`                                   | UTC storage, DST gaps/overlaps (New York, London), Karachi                          |
| 2       | `tests/unit/scheduling/buffers-resources.test.ts`                           | buffers before/after, rooms/equipment, group capacity, overbooking                  |
| 2       | `tests/unit/scheduling/recurring.test.ts`                                   | series expansion, conflicts, alternatives                                           |
| 2       | `tests/unit/scheduling/token-mode.test.ts`                                  | token allocation, ETA                                                               |
| 2       | `tests/integration/booking-concurrency.test.ts`                             | 50 parallel bookings → 1 winner, hold vs book, shared resources                     |
| 3       | `tests/components/booking-wizard.test.tsx`                                  | wizard steps, validation, slot picker                                               |
| 3       | `tests/integration/api-v1-booking.test.ts`                                  | holds, appointments, reschedule/cancel, manage links, .ics                          |
| 3       | `tests/e2e/patient-booking.spec.ts`                                         | book on a phone end to end, guest OTP                                               |
| 4       | `tests/e2e/reception-day.spec.ts`                                           | walk-in, check-in, queue, TV board                                                  |
| 5       | `tests/unit/notifications/*.test.ts`, `tests/integration/reminders.test.ts` | templates, quiet hours, retries, 1/2 replies                                        |
| 6       | `tests/integration/payments-webhooks.test.ts`                               | signatures, idempotency, refunds                                                    |
| 7       | `tests/integration/documents-access.test.ts`                                | signed URLs, access control, consent                                                |
| 8       | `tests/integration/public-api.test.ts`                                      | API keys, rate limits, outbound webhooks                                            |
| 10      | `tests/e2e/security.spec.ts`                                                | OWASP checks, headers, session expiry (automates the manual probes in QA_REPORT.md) |
