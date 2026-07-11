# ADR-014: Firebase for one-time phone ownership verification

- Status: Accepted
- Date: 2026-07-11

## Context

@Ride needs a broadly available way to confirm that a signed-in participant controls the Indian mobile number used for ride operations. Running application-owned SMS requires Indian sender/template onboarding that is disproportionate for the hobby-stage product. Truecaller and carrier/SIM verification do not cover all web users. Phone verification should not replace the common account, Google/email authentication, or application-owned sessions.

## Decision

Use Firebase Phone Authentication only as a one-time proof of control for a saved Indian operational phone number. The browser completes Firebase reCAPTCHA and SMS verification, then sends the resulting ID token to @Ride. The server validates that token with Firebase Admin, requires a recent `phone` sign-in, matches the trusted `phone_number` claim to a short-lived application challenge and the saved profile number, and records verification in PostgreSQL.

The verified number is unique across @Ride accounts. Changing or removing it clears verification and consumes pending challenges. Google OpenID Connect and SES email OTP continue to create @Ride sessions; Firebase does not become the account database or session authority. Ride messages and bulk/service SMS remain disabled.

Controls include India-only Firebase region policy, authenticated initiation, same-origin APIs, per-user/IP daily limits, resend cooldown, short challenge expiry, single-use challenge tokens, recent-authentication checks, and billing alerts. Real SMS testing occurs only on authorized hosted domains; Firebase fictional numbers are used during development.

## Consequences

- A legitimate participant normally incurs at most one verification SMS per saved number.
- A changed phone must be verified again.
- Verification proves control of a number, not legal identity, ownership permanence, or emergency-data accuracy.
- Firebase web and Admin credentials become deployment dependencies for this optional action.
- Billing and SMS-abuse monitoring remain necessary because Firebase billing alerts are not hard spend caps.

## Alternatives considered

- Application-owned DLT SMS: deferred because of onboarding and operational overhead.
- Truecaller: rejected as the universal web method because coverage depends on Android and the installed Truecaller app; missed-call fallback is native-only.
- Firebase carrier/SIM verification: deferred because current platform/carrier support is not universal.
- Manual administrator verification: rejected as weak, inconsistent, and operationally expensive.
