# ADR-004: Use community-owned Razorpay integrations

- Status: Accepted
- Date: 2026-07-07

## Context

Communities need online ride payments, but @Ride does not intend to collect funds and later settle them with organizers.

## Decision

Each community connects its own Razorpay account. @Ride encrypts tenant credentials, creates orders for that tenant, verifies tenant-specific webhooks, and records booking/payment state. Funds move directly to the community. Offline payments are verified manually by permitted community staff.

## Consequences

- No @Ride ride-fund settlement workflow
- Each community is responsible for its gateway account and activation
- Tenant-specific secrets require strong encryption, access control, and rotation
- Refund status must be synchronized even when the community performs the gateway action
- One project-owned Razorpay test account is still needed for development

## Alternatives considered

- @Ride collects and settles all funds: rejected due to operational, accounting, and compliance scope
- Offline-only payments: rejected because online confirmation is a core convenience and anti-no-show tool
