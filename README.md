# @Ride (AtRide)

> Discover communities. Book rides. Ride together.

@Ride is a multi-tenant platform for organized road-adventure communities. Participants use one account to discover communities and trips, reserve slots, pay, and follow trip progress. The initial experience is bike-first, while the core model supports additional vehicle categories such as cars, SUVs, and 4×4 vehicles. Each participating community gets a branded Guild page and management area. Phase 1 uses path-based Guild URLs; subdomains remain a later upgrade.

The initial commercial product is a Guild operating system: hosted website, rides, bookings, payments, members, announcements, and ride operations. Participation in the root @Ride discovery marketplace is optional.

```text
atride.in                    Public ride and community marketplace
atride.in/guilds/royal-ravanas  Royal Ravanas community
atride.in/guilds/wild-gear      Wild Gear Crew community
```

The visual brand is `@Ride`; the written and search-friendly name is `AtRide`; the primary domain is `atride.in`.

## What @Ride provides

### For participants

- Discover nearby communities and upcoming rides
- Filter by city, origin, destination, date, type, price, and availability
- Maintain one verified profile and vehicle garage across all communities
- Build a private, verified Ride Passport without a public rider score
- See upcoming and live rides on the landing page across participant and assigned crew roles
- Select a starting group and book available slots
- Pay through the community's Razorpay account or an approved offline method
- Receive confirmation, payment, schedule, and trip-event notifications
- Read official ride announcements and optionally join an organizer-managed WhatsApp group
- Follow participant-only checkpoint and trip progress

### For communities

- Branded Guild page with listed, unlisted, public, members-only, or invite-only access
- Community owners, administrators, ride managers, and finance roles
- Staff invitations and scoped access control
- Draft and publish trips with a vehicle type, images, pricing, inclusions, and capacity
- Configure multiple starting groups, captains, routes, and merge points
- Connect a community-owned Razorpay account
- Verify offline UPI, bank-transfer, or cash payments
- Manage participants, waitlists, staff, checkpoints, and ride operations
- Configure official announcements and an optional WhatsApp discussion or announcements-only group
- Embed public ride widgets in an existing Guild website, with custom domains planned later

### For captains and ride crews

- Mobile-friendly ride console
- Assigned starting group and participant list
- Start and complete groups
- Check in at route checkpoints
- Report group counts, delays, incidents, and merge progress
- Share last-known authorized crew location with confirmed participants

### For the @Ride team

- Approve and manage communities
- Reserve and manage Guild slugs, with subdomains planned later
- Moderate public content
- Curate featured and promoted rides
- Support users without breaking tenant isolation
- Monitor platform health, notifications, security events, and audit history

## Core product model

@Ride uses one global identity system with scoped authorization:

- Platform roles belong to the @Ride team.
- Community roles apply only inside one community.
- Ride roles apply only to an assigned ride or starting group.
- A person may be a rider in one community, an administrator in another, and a captain on a specific ride.
- Communities never share a common administrator password; each staff member has an individual audited account.

Communities own their ride payments. Each community connects its own Razorpay credentials, and ride money goes directly to that account. @Ride records and verifies the booking outcome but does not collect, hold, or settle ride funds.

The domain model is vehicle-neutral. New trips select a vehicle type, with `BIKE` as the initial default. Motorcycle-oriented screens can use familiar terms such as rider and pillion, while future four-wheel experiences can use driver, co-driver, passenger, convoy, and expedition without changing the identity or booking foundation.

Individual participant profiles are not public in the initial release. Ride Passport summaries, Guild newcomer tiles, and awards are relationship-scoped and consent-controlled. Verified participants may review Guilds; @Ride does not provide a rider star rating.

## Architecture at a glance

@Ride begins as a TypeScript modular monolith with a separate background worker from the same codebase.

```text
Browser / Installable PWA
          |
          v
Wildcard DNS + TLS + CDN
atride.in / *.atride.in
          |
          v
Next.js web and API application
TypeScript + React + Node.js
          |
          v
Application modules
identity | communities | rides | bookings | payments | tracking
          |
   +------+------+--------------------+
   |             |                    |
   v             v                    v
PostgreSQL     Redis           External services
+ PostGIS      + BullMQ        Razorpay, SES,
                                Maps, Cloudinary
                 |
                 v
          TypeScript worker
```

### Proposed technology stack

| Concern | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Backend/API | Next.js route handlers and TypeScript application services on Node.js |
| Database | PostgreSQL with PostGIS |
| ORM/migrations | Prisma ORM |
| Cache, distributed throttling, and queue | Redis with BullMQ when required by scale |
| Authentication | Google OpenID Connect plus email OTP and opaque PostgreSQL sessions; Firebase only for phone ownership verification |
| Images and media | Cloudinary initially |
| Maps and geocoding | Google Maps Platform |
| Online payments | Per-community Razorpay integration |
| Authentication OTP | Amazon SES email OTP initially |
| SMS | Firebase one-time phone verification only; ride/service SMS remains deferred |
| Email | Amazon SES |
| Live progress | Server-Sent Events initially |
| Monitoring | Sentry and structured application logs |
| Testing | Vitest, Testing Library, and Playwright |

After the web product is complete, delivery proceeds to an installable PWA and optional packaged web wrapper. A separate React Native/Expo Android application is a later, evidence-gated phase for stronger offline, push, and authorized crew-location needs.

Public content is server-rendered for performance and SEO. Private participant, payment, administration, and precise live-location pages are not indexable.

## Repository guide

```text
docs/
  architecture/
    system-design.md       System boundaries, tenancy, data, security, deployment
    decisions/             Architecture Decision Records (ADRs)
  requirements/
    use-cases.md           Actors, permissions, and functional workflows
    tenant-onboarding.md   Community onboarding and activation
    guild-hall-and-reputation.md Ride Passport, awards, reviews, and privacy
    guild-visibility-and-embedding.md Private Guilds, marketplace, and widgets
  planning/
    roadmap.md             Testable delivery phases and dependency checklist
    four-wheel-expansion.md Future car, SUV, 4×4, and overlanding considerations
    mobile-strategy.md     PWA, wrapper, and optional Android delivery
src/                       Application source code (created during implementation)
README.md                  Product storefront and documentation index
```

## Documentation

- [System design](docs/architecture/system-design.md)
- [Architecture decisions](docs/architecture/decisions/README.md)
- [Functional use cases](docs/requirements/use-cases.md)
- [Tenant onboarding](docs/requirements/tenant-onboarding.md)
- [Guild Hall, Ride Passport, awards, and reputation](docs/requirements/guild-hall-and-reputation.md)
- [Guild visibility, marketplace participation, and embedding](docs/requirements/guild-visibility-and-embedding.md)
- [Implementation roadmap](docs/planning/roadmap.md)
- [Four-wheel expansion considerations](docs/planning/four-wheel-expansion.md)
- [Mobile delivery strategy](docs/planning/mobile-strategy.md)

The detailed documents are authoritative for their subjects. The root README intentionally stays short and should not duplicate schemas, workflows, or phase-level acceptance tests.

## Delivery status

Development is active on the `develop` branch, and `atride.in` is live on Vercel. Phase 1 provides a populated marketplace, city filters, path-based public and private Guild pages, ride detail pages, SEO routes, and a health endpoint. Phase 2 includes Google OpenID Connect and email OTP sign-in, secure opaque sessions, logout, first-login onboarding, private participant profiles, optional one-time Firebase phone verification, a bike-first vehicle garage, and protected platform/Guild role boundaries. Discovery pages read through tenant-scoped Prisma repositories backed by Neon PostgreSQL/PostGIS, with migrations, database constraints, and repeatable demonstration seeds in place.

Amazon SES domain authentication and sandbox access are configured; production-access approval is pending. Email OTP delivery supports a local mock and an SES v2 HTTPS adapter with narrowly scoped credentials. Firebase is scoped to one-time ownership verification of a saved operational phone. The remaining Phase 0 foundation work is CI and operational hardening. Ride/service SMS, maps, media, Redis workers, and payments remain deliberately deferred behind development flows.

## Product principles

1. One verified participant identity works across all communities.
2. Tenant isolation is enforced on the server and in the database access layer.
3. Every privileged action is attributable to an individual account.
4. Community-owned payment credentials are encrypted and never exposed to the browser.
5. Booking and capacity changes are transaction-safe and idempotent.
6. Exact live location and participant data are private by default.
7. Public communities and rides have useful, crawlable pages.
8. Captain and participant experiences are mobile-first and resilient on weak networks.
9. External providers are accessed through adapters so they can be replaced.
10. Every delivery phase ends with a testable user journey.

## Local development

Prerequisites:

- Git
- Node.js active LTS, pinned with `.nvmrc`
- pnpm through Corepack
- Docker and Docker Compose when local PostgreSQL is introduced

Install and run:

```bash
corepack enable pnpm
pnpm install
pnpm dev
```

After copying `.env.example` to `.env.local` and supplying pooled and direct PostgreSQL URLs, initialize and verify the database:

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:verify
```

Open `http://localhost:3000`. Quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The demonstration fixture remains the repeatable database seed source, while production UI reads go through tenant-scoped Prisma repositories. Redis and Mailpit are introduced behind application-owned adapters as their phases require them. Email, maps, storage, and Razorpay use development adapters so provider accounts do not block the first phases. Ride/service SMS is disabled and is not a launch dependency; Firebase sends only optional one-time phone-verification codes.

Example local tenant URLs:

```text
localhost:3000
localhost:3000/guilds/royal-ravanas
localhost:3000/guilds/wild-gear
```

## Security and secrets

- Never commit `.env` files, API secrets, OTPs, payment credentials, or personal participant data.
- Commit only a redacted `.env.example` containing variable names.
- Use separate credentials and data stores for local, CI, staging, and production.
- Restrict browser and server API keys independently.
- Store tenant Razorpay credentials encrypted in the database, not in source control.
- Use verified webhooks and idempotency for payments and provider callbacks.

## Current decisions and open questions

Accepted architectural choices are recorded in [architecture decisions](docs/architecture/decisions/README.md). Important product questions still to finalize include:

- Community verification and publishing approval policy
- Default financial permissions for captains
- Refund responsibilities for community-owned gateways
- Waitlist and buffer-capacity rules
- Required participant/vehicle documents and retention periods
- Public versus participant-only progress summaries
- Final managed hosting, PostgreSQL, Redis, and worker vendors
- @Ride's organizer subscription or pricing model

## Reference documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [PostGIS](https://postgis.net/documentation/)
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Razorpay developer documentation](https://razorpay.com/docs/)
- [Amazon SES documentation](https://docs.aws.amazon.com/ses/)
- [Cloudinary upload documentation](https://cloudinary.com/documentation/upload_images)
- [TRAI advice to senders](https://trai.gov.in/advice-to-senders)
- [Google Maps Platform documentation](https://developers.google.com/maps/documentation)
- [Google Event structured data](https://developers.google.com/search/docs/appearance/structured-data/event)

---

@Ride is intended to replace fragmented forms, spreadsheets, payment screenshots, and location messages with one dependable operating platform for road-adventure participants and communities.
