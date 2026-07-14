# Guild Hall, Ride Passport, Awards, and Reputation

This document defines the user-facing Guild Hall experience and privacy-safe trust signals across @Ride. It records the decision to use verified experience and awards rather than a public rider rating.

## 1. Terminology

- `Community` remains the technical/domain term.
- `Guild` is an optional user-facing term for a road-adventure community.
- `Guild Hall` is the community's hosted page and member space.

Example:

```text
Royal Ravanas Guild Hall
Motorcycle riding community in Bengaluru
```

SEO and explanatory copy must still use understandable terms such as riding community, road-adventure community, bike ride, convoy, or expedition. `Guild` should add identity without replacing clear language.

## 2. Core privacy decision

@Ride will not provide publicly accessible individual participant profiles in the initial release, even through an opt-in setting.

Anonymous visitors must never see:

- Individual Ride Passports
- Member directories
- Newcomer names or profile photos
- Participant awards tied to an individual
- Exact personal ride history
- Participant contact, vehicle, booking, payment, medical, or location information

Authentication alone is not sufficient to see member information. Access requires an appropriate Guild or ride relationship.

## 3. User, ride, and Guild mapping

A durable ride-participation record links:

```text
User
  -> Ride participation
       -> Ride
       -> Community/Guild
       -> Booking
       -> Starting group
       -> Vehicle
       -> Participant and crew roles
       -> Completion status
       -> Awards/recognition
```

Participation becomes verified only after the ride is completed and the participant's attendance/completion is confirmed according to policy.

A booking and a completed participation are different facts. Cancelled, expired, rejected, and no-show bookings must not increase completed-ride statistics.

## 4. Access matrix

| Viewer | Permitted individual information |
| --- | --- |
| Anonymous visitor | None; public Guild/ride content only when the Guild permits it |
| Verified @Ride user without relationship | No member directory or individual reputation details |
| Confirmed Guild member/participant | Guild-member sections permitted by the Guild and individual consent |
| New booking Guild | Limited Ride Passport summary needed for that booking |
| Assigned ride staff | Operational information required for assigned rides |
| Platform support/safety | Exceptional audited access for legitimate cases |

## 5. Ride Passport

The Ride Passport is a verified aggregate experience summary, not a public social profile.

Example:

```text
Phone verified
Email verified
18 verified completed rides
7 verified multi-day rides
3 Captain assignments
2 Sweep/Marshal assignments
2 verified Guild awards
Member since 2024
```

### 5.1 Allowed aggregate signals

- Verified completed rides
- Multi-day completed rides
- Completed role assignments
- Number of Guilds ridden with, if the participant allows it
- Vehicle/ride categories
- Verified system milestones
- Selected Guild-issued awards
- Account/member-since date

### 5.2 Information not shared cross-Guild by default

- Exact private ride names, dates, routes, or destinations
- Booking price or payment history
- Internal Guild notes
- Cancellation disputes or no-show counts
- Incident or safety reports
- Emergency, medical, identity-document, or live-location data
- Another Guild's private membership details

### 5.3 Visibility modes

Initial modes:

```text
PRIVATE
GUILDS_I_RIDE_WITH
CURRENT_GUILD_MEMBERS
```

There is no `PUBLIC` mode in the initial release.

Recommended default: `GUILDS_I_RIDE_WITH` for the limited summary only, with a clear preview before submission.

When a participant books with a new Guild, the booking flow states which summary fields that Guild will receive. The participant can preview the disclosure. Product policy must decide whether a Guild may require the limited summary for eligibility; optional nonessential fields remain consent-controlled.

### 5.4 Verification labels

The UI distinguishes:

```text
Verified by @Ride activity
Issued by a verified Guild
Self-declared profile information
```

Self-declared experience must not look equivalent to verified completion data.

## 6. No rider rating

@Ride will not implement a public rider star score or cross-Guild negative rating in the initial product.

Reasons:

- Retaliatory or popularity-based ratings
- Bias against new participants
- Unreviewable blacklisting
- Defamation and dispute risk
- One Guild damaging a participant across the platform
- Weak meaning behind a single numeric score

Operational feedback, if introduced later, begins as structured and private to the participant, submitting Guild, and audited platform support. A trust-and-safety incident is a separate workflow with evidence, notification, response, appeal, and moderation—not a one-star review.

## 7. Newcomer welcome section

The Guild Hall can show a `Welcome to the Guild` train of recent first-time participants.

Eligibility:

- First confirmed booking or accepted membership with that Guild
- Booking is not cancelled, expired, rejected, or refunded out of participation
- Participant explicitly opts in for that Guild

Example consent:

```text
Allow Royal Ravanas to welcome me in its Guild Hall.

Visible to authenticated Royal Ravanas members:
- First name
- Profile photo or initials
- City
- Selected Ride Passport highlights
```

Rules:

- Visible only to authenticated members/qualified participants of that Guild.
- Anonymous visitors may see an aggregate such as `12 new members this month`, never individual tiles.
- Profile image is optional; initials/generated avatar are the fallback.
- Never show phone, email, vehicle registration, booking amount, or sensitive profile data.
- Consent is per Guild and revocable.
- The card says `New to this Guild` even when the participant is experienced elsewhere.
- The section shows a bounded recent list rather than a permanent member directory.

## 8. Awards and recognition

Guilds can define and grant awards such as:

- Most Rides Completed
- Best Captain
- Best Marshal or Sweep
- Best Volunteer
- Safety Champion
- Route Planner
- Community Builder
- Rookie of the Year
- Long-Distance Explorer
- Monsoon or Himalayan Explorer

### 8.1 Award categories

**System-calculated:** derived from verified @Ride data, such as ride-count milestones or completed captain assignments.

**Guild-issued:** deliberately granted by authorized Guild staff with a reason and period.

### 8.2 Award model

```text
AwardDefinition
- id
- communityId
- name
- description
- icon/media
- category
- calculationType
- visibility
- active

AwardGrant
- id
- awardDefinitionId
- recipientUserId
- relatedRideId (optional)
- period/year
- reason
- issuedBy
- issuedAt
- revokedAt
```

Rules:

- Only authorized Guild roles can grant manual awards.
- Every award identifies its issuing Guild.
- Grants are not silently edited; corrections/revocations are audited.
- Other Guilds cannot alter the award.
- Offensive, deceptive, or unsafe award definitions are moderated.
- The participant controls whether an eligible award appears in a cross-Guild summary.
- Individual awards are not publicly visible in the initial release.

## 9. Community reviews and ratings

Community ratings are permitted; rider ratings are not.

Only a verified participant who completed the relevant ride can submit a review. Suggested dimensions:

- Organization
- Communication
- Safety briefing
- Itinerary accuracy
- Accommodation and food, where applicable
- Value for money
- Overall experience

Rules:

- One review per eligible participation.
- Display the verified review count with aggregate values.
- Use a minimum count/Bayesian or equivalent approach before presenting a strong aggregate.
- Guilds may respond and report abuse but cannot selectively suppress negative reviews.
- Moderation handles harassment, personal data, and policy violations.
- `Verified Guild` and `Highly rated Guild` are separate claims.
- Review visibility follows the Guild's directory/site access settings.
- Leaving the optional marketplace can remove marketplace exposure, but does not erase legitimate underlying review records.

## 10. Guild Hall composition

Possible sections:

```text
Guild identity, verification, and cover
Welcome and community description
Upcoming rides
New to the Guild
Guild champions and awards
Recent completed adventures
Captains and crew
Guild statistics
Verified participant reviews
Gallery
Rules and participant guidance
```

For a logged-in member:

```text
Your Guild history
- rides completed with this Guild
- upcoming ride
- roles and awards
- member since
```

Anonymous and unrelated viewers receive only the sections permitted by the Guild's visibility settings, never member-level details.

## 11. Conceptual data model

- `ride_participations`
- `participation_roles`
- `ride_passport_preferences`
- `ride_passport_projections`
- `guild_welcome_consents`
- `award_definitions`
- `award_grants`
- `ride_reviews`
- `community_rating_aggregates`
- `review_reports`

Derived projections are rebuilt from authoritative participation, role, and award records. They must not become an untraceable source of truth.

The current Phase 5 implementation persists `guild_welcome_consents` against the unique Guild membership. A confirmed booking can activate previously captured consent, accepted members can opt in from their account, and revocation is retained as an audited state. The Guild Hall query independently requires an active viewer membership, an active subject membership, Guild-level display enablement, and a recent join date.

## 12. Acceptance criteria

- Anonymous users cannot access any individual Ride Passport or newcomer tile.
- A verified unrelated user cannot browse Guild members.
- A new Guild sees only the documented limited summary after a qualifying relationship.
- The participant previews what will be shared.
- Cancelled/no-show bookings do not inflate completed-ride counts.
- Newcomer appearance requires per-Guild opt-in and can be revoked.
- Profile-photo absence uses a safe fallback.
- Awards identify issuer and are auditable.
- No public rider star rating exists.
- Community reviews require verified completed participation.
- Guild review responses and moderation do not permit selective negative-review deletion.

Guild listing and access modes are defined in [guild-visibility-and-embedding.md](guild-visibility-and-embedding.md).
