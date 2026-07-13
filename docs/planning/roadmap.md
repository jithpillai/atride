# @Ride Implementation Roadmap

This roadmap splits development into phases that each end with a deployable, testable user journey. It is the authoritative source for phase scope, acceptance tests, development environments, external accounts, and credentials.

Most external accounts are not required immediately. Development can begin with local PostgreSQL, Redis, disabled SMS, mock email, placeholder maps, and Razorpay test doubles. Real provider accounts become necessary progressively.

Current infrastructure status:

- `atride.in` is live on Vercel.
- Neon PostgreSQL/PostGIS is provisioned and the initial migration/seed are active.
- The `atride.in` identity is configured in Amazon SES and sandbox access is available.
- SES production-access approval has been requested and is pending.
- The SES email adapter and branded OTP template are implemented; both the mailbox-simulator smoke test and real OTP delivery to a verified sandbox recipient have passed.
- SMS is explicitly outside the launch critical path and is deferred to an optional final phase. Cloudinary media uploads are active; maps, Redis workers, and payments remain deferred to their delivery phases.
- Phase 2 foundations are implemented: Google OpenID Connect plus email OTP, opaque sessions, account/logout, first-login onboarding, private participant profiles, a vehicle garage, seeded roles, optional Firebase phone verification, and protected platform/Guild authorization boundaries. Personalized upcoming rides and distributed abuse controls remain scheduled with their dependent phases.
- Phase 3A and the first testable Phase 3B staff-management slice are implemented. Platform administrators can onboard Guilds; Owners/Admins can manage branding, visibility, official links, operating cities, member status, staff invitations and roles, and inspect tenant-scoped audit history.
- Phase 4A is active: authorized Ride Managers can create tenant-scoped drafts, maintain flexible multi-origin plans, itinerary, accommodation, package items, meals, activities, linked commercial dates, versioned policies, ride crew, cover/gallery media, and publication state. Guild-level policy templates are collected during onboarding and snapshot into each new ride. Copyable AI-formatting prompts, local image previews, and multi-select galleries reduce organizer entry effort. Public ride pages render the canonical package. Rich repeatable add/remove controls, origin-specific staff, announcement export, and publication-state refinements remain in Phase 4.

Related documents:

- [Project overview](../../README.md)
- [System design](../architecture/system-design.md)
- [Functional use cases](../requirements/use-cases.md)
- [Tenant onboarding](../requirements/tenant-onboarding.md)
- [Guild Hall and reputation](../requirements/guild-hall-and-reputation.md)
- [Guild visibility and embedding](../requirements/guild-visibility-and-embedding.md)
- [Four-wheel expansion considerations](four-wheel-expansion.md)
- [Mobile delivery strategy](mobile-strategy.md)

## Proposed development phases

| Phase | Deliverable | Testable outcome |
|---|---|---|
| 0 | Engineering foundation | Application builds, database migrates, CI passes, staging deploys |
| 1 | Guild sites, optional marketplace, and tenancy | Wildcard Guild sites and opt-in discovery work |
| 2 | Identity and authorization | Participant registration, OTP, login, roles, vehicle profiles, and tenant isolation work |
| 3 | Community management | Community administrators manage profile, staff, and invitations |
| 4 | Ride creation | Staff create and publish multi-origin rides |
| 5 | Booking and offline payment | Participants reserve slots and administrators verify payments |
| 6 | Community-owned Razorpay | Online payments go directly to each community |
| 7 | Notifications | OTP, confirmations, reminders, and event messages are delivered reliably |
| 8 | Ride operations | Captains start groups and update checkpoint progress |
| 9 | Production hardening | Security, SEO, monitoring, backups, and launch readiness are verified |
| 10 | PWA and web wrapper | Completed web product becomes installable and optionally store-packaged |
| 11 | Optional native Android | Native/offline/tracking client proceeds only after evidence-based approval |
| 12 | Optional compliant Indian SMS | DLT-compliant OTP/service SMS is considered only when documentation and usage justify it |

### Phase 0 — Engineering foundation

Build:

- Next.js/TypeScript project
- Tailwind and base @Ride design system
- PostgreSQL/PostGIS and Redis
- Prisma schema and migrations
- Vehicle-neutral core entities with `BIKE` as the ride-creation default
- Test framework
- GitHub Actions
- Local, test, staging, and production configuration
- Health-check endpoint
- Structured logging and error boundary
- Mock provider adapters

Acceptance tests:

- A new developer can run the application using documented commands.
- PostgreSQL and Redis start locally.
- Database migrations run on an empty database.
- Unit, integration, lint, and build checks pass.
- A staging environment deploys successfully.
- No secrets exist in Git.

External accounts needed: none. Local mock services are enough.

### Phase 1 — Guild sites, optional marketplace, tenancy, and SEO

Build:

- `atride.in` landing page
- Community directory and tiles
- Upcoming and trending ride sections
- City and location filters
- Community public pages
- Listed/unlisted Guild directory policy and public/private Guild access foundation
- Path-based tenant resolution using `/guilds/{slug}`; hostname routing is deferred
- Community themes
- Metadata, structured data, sitemap, and robots rules
- Seed data for two or three demonstration communities

Acceptance tests:

- `atride.in` displays the marketplace.
- `/guilds/royal-ravanas` displays only Royal Ravanas content.
- `/guilds/wild-gear` displays only Wild Gear content.
- An unknown Guild slug returns a proper 404.
- Community pages have independent metadata and canonical URLs.
- Mobile and desktop layouts pass browser tests.
- An unlisted Guild is reachable by direct URL when configured but absent from marketplace results.
- A Guild page never displays another Guild's schedule or promotion.

External accounts needed:

- None when using local images and mocked maps.
- No DNS changes are required. Subdomain infrastructure is deferred.

### Phase 2 — Registration, OTP, and authorization

Build:

- Participant registration
- Email OTP verification
- Login, logout, recovery, and session management
- Participant profile and generic vehicle garage
- Optional Firebase verification of a saved operational phone, with number-change invalidation
- Platform, community, and ride-level roles
- Staff invitation acceptance
- Authenticated `Your upcoming rides` landing-page container and protected query contract
- Rate limiting and OTP abuse prevention
- Audit records for privileged role changes
- Ride Passport privacy preferences with no public individual-profile mode

Acceptance tests:

- A participant can register and verify a mocked email OTP.
- Registration does not depend on an SMS provider or a verified phone number.
- A saved phone is unverified by default and can be verified through Firebase without changing @Ride login/session semantics.
- Changing a verified phone clears verification and requires a new one-time verification.
- A participant cannot access community administration.
- A Royal Ravanas administrator cannot administer Wild Gear.
- An invited captain can accept the invitation.
- Revoking a role removes access immediately.
- OTP expiry, resend cooldown, attempt limits, and one-time use work.
- Logged-out visitors receive no personalized ride payload.
- A newly registered user sees a private empty state rather than a public-cache artifact.
- An anonymous or unrelated verified user cannot retrieve an individual Ride Passport/member profile.
- No rider star-rating field or aggregate is exposed.

External accounts needed:

- Not required for initial implementation; use an on-screen development OTP and Mailpit for local email.
- Amazon SES handles email. Firebase Phone Authentication and billing are required only to test optional phone verification; no @Ride DLT sender or service-SMS account is required.

### Phase 3 — Community administration

Phase 3A and the initial Phase 3B administration slice are implemented: platform administrators can create a draft Guild for an existing verified account, assign its first Owner, approve/suspend it, and Guild Owners/Admins can maintain identity, operating cities, official links, visibility, logo, cover, and gallery media. They can invite account-bound staff roles, revoke pending invitations, grant/revoke delegated roles, suspend/reactivate non-Owner memberships, configure newcomer/award presentation switches, and inspect recent audit history. Participants can maintain an optional private Cloudinary avatar. Broader member search, invitation email delivery, public widgets, and advanced audit filtering/export remain in the rest of Phase 3.

Build:

- Community application and approval
- Community profile, logo, gallery, operating cities, and social links
- Subdomain selection and validation
- Member and staff management
- Role invitations
- Community settings
- Guild Hall branding and access settings
- Directory listing, indexing, review visibility, and default ride visibility
- Guild newcomer/award display preferences
- Public widget allowed-origin configuration
- Audit history
- Community dashboard

Acceptance tests:

- Platform admin approves a community.
- The owner completes the community profile.
- Reserved or duplicate subdomains are rejected.
- Owner invites administrators and ride managers.
- Staff permissions remain restricted to that community.
- Branding appears correctly on its subdomain.
- A private/member-only Guild rejects unrelated viewers.
- An unlisted Guild retains administration, ride, booking, payment, and operation features.

External accounts needed:

- Cloudinary development account for real image-upload testing.
- Staging wildcard domain and TLS.

### Phase 4 — Ride creation and publication

Phase 4A foundation implemented: the Guild workspace links to a protected Ride Studio where Owners, Admins, and Ride Managers create drafts and edit the canonical trip package. The first editor uses documented structured rows for repeated origins, itinerary days, meals, and activities; always-visible examples are generated from the draft’s dates, origin, destination, and capacity, and one-click prompts help external AI tools transform existing WhatsApp announcements without inventing missing facts. Total capacity belongs to the destination/stay; origin allocations are optional planning hints. Linked dates shift together, registration close and balance due default to the same pre-ride date, and browser drafts survive failed validation. Guild onboarding and management maintain reusable policy templates; each new ride receives an independently editable, versioned snapshot. Records render on the public ride page alongside tenant-authorized Cloudinary cover and gallery media, with multi-select uploads and immediate local previews. Publishing enforces package completeness, all mutations show pending feedback, privileged changes are audited, and demonstration rides include itinerary/stay/package/policy data. Richer add/remove row controls, origin-specific staff assignment, announcement generation, and final state-transition rules remain in the rest of Phase 4.

Build:

- Ride drafts
- Ride descriptions and image galleries
- Required vehicle-type selector with `BIKE` selected by default
- Type-aware participant terminology and vehicle requirements
- Start and end dates
- Day-wise itinerary with ordered schedule items and locations
- Accommodation properties, stay dates, room/occupancy options, participant instructions, and amenities
- Included meals, menu summaries, dietary options, activities, and sightseeing
- Explicit pricing, inclusions, exclusions, add-ons, confirmation deposit, balance, and due dates
- Versioned safety rules, waiver references, cancellation/refund, replacement/transfer, and property-conduct policies
- Multiple starting groups
- Captains, vice-captains, sweeps, and marshals
- Routes, checkpoints, and merge points
- Published, closed, postponed, cancelled, and completed states
- Capacity, group capacity, and buffer capacity
- Ride-staff assignments feed the personalized upcoming-rides section
- Public read-only upcoming/featured ride widget endpoints
- WhatsApp-ready/plain-text announcement generation from canonical ride data without participant PII

Acceptance tests:

- A ride manager creates a draft.
- A newly created ride explicitly persists `BIKE` when the default is accepted.
- Changing vehicle type reveals only the relevant validated vehicle-policy fields.
- Bengaluru, Chennai, and Coimbatore groups can merge at Salem.
- Each group has separate staff, time, route, and capacity.
- A draft is not publicly visible.
- Publishing creates a public SEO page.
- A multi-day ride renders its itinerary, stays, amenities, meals, activities, inclusions, and exclusions in the correct day/order.
- Exact stay information can be restricted to confirmed participants while a safe public summary remains available.
- The public ride page clearly distinguishes included, excluded, optional, and not-yet-confirmed items.
- Generated announcement text matches the current published package and excludes participant names, phone numbers, dietary selections, payment evidence, and protected invite links.
- Capacity cannot be reduced below confirmed bookings.
- Unauthorized captains cannot edit unrelated rides.
- An explicitly assigned captain sees the ride on the landing page.
- A Community Admin who is neither assigned nor booked does not automatically see every community ride there.
- Approved Guild origins can embed public widget data; unapproved origins and private fields are rejected.

External accounts needed:

- Cloudinary
- Google Maps test project and restricted development keys

### Phase 5 — Booking and offline payments

Build:

- Participant selection
- Starting-group selection
- Rider/pillion or other applicable occupant-role selection
- Booking-specific dietary and accessibility choices
- Pricing, accommodation option, and add-ons
- Confirmation deposit, balance schedule, and payment-state tracking
- Waiver acceptance
- Capacity reservation
- Booking confirmation
- Waitlist
- Offline UPI, bank transfer, and cash methods
- Payment-proof upload
- Finance review
- Reservation expiry and slot release
- Participant-requested replacement/transfer workflow governed by the accepted policy
- Booking relationships, payment state, role badges, and next actions in `Your upcoming rides`
- Durable ride participation relationship and per-Guild newcomer consent capture

Acceptance tests:

- A participant reserves an available slot.
- The participant reviews day-wise package details, explicit exclusions, rules, and commercial policies before confirming.
- A booking preserves the accepted price, itinerary/package summary, rules, waiver, and refund-policy versions.
- Changing a ride package later does not silently rewrite confirmed booking snapshots.
- A sold-out ride rejects new bookings and exposes only the configured waitlist/contact path.
- Simultaneous requests cannot oversell the final slot.
- Unpaid reservations expire and release capacity.
- A participant uploads offline payment proof.
- Authorized finance staff confirms or rejects it.
- A captain without finance permission cannot mark it paid.
- Every manual payment change has an audit record.
- A confirmed participant sees the booked ride on the landing page.
- A user who is both participant and captain sees one card with both role badges.
- Live/action-required rides sort before ordinary upcoming rides, followed by nearest start time.
- Clicking a card opens the canonical ride page and current server-side permissions control the visible panels/actions.
- A first confirmed Guild relationship can create an opted-in member-only newcomer tile; cancelled/expired bookings cannot.

External accounts needed:

- No payment account
- Cloudinary authenticated/private upload support for payment proof

### Phase 6 — Community-owned Razorpay

Build:

- Encrypted per-community Razorpay credentials
- Test/live configuration
- Gateway connection test
- Razorpay order creation
- Browser checkout
- Signature verification
- Community-specific webhook processing
- Idempotency and reconciliation
- Online payment and refund-state recording

Acceptance tests:

- Royal Ravanas bookings use Royal Ravanas test credentials.
- Wild Gear bookings use Wild Gear credentials.
- Credentials are never returned to the browser.
- A successful verified webhook confirms a booking.
- The browser success screen alone does not confirm payment.
- Duplicate webhooks do not duplicate confirmation.
- Invalid signatures are rejected.
- Money is represented as going directly to the configured community account.

Razorpay provides separate Test and Live API keys, and webhook signatures should be tested in Test mode before activation. [Razorpay API authentication](https://razorpay.com/docs/api/authentication/?preferred-country=IN), [webhook testing](https://razorpay.com/docs/webhooks/validate-test/)

External accounts needed:

- One Razorpay test account owned by the project/team
- Test key ID and secret
- Test webhook secret
- Later, every onboarded community needs its own activated Razorpay account and credentials

### Phase 7 — Email, in-app, and event notifications

Build:

- Amazon SES email OTP
- Booking confirmations
- Offline payment notifications
- Ride changes and cancellations
- Scheduled reminders
- Waitlist offers
- Ride-start and important operational messages
- Transactional outbox
- BullMQ notification worker
- Retries and dead-letter processing
- Delivery-status webhooks
- Notification preferences and in-app inbox
- Authoritative ride announcement/activity feed
- Critical announcement acknowledgements
- Optional protected WhatsApp group invite-link configuration
- WhatsApp channel modes: `DISABLED`, `DISCUSSION`, and recommended `ANNOUNCEMENTS_ONLY`
- Participant privacy notice and eligibility-based link access

Acceptance tests:

- Email OTP is delivered through SES.
- Booking confirmation creates an in-app notification and email.
- A temporary provider failure retries automatically.
- Reprocessing the same event does not send uncontrolled duplicates.
- Changed ride times invalidate obsolete reminder jobs.
- Delivery, failure, bounce, and suppression states are recorded.
- Authorized ride staff can publish an official announcement to the correct audience.
- A critical announcement records participant acknowledgements.
- Confirmed participants can view an enabled WhatsApp invite link; public and unrelated users cannot.
- `ANNOUNCEMENTS_ONLY` requires the organizer to confirm that WhatsApp admin-only posting was configured manually.
- Participants who do not join WhatsApp still receive essential information through @Ride.
- The system never reports that a user joined WhatsApp based only on opening the link.

External accounts needed:

- AWS account and SES region
- Verified `atride.in` SES identity
- SPF, DKIM, and DMARC DNS records
- SES production access
- Approved sender addresses such as `security@atride.in`
- Redis and continuously running worker infrastructure

### Phase 8 — Captain console and ride progress

Build:

- Captain mobile console
- Start and complete starting groups
- Checkpoint check-ins
- Group counts
- Notes, images, delays, and incidents
- Last-known authorized crew location
- Merge-point progress
- Participant-only updates
- Official operational updates published to the ride activity feed
- Server-Sent Events
- Location expiry and retention
- Live rides promoted to the top of the personalized landing-page section
- Verified ride-completion records and Ride Passport projection updates
- Guild award definitions/grants and system milestones
- Verified participant reviews for Guilds (no rider rating)

Acceptance tests:

- Each captain sees only assigned groups.
- Bengaluru and Chennai groups progress independently.
- Groups merge at the configured checkpoint.
- Confirmed participants receive live updates.
- Unbooked visitors cannot access participant tracking.
- Precise location never appears on an indexed page.
- A delayed or failed update can safely retry.
- An active assigned/booked ride appears as `In progress` and links to authorized live progress.
- Completed participation updates only verified aggregate Ride Passport fields.
- Authorized Guild staff can grant an auditable award.
- Only a verified completed participant can review the Guild.
- Individual Ride Passports, newcomer tiles, and awards remain invisible to anonymous/unrelated viewers.

External accounts needed:

- Google Maps staging keys
- Redis
- TLS-enabled staging
- Mobile devices for field testing
- No native application account is required initially

### Phase 9 — Production hardening and launch

Build and verify:

- Wildcard production DNS and TLS
- Backups and restore procedure
- Production monitoring and alerting
- Security headers and rate limits
- Secret rotation
- Accessibility testing
- Performance and load testing
- Payment and OTP abuse testing
- Cross-tenant penetration tests
- Privacy, waiver, terms, refund, and retention workflows
- Search Console and production sitemap
- Operational runbooks

Acceptance tests:

- Backup restoration succeeds in a clean environment.
- Cross-tenant access tests fail safely.
- Final-slot concurrency load test does not oversell.
- Provider outage does not lose bookings or notification events.
- Wildcard subdomains receive valid HTTPS certificates.
- Production health, error, queue, and delivery alerts work.
- Private pages and live tracking are not indexed.
- Listed/unlisted, Guild access, ride access, and indexing combinations pass authorization tests.
- Root marketplace queries and sitemaps exclude unlisted Guilds/private rides.
- Embed endpoints pass origin, CSP, private-field, and clickjacking tests.

### Phase 10 — Installable PWA and packaged web wrapper

This phase begins only after the complete web application has passed Phase 9 and launched successfully.

Build:

- Web app manifest, icons, theme, and install experience
- Standalone PWA navigation and deep links
- Safe application shell/read-only offline behavior
- Network state, pending, retry, and update UX
- Selected idempotent offline actions where browser capability is adequate
- Web push only where supported and justified
- Secure logout/cache clearing
- Technical spike and optional Android web wrapper (TWA or Capacitor-style approach selected then)
- Wrapper login, payment, deep-link, upload, notification, and back-navigation handling

Acceptance tests:

- Supported Android browsers can install and launch @Ride as a PWA.
- Tenant/ride deep links open the correct screen.
- Offline behavior never exposes stale sensitive data to another session.
- Queued actions retain idempotency and show clear sync state.
- Updates do not strand an incompatible client.
- Wrapper distribution adds measurable value over direct PWA installation.
- Store-packaged wrapper passes login, Razorpay redirect, upload, deep-link, and accessibility testing.
- PWA/wrapper does not claim reliable background crew tracking.

External accounts needed:

- None for basic PWA development
- VAPID/push configuration if web push is enabled
- Google Play Console, Android application ID, signing, and test track only for a packaged wrapper

### Phase 11 — Optional native Android application

This phase is not automatically started. It requires proven operational demand after the PWA/wrapper is in use.

Decision gates:

- Captains need more reliable offline checkpoint operation.
- Native push materially improves ride operations.
- Camera/upload or device integration exceeds wrapper capability.
- Authorized crew background location is a validated core need.
- Sustained Android usage and pilot Guild demand justify maintenance cost.

If approved, build:

- React Native/Expo Android client
- Email OTP and secure device-session authentication
- My upcoming/live rides
- Ride details, itinerary, announcements, and acknowledgements
- Captain manifest, group start/complete, check-ins, delays, incidents, and photos
- Encrypted/local offline command queue with idempotent sync
- Push registration and deep links
- Explicit authorized-crew foreground/background location sharing if policy-approved

Acceptance tests:

- Mobile API authorization matches web tenant/role decisions.
- Tokens use OS-backed secure storage and can be revoked per device.
- Offline commands sync once and conflicts are visible.
- Ordinary participants are never asked for background location.
- Crew sharing starts only after explicit disclosure/action, remains visibly active, and stops manually/automatically.
- Android field tests cover multiple device manufacturers and power modes.
- Play Store privacy, permission, disclosure, and review requirements pass.

External accounts needed:

- Google Play Console and Play App Signing
- Firebase or selected push provider
- Restricted Google Maps Android key
- Public privacy/support URLs and closed-test users
- Background-location declaration materials only if that capability ships

iOS remains deferred until Android/PWA demand justifies a separate release phase.

### Phase 12 — Optional compliant Indian SMS

This phase is last and is not required for launch. It begins only if @Ride has the organization documentation, budget, operational ownership, and real usage that justify Indian SMS registration and ongoing template administration.

Decision gates:

- A suitable legal/business entity can register as the Principal Entity.
- TRAI/TCCCPR and access-provider DLT requirements can be satisfied.
- Sender/header and OTP/service content templates are approved.
- Email OTP failure or time-critical field operations demonstrate a material need for SMS.
- Consent, suppression, cost monitoring, abuse controls, and support ownership are defined.

If approved, build:

- Provider adapter selected at implementation time rather than hard-coding MSG91 now
- Phone OTP as an optional verification method
- Explicit verified/unverified phone-contact state
- Essential service/transactional SMS only for approved event types
- DLT identifiers and provider-template mappings
- Delivery receipts, retries, suppression, rate limiting, audit, and cost controls

Acceptance tests:

- The application works fully with `SMS_PROVIDER=disabled`.
- Enabling SMS does not change email OTP or session semantics.
- Only approved templates and purposes can send.
- A phone is marked verified only after a successful one-time challenge.
- Provider/DLT outages degrade to email and in-app communication without losing business events.

External accounts needed only if this phase is approved:

- TRAI-compliant Principal Entity/DLT registration through an access provider
- Registered sender/header
- Approved OTP/service content templates and required consent configuration
- Selected SMS aggregator account, credentials, balance, and webhook configuration

## Development environments

We should maintain four isolated environments.

### Local

Required on the development machine:

- Git
- Node.js active LTS, pinned through `.nvmrc`
- npm
- Docker Desktop or another Docker runtime
- Docker Compose
- PostgreSQL/PostGIS container
- Redis container
- Mailpit for viewing local email
- Disabled SMS plus mock Maps, Razorpay, and storage adapters where possible

Local tenant URLs can use:

```text
atride.localhost:3000
ravanas.localhost:3000
wildgear.localhost:3000
```

### CI

GitHub Actions should run:

- Dependency installation from lockfile
- Type checking
- ESLint
- Unit tests
- Integration tests with temporary PostgreSQL and Redis
- Prisma migration validation
- Production build
- Selected Playwright tests

CI uses test-only secrets and must never use production gateway credentials.

### Staging

Recommended staging resources:

- `staging.atride.in`
- `*.staging.atride.in`
- Staging web deployment
- Staging worker
- Separate PostgreSQL and Redis
- SES test/sandbox configuration
- Razorpay Test mode
- Restricted staging Maps keys
- Separate Cloudinary folder or account/environment

### Production

Production must have separate databases, Redis, provider credentials, storage namespace, DNS, encryption keys, and monitoring.

Never allow staging to connect to production data.

## Accounts and credentials checklist

### Needed before development starts

Only these are essential:

- GitHub repository access — already available
- Approval of the proposed technology stack
- Initial @Ride logo or permission to use a temporary text logo
- Two or three fictional/demo communities
- Sample rides and images
- Agreement on primary timezone and currency
- Agreement on whether login is OTP-first, password-plus-OTP, or both

No live SMS, email, maps, or payment keys are needed for Phase 0.

### Needed during early development

- Cloudinary development account
- Google Cloud project with Maps billing enabled
- Separate browser and server Maps keys
- Staging hosting account
- Managed staging PostgreSQL/PostGIS
- Managed staging Redis
- Worker hosting account
- Access to configure staging DNS

Google recommends separate keys and both application and API restrictions. Browser keys should be restricted by website/referrer and server keys by the appropriate server restriction. [Google Maps API security guidance](https://developers.google.com/maps/api-security-best-practices)

### Needed for email OTP and notifications

- Amazon AWS account
- SES-verified domain
- SES production-access approval
- DNS access for SPF, DKIM, and DMARC
- Bounce/complaint notification configuration

### Needed for payments

For development:

- One Razorpay test merchant account
- Test key ID
- Test secret
- Test webhook secret

For each real community:

- Its own Razorpay account
- Its own test/live credentials
- Its own webhook secret
- Its own onboarding and activation responsibility

The community enters credentials into an encrypted settings screen. Credentials must not be sent by email, WhatsApp, GitHub issue, or chat.

### Needed before production launch

- GoDaddy/domain access
- Final wildcard DNS/TLS decision
- Production hosting
- Production PostgreSQL/PostGIS
- Production Redis
- Production worker
- Cloudinary production configuration
- Google Maps billing, quotas, and alerts
- SES production access
- Sentry project
- Search Console account
- Support mailbox
- Privacy policy, terms, waiver, cancellation, and refund policies
- Emergency and incident-handling process
- Demo or pilot riding community

### Needed only for later optional phases

- Web-push/VAPID configuration if PWA push is enabled
- Google Play Console account for a packaged wrapper or native Android release
- Android application ID and secure signing/Play App Signing setup
- Firebase project or selected push provider
- Restricted Google Maps Android key
- App-link/deep-link domain verification
- Android internal/closed test users and representative physical devices
- Background-location declaration, prominent disclosure, privacy policy, and review materials only if native crew tracking ships
- Principal Entity/DLT registration, sender/header, templates, and aggregator credentials only if Phase 12 SMS is approved

These dependencies do not block web Phases 0–9.

## Environment variables

We will create a committed `.env.example` containing names but no values. Likely variables include:

```text
DATABASE_URL
DIRECT_DATABASE_URL
REDIS_URL

AUTH_SECRET
APP_ENCRYPTION_KEY
APP_BASE_URL

AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
SES_FROM_SECURITY
SES_FROM_NOTIFICATIONS

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
GOOGLE_MAPS_SERVER_KEY

SENTRY_DSN
SENTRY_AUTH_TOKEN

RAZORPAY_TEST_KEY_ID
RAZORPAY_TEST_KEY_SECRET
RAZORPAY_TEST_WEBHOOK_SECRET

# Firebase is used only for optional phone ownership verification
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# Added only if the optional compliant Indian SMS phase is approved
SMS_PROVIDER
SMS_PROVIDER_AUTH_KEY
SMS_OTP_TEMPLATE_ID
SMS_SERVICE_TEMPLATE_IDS

# Added only if PWA web push is enabled
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

Community Razorpay credentials should not become normal process-wide environment variables. They are tenant-specific and should be encrypted in the database using `APP_ENCRYPTION_KEY`.

## What I would need from you first

To begin Phases 0 and 1, I only need:

1. Confirmation that we are proceeding with TypeScript, Next.js, PostgreSQL/PostGIS, Prisma, and Redis.
2. Temporary or final @Ride logo, colors, and branding direction.
3. Two sample bike communities, three to six sample rides, and one representative future four-wheel expedition scenario.
4. Confirmation of the primary initial market—presumably India—and default currency `INR`.
5. Confirmation of the accepted email-OTP-first authentication decision.

SES, Razorpay, Cloudinary, and Google Maps accounts can be created when their corresponding integration phase approaches. Indian SMS accounts and DLT work are deliberately excluded unless Phase 12 is later approved.
