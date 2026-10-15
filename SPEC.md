# Clinic Appointment System: Claude Code Build Instructions

## How to use this file

1. Create an empty project folder and save this file in it as `SPEC.md`.
2. Open Claude Code in that folder.
3. Paste the **Kickoff Prompt** (Part 1) as your first message.
4. After each phase, review, test in the browser, then say: `Proceed to the next phase.`

Part 2 is the full specification Claude Code will follow. Edit anything marked **[DECIDE]** before starting.

## Decisions log

| Item                | Decision                                                                         | Date       |
| ------------------- | -------------------------------------------------------------------------------- | ---------- |
| Target region       | Pakistan: PKR, Asia/Karachi, English + Urdu (RTL)                                | 2026-10-15 |
| Tenancy             | Multi-tenant SaaS (many clinics)                                                 | 2026-10-15 |
| Deployment          | VPS / Docker (long-lived Node processes, BullMQ workers, SSE)                    | 2026-10-15 |
| Auth library        | Better Auth instead of Auth.js (phone OTP, TOTP 2FA, orgs, DB sessions built in) | 2026-10-15 |
| Project location    | `D:\Claude` (outside OneDrive)                                                   | 2026-10-15 |
| Payment providers   | Open: decide before Phase 6                                                      |            |
| Telehealth provider | Open: decide before Phase 7                                                      |            |
| Regulations         | Open: decide before Phase 10                                                     |            |

---

# PART 1: Kickoff Prompt (paste this into Claude Code)

```
Read SPEC.md in full. It describes a production-grade, multi-clinic appointment
booking platform. Build it phase by phase exactly as listed in "Build Phases".

Working rules:
- Before writing code, use plan mode to produce an architecture plan: folder
  structure, database schema (Prisma), API route list, and the third-party
  services per feature. Wait for my approval.
- Then create CLAUDE.md in the repo root summarizing the stack, conventions,
  commands (dev, test, lint, migrate, seed), and key architecture decisions,
  so future sessions have context. Keep it updated as the project evolves.
- Work one phase at a time. At the end of each phase: run lint, type-check
  and all tests; fix failures; update CLAUDE.md; commit with a clear message;
  then give me a short summary and how to test it manually. Stop and wait.
- Every external integration (SMS, WhatsApp, email, payments, video, calendar)
  must sit behind an interface with a mock/console implementation so the app
  runs fully locally with no paid accounts. Real providers are enabled via env.
- Never hard-code secrets. Maintain .env.example with every variable documented.
- Ask me before adding any paid service, changing the stack, or making a
  decision marked [DECIDE] that I haven't filled in.
- Write tests as you go: unit tests for the scheduling engine (it's the core;
  aim for very high coverage there), integration tests for API routes, and
  Playwright end-to-end tests for the main booking flows.
- Treat all patient data as sensitive health data (see Security section).

Start with the architecture plan now.
```

---

# PART 2: Specification

## 1. Product overview

A web platform where patients book, reschedule and cancel clinic appointments online, and clinic staff manage doctors' schedules, the daily queue, reminders, payments and reporting. It supports multiple clinics (multi-tenant), multiple branches per clinic, and multiple doctors/providers per branch.

**Users / roles**

| Role              | What they do                                                                   |
| ----------------- | ------------------------------------------------------------------------------ |
| Patient           | Book/reschedule/cancel, pay, fill intake forms, join video visits, see history |
| Receptionist      | Book on behalf of patients, walk-ins, check-in, manage queue, take payments    |
| Doctor / Provider | Own calendar, availability, leave, visit notes summary, telehealth             |
| Clinic Admin      | Branches, services, staff, pricing, policies, branding, reports                |
| Super Admin       | Platform-level: clinics, plans, billing, system health                         |

**[DECIDED]**

- Target country/region: Pakistan, PKR, Asia/Karachi, English + Urdu.
- Single clinic or SaaS for many clinics: multi-tenant SaaS.

## 2. Tech stack (defaults; change if you prefer)

- **Framework:** Next.js (App Router) + TypeScript, strict mode
- **UI:** Tailwind CSS + shadcn/ui, responsive, mobile-first; installable PWA
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Better Auth (decided; replaces Auth.js) — email/password, phone OTP, Google sign-in; optional 2FA (TOTP) for staff
- **Background jobs:** Redis + BullMQ (reminders, sync, retries, reports)
- **Validation:** Zod on every API input
- **Realtime:** Server-Sent Events or Pusher/Ably for live queue and calendar updates
- **File storage:** S3-compatible (AWS S3 / Cloudflare R2), signed URLs only
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **Dev environment:** Docker Compose for Postgres + Redis + Mailpit
- **Deployment:** **[DECIDED]** VPS/Docker. Include a Dockerfile.
- **Observability:** structured logging (pino), Sentry for errors, health-check endpoint

## 3. Core features

### 3.1 Patient booking (public site, per clinic)

- Clinic landing page with branding, branches, services, doctor profiles (photo, specialty, qualifications, languages, fees, ratings)
- Search/filter: specialty, doctor, branch, date, gender of doctor, language, in-person vs video, fee range
- Booking flow: service → doctor (or "first available") → date → time slot → patient details → intake form → payment (if required) → confirmation
- Guest booking with phone OTP verification, or account login
- Book for family members (dependents under one account)
- Confirmation page + email/SMS/WhatsApp confirmation with "Add to Calendar" (.ics, Google, Outlook links)
- Self-service reschedule/cancel via secure magic link, respecting clinic policy (e.g. no cancellations within X hours)
- Waitlist: join for a full day/doctor; auto-offer freed slots to waitlisted patients first-come with a time-limited hold
- Patient portal: upcoming/past appointments, receipts, documents, prescriptions uploaded by clinic, profile, dependents, notification preferences

### 3.2 Scheduling engine (most critical — build carefully and test heavily)

- Weekly recurring availability per doctor per branch, with multiple shifts per day
- Date overrides: extra hours, reduced hours, leave/holidays, clinic-wide closures, public holiday calendar
- Service-based durations (e.g. consultation 15 min, procedure 45 min) and per-service buffer before/after
- Resources: rooms and equipment; a slot is only free if doctor AND required resources are free
- Slot capacity >1 for group sessions; overbooking allowance configurable per doctor
- Minimum notice (e.g. 2 hrs) and maximum booking horizon (e.g. 60 days)
- **Concurrency-safe booking:** temporary slot hold (e.g. 10 min) during checkout; DB-level constraint/transaction to make double-booking impossible even under simultaneous requests; test this explicitly
- All times stored in UTC; displayed in branch timezone; DST-safe
- Recurring appointments (e.g. weekly physiotherapy x 8 sessions) with conflict detection
- Token/queue-number mode as an alternative to fixed times (common in walk-in clinics): patients get a token and estimated time

### 3.3 Reception / front desk

- Day view and week view calendars per doctor and per branch, drag-and-drop reschedule
- Quick-book on behalf of a patient (search by phone/name/MR number), walk-in registration
- Check-in (manual, QR code scan, or self-service kiosk page), status flow: Booked → Confirmed → Checked-in → In consultation → Completed / No-show / Cancelled
- Live queue board: waiting list with wait times; TV display mode for the waiting room (token numbers, no full patient names)
- Collect payment at desk (cash/card/wallet), print or send receipt
- Block slots, mark doctor running late (auto-notify waiting patients with new estimated time)

### 3.4 Doctor view

- Personal schedule (today/week), next patient, patient summary (visit history, intake answers, uploaded reports)
- Manage own availability and leave (with admin approval option)
- Start telehealth call from the appointment
- Brief visit note + follow-up booking ("book follow-up in 2 weeks") in one click
- Mobile-friendly

### 3.5 Notifications & reminders

- Channels: email, SMS, WhatsApp, web push; patient chooses preferences
- Events: booking confirmed, rescheduled, cancelled, reminder (configurable: e.g. 24 h and 2 h before), doctor running late, waitlist slot available, payment receipt, follow-up due, feedback request after visit
- Two-way confirmation: patient replies 1 to confirm / 2 to cancel (SMS/WhatsApp), status updates automatically
- Editable templates per clinic, per language, with variables ({patient_name}, {doctor}, {time}, {branch_map_link})
- Delivery log with status and retries; quiet hours respected

### 3.6 Payments

- Modes per service: free, pay at clinic, deposit online, full prepay
- Providers behind a common interface: **[DECIDE]** Stripe (international), and for Pakistan: JazzCash, Easypaisa, and/or a card gateway (e.g. PayFast/Safepay)
- Refund rules tied to cancellation policy; no-show fees optional
- Invoices/receipts (PDF), discount codes, packages (e.g. 5-session bundle)
- Webhook handling with signature verification and idempotency

### 3.7 Telehealth

- Video visits via provider behind an interface: **[DECIDE]** Daily.co / Twilio Video / Zoom / Google Meet link generation
- Secure join link valid only near appointment time; waiting room; doctor admits patient
- Fallback: send meeting link via SMS/WhatsApp

### 3.8 Forms, consent & documents

- Form builder for clinic admins: intake questionnaires per service (text, choice, date, file upload, signature)
- E-consent with signature capture and timestamp
- Patients upload previous reports/images before the visit
- All documents linked to patient record; access-controlled

### 3.9 Integrations

- **Calendar sync:** two-way Google Calendar and Microsoft 365/Outlook for doctors (busy times block slots; appointments pushed to their calendar)
- **Messaging:** WhatsApp Business Cloud API, Twilio (or local SMS gateway) for SMS, Resend/SendGrid/SMTP for email
- **Maps:** branch location with Google Maps link/embed
- **Embeddable booking widget:** a script/iframe clinics can place on their own website
- **Public REST API + webhooks** for clinics (appointment.created, .cancelled, etc.) with API keys and rate limits
- **Optional/later:** HL7 FHIR export (Patient, Appointment, Practitioner, Schedule, Slot resources) for EMR/EHR interoperability; Google Business Profile "Book" link
- **Optional AI assistant:** a chat/WhatsApp bot that answers FAQs and books/reschedules using the same booking API (behind a feature flag; never gives medical advice; hands off to staff)

### 3.10 Admin & reporting

- Clinic settings: branding (logo, colors), branches, working hours, services, pricing, policies, languages, notification templates
- Staff management with roles and per-branch permissions; invite by email
- Dashboard: today's appointments, utilization %, no-show rate, cancellations, revenue, new vs returning patients, peak hours, per-doctor performance
- Export to CSV/Excel; scheduled email reports
- Patient feedback/ratings after visits, moderation before publishing
- Super admin: clinic onboarding, subscription plans, usage, feature flags

## 4. Non-functional requirements

### Security & privacy (treat as health data)

- Role-based access control enforced server-side on every query; tenant isolation (every query scoped by clinicId; add tests proving one clinic can't read another's data)
- Encryption in transit (HTTPS) and at rest; sensitive fields (medical notes, documents) additionally encrypted
- Audit log of who viewed/changed which patient record and when
- Rate limiting and bot protection on public booking and OTP endpoints
- Session timeout for staff, 2FA option, password policy
- Data export and deletion on patient request; configurable retention
- Design to be compatible with HIPAA / GDPR-style principles and local data-protection rules **[DECIDE: which regulations apply]**
- Dependency vulnerability scanning; OWASP Top 10 checklist in final phase

### Quality

- Accessibility: WCAG 2.1 AA (keyboard navigation, screen readers, contrast)
- i18n: English + Urdu (with full RTL layout support); locale-aware dates, currency
- Performance: booking pages load fast on 3G mobile; slot search under ~300 ms for typical clinic size
- Reliability: idempotent job processing, retries with backoff, graceful failure if a provider is down
- Seed script with a realistic demo clinic (2 branches, 6 doctors, services, 2 weeks of appointments)

## 5. Data model (starting point; Claude Code should refine)

Clinic, Branch, User, Role/Permission, StaffMember, Doctor(Provider), Specialty, Service, DoctorService (price/duration overrides), Resource (room/equipment), AvailabilityRule, AvailabilityOverride, Holiday, Patient, Dependent, Appointment, AppointmentStatusHistory, SlotHold, RecurringSeries, WaitlistEntry, QueueToken, Payment, Refund, Invoice, Package, DiscountCode, FormTemplate, FormResponse, ConsentRecord, Document, NotificationTemplate, NotificationLog, CalendarConnection, TelehealthSession, Feedback, ApiKey, Webhook, WebhookDelivery, AuditLog, FeatureFlag.

## 6. Build phases

Each phase ends with passing tests, a commit, and a manual-testing summary.

1. **Foundation:** project setup, Docker Compose, Prisma schema v1, auth with roles, multi-tenant scaffolding, layout/design system, seed data, CI (lint + typecheck + tests)
2. **Scheduling engine:** availability, overrides, services, resources, slot generation, holds, concurrency-safe booking. Exhaustive unit tests, including timezone/DST and race conditions
3. **Patient booking flow:** public clinic page, search, booking wizard, guest OTP, confirmation, reschedule/cancel links, .ics
4. **Staff dashboards:** reception calendar, walk-ins, check-in, queue board + TV display, doctor view, admin settings
5. **Notifications:** provider interfaces, templates, reminder jobs, two-way confirmation, delivery logs
6. **Payments:** provider interface, deposits/prepay, webhooks, refunds, receipts
7. **Telehealth, forms & documents:** video provider, form builder, e-consent, uploads
8. **Integrations:** Google/Outlook calendar sync, embeddable widget, public API + webhooks, waitlist auto-offers
9. **Reporting & patient portal polish:** analytics dashboard, exports, feedback, family accounts
10. **Hardening:** security review, audit logs check, accessibility audit, i18n/RTL pass, performance, PWA, Dockerfile, deployment guide, README
11. **Optional:** AI booking assistant, FHIR export, mobile app (React Native/Expo sharing the API)

## 7. Definition of done

- A patient can book, pay, get reminded, reschedule and join a video visit end-to-end on a phone
- Staff can run a full clinic day (walk-ins, queue, check-in, payments) without leaving the app
- No double bookings possible under concurrent load (proven by test)
- No cross-clinic data leakage (proven by test)
- Runs locally with `docker compose up` + one seed command, with all external services mocked
- README and CLAUDE.md fully describe setup, env vars, architecture and deployment
