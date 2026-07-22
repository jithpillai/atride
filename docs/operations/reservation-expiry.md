# Reservation expiry and waitlist promotion

The processor is deliberately independent of any hosting scheduler.

## What it does

- Locks one ride at a time so concurrent booking and maintenance calls cannot oversell it.
- Expires only `RESERVED` bookings whose hold ended and whose initial payment is neither `SUBMITTED` nor `CONFIRMED`.
- Recomputes occupied seats from authoritative booking states.
- Promotes the oldest eligible `WAITLISTED` booking when capacity is available.
- Gives the promoted rider a new time-limited hold and recreates advance/balance obligations using their selected payment method.
- Writes audit and durable notification-outbox events in the transaction; email delivery occurs after commit.
- Uses stable event keys, guarded status updates, and ride locks, so repeated calls are safe.

## Ways to run it

Platform administrators can use **Run reservation processing** on `/admin`.

Automation can call either `GET` or `POST` on:

```text
/api/internal/bookings/expire
Authorization: Bearer <CRON_SECRET>
```

Set the same strong `CRON_SECRET` in the deployment and scheduler. Do not place it in browser code or a public URL.

## Scheduling policy

Use a 5–10 minute interval when product activity later justifies a production scheduler with that frequency. For the hobby stage, `vercel.json` commits one daily safety sweep through `/api/internal/maintenance/daily`. This is intentionally not presented as precise hold expiry: booking attempts also process the relevant ride opportunistically, while the platform-admin action remains a safe manual fallback.

When the deployment moves to a scheduler that supports frequent jobs, point it at the protected endpoint; the booking algorithm and data model do not need to change.
