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
 Community Razorpay      Communication services    Maps and media
 accounts                MSG91 + Amazon SES         Google + Cloudinary
                               |
                               v
                    @Ride application platform
                  PostgreSQL + Redis + workers
```

@Ride is the system of record for communities, rides, bookings, payment status, staff assignments, check-ins, notifications, and audit history. Razorpay remains the payment processor and merchant record source for online transactions performed through each community's account.

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
     authoritative data     cache/OTP/queue  Razorpay/MSG91/SES/
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
| Authentication | Auth.js sessions plus @Ride OTP | Identity and secure sessions |
| Database | PostgreSQL | Authoritative transactional data |
| Geospatial | PostGIS | Nearby discovery and route/location queries |
| ORM | Prisma | Typed data access, migrations, and transactions |
| Cache/ephemeral state | Redis | OTP, rate limits, caches, reservations, and live state |
| Queue | BullMQ | Delayed and asynchronous work |
| Media | Cloudinary initially | Images, transformations, and protected proof uploads |
| Payments | Razorpay SDK/API | Community-owned online checkout and webhooks |
| SMS | MSG91 | Phone OTP and transactional SMS |
| Email | Amazon SES | Email OTP and transactional email |
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
PaymentGateway       Razorpay implementation
SmsProvider          MSG91 implementation
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

### 7.1 Hostname routing

```text
atride.in                    -> marketplace
royalravanas.atride.in       -> Royal Ravanas tenant
wildgear.atride.in           -> Wild Gear tenant
admin.atride.in              -> reserved platform administration
```

The request hostname is normalized and matched against an active `CommunityDomain`. Unknown or suspended tenants return a proper 404. The server must not accept a browser-supplied `communityId` as proof of tenant access.

The Next.js proxy/middleware layer performs only fast hostname validation, reserved-host checks, and rewrites. Cached server services perform community lookup and authorization; slow database work should not be placed directly in middleware.

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

## 8. DNS and TLS

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
- `ride_pricing_options`
- `ride_vehicle_policies`
- `ride_inclusions`
- `ride_addons`
- `ride_status_history`

### 10.4 Bookings and payments

- `bookings`
- `booking_participants`
- `booking_price_snapshots`
- `booking_status_history`
- `capacity_reservations`
- `waitlist_entries`
- `payments`
- `offline_payment_proofs`
- `refunds`
- `waiver_versions`
- `waiver_acceptances`

### 10.5 Ride operations

- `ride_checkins`
- `location_updates`
- `ride_progress_events`
- `ride_incidents`
- `participant_checkins`
- `ride_announcements`
- `ride_announcement_acknowledgements`
- `ride_communication_channels`

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

### 12.2 Online payment confirmation

1. Resolve the community integration using an unguessable integration token.
2. Verify the Razorpay signature using the encrypted community secret.
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

Phone and email are verified independently. Phone verification is required for participant registration; final product policy will determine whether email is also mandatory.

```text
Request OTP
  -> normalize destination
  -> apply IP, session, and destination limits
  -> generate cryptographically secure code
  -> store protected challenge data in Redis with short TTL
  -> deliver through MSG91 or SES
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

Development uses a safe mock OTP provider. Staging tests real MSG91 and SES integrations.

## 14. Notification architecture

@Ride centrally owns communication provider accounts. Communities provide branding, support contacts, and reply-to addresses, not MSG91 or SES secrets.

| Channel | Provider | Initial use |
| --- | --- | --- |
| SMS | MSG91 | Phone OTP and essential transactional messages |
| Email | Amazon SES | Email OTP and transactional email |
| In-app | @Ride | Notification center and unread state |
| WhatsApp group | External/manual in MVP | Optional protected invite link to an organizer-managed group |
| Push | Later | PWA or native application notifications |

Provider interfaces:

```text
OtpProvider
SmsProvider
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

Announcements and acknowledgement records are tenant-scoped and auditable. Critical messages use the transactional outbox to fan out to in-app, email, and SMS channels without making provider delivery part of the publish transaction.

## 15. Media and maps

Cloudinary stores community logos, ride media, route images, galleries, and protected payment proofs. Sensitive media uses authenticated delivery or short-lived signed URLs.

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
