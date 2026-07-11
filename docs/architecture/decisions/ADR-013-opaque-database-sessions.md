# ADR-013: Application-owned opaque database sessions

- Status: Accepted
- Date: 2026-07-10

## Context

@Ride uses Google OpenID Connect and passwordless email OTP, one account across Guilds, and server-authoritative platform, Guild, and ride roles. Privileged access must disappear immediately after a role is revoked or a session is terminated. The initial hobby deployment should also avoid adding an authentication dependency that does not simplify this specific flow.

## Decision

Use application-owned opaque sessions backed by PostgreSQL. After a valid OTP is consumed, the server issues a high-entropy token in an `HttpOnly`, `SameSite=Lax`, secure production cookie. Only a SHA-256 digest of that token is stored in the database.

Every protected request resolves the active session and current role assignments from authoritative data. Session records have an expiry and revocation timestamp. OTP codes are never stored as plaintext: a challenge-bound HMAC is stored with expiry, resend-cooldown, attempt, and one-time-consumption controls.

External identity proofs link to the same user record and issue the same opaque session. The architecture keeps identity and permission services behind application modules so a maintained authentication framework can be adopted later without changing tenant or authorization policies.

## Consequences

- Role revocation and session termination take effect without waiting for a signed token to expire.
- Session and OTP behavior remains explicit and testable for the web app and future mobile clients.
- @Ride owns cookie security, recovery, rotation, abuse controls, and session lifecycle tests.
- PostgreSQL is sufficient for the initial volume; Redis-backed distributed throttling can be added without changing account identity or session semantics.

## Alternatives considered

- Auth.js database sessions: viable, but its provider/session abstraction does not currently reduce the custom email-OTP and multi-level authorization work enough to justify another layer.
- Stateless JWT authorization: rejected because stale embedded roles and difficult immediate revocation conflict with administrative security requirements.
- Password authentication: rejected for the initial passwordless product because it adds password storage and recovery obligations.
