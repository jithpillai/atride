# @Ride (AtRide)

> Discover communities. Book rides. Ride together.

@Ride is a multi-tenant platform for motorcycle riding communities. It gives riders one place to discover communities and upcoming rides, register, book available slots, pay online or offline, and follow an active ride through captain check-ins and route progress.

Each riding community receives its own branded space under an @Ride subdomain, for example:

- `royalravanas.atride.in`
- `wildgear.atride.in`
- `ridersofthestorm.atride.in`

The public platform at `atride.in` acts as a location-aware marketplace across all participating communities. A community subdomain contains only that community's profile, rides, members, bookings, staff, and operations.

This document captures the proposed product, functional requirements, architecture, data model, security model, SEO strategy, and implementation roadmap. It is an initial product and architecture specification, not a final implementation contract.

## 1. Brand and product positioning

### 1.1 Identity

- Visual logo: `@Ride`
- Written/search-friendly name: `AtRide`
- Domain: `atride.in`
- Suggested tagline: `Discover communities. Book rides. Ride together.`
- Alternative tagline: `Your community. Your route. Your ride.`

The `@Ride` logo reads naturally as "At Ride" and works well for an application icon, website header, social identity, and ride merchandise. The plain-text name `AtRide` should also appear consistently in headings, metadata, descriptions, and structured data because users may search for `@Ride`, `AtRide`, `At Ride`, or `atride.in`.

Before public launch, the name, logo, relevant Indian trademark classes, social handles, and confusingly similar brands should be checked.

### 1.2 Product value

Riding communities commonly coordinate through a collection of WhatsApp groups, spreadsheets, forms, payment screenshots, and live-location messages. @Ride brings those activities into one system:

- Community discovery and branded community websites
- Ride publishing and promotion
- Rider registration and verified profiles
- Capacity-controlled ride bookings
- Community-owned online payment gateways
- Offline payment verification
- Multiple starting groups and merge points
- Captain, vice-captain, sweep, and marshal operations
- Checkpoints, check-ins, and live ride progress
- Participant and organizer dashboards
- Search-friendly public ride and location pages

## 2. Product principles

1. **One rider identity:** A rider registers once and can participate in multiple communities.
2. **Individual staff accounts:** Communities must not share a single organization username and password. Every administrator and captain uses an individual account for security and auditing.
3. **Tenant isolation:** A community can access only its own data and riders who have a valid relationship with it.
4. **Community-owned money:** Ride payments go directly to the community's gateway account. @Ride does not collect or settle ride funds.
5. **Operational simplicity:** Start with one modular application rather than premature microservices.
6. **Privacy by design:** Exact live locations and participant information are never public by default.
7. **SEO as a product feature:** Public communities, rides, cities, and destinations have useful server-rendered pages rather than relying only on metadata.
8. **Mobile-first operation:** Booking and ride control must work reliably on mobile devices and slow networks.

## 3. User types and authorization

Authentication is global, but authorization is scoped. A person can have different responsibilities in different communities and rides.

For example, one person may be:

- A normal rider in Wild Gear Crew
- A community administrator in Royal Ravanas
- The lead captain of one ride
- A sweep on another ride

A single `isAdmin` boolean is not sufficient for this model.

### 3.1 Platform roles

Platform roles are assigned only by the @Ride team.

| Role | Responsibilities |
| --- | --- |
| Platform Owner | Full platform access and critical configuration |
| Platform Admin | Manage communities, users, moderation, disputes, and featured content |
| Platform Support | Investigate support cases with limited, audited access |
| Platform Finance Admin | Manage @Ride subscriptions and financial configuration, if introduced |

### 3.2 Community roles

Community roles apply only within a particular riding organization.

| Role | Responsibilities |
| --- | --- |
| Community Owner | Full control of the community and payment configuration |
| Community Admin | Manage community profile, members, staff, rides, and bookings |
| Ride Manager | Create, edit, publish, and operate rides |
| Finance Manager | Verify offline payments and view community payment records |
| Community Member | Access community-member features and member-only rides |
| Rider/Guest | Browse and book permitted rides |

### 3.3 Ride-specific roles

Ride assignments do not automatically grant permanent community administration.

| Role | Responsibilities |
| --- | --- |
| Lead Captain | Controls the overall ride, starts it, coordinates groups, and completes it |
| Captain | Manages an assigned starting group or route segment |
| Vice Captain | Assists a captain and acts under delegated permissions |
| Sweep | Travels at the rear and reports group progress or incidents |
| Marshal | Manages a checkpoint, route section, or participant movement |
| Participant | Accesses booked-ride information and participant-only progress |

Financial permissions and ride-operational permissions should remain separate by default. A captain may verify offline payments only if the community explicitly grants that permission.

### 3.4 Staff invitation workflow

Generic riders can self-register. Privileged accounts are created through invitations or promotions:

1. An authorized administrator enters the person's email address or mobile number.
2. The system creates a pending invitation with a community and role.
3. An existing user accepts the invitation from their account.
4. A new user completes registration and verification before accepting.
5. The role becomes active after acceptance.
6. Assignment, acceptance, changes, and revocation are written to the audit log.

Administrators should never create or know another person's password.

## 4. Authentication and rider profiles

### 4.1 Common authentication

All hostnames use the same identity system:

- `atride.in/login`
- `royalravanas.atride.in/login`
- `wildgear.atride.in/login`

The hostname and the user's intended action determine where they return after authentication.

### 4.2 Mobile verification

Registration should include mobile OTP verification to reduce junk accounts and bookings:

- Name
- Mobile number with normalized country code
- OTP verification
- Email address, according to platform policy
- Password or passwordless authentication
- Terms and privacy consent

Controls should include OTP expiry, attempt limits, request rate limits, duplicate-number handling, suspicious-activity throttling, and CAPTCHA escalation. OTP verification confirms control of a phone number; it does not by itself establish a rider's identity.

Communities may optionally require additional profile completion for selected rides:

- Emergency contact
- Motorcycle details
- Registration number
- Driving licence verification
- Government ID verification
- Voluntarily provided blood group

Sensitive documents should be collected only when genuinely required, with explicit access and retention rules.

### 4.3 Rider profile

A rider profile can contain:

- Name and profile image
- Verified mobile and email
- Home city and preferred starting locations
- Emergency contact
- Dietary or accessibility information
- Community memberships
- Motorcycle garage with one or more motorcycles
- Booking and ride history
- Notification preferences
- Consent and waiver history

## 5. Multi-tenant community model

### 5.1 One application, many communities

The platform uses one codebase and one deployment. The incoming hostname identifies the tenant:

```text
atride.in                    -> public @Ride marketplace
royalravanas.atride.in       -> Royal Ravanas community
wildgear.atride.in           -> Wild Gear Crew community
admin.atride.in              -> reserved platform administration
```

Tenant resolution:

```text
Incoming hostname
      |
      v
Normalize and validate hostname
      |
      v
Look up active CommunityDomain
      |
      +-- Found    -> attach community context and render tenant pages
      +-- Not found -> return a proper 404/community-not-found page
```

The backend derives the tenant from the trusted hostname. It must not trust a `communityId` supplied by the browser as proof of access.

### 5.2 Community capabilities

Each community receives:

- Branded public home page
- Logo, colors, cover image, description, and gallery
- Locations and service areas
- Social and contact links
- Upcoming and previous rides
- Community membership options
- Staff and role management
- Ride and booking management
- Payment configuration
- Reports and audit history
- Community-specific SEO metadata

### 5.3 Community domains

A dedicated domain mapping model supports current subdomains and possible custom domains later:

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

Reserved subdomains should include at least:

```text
www, api, admin, app, auth, login, mail, support, help, status,
payments, static, cdn, assets, blog, security
```

Subdomain slugs must be lowercase, unique, safe, and restricted to an approved character set. Confusing Unicode, dots, impersonation attempts, and reserved names must be rejected.

### 5.4 Instant community onboarding

1. An organizer submits a community application.
2. @Ride verifies and approves the organization.
3. The owner chooses or accepts a suggested subdomain slug.
4. The system verifies availability and reserved-name rules.
5. Community and domain records are created.
6. The wildcard domain begins serving the community without a new DNS record.
7. The owner completes branding, staff, payment, and publishing setup.

## 6. Wildcard DNS and HTTPS

Wildcard DNS is a core infrastructure requirement. It allows every first-level subdomain to reach the same application without manually adding DNS records for each community.

For a self-hosted server with a stable public IP, the conceptual records are:

| Type | Name | Value | Purpose |
| --- | --- | --- | --- |
| A | `@` | Server public IP | Serves `atride.in` |
| A | `*` | Server public IP | Serves `anything.atride.in` |
| CNAME | `www` | `atride.in` | Serves `www.atride.in` |

The exact record type depends on hosting. A CDN or managed host may require a wildcard CNAME, platform-specific target, or nameserver delegation instead of an A record.

Important constraints:

- The wildcard does not cover the apex domain; `atride.in` needs its own record.
- An explicit DNS record normally takes precedence over the wildcard.
- DNS routing does not automatically provide HTTPS.
- The deployment must have automated wildcard TLS for `*.atride.in` or automated per-host certificates.
- `*.atride.in` covers `royalravanas.atride.in`, not `live.royalravanas.atride.in`.
- Deeper subdomains should be avoided; use paths such as `royalravanas.atride.in/live/{rideSlug}`.

Wildcard DNS removes per-community DNS work, but hosting, TLS, CDN, database, messaging, maps, and storage may still have costs.

## 7. Public marketplace and discovery

The root website is more than a community directory. It is a cross-community ride marketplace personalized by location and interests.

### 7.1 Location selection

Location should be resolved in this order:

1. User-selected city
2. Saved city from the rider profile
3. Browser geolocation with permission
4. Approximate IP-based location
5. Popular default locations when no signal is available

The user must always be able to change the detected location. A person currently in Delhi may still be planning a ride from Bengaluru.

Communities can have a headquarters and multiple operating areas. Rides separately contain their starting locations and destination. Discovery considers all three.

### 7.2 Landing page sections

Proposed order:

1. Hero with location selector and ride search
2. Trending rides near the user
3. Upcoming rides
4. Featured or promoted rides
5. Riding communities near the user
6. Browse by ride type
7. Browse by destination
8. Recently added rides
9. How @Ride works
10. Safety and trust
11. Organizer onboarding
12. FAQ and search-friendly footer links

### 7.3 Discovery filters

- City or distance radius
- Starting location
- Destination
- Departure date and date range
- Breakfast, day, weekend, or multi-day ride
- Ride category and difficulty
- Price range
- Available slots
- Accommodation included
- Community
- Motorcycle or engine requirement
- Member-only or public ride

### 7.4 Ranking and promotion

Different collections must be clearly distinguished:

| Collection | Main selection method |
| --- | --- |
| Upcoming | Start date and location relevance |
| Recently added | Publish date |
| Trending | Recent confirmed bookings, engagement, freshness, quality, and proximity |
| Featured | Editorially selected by @Ride |
| Promoted | Paid or contractual placement with a visible label |
| Near you | Geographic relevance |

Promoted placements must be labelled `Sponsored` or `Promoted` and should not silently manipulate the organic trending score.

The platform promotion manager can configure the ride, target cities, placement, priority, active dates, limits, label, and status.

## 8. Ride management

### 8.1 Ride information

A ride manager or authorized captain can create a ride with:

- Name, slug, and short summary
- Full destination and experience description
- Ride category and difficulty
- Start and expected end date/time
- Registration opening and closing date/time
- Public, community-only, or invitation-only visibility
- Destination and places covered
- Motorcycle and rider eligibility requirements
- Safety instructions and required gear
- Cancellation and refund rules
- Contact and emergency instructions

### 8.2 Media

- Cover image
- Mobile/social sharing image
- Multiple gallery images
- Route and itinerary images
- Optional post-ride gallery

Media should be namespaced by community and ride, for example:

```text
communities/{communityId}/rides/{rideId}/...
```

### 8.3 Ride status lifecycle

```text
DRAFT
  |
  v
PENDING_APPROVAL (optional community workflow)
  |
  v
PUBLISHED
  |
  v
BOOKING_OPEN
  |
  +-- BOOKING_CLOSED
  +-- SOLD_OUT
  |
  v
CHECK_IN_OPEN
  |
  v
IN_PROGRESS
  |
  v
COMPLETED
```

Alternative states include `POSTPONED`, `CANCELLED`, and `ARCHIVED`. Draft rides are visible only to authorized community staff. Published public rides receive canonical URLs, public metadata, and sitemap entries.

### 8.4 Pricing and inclusions

A ride can offer multiple pricing options:

- Rider with own motorcycle
- Rider with pillion
- Pillion-only participant
- Single or shared accommodation
- Community-member price
- Early-bird price
- Optional add-ons

Each option contains:

- Amount and currency
- Valid-from and valid-until times
- Included amenities and exclusions
- Cancellation/refund policy
- Applicable taxes
- Capacity or inventory, if different from overall ride capacity

Structured inclusions may include:

- Number of nights
- Resort, hotel, homestay, or campsite
- Room-sharing arrangement
- Breakfast, lunch, dinner, and refreshments
- Fuel inclusion or exclusion
- Entry tickets
- Support vehicle
- Mechanical or medical support
- Merchandise
- Insurance, where applicable

The accepted price and inclusions are snapshotted into the booking. Later ride edits must not silently change confirmed bookings.

## 9. Multiple starting groups, routes, and merge points

A ride may start from multiple cities and merge later:

```text
Bengaluru group -- Captain A --\
                                  \
Chennai group --- Captain B ------+-- Salem merge point -- Kodaikanal
                                  /
Coimbatore group - Captain C ----/
```

Each ride group contains:

- Name
- Starting location and coordinates
- Assembly and departure time
- Assigned captain, vice captain, and sweep
- Capacity allocation
- Route segments and initial checkpoints
- Merge location and expected merge time
- Group-specific instructions and contact information

During booking, a rider selects a starting group. That selection controls meeting instructions, group capacity, assigned crew, route notifications, and relevant live progress.

Checkpoint types may include:

- Assembly point
- Starting point
- Breakfast or meal stop
- Fuel stop
- Rest stop
- Merge point
- Accommodation
- Sightseeing location
- Final destination
- Return checkpoint

## 10. Capacity, buffers, and waitlists

A ride can have both a published capacity and a controlled buffer:

```text
publishedCapacity = 50
bufferCapacity = 5
effectiveMaximum = 55
```

Capacity may be configured at both ride and starting-group levels:

```text
Overall: 100
Bengaluru: 50
Chennai: 30
Coimbatore: 20
```

Rules:

- Confirming a booking must atomically consume capacity.
- Two riders must not be able to take the final slot simultaneously.
- An administrator can increase capacity or release buffer slots.
- Capacity cannot be reduced below confirmed participants.
- Every capacity change is audited.
- Sold-out rides may optionally accept a waitlist.
- A released or expired slot can be offered to the next waitlisted rider.

## 11. Booking workflow

### 11.1 Booking steps

1. Rider selects a ride and starting group.
2. System checks eligibility and capacity.
3. Rider selects participants, motorcycle, price, accommodation, and add-ons.
4. Rider reviews inclusions, exclusions, safety requirements, and cancellation policy.
5. Rider accepts the required waiver and consent.
6. System creates a short-lived reservation.
7. Rider selects online or offline payment.
8. Successful payment or manual verification confirms the booking.
9. Rider and organizer receive notifications.

### 11.2 Booking statuses

```text
RESERVED
PENDING_PAYMENT
PENDING_VERIFICATION
CONFIRMED
WAITLISTED
CANCELLED
EXPIRED
COMPLETED
```

Booking status and payment status must remain separate.

### 11.3 Booking snapshot

A booking preserves the information required for the ride at the time of confirmation:

- Rider and participant names
- Selected starting group
- Motorcycle information
- Emergency contact
- Dietary/accommodation selections
- Selected price and inclusions
- Accepted policies and waiver versions
- Contact information needed by the organizer

If the rider later changes a profile field, historical bookings remain accurate. Sensitive values should be minimized and protected.

## 12. Community-owned online payments

@Ride uses a bring-your-own-payment-gateway model. Each community connects its own Razorpay account, and the money moves directly from the rider to that community.

```text
Rider -> @Ride checkout -> Community's Razorpay account
                         -> Razorpay webhook to @Ride
                         -> Booking marked paid and confirmed
```

@Ride does not:

- Collect or hold ride charges
- Transfer ride funds to communities
- Perform settlement between @Ride and a community
- Deduct platform commission from the ride transaction

If @Ride later charges organizers, that should preferably be a separate subscription or service invoice.

### 12.1 Payment configuration

Community payment settings include:

- Gateway provider
- Key ID
- Encrypted key secret
- Encrypted webhook secret
- Test/live mode
- Connection and webhook-verification status
- Enabled payment methods
- Last successful verification time

Only the community owner or an explicitly authorized finance administrator can manage credentials. Secrets must never be stored in plain text, returned to the browser, placed in logs, or shown again after saving.

Suggested activation flow:

1. Enter test credentials.
2. Encrypt and save them server-side.
3. Verify the configuration.
4. Configure a unique, unguessable webhook endpoint/integration token.
5. Verify webhook signatures with that community's secret.
6. Complete a test transaction.
7. Enable live mode.
8. Audit all credential and mode changes.

The verified payment webhook, not the browser success page, is the source of truth. Webhook handling must be idempotent so a repeated event cannot duplicate payment or booking changes.

### 12.2 Payment statuses

```text
NOT_REQUIRED
UNPAID
PENDING_VERIFICATION
PAID_ONLINE
PAID_OFFLINE
FAILED
REJECTED
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

## 13. Offline payments

Communities may enable:

- Cash
- Direct UPI
- Bank transfer
- Payment at assembly point
- Another manually agreed method

Workflow:

1. Rider chooses an offline method.
2. Booking becomes `PENDING_PAYMENT` or `PENDING_VERIFICATION`.
3. A slot is reserved for the configured period.
4. Rider optionally uploads a screenshot and transaction reference.
5. Authorized community staff confirms or rejects payment.
6. Confirmation changes payment to `PAID_OFFLINE` and booking to `CONFIRMED`.
7. Expired or rejected reservations release their capacity.

Manual confirmation records:

- Amount received
- Method
- Transaction/UTR/reference number
- Payment date
- Proof image, when provided
- Internal note
- Verified by user ID
- Verification timestamp

Offline proof is best uploaded through @Ride. If it arrives through WhatsApp or in person, the verifier can still record the reference and attach proof where appropriate.

Each ride can define an offline reservation period and whether unpaid bookings expire automatically. Cash-at-start may be exempted, but communities should understand the increased no-show risk.

## 14. Ride operations and progress tracking

### 14.1 Starting a ride

- A captain starts an assigned starting group.
- The lead captain starts or controls the overall ride.
- Participants receive a start notification.
- Participant-only progress becomes active.
- Starting-group progress remains separate until groups merge.

### 14.2 Check-ins

Each checkpoint can record:

- Planned and actual arrival/departure time
- Status
- Captain or marshal performing the check-in
- Optional coordinates
- Optional note or image
- Group/participant count
- Delay, incident, or assistance indicator

Progress is an estimate based on completed checkpoints, for example:

```text
7 of 12 checkpoints completed - approximately 58%
```

Before a merge, participants can see group-specific progress:

```text
Bengaluru group   4/5 checkpoints - arrived at Salem
Chennai group     3/4 checkpoints - 25 km from Salem
Coimbatore group  3/3 checkpoints - waiting at merge point
```

### 14.3 Live location scope

The first release should track authorized crew rather than every participant continuously:

- Captain or authorized crew location
- Last-known location and update time
- Manual checkpoint check-ins
- Completed route segments
- Delay or emergency status
- Access restricted to confirmed participants and authorized staff
- Automatic expiry and retention rules after the ride

Precise live coordinates must never appear on an indexable public page. The public may see a coarse status such as `In progress` only if the community enables it.

Redis can hold current ephemeral progress, while periodic snapshots and checkpoint events are stored in PostgreSQL/PostGIS. Server-Sent Events or WebSockets can push updates to active participant screens.

## 15. Community access to rider information

A user is global to @Ride, but personal data is not globally available to communities. A community may access a user's relevant information only when:

- The user booked that community's ride.
- The user joined that community.
- The user accepted a staff invitation.
- Audited platform support access was granted for a legitimate support case.

Community A must not see Community B's membership, booking, payment, or ride records.

Authorized ride staff may need access to:

- Name and contact number
- Emergency contact
- Starting group
- Motorcycle and registration number
- Dietary/accommodation needs
- Payment and booking status
- Waiver acceptance
- Voluntarily supplied medical/safety information

Access should be role-based, purpose-limited, audited, and subject to post-ride retention rules.

## 16. Dashboards

### 16.1 Platform administration

Proposed hostname: `admin.atride.in`

- Platform metrics
- Community applications and verification
- Communities and domains
- User and support management
- Featured and promoted content
- Ride moderation
- Reports and disputes
- Platform configuration
- Security and audit logs

### 16.2 Community management

Proposed path: `{community}.atride.in/manage`

- Overview
- Community profile and branding
- Rides and drafts
- Bookings and waitlists
- Participants and manifests
- Captains, staff, and members
- Online and offline payment records
- Payment integration
- Galleries and content
- Reports
- Audit history
- Settings

### 16.3 Captain ride console

Proposed path: `{community}.atride.in/manage/rides/{rideId}/control`

- Start or finish assigned group
- View assigned participants
- View route and checkpoint schedule
- Perform checkpoint check-ins
- Record group counts and delays
- Publish participant-visible updates
- Escalate incidents
- See merge-group status

### 16.4 Rider dashboard

Proposed path: `atride.in/my-rides`

- Upcoming and previous rides
- Pending and confirmed bookings
- Payment actions and proofs
- Starting-group instructions
- Participant-only ride progress
- Saved communities and rides
- Profile, motorcycles, and emergency contact
- Waivers and receipts

## 17. SEO and metadata

Metadata alone cannot guarantee ranking. @Ride needs crawlable, useful, unique content, correct technical SEO, community participation, reputation, and links.

### 17.1 Homepage identity

Suggested title:

```text
AtRide (@Ride) - Discover and Book Motorcycle Group Rides
```

Suggested description:

```text
Discover motorcycle riding communities across India, explore upcoming rides,
reserve your slot, and follow ride progress with AtRide.
```

The homepage should include:

- `WebSite` structured data with `AtRide` as the name and `@Ride` as an alternate name
- `Organization` structured data
- Canonical URL
- Open Graph and social-preview metadata
- Logo, social profiles, and contact information
- Meaningful headings and visible explanatory content

### 17.2 Community and ride pages

- Every community has a unique description, logo, location, and canonical home page.
- Every public ride has a stable, unique leaf URL.
- Public ride pages include appropriate `Event` structured data.
- Structured data reflects visible page content and accurate availability.
- Draft, checkout, dashboard, participant, and live-location pages are not indexed.
- Community pages can provide `Organization` structured data and verified social links.

### 17.3 Location and destination pages

Important discovery pages should be server-rendered:

```text
atride.in/rides/bengaluru
atride.in/rides/chennai
atride.in/rides/delhi
atride.in/destinations/ooty
atride.in/destinations/kodaikanal
```

Only create indexable pages when they contain meaningful rides, communities, and original information. Empty or nearly identical city pages should not be generated only to target keywords.

### 17.4 Technical SEO

- Dynamic page titles and descriptions
- Canonical URLs
- Sitemap index and updated community/ride/location sitemaps
- `robots.txt`
- Search Console verification
- Server-rendered public content
- Optimized images and descriptive alt text
- Social sharing images
- Fast mobile performance and stable layouts
- Redirect management for changed slugs
- No indexing of private or low-value application screens

## 18. Application and technology architecture

@Ride will be a **TypeScript modular monolith**. The browser application, server-rendered pages, and HTTP API will live in one Next.js codebase. A separate worker process, written in the same language and sharing the same domain modules, will handle reliable asynchronous work such as SMS, email, reminders, booking expiry, and webhook retries.

There is no separate Java, Python, PHP, or Laravel backend in the initial architecture. The backend programming language is TypeScript running on Node.js. This gives the project one language across UI, API, domain services, integrations, jobs, and shared types while retaining clear backend boundaries.

## 18a. Proposed technical architecture

Start as a modular monolith: one deployable application with well-separated modules. This retains the development simplicity of Zstore while supporting @Ride's more complex tenancy, permissions, payments, and operations.

```text
Browser / Installable PWA
          |
          v
Next.js application
  +-- Public marketplace and SEO pages
  +-- Community subdomain websites
  +-- Rider dashboard
  +-- Community and captain dashboards
  +-- Platform administration
  +-- API and webhook endpoints
          |
          v
Application modules
  +-- Identity and access
  +-- Communities and domains
  +-- Memberships and invitations
  +-- Rides, groups, routes, and checkpoints
  +-- Capacity, bookings, and waitlists
  +-- Payments and offline verification
  +-- Tracking and ride operations
  +-- Discovery and promotions
  +-- Notifications
  +-- Audit and reporting
          |
          v
Infrastructure
  +-- PostgreSQL + PostGIS
  +-- Redis
  +-- Object/image storage
  +-- Background job queue
  +-- Maps/geocoding provider
  +-- OTP/email/SMS/WhatsApp providers
  +-- Community-owned Razorpay integrations
```

### 18a.1 Proposed stack

- Frontend and server: Next.js with TypeScript
- Styling: Tailwind CSS and a reusable @Ride design system
- Authentication: Auth.js-compatible session architecture with OTP integration
- Primary database: PostgreSQL
- Geographic features: PostGIS
- ORM/data access: Prisma or another transaction-safe TypeScript ORM, selected during implementation
- Ephemeral state and caching: Redis
- Background processing: Redis-backed queue or managed equivalent
- Media: S3-compatible object storage or Cloudinary
- Payments: Per-community Razorpay integration, designed for additional gateways later
- Live updates: Server-Sent Events initially; WebSockets if bidirectional real-time needs justify them
- Deployment: Managed Next.js platform or containerized Node deployment with wildcard DNS/TLS
- Observability: Structured logs, error tracking, metrics, health checks, and audit events

### 18a.2 Why PostgreSQL instead of copying Zstore's MongoDB model

@Ride has strongly related data and transactional constraints:

- Users belong to multiple communities.
- Roles are scoped to communities and rides.
- Rides have groups, routes, pricing, bookings, payments, and check-ins.
- Capacity must not be oversold.
- Payment confirmation and slot allocation must be atomic.
- Geographic discovery benefits from PostGIS.

MongoDB can support these features, but PostgreSQL better matches the relational and transactional nature of this platform.

### 18a.3 Application layers

1. **Presentation layer:** Public pages, dashboards, forms, and API contracts.
2. **Route/controller layer:** Authentication, tenant resolution, input validation, and response mapping.
3. **Application layer:** Use cases such as `createRide`, `bookRide`, `confirmOfflinePayment`, and `checkInCheckpoint`.
4. **Domain layer:** Capacity, role, lifecycle, payment, cancellation, and visibility rules.
5. **Data-access layer:** Transactional repositories and tenant-scoped queries.
6. **Integration layer:** Razorpay, storage, maps, OTP, email, SMS, and WhatsApp.
7. **Worker layer:** Reminders, expiry, notifications, webhook retries, and scheduled publication.

Business rules must not be embedded only in page components or API handlers.


### 18.1 Runtime topology

```text
Rider browser / Organizer browser / Installable PWA
                         |
                         | HTTPS
                         v
              Wildcard DNS + TLS + CDN
               atride.in / *.atride.in
                         |
                         v
             Next.js web and API application
             TypeScript on the Node.js runtime
  +----------------------+------------------------+
  |                      |                        |
  | Server-rendered UI   | Route handlers/API     | Webhooks/SSE
  | Public SEO pages     | Commands and queries   | Payments/live progress
  +----------------------+------------------------+
                         |
                         v
                Application/domain modules
  auth | communities | rides | bookings | payments | tracking
  discovery | notifications | media | audit | reporting
             |                   |                 |
             v                   v                 v
     PostgreSQL/PostGIS        Redis        External integrations
     source of truth       cache/OTP/queue   Razorpay/MSG91/SES/
                                             Maps/Cloudinary
             ^                   |
             |                   v
             +---------- TypeScript worker ----------+
                        BullMQ consumers
                    reminders, expiry, delivery,
                    retry, webhook reconciliation
```

The web/API process handles request-response work. The worker handles tasks that must survive a browser closing, a provider timeout, or a temporary deployment restart.

### 18.2 Concrete technology choices

| Layer | Proposed technology | Purpose |
| --- | --- | --- |
| Programming language | TypeScript | Shared, strongly typed language for frontend, backend, jobs, and tests |
| Web framework | Next.js App Router on Node.js | Server-rendered pages, React UI, route handlers, metadata, sitemaps, and API endpoints |
| UI library | React | Interactive user, organizer, and captain interfaces |
| Styling | Tailwind CSS | Responsive @Ride design system and reusable UI primitives |
| Accessible components | Headless UI and Heroicons | Menus, dialogs, navigation, and icons consistent with Zstore's approach |
| Forms | React Hook Form + Zod | Form state, shared validation, and typed request schemas |
| Authentication | Auth.js sessions plus @Ride OTP verification | Secure sessions, account linking, login, and role-aware access |
| Primary database | PostgreSQL | Transactional system of record |
| Geographic database | PostGIS extension | Nearby communities, ride origins, destinations, and distance filtering |
| ORM and migrations | Prisma ORM | Typed database access, schema migrations, and transactions |
| Cache/ephemeral data | Redis | Tenant/domain cache, rate limits, OTP challenges, live state, and short reservations |
| Job queue | BullMQ on Redis | Reliable notification, reminder, expiry, and retry jobs |
| Image/media storage | Cloudinary initially | Signed uploads, transformations, thumbnails, galleries, and social images |
| Online payments | Official Razorpay server SDK/API | Per-community gateway orders, verification, and webhooks |
| SMS/phone OTP | MSG91 API | Indian mobile OTP and transactional/event SMS |
| Transactional email | Amazon SES API | Email OTP, confirmations, reminders, and operational email |
| Email templates | React Email or server-rendered HTML templates | Versioned responsive email templates |
| Maps and geocoding | Google Maps Platform | Maps, places, geocoding, coordinates, and route display |
| Live updates | Server-Sent Events | One-way ride status and checkpoint updates to participants |
| Error monitoring | Sentry | Frontend/backend error tracking and release diagnostics |
| Application logging | Pino structured logs | Searchable JSON logs with redaction and correlation IDs |
| Product analytics | Privacy-conscious analytics selected before launch | Funnels, ride discovery, and booking conversion without exposing sensitive data |
| Unit/integration tests | Vitest + Testing Library | Domain, component, and integration tests |
| Browser tests | Playwright | End-to-end tenant, booking, payment, and role tests |
| API documentation | OpenAPI generated/maintained from validated contracts | Internal and future mobile-client API documentation |

Exact dependency versions will be pinned when the application is scaffolded. Libraries should be kept behind local adapters where a provider may change, especially SMS, email, maps, storage, and payments.

### 18.3 Frontend architecture

The frontend is React rendered through the Next.js App Router:

- **React Server Components** for public communities, rides, location pages, dashboards, and initial data loading.
- **Client Components** only where browser interaction is needed, such as forms, filters, maps, uploads, live progress, and captain controls.
- **Server-side metadata** for canonical URLs, titles, descriptions, social images, and structured data.
- **Route groups/layouts** for the public marketplace, community site, rider area, community management, captain console, and platform administration.
- **Mobile-first responsive UI** with an installable PWA path for field use.
- **Shared design tokens** with community branding applied as safe theme variables rather than arbitrary CSS.
- **Accessibility** through semantic HTML, keyboard support, focus states, contrast, and screen-reader labels.

Proposed route organization:

```text
src/app/
  (marketplace)/                 # atride.in public discovery
  (account)/                     # login, verification, profile, my rides
  (community-public)/            # tenant public pages after host resolution
  (community-manage)/manage/     # tenant administration
  (platform-admin)/platform/     # @Ride administration
  api/                           # REST-style route handlers and webhooks
```

The single Next.js proxy/middleware layer performs only fast hostname normalization, reserved-host checks, and route rewriting. Community lookup and permission checks occur in cached server-side services; slow database work should not be placed directly in middleware.

### 18.4 Backend architecture

The backend is TypeScript on Node.js and consists of:

- Next.js route handlers for browser/mobile APIs
- Server actions only for narrowly scoped UI mutations where appropriate
- Application services for use cases such as `createRide`, `reserveSlot`, `confirmBooking`, and `checkInCheckpoint`
- Domain policies for lifecycle, permissions, capacity, pricing, and visibility
- Prisma repositories for transaction-safe PostgreSQL access
- Provider adapters for Razorpay, MSG91, SES, Cloudinary, Google Maps, and future alternatives
- BullMQ workers for background and scheduled processing
- Webhook handlers for Razorpay and message delivery-status callbacks
- Server-Sent Event endpoints for authorized live progress

The initial external API style is JSON over HTTPS with REST-oriented resources. It is simpler for the web application, webhooks, and a future mobile app than introducing GraphQL before it is needed.

Typical request path:

```text
Route handler
  -> validate hostname, session, permission, and Zod input
  -> call application service
  -> enforce domain rule
  -> execute tenant-scoped Prisma transaction
  -> write business event to outbox in the same transaction
  -> return a typed response
  -> worker later delivers notifications/integration work
```

### 18.5 Data and storage architecture

**PostgreSQL/PostGIS is the authoritative database.** It stores users, communities, roles, rides, routes, capacity, bookings, payments, checkpoints, notification records, and audit history.

**Redis is not the permanent source of truth.** It stores short-lived or recomputable state:

- OTP challenges and attempt counters
- Request and resend rate limits
- Short booking/capacity reservations
- Cached hostname-to-community mappings
- Current ride progress and last-known crew state
- BullMQ job data
- Idempotency and temporary locks

**Cloudinary stores public and controlled media:** community logos, ride banners, galleries, offline payment proofs, and generated thumbnails. Payment proofs and sensitive uploads require authenticated delivery or signed URLs rather than public asset URLs.

Database and Redis access must use connection pooling appropriate to the chosen hosting platform.

### 18.6 Deployment architecture

Recommended initial deployment:

| Component | Deployment model |
| --- | --- |
| Next.js web/API | Vercel or an equivalent managed Node/Next.js platform with wildcard TLS |
| TypeScript worker | A continuously running container service such as Railway, Render, Fly.io, or AWS ECS |
| PostgreSQL/PostGIS | Managed PostgreSQL provider with PostGIS, automated backups, and point-in-time recovery |
| Redis/BullMQ | Managed Redis with TLS and persistence suitable for queues |
| Media | Cloudinary |
| DNS | `atride.in` and `*.atride.in`, configured according to the selected host |
| Secrets | Hosting secret manager/environment variables; payment credentials additionally encrypted in the database |

The web and worker deployments come from the same repository and share domain packages. They scale separately: web traffic does not need to scale notification workers at the same rate.

For local development, Docker Compose can run PostgreSQL/PostGIS and Redis, while Next.js and the worker run as separate Node processes.

### 18.7 Main application packages and integrations

The initial package plan is:

```text
Core:          next, react, react-dom, typescript
UI:            tailwindcss, @headlessui/react, @heroicons/react
Forms:         react-hook-form, zod, @hookform/resolvers
Authentication: Auth.js packages, jose where signed tokens are required
Database:      prisma, @prisma/client
Redis/queue:   ioredis, bullmq
Payments:      razorpay
Email:         @aws-sdk/client-sesv2, react-email templates
Media:         cloudinary
Maps:          Google Maps JavaScript/Places APIs through a small local adapter
Logging:       pino
Monitoring:    @sentry/nextjs
Dates:         date-fns with UTC storage and IANA timezone identifiers
Testing:       vitest, Testing Library, Playwright
```

MSG91 should be integrated through its HTTPS API behind an `SmsProvider`/`OtpProvider` adapter rather than coupling domain code to an unofficial package. The same adapter pattern applies to email and maps.

### 18.8 Why PostgreSQL instead of copying Zstore's MongoDB model

@Ride has strongly related data and transactional constraints:

- Users belong to multiple communities.
- Roles are scoped to communities and rides.
- Rides have groups, routes, pricing, bookings, payments, and check-ins.
- Capacity must not be oversold.
- Payment confirmation and slot allocation must be atomic.
- Geographic discovery benefits from PostGIS.

MongoDB can support these features, but PostgreSQL better matches the relational and transactional nature of this platform.

### 18.9 Application layers

1. **Presentation layer:** Public pages, dashboards, forms, and API contracts.
2. **Route/controller layer:** Authentication, tenant resolution, input validation, and response mapping.
3. **Application layer:** Use cases such as `createRide`, `bookRide`, `confirmOfflinePayment`, and `checkInCheckpoint`.
4. **Domain layer:** Capacity, role, lifecycle, payment, cancellation, and visibility rules.
5. **Data-access layer:** Transactional repositories and tenant-scoped queries.
6. **Integration layer:** Razorpay, storage, maps, OTP, email, SMS, and WhatsApp.
7. **Worker layer:** Reminders, expiry, notifications, webhook retries, and scheduled publication.

Business rules must not be embedded only in page components or API handlers.

## 19. Proposed modules

```text
src/
  modules/
    auth/
    users/
    motorcycles/
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
    media/
    audit/
  app/
  components/
  infrastructure/
  jobs/
  lib/
```

This is a logical module boundary, not a requirement to create a separate service or package for every directory.

## 20. Conceptual data model

### 20.1 Identity and access

- `users`
- `user_contacts`
- `rider_profiles`
- `motorcycles`
- `otp_challenges`
- `sessions`
- `platform_role_assignments`
- `community_memberships`
- `community_role_assignments`
- `staff_invitations`
- `ride_staff_assignments`

### 20.2 Communities

- `communities`
- `community_domains`
- `community_locations`
- `community_media`
- `community_settings`
- `community_payment_integrations`

### 20.3 Rides

- `rides`
- `ride_media`
- `ride_groups`
- `ride_group_staff`
- `ride_route_segments`
- `ride_checkpoints`
- `ride_pricing_options`
- `ride_inclusions`
- `ride_addons`
- `ride_status_history`

### 20.4 Bookings and payments

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

### 20.5 Ride operations

- `ride_checkins`
- `location_updates`
- `ride_progress_events`
- `ride_incidents`
- `participant_checkins`

### 20.6 Platform operations

- `promotions`
- `notification_templates`
- `notification_events`
- `notifications`
- `notification_deliveries`
- `notification_preferences`
- `outbox_events`
- `audit_logs`
- `support_access_grants`

Most community-owned records contain a mandatory `communityId`. Database constraints, indexes, service rules, and tests must enforce tenant boundaries.

## 21. Critical transactional workflows

### 21.1 Capacity-safe booking

Within a database transaction:

1. Lock or atomically validate the relevant ride/group capacity.
2. Confirm eligibility and booking window.
3. Prevent prohibited duplicate bookings.
4. Create a time-limited capacity reservation.
5. Create the pending booking.
6. Initiate the selected payment flow.
7. Confirm only after a verified online webhook or authorized offline approval.
8. Expire and release abandoned reservations.

### 21.2 Online payment confirmation

1. Resolve the community payment integration from an unguessable integration token.
2. Verify the gateway signature using the encrypted community webhook secret.
3. Check webhook idempotency.
4. Validate amount, currency, gateway order, and booking.
5. Save payment result and immutable gateway references.
6. Confirm the booking atomically.
7. Dispatch notifications after commit.

### 21.3 Offline payment confirmation

1. Verify that the actor has a finance-related community permission.
2. Validate booking, amount, and current state.
3. Store proof/reference and verification details.
4. Mark payment and booking confirmed atomically.
5. Add an audit event.
6. Notify the rider.

## 22. Security, privacy, and reliability

### 22.1 Tenant security

- Resolve tenant from a validated hostname.
- Scope every community query by `communityId`.
- Include tenant ID in cache keys, storage paths, and background jobs.
- Test cross-tenant access attempts.
- Return 404 for unknown or suspended tenants.
- Do not use predictable identifiers as authorization.

### 22.2 Access control

- Centralize permission checks.
- Use individual accounts, MFA for privileged users, and short-lived sensitive actions.
- Separate financial permissions from ride-operation permissions.
- Audit role, capacity, payment, publication, and tracking changes.
- Require step-up authentication for payment credential changes.

### 22.3 Secrets and payments

- Encrypt community gateway credentials at rest.
- Restrict decryption to the payment integration service.
- Never expose secrets to the client or logs.
- Verify webhook signatures and make processing idempotent.
- Support credential rotation and immediate disablement.
- Avoid storing card or UPI credentials handled by the gateway.

### 22.4 Personal and location data

- Collect only data needed for the ride.
- Use explicit consent and versioned waivers.
- Restrict participant lists and emergency information.
- Do not expose precise live location publicly.
- Define retention and deletion rules for location, identity, and payment proof.
- Log exceptional platform-support access.
- Provide privacy, terms, cancellation, refund, and safety policies before launch.

### 22.5 Reliability

- Idempotent background jobs and webhooks
- Database backups and tested restore procedure
- Health checks and alerting
- Retry policies with dead-letter handling
- Rate limiting for auth, OTP, booking, uploads, and webhooks
- Graceful operation on slow or intermittent mobile networks
- Check-in actions that clearly show pending, successful, or retry states

## 23. Notifications

@Ride will centrally operate the SMS and email infrastructure. Communities configure their public contact and reply-to details, but they do not need to provide their own MSG91 or Amazon SES credentials. Central ownership keeps authentication reliable, templates compliant, delivery observable, and secrets out of community dashboards.

Ride-payment gateways remain community-owned; communication providers remain platform-owned.

### 23.1 Provider plan

| Need | Initial provider | Notes |
| --- | --- | --- |
| Phone OTP | MSG91 | India-oriented OTP delivery and verification support |
| Transactional/event SMS | MSG91 | DLT-approved templates and sender/header required for Indian traffic |
| Email OTP | Amazon SES | Sent from an authenticated @Ride domain |
| Transactional/event email | Amazon SES | Booking, payment, ride, and account messages |
| In-app notifications | @Ride database/API | Notification center and unread count |
| WhatsApp | Later phase | Add through an approved provider and message templates if justified |
| Push notifications | Later PWA/mobile phase | Web Push or mobile platform notification services |

Providers are accessed through internal interfaces so they can be replaced without rewriting booking or ride modules:

```text
OtpProvider
  sendPhoneOtp()
  sendEmailOtp()

SmsProvider
  sendTemplate()
  getDeliveryStatus()

EmailProvider
  sendTemplate()
  getDeliveryStatus()
```

### 23.2 Phone and email OTP flow

Phone and email are verified independently. Phone verification is required for rider registration; email verification may also be required according to the final authentication policy.

```text
User requests OTP
      |
      v
Normalize phone/email and apply IP + destination rate limits
      |
      v
Generate cryptographically secure one-time code
      |
      v
Store only protected challenge data in Redis with short TTL
      |
      +-- phone -> MSG91 approved OTP template
      +-- email -> Amazon SES @Ride OTP template
      |
      v
User submits code
      |
      v
Constant-time verification + attempt check + expiry check
      |
      +-- valid   -> consume challenge and mark contact verified
      +-- invalid -> increment attempts; lock when limit is reached
```

Recommended controls:

- Five-minute OTP validity
- One-time use
- Resend cooldown
- Maximum verification attempts per challenge
- Limits by IP address, device/session, and phone/email destination
- Escalating cooldown or CAPTCHA after suspicious behavior
- Do not reveal whether an account exists during login/recovery flows
- Store OTPs only as a secure HMAC/hash or rely on the provider's managed verification; never store or log the plain code
- Redact phone numbers, email addresses, provider secrets, and OTPs from logs
- Record request and verification outcomes for abuse monitoring without storing the code
- Invalidate older challenges when a replacement code is issued

Email OTP is not an automatic bypass for phone verification. Each channel verifies ownership of its own destination. A controlled fallback flow may be introduced for account recovery after security review.

### 23.3 SMS compliance and setup

Before production SMS to Indian numbers, @Ride must complete the required sender/entity and template setup for the selected provider and telecom ecosystem. This includes approved message templates and the correct template identifiers for OTP and transactional messages.

Template text must match the approved version, including variables. OTP, transactional/service, and promotional messages must not be mixed under the same consent or template assumptions. Marketing communication requires separate consent and preferences from service messages needed to operate a booking.

Example SMS template categories:

- Login/registration OTP
- Booking confirmed
- Offline payment awaiting verification
- Offline payment approved or rejected
- Ride changed, postponed, or cancelled
- Ride reminder
- Starting group started
- Important operational delay or safety notice
- Waitlist slot offered

Message bodies should be concise and avoid sensitive medical, identity, payment-secret, or precise live-location data. Use an authenticated short link to show protected details inside @Ride.

### 23.4 Email-domain setup

Amazon SES should send from the verified `atride.in` domain, for example:

```text
OTP/security:       security@atride.in
Ride notifications: notifications@atride.in
Support:            support@atride.in
```

Production setup includes:

- Domain verification
- SPF and DKIM
- DMARC policy and reporting
- SES production access rather than sandbox-only sending
- Bounce and complaint processing
- Suppression handling
- A community-specific `Reply-To` where appropriate
- Text and HTML versions of important emails

Communities may be visually represented in a message, but the sender identity should remain clearly @Ride unless a verified custom sender feature is deliberately added later.

### 23.5 Reliable notification pipeline

Core transactions must not call SMS or email providers directly. They write an outbox event in the same PostgreSQL transaction as the business change:

```text
Booking confirmed transaction
  +-- update booking
  +-- record payment result
  +-- insert outbox event: booking.confirmed
             |
             v
Outbox publisher -> BullMQ -> Notification worker
                                |
                                +-- create in-app notification
                                +-- render SMS template
                                +-- render email template
                                +-- call provider adapters
                                +-- record each delivery attempt
                                +-- retry temporary failures
                                +-- dead-letter permanent/exhausted failures
```

This transactional-outbox design prevents a case where a booking is committed but the confirmation message is lost because the application crashes before queueing it. Every event and delivery uses an idempotency key so retries cannot send uncontrolled duplicates.

OTP delivery is latency-sensitive and follows a dedicated high-priority path, but still records provider request IDs, redacted delivery results, rate limits, and verification outcomes.

### 23.6 Event catalogue

Initial domain events include:

| Event | Typical recipients | Channels |
| --- | --- | --- |
| `identity.phone_otp_requested` | User | SMS |
| `identity.email_otp_requested` | User | Email |
| `staff.invited` | Invited staff member | Email, SMS, in-app when available |
| `booking.created` | Rider | In-app, email |
| `booking.payment_pending` | Rider | In-app, email, optional SMS |
| `booking.confirmed` | Rider and relevant organizer | In-app, email, SMS |
| `booking.expired` | Rider | In-app, email |
| `payment.offline_proof_submitted` | Finance staff | In-app, email |
| `payment.offline_verified` | Rider | In-app, email, SMS |
| `waitlist.slot_offered` | Rider | In-app, SMS, email |
| `ride.reminder_due` | Confirmed participants | In-app, email, optional SMS |
| `ride.schedule_changed` | Confirmed participants and staff | In-app, email, SMS |
| `ride.cancelled_or_postponed` | Confirmed participants and staff | In-app, email, SMS |
| `ride.group_started` | Group participants and authorized staff | In-app, SMS |
| `ride.important_update` | Relevant participants | In-app, SMS, email according to urgency |
| `ride.completed` | Participants and staff | In-app, email |

Community administrators cannot write arbitrary bulk SMS text in the MVP. They select approved event/template types and provide validated variables. This prevents template mismatch, spam, secret leakage, and unexpected messaging costs.

### 23.7 Scheduled reminders

When a ride or booking is confirmed, the worker schedules reminder jobs, for example:

- Booking/payment deadline reminder
- Offline payment reservation expiry
- Seven-day ride preparation email
- Twenty-four-hour ride reminder
- Starting-group assembly reminder
- Waitlist-offer expiry

If a ride time, group, or status changes, obsolete jobs are cancelled or ignored through event-version checks and new jobs are scheduled. Every scheduled job re-reads current authoritative data before sending.

### 23.8 Templates and community branding

Templates are versioned and stored as application-managed definitions with provider template identifiers:

```text
NotificationTemplate
- eventType
- channel
- version
- locale
- providerTemplateId / dltTemplateId
- allowedVariables
- status
```

Safe variables include community name, ride name, date/time, starting group, support contact, booking reference, and an authenticated @Ride link. The worker validates variables before rendering.

Email can use the community logo and theme within an @Ride-owned frame. SMS uses the approved @Ride sender identity and approved text template.

### 23.9 Delivery status, retries, and visibility

Store one delivery record per recipient/channel:

- Event and notification IDs
- Recipient user ID and redacted destination
- Provider and provider request ID
- Template/version
- Queued, sent, delivered, bounced, failed, or suppressed status
- Attempt count and last error category
- Timestamps

Provider delivery webhooks update final status. Temporary errors use exponential backoff with a maximum attempt count. Permanent failures, invalid destinations, hard email bounces, and opted-out marketing messages are not retried indefinitely.

Riders can see relevant in-app notifications. Community staff can see delivery status for their own ride communications without seeing platform secrets or unrelated tenant data. Platform support receives aggregate failure alerts.

### 23.10 Notification preferences and consent

Messages are classified as:

- **Security:** OTP, account recovery, and suspicious-login notices
- **Transactional/service:** booking, payment, cancellation, ride-time, and essential operational messages
- **Marketing:** recommendations, promotions, and newsletters

Security and essential service messages are sent only when needed for the requested account or booking workflow. Marketing requires separate opt-in and unsubscribe controls. Users can configure nonessential channel preferences, while the product clearly explains which operational messages are necessary for an active booking.

## 24. Design direction

The visual system can reuse the clarity and component patterns of Zstore while adopting an adventure-oriented identity:

- Strong mobile-first ride cards
- High-contrast outdoor photography
- Clear date, route, difficulty, price, and availability hierarchy
- Distinct community branding within a consistent @Ride frame
- Map and timeline components
- Accessible status colors with text labels
- Large touch targets for captains operating outdoors
- Skeleton and low-connectivity states

The experience should feel dependable and operational, not only promotional.

## 25. Delivery roadmap

### Phase 0: Product and technical foundation

- Confirm brand and trademark viability
- Finalize roles and permission matrix
- Define booking, cancellation, waiver, and data-retention policies
- Validate and provision the proposed hosting, PostgreSQL/PostGIS, Redis, Google Maps, MSG91, Amazon SES, and Cloudinary services
- Complete SMS sender/entity/template registration required for production Indian messaging
- Verify the `atride.in` email domain and configure SPF, DKIM, DMARC, bounce, and complaint handling
- Establish wildcard DNS/TLS strategy
- Create design system and database migrations

### Phase 1: Public marketplace

- @Ride landing page
- Location-aware ride and community discovery
- Community profiles and wildcard subdomains
- Public ride pages
- City/destination pages
- SEO metadata, structured data, sitemap, and robots rules
- Community application/onboarding
- Featured and promoted content administration

### Phase 2: Identity, communities, and bookings

- Mobile verification and rider profiles
- Motorcycle and emergency-contact profiles
- Community roles and invitations
- Ride creation, drafts, publication, pricing, inclusions, and media
- Multiple starting groups and capacity
- Booking, reservation, waitlist, and waiver flow
- Per-community Razorpay configuration
- Offline payments and proof verification
- Rider and community dashboards
- Notifications and audit logs

### Phase 3: Ride operations

- Captain console
- Staff assignments
- Routes, checkpoints, and merge points
- Starting-group and participant check-in
- Last-known authorized crew location
- Participant-only live progress
- Delay, status, and incident updates
- Ride completion and post-ride summary

### Phase 4: Growth and advanced operations

- Organizer subscription plans, if required
- Reviews and reputation
- Advanced analytics and reports
- Custom community domains
- Richer promotion tools
- Route planning integrations
- Native mobile apps if usage and operational needs justify them

## 26. MVP recommendation

The first usable commercial release should include:

- Public marketplace and location filtering
- Community subdomains and profiles
- Rider registration with mobile verification
- Community roles and staff invitations
- Ride creation with multiple origins, pricing, images, capacity, and inclusions
- Online payment through the community's Razorpay account
- Offline payment verification
- Booking and participant management
- Rider and community dashboards
- SEO-ready public pages

Live GPS tracking should follow after booking and captain workflows are stable. A smaller initial tracking release can provide manual checkpoint check-ins and last-known captain location before continuous real-time features.

## 27. Decisions still to finalize

- Final authentication method: password, OTP-first, social login, or a combination
- Exact community verification procedure
- Which staff roles may verify offline payment by default
- Refund handling when communities own the gateway account
- Whether a community may publish immediately or requires platform approval
- Whether buffer slots are visible or hidden
- Waitlist rules and offer expiry
- Required rider documents and retention periods
- Public versus participant-only ride progress
- Final managed vendors/plans for PostgreSQL/PostGIS, Redis, and the TypeScript worker deployment
- Final contracts/accounts and production limits for Google Maps, MSG91, Amazon SES, and Cloudinary
- Hosting approach and wildcard TLS automation
- @Ride organizer pricing model, if any

## 28. Reference links

- Next.js App Router: <https://nextjs.org/docs/app>
- Auth.js: <https://authjs.dev/>
- Prisma transactions: <https://www.prisma.io/docs/orm/prisma-client/queries/transactions>
- PostgreSQL: <https://www.postgresql.org/docs/>
- PostGIS: <https://postgis.net/documentation/>
- BullMQ: <https://docs.bullmq.io/>
- Razorpay developer documentation: <https://razorpay.com/docs/>
- MSG91 OTP API: <https://docs.msg91.com/otp-widget>
- MSG91 SMS API: <https://docs.msg91.com/sms>
- MSG91 India DLT guidance: <https://msg91.com/help/dlt-registration-in-india/dlt-faqs>
- Amazon SES documentation: <https://docs.aws.amazon.com/ses/>
- Google Maps Platform documentation: <https://developers.google.com/maps/documentation>
- Cloudinary documentation: <https://cloudinary.com/documentation>
- Google Event structured data: <https://developers.google.com/search/docs/appearance/structured-data/event>
- Google Organization structured data: <https://developers.google.com/search/docs/appearance/structured-data/organization>
- Google site-name guidance: <https://developers.google.com/search/docs/appearance/site-names>
- Google canonical URL guidance: <https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls>
- Vercel domain and wildcard-domain guidance: <https://vercel.com/docs/domains/working-with-domains>
- GoDaddy wildcard SSL overview: <https://www.godaddy.com/help/what-is-a-wildcard-ssl-certificate-567>

---

@Ride should preserve Zstore's approachable full-stack development experience and reusable UI thinking, while using a multi-tenant, role-aware, transaction-safe foundation suited to real communities, bookings, payments, and ride operations.
