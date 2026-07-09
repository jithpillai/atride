# ADR-008: Make @Ride a Guild OS with optional marketplace participation

- Status: Accepted
- Date: 2026-07-09

## Context

At launch, @Ride has no marketplace audience to promise Guilds. Existing communities may also avoid platforms that expose their schedules or encourage members to discover competing groups. They still benefit from a hosted website, bookings, payments, participant management, announcements, and ride operations.

## Decision

Treat the Guild operating system as the primary product and the root discovery marketplace as optional distribution. Model directory visibility, Guild Hall access, per-ride access, and indexing independently. Unlisted/private Guilds receive the complete operating product. A Guild subdomain never displays another Guild's schedule or promotion.

Support public read-only widgets for approved existing Guild websites. Do not embed authenticated booking/payment/administration flows cross-site. Add custom domains later for a first-party white-label experience.

## Consequences

- Guild adoption does not depend on @Ride network size.
- Root marketplace queries and sitemaps must enforce listing policy.
- Private/unlisted content requires authorization and noindex controls.
- Tenant pages cannot reuse cross-Guild recommendation components accidentally.
- Widget endpoints need explicit public projections, allowed origins, and CSP.
- Custom domains need verification, TLS, canonical, and redirect handling.

## Alternatives considered

- Require every Guild to join the marketplace: rejected because it weakens early adoption and privacy.
- Separate deployments for private Guilds: rejected because visibility policy can isolate tenants in one platform.
- Embed the entire application in an iframe: rejected due to authentication, storage, payment, navigation, and security limitations.
