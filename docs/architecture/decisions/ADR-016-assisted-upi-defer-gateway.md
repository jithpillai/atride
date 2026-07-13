# ADR-016: Use assisted UPI by default and defer payment gateways

- Status: Accepted
- Date: 2026-07-13
- Supersedes: ADR-004

## Context

Early @Ride Guilds commonly collect ride advances and balances through a personal or community UPI ID and reconcile screenshots manually. Requiring every Guild to activate and maintain a payment-gateway merchant account would add KYC, business-registration, and support work that does not match the hobby/community launch stage.

@Ride must still make direct payment convenient, distinguish the confirmation advance from the remaining balance, prevent ambiguous evidence, and notify finance staff promptly without ever collecting or settling Guild funds.

## Decision

The default payment experience is assisted UPI:

- A Guild configures its own UPI ID and payee name.
- @Ride generates a standard UPI intent on mobile and a QR for the same URI on desktop.
- The exact amount, currency, payee, and booking reference are prefilled.
- Money moves directly from participant to Guild.
- The participant submits the UPI/bank transaction reference and optional protected proof.
- Guild Owner, Admin, and Finance users receive a durable event notification with a direct review link.
- Authorized finance staff confirm or reject each confirmation-advance and balance obligation separately.
- @Ride records payment state and audit history but does not become the merchant, custodian, or settlement intermediary.

A community-owned Razorpay integration is deferred until after the PWA/native-app phases and proceeds only if real Guild demand and manual-reconciliation cost justify it.

## Consequences

- Launch does not require a platform merchant account, payment-gateway credentials, or settlement ledger.
- UPI completion is not automatically verifiable; finance review remains authoritative.
- Payment recipient, amount, purpose, due date, reference, reviewer, and status must be immutable/auditable.
- Proof media remains private and tenant-scoped; email links open authenticated finance views and never expose the proof itself.
- Gateway automation remains an adapter-compatible optional phase rather than a launch dependency.

## Alternatives considered

- Require Razorpay for every Guild: deferred because merchant onboarding is disproportionate to current demand.
- @Ride collects and settles funds: rejected due to accounting, compliance, chargeback, and operational scope.
- Pure manual instructions with no intent/QR or obligation tracking: rejected because it produces avoidable amount/reference errors and slow reconciliation.
