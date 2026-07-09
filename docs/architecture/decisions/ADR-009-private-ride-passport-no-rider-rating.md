# ADR-009: Use a private Ride Passport and no rider star rating

- Status: Accepted
- Date: 2026-07-09

## Context

A participant's verified experience can help a new Guild understand their background, but public profiles and rider star ratings create privacy, scraping, retaliation, bias, blacklisting, dispute, and moderation risks.

## Decision

Build Ride Passport summaries from verified completed participation, role assignments, milestones, and consented awards. Do not offer public individual profiles in the initial release. Share only a limited, previewable aggregate with a Guild after a qualifying relationship. Newcomer tiles and individual awards are Guild-member-only and require per-Guild consent.

Do not implement public or cross-Guild rider star ratings. Permit verified completed participants to review Guilds under neutral moderation rules.

## Consequences

- Participation/completion must be distinct from bookings.
- Passport projections must be traceable to authoritative records.
- Privacy preferences and disclosure previews are required.
- Cross-Guild negative notes and no-show statistics are not shared automatically.
- Trust-and-safety incidents require a separate evidence, notice, response, appeal, and moderation process if introduced.
- Guild awards and community reviews require issuer/eligibility/audit records.

## Alternatives considered

- Public opt-in participant profiles: deferred because the initial value does not justify privacy and scraping risk.
- Public rider star rating: rejected because a single score is weak, gameable, and potentially harmful.
- No cross-Guild signal at all: rejected because limited verified aggregate experience has legitimate eligibility value.
