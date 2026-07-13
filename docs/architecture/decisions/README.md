# Architecture Decision Records

Architecture Decision Records (ADRs) capture important choices, their context, and consequences. They prevent research and rationale from being repeated in the root README.

## Status values

- `Proposed`: under discussion
- `Accepted`: current direction
- `Superseded`: replaced by a newer ADR
- `Rejected`: considered but not selected

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [ADR-001](ADR-001-modular-monolith.md) | TypeScript modular monolith | Accepted |
| [ADR-002](ADR-002-postgresql-postgis.md) | PostgreSQL/PostGIS as the primary database | Accepted |
| [ADR-003](ADR-003-hostname-multi-tenancy.md) | Path-first multi-tenancy with deferred wildcard subdomains | Accepted |
| [ADR-004](ADR-004-community-owned-payments.md) | Community-owned Razorpay integrations | Accepted |
| [ADR-005](ADR-005-central-communications.md) | Central MSG91/SES communication platform | Superseded by ADR-011 |
| [ADR-006](ADR-006-vehicle-neutral-bike-first.md) | Vehicle-neutral core with a bike-first launch | Accepted |
| [ADR-007](ADR-007-official-announcements-external-chat.md) | Official @Ride announcements with external WhatsApp chat | Accepted |
| [ADR-008](ADR-008-guild-os-optional-marketplace.md) | Guild OS with optional marketplace participation | Accepted |
| [ADR-009](ADR-009-private-ride-passport-no-rider-rating.md) | Private Ride Passport and no rider star rating | Accepted |
| [ADR-010](ADR-010-web-pwa-wrapper-then-android.md) | Complete web, then PWA/wrapper, then optional Android | Accepted |
| [ADR-011](ADR-011-email-first-defer-sms.md) | Email-first authentication with optional final-phase SMS | Accepted |
| [ADR-012](ADR-012-cloudinary-media.md) | Cloudinary as initial media provider behind an adapter | Accepted |
| [ADR-013](ADR-013-opaque-database-sessions.md) | Application-owned opaque PostgreSQL sessions | Accepted |
| [ADR-014](ADR-014-firebase-phone-verification.md) | Firebase for one-time phone ownership verification | Accepted |
| [ADR-015](ADR-015-review-before-apply-ai-authoring.md) | Review-before-apply AI ride authoring | Accepted |

## Adding a decision

Copy this outline into `ADR-NNN-short-name.md`:

```markdown
# ADR-NNN: Decision title

- Status: Proposed
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences

## Alternatives considered
```

An accepted ADR should be superseded by a new ADR rather than silently rewritten when the architectural decision changes materially.
