# ADR-007: Keep official announcements in @Ride and casual chat external

- Status: Accepted
- Date: 2026-07-08

## Context

Communities already use WhatsApp effectively for informal ride conversation. Building native group chat would require real-time messaging, push delivery, media, moderation, reporting, privacy, retention, and synchronization while still competing with established participant habits. Organizers nevertheless need a dependable source of truth for itinerary, payment, schedule, safety, and operational updates.

Programmatic creation of normal large WhatsApp groups is not a dependable MVP capability. Unofficial WhatsApp-Web automation introduces account-ban, privacy, credential, and maintenance risk; official group capabilities and eligibility must not be assumed.

## Decision

Do not build participant-to-participant chat in the MVP. Build a tenant-scoped official announcement/activity feed with optional acknowledgement for critical updates. Allow a ride administrator to attach a manually created WhatsApp invite link using one of these modes:

```text
DISABLED
DISCUSSION
ANNOUNCEMENTS_ONLY
```

When WhatsApp is enabled, `ANNOUNCEMENTS_ONLY` is the recommended default. The organizer manually configures WhatsApp so only admins can send and confirms that step in @Ride. Essential information remains in @Ride regardless of WhatsApp participation.

## Consequences

- @Ride remains the authoritative operational record.
- Communities retain familiar WhatsApp conversation without @Ride rebuilding chat.
- Invite links require protected storage, access control, expiry, and privacy disclosure.
- Opening an invite link cannot be treated as verified group membership.
- External group moderation remains the community's responsibility.
- Official announcements fan out through in-app and email initially; an approved optional SMS adapter may be added later.
- A future official WhatsApp adapter can be added behind the communication-channel interface if API limits and eligibility become suitable.

## Alternatives considered

- Native @Ride chat: rejected for MVP due to scope, moderation, privacy, and weak differentiation.
- Unofficial automated WhatsApp group management: rejected due to account, security, and reliability risk.
- WhatsApp-only essential communication: rejected because participants may not join and operational information must remain auditable in @Ride.
