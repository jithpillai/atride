# @Ride System Design

This document defines the proposed technical architecture for @Ride. Functional behavior belongs in [use-cases.md](../requirements/use-cases.md), community activation belongs in [tenant-onboarding.md](../requirements/tenant-onboarding.md), and delivery sequencing belongs in the [roadmap](../planning/roadmap.md).

## 1. Architecture goals

- Serve the marketplace and every community from one codebase.
- Enforce strong tenant and role isolation.
- Prevent oversold rides and duplicate payment processing.
- Support public SEO pages and private operational screens.
- Keep authentication, bookings, payments, and notifications auditable.
- Support unreliable mobile networks during rides.
- Introduce operational complexity only when the product needs it.
- Keep external services replaceable through local adapters.
- Support private/unlisted Guilds without reducing their operating capabilities.
- Keep individual participant reputation private and relationship-scoped.
- Prepare stable APIs for PWA/wrapper and a possible later Android client.

## 2. System context

```text
Participants             Community staff                 @Ride staff
   |                           |                             |
   +---------------------------+-----------------------------+
                               |
                               v
                    @Ride web application / PWA
                               |
       +-----------------------+------------------------+
       |                       |                        |
       v                       v                        v
 Community UPI          Communication services    Maps and media
 accounts               In-app + Amazon SES        Google + Cloudinary
 optional gateway
                         SMS deferred
                               |
                               v
                    @Ride application platform
                  PostgreSQL + Redis + workers
```

@Ride is the system of record for communities, rides, bookings, payment obligations/status, staff assignments, check-ins, notifications, and audit history. The Guild's bank/UPI provider is the source of truth for actual fund movement; permitted Guild staff reconcile transaction references and protected proof in @Ride. An automated community-owned gateway may be added later without making @Ride the merchant or settlement intermediary.

## 3. Runtime architecture

@Ride starts as a TypeScript modular monolith. The web/API process and background worker are deployed separately but share the same repository, domain modules, schemas, and tests.

```text
Browser / Installable PWA
          |
          | HTTPS
          v
Wildcard DNS + TLS + CDN
atride.in / *.atride.in
          |
          v
Next.js web and API application
TypeScript on Node.js
  +----------------------+------------------------+
  | Server-rendered UI   | Route handlers/API     | Webhooks/SSE
  +----------------------+------------------------+
                         |
                         v
                Application/domain modules
  identity | tenants | rides | bookings | payments | tracking
  discovery | notifications | media | audit | reporting
             |                   |                 |
             v                   v                 v
     PostgreSQL/PostGIS        Redis        External providers
     authoritative data     cache/OTP/queue  UPI/SES/
                                             Maps/Cloudinary
             ^                   |
             |                   v
             +---------- TypeScript worker ----------+
                  BullMQ jobs, reminders, retries,
                  notification and expiry processing
```

The request-response application handles interactive web and API traffic. The worker handles work that must survive a closed browser, provider timeout, deployment restart, or scheduled execution.

## 4. Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Language | TypeScript | Frontend, backend, jobs, shared types, and tests |
| Web framework | Next.js App Router on Node.js | Pages, APIs, metadata, webhooks, and streaming |
| UI | React and Tailwind CSS | Responsive public and operational interfaces |
| UI primitives | Headless UI and Heroicons | Accessible components and icons |
| Forms/contracts | React Hook Form and Zod | Client forms and shared input validation |
| Authentication | Google OpenID Connect, email OTP, and opaque database sessions | Identity, account linking, revocation, and secure sessions |
| Database | PostgreSQL | Authoritative transactional data |
| Geospatial | PostGIS | Nearby discovery and route/location queries |
| ORM | Prisma | Typed data access, migrations, and transactions |
| Cache/ephemeral state | Redis | OTP, rate limits, caches, reservations, and live state |
| Queue | BullMQ | Delayed and asynchronous work |
| Media | Cloudinary initially | Images, transformations, and protected proof uploads |
| Payments | Dynamic UPI intent/QR plus manual reconciliation | Direct-to-Guild collection without platform settlement |
| SMS | Disabled initially | Optional compliant post-launch adapter |
| Email | Amazon SES v2 HTTPS API | Email OTP and transactional email |
| Maps | Google Maps Platform | Places, geocoding, maps, and route display |
| Live updates | Server-Sent Events initially | Participant ride-progress updates |
| Monitoring | Sentry and Pino | Error tracking and structured logs |
| Tests | Vitest, Testing Library, Playwright | Unit, integration, component, and browser coverage |
| Mobile delivery (later) | PWA/web wrapper, then React Native/Expo if approved | Installable web experience followed by evidence-gated Android |

Dependency versions will be pinned during Phase 0. External provider packages must not leak into domain modules; they are wrapped by application-owned interfaces.

## 5. Application boundaries

### 5.1 Presentation

- Public marketplace and location pages
- Personalized `Your upcoming rides` landing-page module
- Public community and ride pages
- Participant account, vehicle garage, and bookings
- Community management
- Captain ride console
- Platform administration
- In-app notification center
- Guild Hall, Ride Passport, awards, and verified community reviews
- Public Guild embed widgets

React Server Components render public pages and initial dashboard data. Client Components are limited to interaction-heavy features such as forms, filters, maps, uploads, and live progress.

Every user-initiated mutation must expose an immediate pending state. Server-action forms use the shared pending-submit primitive to disable repeat submission and mask the affected card or form until navigation or completion. Client API calls use the shared pending overlay plus a disabled initiating control. Pending copy describes the operation, remains accessible through `aria-live`/`aria-busy`, and is always followed by an explicit success, redirect, or retryable error state. New mutation UI is incomplete until this behavior is implemented and tested.

Client-side route changes must also acknowledge the first click immediately with the shared full-page navigation indicator, including cached App Router transitions and browser history navigation. All enabled links, buttons, and button-like controls must expose the pointer cursor; disabled controls must expose a disabled or waiting cursor. These interaction affordances are part of the definition of done for every new screen.

### 5.2 HTTP/API

Next.js route handlers expose JSON-over-HTTPS endpoints for web clients, provider callbacks, and a future mobile application. GraphQL is not required initially.

Each protected request performs:

1. Hostname normalization and tenant resolution.
2. Session verification.
3. Permission evaluation.
4. Zod input validation.
5. Application service invocation.
6. Tenant-scoped database work.
7. Typed response mapping.

### 5.3 Application services

Application services coordinate use cases such as:

- `applyForCommunity`
- `inviteCommunityStaff`
- `createRide`
- `publishRide`
- `reserveRideCapacity`
- `confirmOnlinePayment`
- `verifyOfflinePayment`
- `startRideGroup`
- `checkInCheckpoint`
- `getMyUpcomingRides`
- `getRidePassportSummaryForGuild`
- `grantGuildAward`
- `submitGuildReview`
- `resolveGuildVisibility`

They control transactions and call domain policies, repositories, providers, and the outbox.

### 5.4 Domain policies

Domain code owns rules for:

- Tenant boundaries
- Role and permission scopes
- Ride lifecycle transitions
- Booking eligibility
- Capacity and waitlist behavior
- Price snapshots
- Payment-state transitions
- Checkpoint sequencing
- Public/private visibility
- Cancellation and refund-state rules

### 5.5 Data access

Repositories use Prisma and require tenant context for tenant-owned records. Raw access that bypasses tenant scoping should be limited to reviewed platform-administration services.

### 5.6 Integration adapters

```text
PaymentIntentGenerator  Standard UPI deep-link and QR implementation
PaymentGateway          Optional future Razorpay implementation
SmsProvider          Disabled implementation; compliant provider optional later
EmailProvider        Amazon SES implementation
MediaProvider        Cloudinary implementation
MapsProvider         Google Maps implementation
LiveProgressStore    Redis implementation
```

Mocks implement the same interfaces for local development and automated tests.

### 5.7 Personalized landing-page projection

The public landing page should remain cacheable and SEO-safe. Authenticated ride data is loaded through an isolated protected component/API rather than being embedded in a shared public cache entry.

The upcoming-rides query combines active relationships:

```text
eligible bookings for user
UNION
active ride staff assignments for user
```

The application layer then:

1. Deduplicates by ride.
2. Combines role/relationship badges.
3. Adds booking, payment, starting-group, and next-action summaries.
4. Promotes live and action-required rides.
5. Sorts remaining rides by start time.
6. Returns a bounded initial list with a link to the complete account view.

Community-level administration is not an implicit personal ride relationship. A Community Admin sees a ride here only when explicitly assigned to it or booked on it.

The response is user-private and uses `private`/`no-store` behavior or an equivalently isolated user-scoped cache. It never contributes to public HTML metadata, structured data, sitemap content, or CDN cache entries.

Role badges in the projection are presentation data. Opening a ride invokes fresh tenant, session, booking, staff-assignment, and permission checks. Revoking a role therefore removes operational access even if a stale card remains briefly visible in a browser.

### 5.8 Participant profile and vehicle garage

The global participant profile is private by default and is not a public social profile. It stores home location, an explicitly unverified operational phone, emergency contact, canonical relationship/dietary values, optional self-reported blood group, and ride-relevant accessibility or medical notes. A Guild may receive these fields only through an eligible ride relationship and an authorized operational use case. Blood group is labelled unverified emergency-reference data and never substitutes for clinical blood typing or compatibility testing.

The vehicle garage is global to the participant and vehicle-neutral, with `BIKE` selected by default. The initial profile stores only the final two to four registration characters for recognition; a full registration identifier is deferred until field-level encryption and a concrete booking or verification purpose exist. Only one vehicle may be primary, enforced by a database partial unique index.

## 6. Proposed source organization

```text
src/
  app/                       Next.js routes and layouts
  components/                Shared UI and design system
  modules/
    auth/
    users/
    vehicles/
    communities/
    domains/
    memberships/
    invitations/
    rides/
    ride-groups/
    routes/
    checkpoints/
    bookings/
    capacity/
    waitlists/
    payments/
    tracking/
    discovery/
    promotions/
    notifications/
    communications/
    reputation/
    awards/
    reviews/
    embeds/
    media/
    audit/
  infrastructure/            Database, Redis, provider adapters
  jobs/                       Worker entry point and processors
  lib/                        Cross-cutting helpers
prisma/
  schema.prisma
  migrations/
tests/
```

This is a logical organization, not a requirement to make every module an independent package or service.

## 7. Multi-tenant design

### 7.1 Initial path routing and future hostnames

```text
atride.in                           -> marketplace
atride.in/guilds/royal-ravanas      -> Royal Ravanas tenant
atride.in/guilds/wild-gear          -> Wild Gear tenant
```

Phase 1 resolves a normalized route slug against an active community and creates trusted tenant context server-side. Unknown, private, or suspended tenants return the appropriate unavailable response. The server must not accept a browser-supplied `communityId` as proof of tenant access.

Subdomains remain a later routing adapter. When enabled, hostname resolution will produce the same tenant context used by path routing, so repositories and authorization policies do not depend on how the tenant was addressed.

### 7.2 Tenant isolation rules

- Tenant-owned tables contain a mandatory `communityId`.
- Tenant repositories require a resolved tenant context.
- Unique constraints include tenant scope where appropriate.
- Cache keys, storage paths, queue jobs, and audit records contain tenant identity.
- URLs and predictable IDs are not authorization mechanisms.
- Platform-support access is exceptional, time-bound where appropriate, and audited.
- Automated tests attempt cross-tenant reads and writes.

### 7.3 Domain records

```text
CommunityDomain
- id
- communityId
- hostname
- type: SUBDOMAIN | CUSTOM_DOMAIN
- status: PENDING | ACTIVE | SUSPENDED
- isPrimary
- verifiedAt
- createdAt
- updatedAt
```

Reserved names include `www`, `api`, `admin`, `app`, `auth`, `login`, `mail`, `support`, `help`, `status`, `payments`, `static`, `cdn`, `assets`, `blog`, and `security`.

### 7.4 Guild and ride visibility

Visibility is policy, not a single boolean:

```text
directoryVisibility: LISTED | UNLISTED
guildHallAccess: PUBLIC | VERIFIED_USERS | GUILD_MEMBERS | INVITE_ONLY
searchIndexing: INDEXABLE | NOINDEX
rideVisibility: PUBLIC | VERIFIED_USERS | GUILD_MEMBERS | INVITE_ONLY
```

The server evaluates visibility before fetching/serializing protected content. `UNLISTED` removes a Guild from marketplace queries and public marketplace sitemaps but does not disable its hosted site, administration, bookings, payments, or operations.

A Guild tenant page never contains another Guild's recommendations or schedule. Cross-Guild discovery exists only at the root marketplace and includes opted-in listed content.

### 7.5 Embed boundary

Embed endpoints are separate public read models for upcoming rides, a featured ride, calendar, or Guild summary. They contain only explicitly embeddable data and require an allowed parent-origin configuration enforced with CSP `frame-ancestors`.

Authentication, booking, payment, participant data, Ride Passport, administration, and precise location are not embedded. Actions top-level navigate to the Guild Hall/custom domain.

This avoids relying on third-party iframe cookies/storage and limits clickjacking/data exposure. Custom domains later reuse `CommunityDomain` for a first-party full experience.

## 8. Deferred DNS and TLS

Phase 1 does not require wildcard DNS or tenant certificates. All Guilds use `/guilds/{slug}` on the primary `atride.in` host. The following infrastructure applies only when subdomains are activated later.

Wildcard DNS sends first-level community subdomains to the same application. A self-hosted deployment with a stable IP could use:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | Server public IP |
| A | `*` | Server public IP |
| CNAME | `www` | `atride.in` |

The managed host may instead require CNAME targets or nameserver delegation. The host must automate TLS for `atride.in` and `*.atride.in`.

Important constraints:

- A wildcard does not cover the apex domain.
- Explicit DNS records take precedence over the wildcard.
- DNS routing does not itself provide HTTPS.
- `*.atride.in` covers `club.atride.in`, not `live.club.atride.in`.
- Deeper functionality uses paths such as `club.atride.in/live/{ride}`.

## 9. Vehicle-neutral ride model

`Ride` remains the branded umbrella term, but the core data model must not assume every ride uses a motorcycle. Every ride stores an explicit vehicle policy.

The ride-creation screen includes a required `vehicleType` selector. The initial default is `BIKE`, preserving the first motorcycle-focused launch while avoiding a bike-only schema.

Initial vehicle types:

```text
BIKE (default)
CAR
SUV
JEEP
OTHER
```

Drive capability is modeled separately because an SUV or car may have different drivetrains:

```text
TWO_WHEEL_DRIVE
ALL_WHEEL_DRIVE
FOUR_WHEEL_DRIVE
NOT_APPLICABLE
```

The model supports context-specific participant roles:

```text
RIDER
PILLION
DRIVER
CO_DRIVER
PASSENGER
CREW
```

Pricing declares its booking unit rather than assuming one rider equals one booking:

```text
PER_PERSON
PER_VEHICLE
PER_SEAT
PER_ROOM
PER_TEAM
```

The initial UI can expose only the combinations required for bikes. Four-wheel combinations are enabled deliberately after the workflows in [four-wheel-expansion.md](../planning/four-wheel-expansion.md) are validated.

### 9.1 Vehicle record

The generic `Vehicle` record can contain:

- Category/type
- Manufacturer, model, and year
- Registration number
- Ownership type
- Fuel type
- Seating capacity
- Drive type
- Engine capacity
- Ground clearance
- Images
- Validated category-specific attributes

Not every field applies to every vehicle. Shared fields remain relational columns, while a controlled specification structure may hold type-specific values. Arbitrary unvalidated JSON must not become the only vehicle model.

### 9.2 Ride vehicle policy

A ride can define:

- Primary vehicle type
- Additional allowed vehicle types, when mixed convoys are enabled
- Participant-owned, organizer-provided, or mixed vehicles
- Minimum/maximum engine capacity where relevant
- Required drive type and ground clearance
- Seating/occupancy rules
- Required equipment
- Required vehicle documents
- Vehicle-level and person-level capacity

Bike rides default to `BIKE`, rider/pillion terminology, and bike-appropriate requirements. Car and 4×4 interfaces use driver/passenger and convoy terminology without changing the underlying authorization, booking, payment, or checkpoint systems.

## 10. Data architecture

PostgreSQL/PostGIS is authoritative. Redis stores only short-lived or recomputable state.

### 10.1 Identity and authorization

- `users`
- `user_contacts`
- `participant_profiles`
- `vehicles`
- `sessions`
- `otp_challenges`
- `platform_role_assignments`
- `community_memberships`
- `community_role_assignments`
- `staff_invitations`
- `ride_staff_assignments`
- `ride_participations`
- `participation_roles`
- `ride_passport_preferences`
- `ride_passport_projections`

### 10.2 Communities

- `communities`
- `community_domains`
- `community_locations`
- `community_media`
- `community_settings`
- `community_payment_integrations`
- `community_visibility_settings`
- `embed_configurations`
- `guild_welcome_consents`
- `award_definitions`
- `award_grants`
- `ride_reviews`
- `community_rating_aggregates`
- `review_reports`

### 10.3 Rides

- `rides`
- `ride_media`
- `ride_groups`
- `ride_group_staff`
- `ride_route_segments`
- `ride_checkpoints`
- `ride_itinerary_days`
- `ride_itinerary_days.date` is a timezone-invariant calendar date; `scheduled_at` is optional and stores the exact event time when known, allowing multiple ordered events on one ride date.
- `ride_itinerary_items`
- `ride_accommodations`
- `ride_accommodation_amenities`
- `ride_meals`
- `ride_activities`
- `ride_pricing_options`
- `ride_payment_schedules`
- `ride_vehicle_policies`
- `ride_inclusions`
- `ride_exclusions`
- `ride_addons`
- `ride_rule_sets`
- `ride_policy_versions`
- `community_ride_policy_templates` (Guild defaults copied into new ride policy versions)
- `ride_status_history`
- `ride_ai_generations` (usage/status metadata only; no persisted prompt or response content)
- `ride_announcements` (regenerable canonical-data export snapshots)

Guild policy templates are authoring defaults, not live references. Creating a ride copies the current Guild templates into that ride’s independently editable versioned policies. Later Guild-template edits affect only future rides and never silently rewrite published rides or booking-policy snapshots.

The Ride Assistant is an optional server-side adapter around Gemini structured output. Browser code never receives the provider key. The API repeats tenant and ride-scoped authorization, applies common PII/source filtering, requests a strict JSON schema, normalizes bounded output into the existing editor formats, records only model/status/token metadata, and enforces daily user/ride generation limits. Generated content remains an unsaved proposal until a human selects and applies it. External Gemini is only a clipboard/open fallback and has no callback into @Ride.

### 10.4 Bookings and payments

- `bookings`
- `booking_participants`
- `booking_price_snapshots`
- `booking_package_snapshots`
- `booking_policy_acceptances`
- `booking_preferences`
- `booking_status_history`
- `capacity_reservations`
- `waitlist_entries`
- `payments`
- `offline_payment_proofs`
- `refunds`
- `waiver_versions`
- `waiver_acceptances`

The Phase 5 foundation maps this conceptual model into executable Prisma aggregates:

- `ride_bookings` owns the booking lead, ride, selected origin/lead role, vehicle choice, reservation expiry, consent timestamps, party seat count, aggregate prices, and immutable JSON package/policy snapshot. A lead may reference a saved garage vehicle, provide a booking-only minimal vehicle snapshot, or explicitly bring a compatible vehicle without disclosing its make, model, or registration. Booking-only details never create or update a global garage record.
- `booking_participants` stores the linked booking lead plus unregistered pillion/passenger companions with immutable display name, occupant role, diet, emergency-contact, accessibility, and ordering details. Companions do not become platform accounts or Guild members merely because a lead booked for them.
- `booking_add_ons` stores selected package add-ons and their immutable quantity/unit-price/total snapshot.
- `ride_accommodation_options` defines active included, per-person, or per-room offerings, occupancy, optional room inventory, and price. Retired options remain addressable for historical bookings.
- `booking_accommodation_selections` stores immutable stay/option names, pricing mode, unit price, required rooms, guest count, and total. This preserves the commercial agreement when a Guild later edits or retires an offering.
- `booking_payments` stores deposit, balance, full-payment, or other obligations independently from the booking lifecycle, including amount, due/submission timestamps, offline method, transaction reference, verification state, proof asset, finance reviewer, and review note. A confirmed advance confirms the reserved seat without falsely marking the later balance as paid.
- `community_payment_settings` stores the tenant-owned assisted-UPI toggle, validated VPA, payee display name, and participant instructions. Only Guild Owner/Admin roles mutate it; Finance may view the active recipient.
- Each UPI `booking_payments` obligation snapshots its VPA, payee name, and instructions when issued. The participant UI derives a standard exact-amount `upi://pay` intent and renders the same URI locally as a QR; no external QR service sees payment data. The bank-visible note begins with the booked participant's display name followed by `@Ride` and the ride title, making payments traceable when the payer account belongs to a parent, partner, or friend. Later Guild-setting changes never rewrite an existing non-null snapshot.
- `notification_outbox_events` stores one idempotent, recipient-specific delivery event for payment submission, confirmation, or rejection. Owner/Admin/Finance recipients receive review links; participants receive the finance decision. Provider failure leaves a retryable durable record rather than rolling back or losing the business event.

`media_assets` stores payment evidence using private authenticated Cloudinary delivery. `audit_logs` records reservation and finance decisions. Separate status-history, capacity-reservation, refund, and waiver tables remain targets for later increments where their independent lifecycles are required.

### 10.5 Ride operations

- `participant_attendance` (one record per booking participant, never only per booking lead)
- `participant_attendance_events` (append-only actor/time/checkpoint transition history)
- `ride_checkins`
- `location_updates`
- `ride_progress_events`
- `ride_incidents`
- `participant_checkins`
- `ride_announcements`
- `ride_announcement_acknowledgements`
- `ride_communication_channels`

Attendance bulk actions are bounded state transitions rather than blanket rewrites. Group start applies `CHECKED_IN -> STARTED`; group completion applies `STARTED -> COMPLETED`. `EXPECTED` remains open for late checkpoint admission until the whole ride is finally closed, when unresolved `EXPECTED -> NO_SHOW`. `CHECKED_IN` at final closure is an exception requiring review and may become `DID_NOT_START`. `DISCONTINUED` and `REMOVED` are terminal operational exceptions and are not overwritten by completion. Every transition stores the actor, timestamp, optional starting group/checkpoint, and note.

### 10.6 Platform and communication

- `promotions`
- `notification_templates`
- `notification_events`
- `notifications`
- `notification_deliveries`
- `notification_preferences`
- `outbox_events`
- `audit_logs`
- `support_access_grants`

Detailed Prisma fields and indexes will be introduced as versioned migrations during implementation. The conceptual model deliberately avoids freezing a schema before the use cases and invariants have executable tests.

## 11. Important data invariants

- A community domain maps to at most one active community.
- A community-owned record always has a community identifier.
- A role assignment has an explicit scope and assigner.
- Confirmed capacity never exceeds the permitted ride/group maximum.
- A booking stores immutable price, policy, and participant snapshots.
- Every ride stores an explicit vehicle type; `BIKE` is a UI default, not an implicit database assumption.
- Vehicle, occupant-role, pricing-unit, and capacity combinations must pass type-specific validation.
- A gateway payment event is processed once by provider event ID.
- Manual payment verification records the actor, time, amount, and evidence.
- A checkpoint check-in identifies its actor and ride group.
- Notification deliveries have stable idempotency keys.
- External communication invite links never appear in public responses, caches, metadata, or logs.
- A recorded external channel mode represents organizer-configured intent, not verified WhatsApp state.
- Individual Ride Passports, newcomer tiles, and awards are never public in the initial release.
- Completed-ride aggregates derive only from verified participation, not arbitrary bookings.
- @Ride has no public rider star-rating aggregate.
- Unlisted Guild data never enters root marketplace queries, recommendations, or sitemaps.
- Embed responses contain only explicitly public/embeddable fields and enforce allowed parent origins.
- Audit entries are append-only from normal application flows.

## 12. Transactional workflows

### 12.1 Capacity-safe booking

Within a database transaction:

1. Validate ride state, booking window, group, and eligibility.
2. Atomically check or lock relevant capacity.
3. Prevent prohibited duplicate bookings.
4. Create a time-limited capacity reservation.
5. Create the pending booking and price snapshot.
6. Commit an outbox event.

Online or verified offline payment later confirms the booking atomically. Expiry releases abandoned capacity. Concurrency tests must prove that simultaneous requests cannot consume the final slot twice.

The current PostgreSQL implementation serializes reservation attempts by locking the canonical ride row with `SELECT ... FOR UPDATE` and computes occupancy from capacity-holding booking states. `totalSlots` is the hard participant limit; assigned ride staff are operational roles outside that participant count. The legacy `buffer_slots` database column is exposed by the application as `waitlistCapacity` and limits queued participant seats only—it never increases ride capacity. Before accepting a new reservation, the same idempotent expiry processor used by scheduled maintenance handles that ride. It never expires a hold whose initial payment is `SUBMITTED` or `CONFIRMED`; genuinely unpaid holds become `EXPIRED`, capacity is recomputed, and the oldest eligible waitlisted booking receives a fresh time-limited hold and payment obligations. Authorized staff cancellation uses the same canonical ride lock, changes the booking to `CANCELLED` without deleting participant or financial evidence, recalculates the denormalized display counter, writes an audit event with the previous state and reason, and then safely attempts waitlist promotion. Confirmed or submitted funds are flagged for manual reconciliation and cannot be processed through the ordinary active-booking finance transition. The ride-level `bookedSlots` value is maintained as a denormalized display counter; it is never the sole source of truth for accepting a reservation. Audit and notification-outbox events are written in the same transaction, while email delivery remains outside it. Because this atomic workflow performs several Neon round trips while holding the ride lock, it uses a scoped 15-second interactive-transaction timeout and a five-second acquisition wait rather than Prisma's five-second runtime default. A protected global sweep endpoint handles rides that receive no subsequent booking traffic and can also be run by a platform administrator.

### 12.2 Optional gateway payment confirmation

1. Resolve the community integration using an unguessable integration token.
2. Verify the provider signature using the encrypted community secret.
3. Reject duplicate provider event IDs.
4. Validate order, booking, amount, and currency.
5. Save immutable gateway references.
6. Transition payment and booking in one transaction.
7. Write the confirmation event to the outbox.

The browser success page is never the payment source of truth.

### 12.3 Offline payment confirmation

1. Verify finance permission in the booking's community.
2. Validate booking, reservation, amount, and current state.
3. Store method, reference, proof, note, actor, and timestamp.
4. Transition payment and booking atomically.
5. Append audit and notification events.

### 12.4 Transactional outbox

Business updates and their outbox records commit together. A publisher moves pending events to BullMQ, and idempotent workers deliver notifications or integration work.

```text
Database transaction
  +-- change business state
  +-- insert outbox event
            |
            v
Outbox publisher -> BullMQ -> worker -> provider
                                  |
                                  +-> delivery status and retries
```

This avoids losing a message after a successful booking commit and avoids calling providers while a database transaction is open.

## 13. Authentication and OTP

Email OTP and Google OpenID Connect are the account authentication methods. A saved operational phone may optionally be verified once with Firebase Phone Authentication. Firebase proves control of the phone number but does not issue the @Ride application session or become an account database. Registration remains usable without phone verification, and ride/service SMS remains disabled.

```text
Request OTP
  -> normalize destination
  -> apply IP, session, and destination limits
  -> generate cryptographically secure code
  -> store protected challenge data in PostgreSQL with short expiry
  -> deliver through SES email (or the development adapter)
  -> verify with expiry and attempt checks
  -> consume challenge and mark contact verified
```

Controls:

- Short validity and one-time use
- Resend cooldown and attempt limit
- Rate limits by IP, device/session, and destination
- CAPTCHA escalation after suspicious behavior
- No account-existence disclosure in recovery flows
- No plaintext OTP in database, logs, analytics, or error reports
- Older challenge invalidation after resend

Development uses a safe mock email OTP provider. Staging tests the real SES integration.

The SES adapter uses Signature Version 4 over the SES v2 HTTPS API and send-only IAM credentials restricted to the `noreply@atride.in` From address. Provider failures invalidate the newly created OTP challenge so a participant can retry instead of being trapped behind the resend cooldown. Codes are never written to application logs, and only the local non-production mock provider may return a development code to the UI. Reserved `.test` identities automatically use this mock outside production so seeded role accounts remain testable while real addresses exercise SES.

Successful verification issues a high-entropy opaque session token in an `HttpOnly`, `SameSite=Lax`, secure production cookie. PostgreSQL stores only the token digest, expiry, last-seen time, and optional revocation time. Protected requests load current role assignments from authoritative data so role revocation is immediate. Redis may later provide distributed request throttling, but it is not required for the initial session or OTP semantics. See [ADR-013](decisions/ADR-013-opaque-database-sessions.md).

Firebase phone verification starts only for an authenticated user and a phone already saved on that user's profile. @Ride creates a short-lived, hashed, single-use challenge before the browser invokes Firebase reCAPTCHA/SMS. The confirmation API validates the Firebase ID-token signature and revocation state, requires a recent `phone` authentication, compares its trusted `phone_number` claim with both the challenge and current profile, and then atomically records `phoneVerifiedAt`, provider, a unique `PHONE` contact, and challenge consumption. Changing the profile phone clears these records and invalidates pending challenges. See [ADR-014](decisions/ADR-014-firebase-phone-verification.md).

Google OpenID Connect is an additional identity proof, not a separate account system. The authorization-code flow uses state, nonce, S256 PKCE, an encrypted short-lived `HttpOnly` flow cookie, exact redirect-URI matching, and Google signing-key verification. Only `openid email profile` scopes are requested. A new Google subject is linked to an existing AtRide user when Google supplies the same verified email; otherwise one common user is created. AtRide stores the stable provider subject and email-at-link but does not retain Google access or refresh tokens.

## 14. Notification architecture

@Ride centrally owns communication provider accounts. Communities provide branding, support contacts, and reply-to addresses, not SES or future SMS-provider secrets.

| Channel | Provider | Initial use |
| --- | --- | --- |
| Phone verification SMS | Firebase | Optional one-time verification of a saved Indian operational number |
| Ride/service SMS | Disabled initially | Optional final-phase messages after DLT readiness |
| Email | Amazon SES | Email OTP and transactional email |
| In-app | @Ride | Notification center and unread state |
| WhatsApp group | External/manual in MVP | Optional protected invite link to an organizer-managed group |
| Push | Later | PWA or native application notifications |

Provider interfaces:

```text
OtpProvider
SmsProvider (optional; disabled adapter initially)
EmailProvider
```

Initial event types include staff invitation, booking created/confirmed/expired, payment proof submitted/verified, waitlist offer, ride reminder, schedule change, cancellation, group start, important ride update, and ride completion.

Templates are versioned by event type, channel, locale, provider template ID, allowed variables, and status. Community staff select approved event types; arbitrary bulk SMS is not part of the MVP.

Every delivery records recipient, redacted destination, provider request ID, template version, attempt count, status, timestamps, and error category. Provider callbacks update delivered, bounced, failed, and suppressed states.

Security, transactional/service, and marketing communication are separate categories. Marketing requires separate consent and unsubscribe behavior.

### 14.1 Ride communication boundary

@Ride does not implement participant chat in the MVP. It owns the structured, authoritative communication layer:

- Pinned itinerary and assembly information
- Official ride announcements
- Schedule, route, accommodation, cancellation, and safety changes
- Operational checkpoint/group progress
- Critical participant acknowledgements
- Notification delivery history

Casual conversation and participant social interaction may occur in an optional organizer-managed WhatsApp group.

```text
RideCommunicationChannel
- id
- rideId
- type: WHATSAPP_GROUP
- mode: DISABLED | DISCUSSION | ANNOUNCEMENTS_ONLY
- inviteUrlEncrypted
- visibilityPolicy
- availableFrom
- expiresAt
- configuredBy
- configurationConfirmedAt
- status
```

`ANNOUNCEMENTS_ONLY` is the recommended enabled default. Because the normal WhatsApp group is managed outside @Ride, the organizer manually sets WhatsApp's group permission to allow only admins to send and confirms that configuration in @Ride. The platform stores intent and confirmation, not a guarantee of current external state.

Invite links are bearer-style access information. They are encrypted/protected at rest, returned only through an authorized endpoint, excluded from logs and analytics, and never included in public page HTML, metadata, sitemaps, or caches. Confirmed participants see a privacy notice before opening the link.

The MVP does not use unofficial WhatsApp-Web automation or depend on Meta Groups API eligibility. A future provider adapter may automate creation/settings only if the official API becomes practical for expected ride sizes and account eligibility.

```text
RideAnnouncement
- id
- rideId
- rideGroupId (optional)
- type
- urgency
- title/body or structured payload
- requiresAcknowledgement
- publishedBy
- publishedAt
- version
```

Announcements and acknowledgement records are tenant-scoped and auditable. Critical messages use the transactional outbox to fan out to in-app and email channels without making provider delivery part of the publish transaction. An optional SMS adapter may subscribe to approved events only after Phase 12.

## 15. Media and maps

Cloudinary is the accepted initial media provider. It stores community logos/covers/galleries, ride media, route images, user avatars, and protected payment proofs. Upload authorization is tenant- and purpose-scoped, browser uploads use short-lived server-signed parameters, and Neon stores only provider identifiers, ownership, dimensions, format, size, access policy, ordering, and audit metadata—not image binaries or expiring delivery URLs.

Phase 3A implements direct signed browser uploads with server-generated public IDs scoped to the authenticated user or authorized Guild. After upload, the server independently fetches authoritative Cloudinary resource metadata, rejects unsupported formats or excessive sizes, and only then links the asset in PostgreSQL. User avatars use Cloudinary authenticated delivery and signed URLs; published Guild logos, covers, and galleries use public CDN delivery. Replacement updates the database relationship transactionally before best-effort deletion of the superseded provider asset. SVG is initially rejected.

Repository-owned default rider, Guild, and Guild Hall cover images provide deterministic fallbacks when no media relationship exists or a Cloudinary delivery request fails. Defaults contain no tenant/user identity and are replaced automatically whenever a valid uploaded asset is available.

Public Guild and published-ride media uses CDN delivery and controlled transformations. A Guild Hall retains its bounded, administrator-curated gallery and also derives two non-owning visual feeds: the nearest three public upcoming rides and latest three public completed rides, using each ride cover plus at most two public gallery assets. These feeds reference the original ride assets, link back to the source ride, lazy-load horizontally, and never duplicate Cloudinary records. User avatars are authenticated by default because individual profiles are not public. Payment proofs, incident/evidence media, and identity/vehicle documents use authenticated/private delivery with short-lived signed URLs. Upload policies enforce MIME/format and size limits, automatic resizing/orientation, metadata/EXIF removal, replacement/delete authorization, tenant quotas, and orphan cleanup. A `MediaProvider` adapter preserves the option to move object storage later without changing domain records.

Google Maps uses separate restricted keys for browser and server traffic. Browser keys are restricted by approved origins and APIs; server keys are kept out of the client and restricted according to the deployment. Only required APIs are enabled.

Coordinates are stored in PostGIS for origins, operating areas, destinations, checkpoints, and proximity queries. Google provider identifiers may be stored alongside normalized application-owned location data.

## 16. Live ride progress

The first release tracks authorized crew and checkpoint progress rather than continuously tracking every participant.

- Redis holds current ephemeral group state and last-known authorized crew position.
- PostgreSQL stores durable checkpoint, progress, and periodic location events.
- Server-Sent Events push authorized updates to confirmed participants.
- Starting groups remain independent until their configured merge point.
- Public pages may show a coarse state such as `In progress`, never precise coordinates.
- Location visibility and retention expire after the ride according to policy.

The client must show pending, successful, and retry states so captains can operate on weak networks without unknowingly duplicating check-ins.

## 17. Security architecture

### 17.1 Access control

- Central permission policy rather than scattered role-name checks
- Individual accounts for staff
- MFA/step-up authentication for sensitive administration
- Separate financial and ride-operation permissions
- Immediate role revocation
- Audit history for role, payment, capacity, publication, and tracking changes

### 17.2 Secrets

- Environment-specific secrets in a managed secret store
- No secrets in Git, logs, analytics, or client bundles
- Community gateway credentials encrypted at rest with a platform master key
- Restricted decryption inside the payment adapter only
- Credential rotation and immediate disablement
- Redacted structured logs

### 17.3 Personal and location data

- Collect only information required for a defined purpose
- Version and record waivers and consent
- Limit participant manifests and emergency data to authorized roles
- Use post-ride access and retention limits
- Audit exceptional platform-support access
- Never expose precise live location publicly
- No public individual participant profile mode in the initial release
- Relationship-scoped Ride Passport summaries with a preview of disclosed fields
- Per-Guild consent for newcomer and award display
- Member-only newcomer queries that require active viewer and subject memberships, retain revocation, and expose only first name, optional avatar, city, and join date
- No cross-Guild negative notes or rider score

### 17.4 Provider callbacks

- Verify signatures where supported
- Use idempotency keys/provider event IDs
- Apply size, content-type, and rate limits
- Avoid logging raw sensitive payloads
- Retry safely and dead-letter exhausted failures

## 18. Reliability and observability

- Idempotent webhooks and jobs
- Automated PostgreSQL backups and tested restores
- Health checks for web, worker, database, Redis, and queue lag
- Structured logs with request, tenant, user, and correlation IDs where safe
- Error reporting with personal-data redaction
- Retry policies with exponential backoff
- Dead-letter handling and operational alerts
- Rate limiting for authentication, OTP, bookings, uploads, and callbacks
- Metrics for booking conversion, payment confirmation, queue lag, and delivery health

## 19. Deployment environments

| Environment | Purpose |
| --- | --- |
| Local | Docker PostgreSQL/PostGIS, Redis, Mailpit, and mocked external providers |
| CI | Isolated automated checks with temporary data services |
| Staging | Production-like deployment using test/sandbox provider credentials |
| Production | Isolated data, secrets, provider accounts, DNS, monitoring, and backups |

Recommended deployment shape:

- Next.js web/API on a managed Next.js platform or equivalent Node host with wildcard TLS
- Worker on a continuously running container service
- Managed PostgreSQL/PostGIS with connection pooling and point-in-time recovery
- Managed Redis with TLS and queue-suitable persistence
- Cloudinary for media
- Wildcard staging and production DNS

Web and worker deploy from the same repository but scale independently.

## 20. SEO boundaries

Public server-rendered pages:

- Marketplace
- City and destination discovery
- Community profiles
- Published ride details
- Public unlisted Guild pages only when that Guild separately enables indexing

Private or non-indexable pages:

- Draft rides
- Login and account recovery
- Checkout and payment
- Participant manifests
- Community/platform administration
- Participant-only progress and precise live location
- Individual Ride Passports, newcomer tiles, and participant awards

Public pages use canonical URLs, dynamic metadata, sitemaps, social images, and accurate `WebSite`, `Organization`, and `Event` structured data where applicable.

Root marketplace sitemaps and location pages include only `LISTED` content. Embed endpoints are not competing canonical pages. Custom-domain rollout defines one canonical per public page and redirects/canonical annotations as appropriate.

## 21. Testing strategy

- Unit tests for domain policies and state transitions
- Database integration tests for constraints and transactions
- Cross-tenant authorization tests
- Concurrency tests for final-slot booking
- Contract tests for provider adapters
- Webhook signature and idempotency tests
- Worker retry and dead-letter tests
- Component accessibility tests
- Playwright journeys for bike riders, four-wheel participants, organizers, captains, and platform roles as those modes are enabled
- Staging smoke tests using real provider sandboxes
- Backup restore, load, and security testing before launch

## 22. PWA, wrapper, and future mobile client

The web application is completed and launched first. Mobile delivery proceeds in stages:

```text
Responsive web -> installable PWA -> optional packaged web wrapper
               -> native Android only after an evidence-based decision gate
```

The PWA adds installation, manifest/icons, deep links, safe offline shell/read behavior, network retry states, and selected idempotent offline actions. It does not promise reliable background location.

A packaged wrapper reuses the completed web product and is validated for login, payments, deep links, uploads, notifications, updates, accessibility, and back navigation before store release.

If native Android is approved, the proposed client is React Native/Expo. It uses versioned JSON APIs and never connects directly to PostgreSQL or Redis. Shared code is limited to contracts, schemas, enums, permissions, tokens, and utilities rather than forcing web UI reuse.

Backend mobile readiness includes:

- Rotating/revocable mobile access and refresh tokens
- Device-session and push-token records
- Idempotency keys and sync-friendly endpoints
- Signed uploads and deep links
- Identical tenant/role enforcement
- Offline command conflict handling

Background location is native-only/evidence-gated, restricted to explicitly consenting authorized crew during an active ride, and subject to Android/Play disclosure, foreground-service, privacy, retention, and review requirements.

See [mobile strategy](../planning/mobile-strategy.md).

## 23. Architecture evolution

The modular monolith should remain until scale or organizational boundaries provide measured reasons to extract a service. Likely future extraction candidates are notifications and high-frequency live tracking. Extraction is not an MVP requirement.

Architecture changes that affect data ownership, deployment boundaries, security, or core providers should be recorded as ADRs in [decisions](decisions/README.md).
