# ADR-011: Use email-first authentication and defer Indian SMS

- Status: Accepted
- Date: 2026-07-10
- Supersedes: [ADR-005](ADR-005-central-communications.md)

## Context

@Ride is initially a hobby/learning product with no guaranteed commercial demand. Indian OTP, transactional, and service SMS requires Principal Entity registration, registered headers, content templates, and other DLT/TCCCPR obligations. The project does not currently have the organization documentation or operational need to justify making that work a launch dependency.

Email OTP, in-app notifications, and transactional email can support registration, recovery, booking confirmations, payment updates, reminders, and ride announcements without blocking product development. A contact phone number can still be useful for booked-ride operations, but storing a number does not prove control of it.

## Decision

Use Amazon SES email OTP as the required initial authentication channel. Use email and in-app delivery for launch notifications. Keep `SMS_PROVIDER=disabled` as a supported production configuration.

Phone number collection is optional during registration/profile setup and may be required when booking needs operational/emergency contact. Such numbers remain explicitly unverified. @Ride must not present, expose, or authorize based on a phone-verification claim that has not occurred.

Move Indian SMS to an optional final phase. Select an aggregator only when that phase begins and only after Principal Entity/DLT, sender/header, content-template, consent/suppression, cost, security, and support requirements can be satisfied. SMS remains an adapter over existing OTP/outbox contracts; enabling it must not redefine account identity or business workflows.

## Consequences

- SMS paperwork and provider availability cannot block web launch.
- Email deliverability, rate limits, abuse prevention, recovery, and SES operations become launch-critical.
- Booking and staff screens clearly distinguish verified email from unverified contact phone.
- Essential ride information remains available in-app and through email.
- Future SMS can be added for redundancy or time-critical operations without redesigning identity or notifications.

## Alternatives considered

- Require MSG91 phone OTP at launch: rejected because DLT/organization prerequisites would block the hobby release.
- Use unofficial or consumer-SIM SMS automation: rejected for compliance, reliability, security, and operational risk.
- Omit phone numbers entirely: rejected because booked-ride emergency/operational contact can still be useful when collected transparently and purpose-limited.
