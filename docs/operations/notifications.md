# Notification operations

## Daily Hobby maintenance

`vercel.json` invokes `GET /api/internal/maintenance/daily` once per day at `00:00 UTC` (Vercel Hobby may execute anywhere within that hour, approximately 05:30–06:29 IST). Vercel supplies `Authorization: Bearer $CRON_SECRET`; production must define a long random `CRON_SECRET`.

The bounded worker runs, in order:

1. Expire eligible unpaid reservation holds and promote waitlist entries.
2. Create idempotent upcoming-ride and payment reminders from canonical dates.
3. Deliver or retry up to 100 due outbox events.
4. Recycle eligible inbox, outbox, and compact provider-event rows.

Business actions still attempt immediate post-commit delivery, so the daily worker is a recovery and reminder mechanism rather than the primary path for urgent announcements.

## SES delivery callbacks

The application endpoint is `POST https://atride.in/api/providers/ses/events`. It accepts only a valid AWS SNS signature whose `TopicArn` exactly equals `SES_SNS_TOPIC_ARN`. It automatically confirms a valid SNS HTTPS subscription, deduplicates notifications by SNS `MessageId`, records compact event metadata, and never stores the raw callback body.

AWS activation steps:

1. Create an SNS Standard topic in the same operational AWS region.
2. Set its exact ARN as `SES_SNS_TOPIC_ARN` in Vercel and redeploy.
3. Add the HTTPS subscription for the endpoint above; @Ride confirms it only after signature and topic verification.
4. Create an SES configuration set and publish delivery, delay, bounce, complaint, reject, and rendering-failure events to the SNS topic.
5. Set the configuration-set name as `SES_CONFIGURATION_SET` in Vercel and redeploy.
6. If the send-only IAM policy lists individual resources, include the configuration-set resource required by that policy.

`SES_CONFIGURATION_SET` is optional. When absent, existing SES sandbox sends continue normally but cannot be correlated with provider callbacks through this configuration.

## Retention

- Read ordinary inbox rows: 30 days.
- Unread ordinary inbox rows: 90 days.
- Ride-bound rows: additionally protected until 30 days after ride completion.
- Critical/acknowledgement-required rows: protected until acknowledgement, then retained for 90 days.
- Successfully handed-off outbox rows: 14 days.
- Exhausted failures: 30 days.
- Compact provider callback deduplication rows: 30 days.
- Pending, retryable, unresolved, and unacknowledged records are never removed by age alone.

Canonical rides, bookings, payments, announcements, acknowledgements, refund records, and audit events are outside this cleanup.
