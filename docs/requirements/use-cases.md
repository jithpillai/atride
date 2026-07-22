# @Ride Functional Use Cases

This document defines actors, permissions, and product workflows. Technical implementation details belong in [system-design.md](../architecture/system-design.md).

## 1. Actors

### 1.1 Platform actors

| Actor | Scope |
| --- | --- |
| Platform Owner | Full @Ride platform and critical configuration |
| Platform Admin | Communities, users, moderation, support, and featured content |
| Platform Support | Limited, audited investigation of support cases |
| Platform Finance Admin | @Ride's own subscription or service billing, if introduced |

### 1.2 Community actors

| Actor | Scope |
| --- | --- |
| Community Owner | Full control of one community and its payment configuration |
| Community Admin | Community profile, members, staff, rides, and bookings |
| Ride Manager | Ride creation, editing, publication, and management |
| Finance Manager | Offline payment verification and payment records |
| Community Member | Member-only community features and eligible rides |
| Participant/Guest | Discovery, registration, vehicle profile, and permitted bookings |

### 1.3 Ride actors

| Actor | Scope |
| --- | --- |
| Lead Captain | Overall ride control and coordination |
| Captain | Assigned starting group or route segment |
| Vice Captain | Delegated assistance to a captain |
| Sweep | Rear-group progress and incident reporting |
| Marshal | Assigned checkpoint or route section |
| Participant | Booked ride information and participant-only progress |

A person can have different roles in different communities and rides. Ride roles do not automatically grant permanent community administration.

## 2. Authorization principles

- One global user account works across @Ride.
- Every privileged user has an individual account.
- Platform, community, and ride permissions have independent scopes.
- Financial permission is separate from ride-operation permission.
- Communities see only users with a valid membership, booking, invitation, or support relationship.
- Every sensitive or privileged mutation is audited.

## 3. Public discovery

### UC-01: Discover nearby rides

**Actor:** Visitor or participant

**Preconditions:** None

**Flow:**

1. @Ride determines a preferred location from user selection, profile, browser permission, approximate IP location, or a default.
2. The marketplace displays relevant trending and upcoming rides across communities.
3. The visitor filters by origin, destination, date, vehicle type, trip type, price, availability, community, accommodation, or vehicle requirement.
4. The visitor opens a public ride page.

**Rules:**

- The user can always override an inferred location.
- Geographic relevance ranks results but does not prevent searching other cities.
- Promoted results are visibly labelled.
- Cancelled, archived, private, and draft rides do not appear as bookable public rides.

### UC-02: Discover communities

**Actor:** Visitor or participant

**Flow:**

1. Browse communities near a location or by name.
2. Open a community's `*.atride.in` page.
3. View its profile, operating areas, gallery, social links, and published rides.

**Rules:**

- A community subdomain shows only that community's content.
- Suspended or unknown communities return an appropriate unavailable/404 response.

### UC-03: View trending, featured, and promoted content

**Actor:** Visitor or participant

**Rules:**

- Upcoming is primarily date-based.
- Recently added is publish-date based.
- Trending uses recent confirmed bookings, engagement, freshness, quality, and proximity.
- Featured content is editorially selected by @Ride.
- Promoted content is paid or contractual placement and is labelled.

### UC-03A: View my upcoming rides on the landing page

**Actor:** Authenticated participant or ride staff member

**Goal:** See every relevant upcoming ride in one place regardless of whether the user's relationship is participant, captain, vice captain, sweep, marshal, or another explicit ride assignment.

**Eligibility:**

A ride appears when the user has at least one active ride-level relationship:

- Confirmed or actionable booking
- Lead Captain assignment
- Captain or Vice Captain assignment
- Sweep or Marshal assignment
- Another explicit ride-staff assignment

A broad Community Admin role alone does not add every community ride to this personal section. Community-wide ride management remains in the community dashboard.

**Flow:**

1. A logged-in user opens the main `atride.in` landing page.
2. @Ride displays `Your upcoming rides` above general discovery sections.
3. Each card shows community, ride, dates, destination, starting group, booking/payment state, role badges, and the next important action.
4. If the user has several relationships with one ride, @Ride shows one deduplicated card with all relevant role badges.
5. Clicking the card opens the ride's canonical community URL.
6. The ride page recalculates current permissions and displays participant information and/or role-specific controls.

**Prioritization:**

1. Live rides
2. Rides with an action required
3. Upcoming rides ordered by nearest start time

Action-required examples include pending payment, payment proof, waiver acceptance, missing vehicle details, starting-group selection, schedule acknowledgement, or an incomplete captain checklist.

**Rules:**

- Role badges are informational; the destination page never trusts them for authorization.
- Current booking, staff assignment, group assignment, and permission records are re-evaluated on every protected page/API request.
- One ride appears once even when the user is both participant and captain.
- Completed and archived rides do not appear in the upcoming collection.
- Cancelled/postponed rides may remain temporarily when an acknowledgement or refund action is required.
- The initial section may show five rides plus `View all my rides`.
- Logged-out visitors never receive another user's personalized data or section payload.
- Personal ride data must not enter public page caches or SEO output.

**Navigation:**

The canonical ride page remains shared:

```text
{community}.atride.in/rides/{rideSlug}
```

It can render public details plus protected participant panels. Operational actions link to the authorized ride console:

```text
{community}.atride.in/manage/rides/{rideId}/control
```

## 4. Identity and participant profile

### UC-04: Register a participant

**Actor:** Visitor

**Flow:**

1. Enter name and email address.
2. Receive and verify an email OTP.
3. Optionally provide a mobile number during profile setup; a contact number is required when a booking needs operational/emergency contact.
4. Accept terms and privacy notice.
5. Create the participant profile.

**Rules:**

- OTPs expire, are one-time use, and have resend/attempt limits.
- Phone numbers and email addresses are normalized.
- A saved operational phone may be verified once through Firebase Phone Authentication; this is optional during registration.
- Verification proves recent control of the number, not real-world identity or permanent ownership.
- Changing the operational phone immediately removes its verified status and requires a new verification.
- Verification confirms control of the destination, not real-world identity.
- Recovery flows do not disclose whether an account exists.

### UC-05: Maintain participant and vehicle information

**Actor:** Participant

**Capabilities:**

- Edit profile and home city
- Add bikes or other supported vehicles to a vehicle garage
- Maintain emergency contact
- Optionally maintain a self-reported blood group for emergency reference
- Maintain dietary/accessibility preferences
- Configure notification preferences
- View memberships, bookings, and waiver history

Sensitive fields must be purpose-limited and access-controlled.

Blood group is optional, self-reported, never public, and visible to authorized ride staff only through an active participant relationship. It is reference information for communicating with emergency responders and must never replace clinical blood typing, antibody screening, or compatibility testing.

## 5. Community and staff management

Detailed community activation is defined in [tenant-onboarding.md](tenant-onboarding.md).

### UC-06: Invite community staff

**Actor:** Community Owner or authorized Community Admin

**Flow:**

1. Enter an email or phone number.
2. Select a permitted community role.
3. Send a time-limited invitation.
4. Recipient registers or signs in.
5. Recipient accepts the invitation.
6. Role becomes active and is audited.

**Rules:**

- The inviter cannot grant permissions they do not possess.
- Community roles apply only to the inviting community.
- Administrators never create another user's password.

### UC-06A: Join a Guild through a participant invitation link

**Actor:** Guild Owner or Admin; participant

**Flow:**

1. An Owner or Admin creates an expiring, revocable link with an optional maximum join count.
2. The Guild shares the link through its existing communication channels.
3. A participant opens it and signs in or creates a common AtRide account.
4. If needed, the participant completes onboarding and returns to the same invitation.
5. AtRide activates ordinary Guild membership and records the acceptance in the tenant audit log.

**Rules:**

- A participant link can never grant a staff or platform role.
- Expired, exhausted, and revoked links cannot be accepted.
- Existing active members do not consume another use.
- Link creation, revocation, and acceptance are tenant-scoped and audited.

### UC-07: Assign ride staff

**Actor:** Community Admin, Ride Manager, or permitted Lead Captain

**Flow:**

1. Select a published or draft ride.
2. Assign lead captain, group captains, vice captains, sweeps, and marshals.
3. Limit each assignment to a ride, group, checkpoint, or route segment.

## 6. Ride creation and publication

### UC-08: Create a ride draft

**Actor:** Ride Manager or authorized Captain

**Ride information:**

- Name, slug, summary, and description
- Start and expected end date/time
- Registration window
- Destination and places covered
- Ride type and difficulty
- Primary vehicle type, defaulting to `BIKE`
- Vehicle ownership mode: participant-owned, organizer-provided, or mixed
- Visibility: public, community-only, or invitation-only
- Vehicle and participant eligibility
- Safety requirements and required gear
- Cancellation/refund rules
- Contact and emergency instructions

**Media:**

- Cover image
- Social image
- Gallery images
- Route/itinerary images

**Rules:**

- Drafts are not public or indexable.
- Public slugs are unique within their intended scope.
- All date/time values retain an IANA timezone while being stored consistently.

### UC-09: Configure pricing and inclusions

**Actor:** Ride Manager

Pricing options may include:

- Rider with own motorcycle
- Rider with pillion
- Pillion-only participant
- Driver with own vehicle
- Passenger seat in an organizer-provided vehicle
- Per-vehicle or per-team entry
- Single/shared accommodation
- Community-member rate
- Early-bird rate
- Optional add-ons

Each option includes amount, currency, booking unit (`PER_PERSON`, `PER_VEHICLE`, `PER_SEAT`, `PER_ROOM`, or `PER_TEAM`), validity, capacity if applicable, inclusions, exclusions, cancellation rules, and taxes where applicable.

Structured inclusions may cover accommodation, meals, fuel, tickets, support vehicle, mechanical/medical support, merchandise, and insurance.

Confirmed bookings retain price and inclusion snapshots when the ride later changes.

### UC-09A: Configure itinerary, stays, meals, and activities

**Actor:** Ride Manager

The ride package is structured rather than stored only as formatted announcement text.

Each itinerary day can contain ordered entries such as assembly, departure, regroup, meal, sightseeing, activity, check-in, free time, briefing, campfire, and checkout. Entries include their date/time or time window, location, description, audience, and whether timing is confirmed or provisional.

Accommodation records may include:

- Property name and public location summary
- Exact address/map visibility, which may be restricted to confirmed participants
- Check-in/check-out times and number of nights
- Room or occupancy options
- Gender/privacy allocation notes where operationally required and legally appropriate
- Secure parking and organizer-defined property amenities
- Participant instructions and property restrictions

Meal records specify the service date, meal type, included/not-included state, menu summary, and available dietary choices. A participant's selected diet remains booking-specific; it is not inferred permanently from an old ride.

Activities and amenities are separate from essential inclusions so that a schedule change can identify exactly what changed. Exclusions are explicit. The interface must not imply that an unmentioned item is included.

### UC-09B: Configure rules and commercial policies

**Actor:** Ride Manager

Ride rules cover safety gear, convoy formation, road behavior, substance restrictions, property conduct, participant respect, staff instructions, and consequences for serious violations. Rules must be written clearly, reviewed by the organizer, and must not override applicable law or platform safety policy.

Commercial policies can define:

- Confirmation deposit, remaining balance, and due dates
- Refundability by payment stage or date
- Cancellation and no-show handling
- Admin-controlled cancellation and replacement; participants contact the Guild instead of transferring a booking themselves
- Organizer cancellation/postponement handling
- Whether a confirmed price includes taxes and add-ons

Rules, waivers, package details, and commercial policies are versioned. A confirmed booking stores the versions and price/package snapshots accepted by the participant. Later edits do not silently change an existing booking agreement; material changes require notification and, where appropriate, acknowledgement or renewed consent.

Guild onboarding collects reusable safety, payment, cancellation, replacement, and property-conduct templates. Guild Owners/Admins may maintain them in Guild settings. A new ride receives a snapshot of the current templates and the Ride Manager reviews and edits that ride-specific copy before publication; templates are never a mechanism for retroactively changing existing rides.

Total ride capacity represents destination, stay, or overall package capacity and is captured when the draft is first created, so operational lists never substitute a placeholder or starting-group allocation for the canonical denominator. Starting groups identify assembly/departure operations; per-origin capacity and buffer allocations are optional planning hints and are not required to sum to the total ride capacity unless a Guild explicitly chooses fixed origin allocations.

Where the initial editor requires structured line formats, it keeps examples visible while typing and may provide copyable prompts for external AI tools to transform an existing announcement. Such prompts instruct the tool not to invent missing facts, and the Ride Manager remains responsible for reviewing all generated structured data.

The optional in-product Ride Assistant uses the saved and currently unsaved factual form fields plus a separately optional organizer announcement. Before a provider request, @Ride filters common participant-list rows, phone numbers, email addresses, payment identifiers, and private links. It returns structured suggestions and unresolved facts into a review panel. Nothing is applied automatically: the organizer can edit, select, apply, or discard each section, and must explicitly save the ride afterward. Per-section regeneration avoids repeating the whole task. Provider credentials remain server-only, daily per-user/per-ride limits bound cost, and prompt content is not stored in AI usage records. The copy/open-external-Gemini fallback carries the same no-invention and privacy instructions but requires manual paste and review. The itinerary contains at least one chronological event for every inclusive ride date: the application guarantees date coverage deterministically, while AI enriches each day and unresolved details remain visible for organizer confirmation. Multiple events may share a calendar date, with an optional local time for time-specific departures, meals, activities, checkpoints, and return events.

### UC-09C: Generate organizer-ready announcements

**Actor:** Ride Manager or authorized Captain

@Ride can generate a WhatsApp-ready or plain-text announcement from the canonical ride record. The export may include public itinerary, package, pricing, rules, booking instructions, and current availability, but it does not include the participant manifest, personal phone numbers, dietary selections, payment proofs, or protected WhatsApp invite links by default.

Participant manifests are separate authorized views/exports with purpose-limited fields and auditability. Organizers should update structured data first and regenerate the announcement instead of maintaining an independent, conflicting source of truth in chat.

### UC-09E: Review and share the participant manifest

**Actor:** Guild Owner/Admin/Ride Manager or assigned Lead Captain/Captain/Vice Captain

The operational manifest is built from immutable booking-participant snapshots rather than the participant's current public profile. It shows the booked party, starting group, occupant roles, booking-specific diet/accessibility/emergency details, lead contact, vehicle-sharing choice, accommodation, and summarized payment state. Guild ride managers may view the complete ride. Assigned ride staff see only their assigned starting group unless their assignment explicitly covers the whole ride.

Authorized staff may download an Excel-compatible report for offline ride operations. Every export records the actor, ride, origin scope, booking count, participant count, and timestamp in the Guild audit history. Payment-proof media is never embedded in the report.

For quick chat coordination, @Ride generates a numbered WhatsApp-ready list from confirmed participants. That message includes only names, starting cities, occupant roles, and dietary preferences. Phone numbers, email, blood group, medical/accessibility notes, emergency contacts, vehicle details, payment information, and proof media remain inside the protected manifest.

### UC-09D: Select vehicle type and policy

**Actor:** Ride Manager

The ride-creation form requires a vehicle type. `BIKE` is preselected for the initial launch, but the persisted ride always stores the selection explicitly.

Initial values:

```text
BIKE (default)
CAR
SUV
JEEP
OTHER
```

Selecting a type controls contextual fields and terminology:

- `BIKE`: rider, pillion, engine capacity, and bike requirements
- `CAR`/`SUV`/`JEEP`: driver, co-driver, passenger, seating, drive type, ground clearance, and equipment
- `OTHER`: platform-approved configuration rather than unrestricted free-form behavior

The initial production release may enable only `BIKE` while retaining the generic persisted model. Four-wheel enablement follows the validation plan in [four-wheel-expansion.md](../planning/four-wheel-expansion.md).

### UC-10: Configure multiple starting groups

**Actor:** Ride Manager

Example:

```text
Bengaluru group -- Captain A --\
                                  \
Chennai group --- Captain B ------+-- Salem merge point -- Kodaikanal
                                  /
Coimbatore group - Captain C ----/
```

Each group defines:

- Origin and coordinates
- Assembly and departure time
- Captain, vice captain, and sweep
- Capacity allocation
- Route segments and checkpoints
- Merge point and estimated merge time
- Group-specific instructions

### UC-11: Publish a ride

**Actor:** Authorized Ride Manager or approver

**Flow:**

1. Validate mandatory fields, pricing, groups, capacity, policy, and media.
2. Optionally submit for community approval.
3. Publish and open booking according to schedule.
4. Create public metadata and sitemap eligibility.

Ride lifecycle:

```text
DRAFT -> PENDING_APPROVAL -> PUBLISHED -> BOOKING_OPEN
      -> BOOKING_CLOSED/SOLD_OUT -> CHECK_IN_OPEN
      -> IN_PROGRESS -> COMPLETED -> ARCHIVED
```

Alternative states are `POSTPONED` and `CANCELLED`.

## 7. Capacity and waitlists

### UC-12: Configure ride capacity

**Actor:** Ride Manager

`Total slots` is the hard participant capacity for the ride. Assigned captains, marshals, sweeps, volunteers, and other ride staff do not consume participant slots. Starting-group capacities are optional planning hints only and do not divide or override the ride-wide limit.

`Waitlist capacity` is the maximum number of participant seats that may queue after Total slots are occupied. It does not create extra bookable ride places. A value of zero disables the waitlist.

Rules:

- Confirmed capacity cannot exceed the permitted maximum.
- Capacity cannot be reduced below confirmed participants.
- Total-slot and waitlist-capacity changes are audited.
- Increasing Total slots may promote the oldest eligible waitlisted booking party into a time-limited reservation.
- A multi-person party may join or be promoted only when the entire party fits the remaining waitlist or ride capacity.
- Reducing Total slots below occupied participant seats, or Waitlist capacity below already queued seats, is prohibited.

### UC-13: Join a waitlist

**Actor:** Participant

When a ride/group is sold out, the participant may join a waitlist. Released capacity can create a time-limited offer for the next eligible participant. Expired offers move to the next entry.

## 8. Booking

### UC-14: Book a ride

**Actor:** Verified participant

**Flow:**

1. Select ride and starting group.
2. Validate eligibility and availability.
3. Select participant(s), occupant roles, pricing, accommodation, add-ons, and one vehicle mode: saved garage vehicle, ride-only basic details, privacy-preserving own vehicle with no details, or no vehicle for a pillion/passenger.
4. Review inclusions, exclusions, safety requirements, cancellation rules, and total.
5. Accept the current waiver and consent.
6. Create a time-limited capacity reservation.
7. Select online or offline payment.
8. Confirm after verified payment.

Booking statuses:

```text
RESERVED
CONFIRMED
WAITLISTED
CANCELLED
EXPIRED
PAYMENT_REJECTED
```

The signed-in booking lead may include named pillion/passenger companions without creating separate platform accounts for them. Every party member consumes a ride slot. Ride fees, confirmation deposits, and selected per-person add-ons scale by party size. Accommodation may be included, charged per person, or charged per room; per-room quantities round up by maximum occupancy and respect configured room inventory. The booking stores immutable participant and accommodation snapshots.

Participant self-transfer is intentionally unsupported. When a replacement is necessary, an authorized Guild ride manager cancels the original record with a mandatory operational reason. The replacement participant then submits a fresh booking and accepts the current waiver and commercial terms; staff do not impersonate a rider or copy another participant's consent. Cancellation is a status transition rather than deletion: participant snapshots, payments, proofs, and audit history remain available for reconciliation, while seat and room occupancy are released and the eligible waitlist may be promoted. Any refund or participant communication is a separate explicit operation.

Payment progress is modelled independently rather than duplicated in the booking status. A booking payment uses `PENDING`, `SUBMITTED`, `CONFIRMED`, or `REJECTED`, and identifies whether it is a confirmation deposit, balance, full payment, or another obligation. A future completed-ride lifecycle may add `COMPLETED` after verified participation.

**Rules:**

- Concurrent requests cannot oversell a slot.
- The booking records participant, contact, vehicle choice, occupant roles, group, price, policy, and waiver snapshots. Ride-only vehicle details do not populate the participant's global garage, and a rider/driver may state that they are bringing a compatible vehicle without disclosing identifying details.
- Profile edits do not silently rewrite historical bookings.

## 9. Payments

### UC-15: Pay through assisted Guild UPI

**Actor:** Participant

**Flow:**

1. @Ride loads the ride's snapshotted price obligations and the Guild's active UPI recipient.
2. On mobile, @Ride opens a standard UPI intent with recipient, Guild name, exact amount, currency, and booking reference prefilled.
3. On desktop, @Ride displays a QR for the same UPI URI.
4. The participant completes payment directly in their UPI app and submits the transaction reference and optional protected proof.
5. Guild Owner/Admin/Finance recipients receive an event email with a direct review link.
6. Authorized finance staff confirm or reject the advance or balance obligation; @Ride updates the booking atomically and notifies the participant.

**Rules:**

- Money goes directly to the community's bank/UPI account.
- @Ride does not collect or settle ride funds.
- Opening a UPI app or submitting proof is not confirmation; authorized finance review is required.
- The booking separately tracks confirmation advance, balance due, due dates, submitted references, and confirmed amounts.
- The UPI recipient used for an obligation is snapshotted so a later Guild-setting change cannot rewrite payment history.
- A future community-owned gateway may automate reconciliation only after the optional gateway phase is approved.

Payment statuses:

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

### UC-16: Submit offline payment

**Actor:** Participant

Supported methods may include cash, direct UPI, bank transfer, payment at assembly, or another approved method.

**Flow:**

1. Select offline payment.
2. Receive a pending booking and reservation deadline.
3. Optionally upload proof and transaction reference.
4. Wait for community verification.

### UC-17: Verify offline payment

**Actor:** Community Owner, Community Admin, or Finance Manager

**Flow:**

1. Review amount, method, reference, proof, and booking.
2. Confirm or reject payment.
3. Record actor, timestamp, amount, method, proof, and note.
4. Confirm booking or release capacity.

Financial access is not granted to captains by default. The current Phase 5 implementation requires an explicit Owner, Admin, or Finance role; a future custom permission may delegate only the required finance action without granting a broader role.

### UC-18: Manage payment expiry and refunds

- Online checkout reservations have a short expiry.
- Offline reservations use a community/ride-configured deadline.
- Expired reservations release capacity.
- Refund status is recorded even when the community performs the refund in its gateway account.
- Final refund responsibility and policy must be visible to the participant.
- A whole-ride cancellation creates one aggregate refund-reconciliation record per affected booking when confirmed money or submitted evidence exists.
- Confirmed money begins in `PENDING`; submitted but unconfirmed evidence begins in `REVIEW_REQUIRED`.
- Guild Owner/Admin/Finance records the reconciled refundable amount, cumulative returned amount, UTR/reference, note, actor, and time.
- @Ride never claims to have transferred funds; the Guild remains responsible for returning direct UPI, bank, or cash payments.

### UC-18A: Postpone or cancel a ride

**Actor:** Guild Owner, Guild Admin, or Ride Manager

1. Choose postpone or cancel from the Ride Studio disruption controls.
2. Enter a participant-facing reason of at least 20 characters and acknowledge the operational impact.
3. For postponement, optionally enter a proposed update date. Existing bookings remain intact while reservations and payment actions pause.
4. Republish only after the schedule/package is corrected; this resolves the active postponement record.
5. For cancellation, atomically cancel all active bookings, clear the derived occupied-slot counter, retain payment/proof history, and create refund-review records.
6. Queue one idempotent participant notification per affected booking. Delivery failure never rolls back the canonical disruption.

Cancellation is terminal and never promotes the cancelled ride's waitlist. Assigned captains without Guild ride-management permission cannot perform the financially consequential whole-ride action.

## 10. Ride operations

### UC-19: Start a ride group

**Actor:** Assigned Captain or Lead Captain

1. Open the captain console.
2. Verify group, participants, and starting point.
3. Start the assigned group.
4. Notify relevant participants and staff.

The lead captain controls overall ride state. Group captains control only assigned groups unless delegated otherwise.

### UC-20: Check in at a checkpoint

**Actor:** Assigned Captain, Sweep, or Marshal

Capture:

- Planned and actual arrival/departure
- Group count
- Status
- Optional coordinates
- Optional note/image
- Delay, incident, or assistance indicator
- Performing staff member

The client clearly shows pending, successful, and retry states on weak networks.

### UC-21: View ride progress

**Actor:** Confirmed participant or authorized staff

- View completed checkpoints and estimated progress.
- View the selected starting group's progress before merge.
- View merged ride progress after the merge event.
- View last-known authorized crew location if enabled.

Exact live location is never public or indexable. Access expires according to post-ride policy.

### UC-22: Complete a ride

**Actor:** Lead Captain or authorized Ride Manager

1. Complete remaining group/ride state.
2. Record final progress and notes.
3. Stop participant live updates.
4. Apply location-retention policy.
5. Notify participants and optionally request feedback.

## 11. Notifications

### UC-23: Receive identity messages

- Email OTP through Amazon SES
- Account recovery or security notice
- Optional one-time Firebase phone-verification code for a saved operational number

### UC-24: Receive booking and payment messages

- Booking created, expired, confirmed, or cancelled
- Offline payment proof received, accepted, or rejected
- Online payment confirmed or failed
- Waitlist slot offered

### UC-25: Receive ride-event messages

- Ride reminder
- Starting-group instructions
- Schedule or route change
- Postponement or cancellation
- Group started
- Important delay, incident, or operational update
- Ride completed

Messages are delivered through approved templates. Marketing consent is separate from security and essential service communication.

Participants may turn off email for the upcoming-ride reminder and routine announcements. Those events remain available in the @Ride inbox. Booking, waitlist, payment, disruption, important, critical, acknowledgement-required, and safety communication cannot be disabled as optional email.

### UC-26: Publish an official ride announcement

**Actor:** Lead Captain, assigned Captain, Ride Manager, Community Admin, or another explicitly permitted ride role

**Flow:**

1. Select an approved announcement type.
2. Enter validated details and urgency.
3. Choose the relevant ride groups or all confirmed participants.
4. Publish to the @Ride ride activity/announcement feed.
5. Fan out in-app and email notifications according to importance and policy; SMS may be added by the optional post-launch adapter.
6. For a critical announcement, monitor participant acknowledgement.

Examples include assembly instructions, schedule/route changes, accommodation changes, postponement/cancellation, group start, delays, incidents, merge progress, and completion.

**Rules:**

- The @Ride announcement feed is the authoritative operational record.
- Announcements record author, audience, time, type, content/version, and delivery event.
- Critical announcements may require an `Acknowledged` action.
- Casual participant-to-participant chat is outside the MVP.

### UC-27: Configure an external WhatsApp ride group

**Actor:** Community Admin, Ride Manager, or another explicitly permitted ride administrator

**Flow:**

1. Create and administer the WhatsApp group manually.
2. Paste its invite link into protected ride communication settings.
3. Save the link; it is available only to confirmed participants and assigned ride staff.
4. Replace or remove the link when the external group changes or the invitation is revoked.

**Rules:**

- @Ride does not create or manage the normal WhatsApp group in the MVP.
- @Ride does not store or describe the external group’s live posting permissions or settings.
- The invite URL is treated as protected bearer-style information and is not exposed publicly or indexed.
- Booking does not silently add a participant to WhatsApp.
- Before opening the link, participants are told that joining can expose their WhatsApp phone number/profile information to group members.
- Essential ride information remains available in @Ride for participants who do not join WhatsApp.
- The organizer, not @Ride, moderates the external group.
- The link can be replaced or removed if leaked.
- @Ride does not record invite-link opens or external group membership.

## 12. Dashboards

### Platform administration

- Metrics
- Community applications and domains
- User support and moderation
- Featured/promoted content
- Security, notification, and audit operations

### Community management

- Profile and branding
- Rides and drafts
- Bookings, waitlists, and participants
- Staff, members, and roles
- Payments and refunds
- Payment integration
- Reports and audit history

### Captain console

- Assigned group
- Participants
- Route and checkpoints
- Start/complete controls
- Check-ins, delays, incidents, and merge status

### UC-27A: Record attendance and progress participation

Attendance belongs to each booked participant, including pillions/passengers within a party, and not only to the lead booking. Before departure each participant starts as `EXPECTED` and may be individually checked in. Starting a group is a bulk operational action that moves only `CHECKED_IN` participants to `STARTED`; it does not convert absent or late `EXPECTED` participants into no-shows.

A captain may admit a late `EXPECTED` participant at a permitted checkpoint, recording the timestamp and checkpoint. Completing the group changes `STARTED` participants to `COMPLETED`. `DISCONTINUED` and `REMOVED` are explicit exceptions and are never overwritten by bulk completion. Only final closure of the entire ride converts remaining `EXPECTED` participants to `NO_SHOW`. A participant still `CHECKED_IN` at closure requires staff review and may be classified as `DID_NOT_START`. Every individual and bulk transition records its actor and time.

### Participant account

- Profile and vehicle garage
- Upcoming and previous rides
- Pending and confirmed bookings
- Payment actions and proofs
- Group instructions and private ride progress
- Waivers and notifications

## 13. Community access to participant data

A community can access a user's relevant data only when the user:

- Books that community's ride
- Joins that community
- Accepts a staff invitation
- Is involved in a legitimate, audited support case

Relevant operational fields may include name, contact, emergency contact, group, vehicle, occupant role, accommodation/dietary needs, payment status, and waiver acceptance. Access is role-based, purpose-limited, audited, and subject to retention rules.

## 14. Guild Hall, trust, and visibility

### UC-28: Open a Guild Hall

The community tile/direct URL opens the branded Guild Hall. Sections depend on directory, site-access, ride-visibility, indexing, viewer relationship, and individual consent settings. `Community` remains the domain term; `Guild Hall` is the user-facing experience.

### UC-29: Share a limited Ride Passport

When booking with a new Guild, the participant previews the verified aggregate experience summary that the Guild will receive. Exact private rides, payments, internal notes, incidents, medical data, and other Guild memberships are not disclosed. Individual profiles have no public visibility mode in the initial release.

### UC-30: Welcome a newcomer

After a first confirmed booking/membership, a participant may opt in per Guild to appear in the authenticated Guild-member welcome section. The tile uses first name, optional profile image/initials, city, and consented highlights. Anonymous visitors see no individual newcomer details.

### UC-31: Grant an award

Authorized Guild staff create/assign a moderated award with issuer, reason, period, and optional related ride. System milestones use verified completion data. Grants, correction, and revocation are audited; the recipient controls cross-Guild display.

### UC-32: Review a Guild

Only a verified completed participant can submit one review for the relevant ride/Guild. Guilds can respond or report abuse but cannot selectively hide negative reviews. @Ride does not implement rider star ratings.

### UC-33: Configure Guild and ride visibility

Authorized Guild administrators configure directory listing (`LISTED`/`UNLISTED`), Guild Hall access (`PUBLIC`, `VERIFIED_USERS`, `GUILD_MEMBERS`, `INVITE_ONLY`), indexing, and per-ride visibility. A Guild receives all operating features when unlisted/private, and its subdomain never promotes competing Guilds.

### UC-34: Embed a public Guild widget

An authorized Guild creates an allowed-origin configuration for an upcoming-rides, featured-ride, calendar, or Guild-summary widget. The widget contains public/explicitly embeddable data only. Login, booking, payment, member information, administration, and precise location open as top-level @Ride/custom-domain pages rather than operating inside the iframe.

Detailed rules:

- [Guild Hall and reputation](guild-hall-and-reputation.md)
- [Guild visibility and embedding](guild-visibility-and-embedding.md)

## 15. SEO requirements

Public pages include:

- Marketplace and useful city/destination discovery pages
- Community profiles
- One stable page per published public ride

Required capabilities:

- Dynamic titles and descriptions
- Canonical URLs
- Sitemaps and robots rules
- Open Graph/social images
- Meaningful headings and content
- `WebSite`, `Organization`, and `Event` structured data where applicable
- Redirect management for changed slugs

Private application, payment, draft, participant, and exact-location pages must not be indexed.

## 16. Non-functional acceptance themes

- Mobile-first and accessible
- Tenant-safe
- Transaction-safe
- Idempotent provider handling
- Auditable privileged changes
- Privacy-conscious
- Resilient to provider and network failures
- Observable and supportable
- SEO-capable for public content

Phase-specific acceptance tests are maintained in the [roadmap](../planning/roadmap.md).
