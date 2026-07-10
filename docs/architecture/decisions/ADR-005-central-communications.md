# ADR-005: Centrally operate SMS and email communication

- Status: Superseded by [ADR-011](ADR-011-email-first-defer-sms.md)
- Date: 2026-07-07

## Context

OTP, booking confirmations, reminders, and ride-event messages need consistent templates, compliance, retries, delivery status, and abuse controls. Requiring every community to configure communication providers would make authentication and support unreliable.

## Decision

@Ride centrally operates MSG91 for phone OTP/transactional SMS and Amazon SES for email OTP/transactional email. Communities provide branding, support contact, and reply-to details. Domain events are written through a transactional outbox and delivered by BullMQ workers.

## Consequences

- Central DLT/template and email-domain administration
- Consistent identity and authentication delivery
- Platform owns communication cost monitoring and provider health
- Messages must separate security, transactional/service, and marketing consent
- Provider adapters allow later replacement

## Alternatives considered

- Community-provided SMS/email credentials: rejected for authentication reliability and operational complexity
- Send providers directly inside booking requests: rejected because provider failures could delay or lose business operations
- MSG91 for both SMS and email: possible future simplification; SES is initially selected for email control and deliverability operations
