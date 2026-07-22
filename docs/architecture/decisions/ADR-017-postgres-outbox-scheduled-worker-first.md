# ADR-017: PostgreSQL outbox and scheduled worker first

- Status: Accepted
- Date: 2026-07-21

## Context

@Ride needs durable transactional email, in-app notifications, reminders, retries, and expiry processing. The launch workload is small and cost-sensitive, while PostgreSQL already stores the authoritative business state and transactional outbox. Running Redis and a continuously available BullMQ worker from day one would add cost and operational surface before queue throughput requires it.

## Decision

The initial asynchronous architecture uses the PostgreSQL transactional outbox plus protected, idempotent scheduled endpoints.

- Business state and its outbox event commit in one database transaction.
- A scheduler invokes short-lived workers that claim eligible rows, call providers, and persist delivery or retry state.
- Reminder workers derive eligibility from current canonical ride and payment dates instead of storing an independent schedule as truth.
- Stable event keys prevent duplicate reminders across repeated scheduler runs.
- During the hobby stage, Vercel invokes one bounded combined maintenance route daily at `00:00 UTC`. Immediate business events still attempt post-commit delivery; the daily invocation recovers retries, creates reminders, expires holds, promotes waitlists, and performs retention cleanup.
- Because Vercel Hobby may invoke anywhere within the configured hour, upcoming-ride reminders use a 36-hour eligibility horizon and never promise an exact 24-hour delivery time.
- Failed reminder rows whose canonical date or eligibility changed are invalidated before retry.
- Redis and BullMQ are deferred until measured traffic, latency, queue lag, or scheduling precision makes a dedicated queue worthwhile.

## Consequences

This keeps the hobby-stage deployment inexpensive and makes PostgreSQL the only required stateful service. Scheduling precision is limited by the deployment scheduler, and each invocation must stay within serverless execution limits. Work is therefore bounded and resumable.

If a dedicated queue is introduced later, the transactional outbox and event contracts remain valid. The publisher can enqueue claimed events into BullMQ without changing business transactions or notification producers.
