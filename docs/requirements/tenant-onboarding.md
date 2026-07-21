# Community Tenant Onboarding

This document defines how a riding community applies, receives a subdomain, assigns staff, configures payments, and becomes publicly active on @Ride.

## 1. Goals

- Give legitimate communities a fast but controlled onboarding path.
- Create subdomains without per-community DNS changes.
- Establish one accountable Community Owner.
- Prevent impersonation, reserved-name abuse, and abandoned tenants.
- Ensure payment credentials and participant data are protected.
- Make activation status and missing requirements visible.

## 2. Tenant states

```text
APPLICATION_DRAFT
      |
      v
SUBMITTED
      |
      +-- NEEDS_INFORMATION
      +-- REJECTED
      |
      v
APPROVED
      |
      v
SETUP_IN_PROGRESS
      |
      v
READY_FOR_REVIEW
      |
      v
ACTIVE
      |
      +-- SUSPENDED
      +-- ARCHIVED
```

Community state and domain state are separate. A community may be approved while its requested custom domain remains pending verification.

## 3. Application

### Applicant information

- Applicant's verified @Ride account
- Legal/personal name as appropriate
- Mobile number and email
- Relationship to the community
- Confirmation that the applicant is authorized to represent it

### Community information

- Community name
- Preferred subdomain
- Description, road-adventure focus, and supported vehicle categories
- Founded year, if applicable
- Headquarters and operating cities
- Social profile links
- Approximate member count
- Logo or identity evidence
- Public contact details

### Verification evidence

Verification is a product and operations policy rather than only a technical check. Depending on risk and scale, evidence may include:

- Existing website or social profiles
- Community owner/admin confirmation
- Prior ride history
- Public identity matching the requested name
- Business or organization documents where appropriate
- Manual call or email verification

The platform should collect only evidence necessary for the verification decision and apply retention rules.

## 4. Review by @Ride

Platform staff can:

- Approve
- Request more information
- Reject with an internal reason and user-safe explanation
- Flag possible impersonation or name conflict
- Reserve or decline a subdomain

Every review action records the actor, timestamp, reason category, and notes.

## 5. Subdomain assignment

The system suggests a slug from the community name and validates:

- Lowercase ASCII format
- Length requirements
- Allowed letters, numbers, and hyphens
- No leading/trailing hyphen
- No dots or deeper hostnames
- Global uniqueness
- Reserved-name list
- Impersonation/confusability rules

Examples:

```text
Royal Ravanas   -> royalravanas.atride.in
Wild Gear Crew  -> wildgear.atride.in
```

Reserved names include:

```text
www, api, admin, app, auth, login, mail, support, help, status,
payments, static, cdn, assets, blog, security
```

The wildcard DNS record already routes the subdomain to @Ride. Activation requires only database/domain state; no new GoDaddy record is created per community.

Unknown and inactive hostnames return a proper unavailable/404 page rather than the marketplace.

## 6. Owner activation

After approval:

1. The applicant receives a time-limited owner invitation.
2. They sign in using their verified individual account.
3. They accept Community Owner responsibility.
4. The system creates the owner role assignment and audit event.
5. The owner enters the setup checklist.

There is no shared community password.

## 7. Setup checklist

### Required before activation

- Community name and unique subdomain
- Logo and cover image
- Public description
- Headquarters or primary operating area
- At least one public contact method
- Community Owner
- Acceptance of organizer terms and privacy responsibilities
- Safety/cancellation defaults or acknowledgement of platform defaults
- Directory visibility, Guild Hall access, and indexing choices

### Required before publishing a paid ride

- Active online gateway or at least one approved offline method
- Payment and refund contact
- Cancellation/refund policy
- Participant data-access acknowledgement
- Required ride staff and emergency contact

### Recommended

- Gallery
- Additional operating cities
- Social links
- Community Admin backup
- Finance Manager
- Ride Manager
- Community-specific participant and vehicle guidance
- Newcomer/award/review visibility preferences
- Public widget origins, if embedding is used

## 8. Staff onboarding

The owner invites staff by email or mobile number. Invitations identify community, role, inviter, expiry, and status.

```text
PENDING -> ACCEPTED
        -> EXPIRED
        -> REVOKED
```

Rules:

- Invitees use individual @Ride accounts.
- The inviter cannot grant a role beyond their own authority.
- Community roles do not apply to other tenants.
- Ride-specific roles are assigned separately.
- Role assignment, change, and removal are audited.
- Sensitive payment configuration is limited to the owner or explicitly authorized finance administration.

## 9. Payment onboarding

### 9.1 Assisted UPI payments

Each community configures the UPI recipient to which its participants pay directly.

Setup fields:

- UPI ID/VPA
- Payee/display name
- Optional finance instructions
- Enabled status

Activation flow:

1. Authorized owner opens payment settings.
2. Enter and validate the UPI ID and payee name.
3. Preview a sample intent and QR without moving money.
4. Save the active recipient and audit creation, replacement, and disablement.
5. Snapshot the active recipient into every new payment obligation.

Rules:

- Only authorized Guild roles can change payment settings.
- Community staff cannot view another tenant's payment configuration.
- Transaction references and protected proof remain tenant-scoped private data.
- Razorpay credential onboarding is excluded unless the optional post-app gateway phase is approved.
- Captains cannot manage credentials unless they also hold an explicit permitted community role.
- @Ride does not collect or settle the community's ride funds.

### 9.2 Offline payments

The community enables supported methods:

- Cash
- Direct UPI
- Bank transfer
- Payment at assembly
- Other approved manual method

Configuration includes instructions, reservation deadline, proof requirement, and roles allowed to verify payment.

Finance permission is separate from ride-operation permission. Captains do not receive it by default.

## 10. Domain and publication activation

When mandatory setup is complete:

1. Owner submits the tenant as ready.
2. System validates checklist and integration state.
3. Platform or automated policy approves activation.
4. `CommunityDomain.status` becomes `ACTIVE`.
5. The public community page becomes available.
6. Eligible public pages enter sitemap generation.
7. Owner receives activation confirmation.

Publishing a community does not automatically publish draft rides.

## 11. Community configuration

After activation, authorized staff can manage:

- Name, description, logo, cover, and gallery
- Public contact and social links
- Headquarters and operating areas
- Theme colors within safe platform constraints
- Membership rules
- Ride defaults
- Payment methods
- Staff and role assignments
- Notification reply-to contact
- Optional protected WhatsApp invite links configured separately for individual rides
- Acknowledgement that essential information must remain available in @Ride
- Directory visibility: listed or unlisted
- Guild Hall access: public, verified users, Guild members, or invite-only
- Search indexing where public access permits it
- Default ride visibility, with per-ride override
- Guild-member newcomer and award display settings
- Public widget/embed configuration and allowed origins
- Privacy/data contacts

Changes to identity-critical fields, primary domain, ownership, and payment credentials may require step-up authentication or platform review.

## 12. Participant data responsibilities

Before accessing bookings, the community acknowledges that:

- Participant data is available only for a valid community relationship.
- Data is used only for ride operation, safety, support, and payment verification.
- Information is not exported or reused for unrelated marketing without appropriate consent.
- Access is limited to authorized staff.
- Payment proof and emergency information are sensitive.
- Post-ride access and retention follow platform policy.
- Exceptional access and exports are auditable.

## 13. Suspension and ownership changes

### Suspension

Platform administrators may suspend a community for security, impersonation, policy, legal, payment-abuse, or safety reasons.

During suspension:

- Public tenant pages become unavailable or show a controlled notice.
- New bookings stop.
- Staff mutation access may be restricted.
- Existing participant obligations and support paths remain visible to authorized platform staff.
- Suspension reason and resolution actions are audited.

### Ownership transfer

Ownership transfer requires:

- Existing-owner approval where available
- New owner's verified account
- Step-up authentication
- Platform review for higher-risk cases
- Explicit transfer audit record
- Revalidation of sensitive payment and contact settings

## 14. Custom domains

Custom community-owned domains are a later capability. They require:

- Domain ownership verification
- DNS instructions
- Automated TLS issuance/renewal
- Canonical domain selection
- Redirect policy between custom and `atride.in` domains
- Protection against domain takeover after DNS changes

The default and MVP domain model remains `{community}.atride.in`.

Public read-only widgets can precede custom domains for Guilds with existing websites. Authenticated application, booking, payment, participant, and administration screens are not embedded cross-site. See [guild visibility and embedding](guild-visibility-and-embedding.md).

## 15. Acceptance criteria

- An approved community receives a working subdomain without a manual DNS record.
- Reserved, duplicate, invalid, and misleading names are rejected.
- A Community Owner uses an individual verified account.
- Community staff cannot access another tenant.
- Payment credentials are encrypted and cannot be read back.
- An incomplete tenant cannot publish paid rides.
- An unlisted Guild receives the full operating product without appearing in the marketplace.
- Private/member-only Guild content is not indexed or returned to unrelated viewers.
- Guild subdomains do not promote other Guilds.
- Activation and suspension are reflected immediately in hostname routing.
- Every review, ownership, role, domain, and credential event is audited.

Implementation sequencing and required external accounts are maintained in the [roadmap](../planning/roadmap.md).
