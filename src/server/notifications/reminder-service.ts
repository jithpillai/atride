import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const ACTIVE_RIDE_STATUSES = ["PUBLISHED", "CLOSED"] as const;
const ACTIONABLE_PAYMENT_STATUSES = ["PENDING", "REJECTED"] as const;

function applicationUrl() {
  return (process.env.APP_URL?.trim() || "https://atride.in").replace(/\/$/, "");
}

function verifiedEmail(user: { contacts: Array<{ normalizedValue: string }> }) {
  return user.contacts[0]?.normalizedValue ?? null;
}

function iso(value: Date) {
  return value.toISOString();
}

export async function invalidateObsoleteReminderEvents() {
  const events = await db.notificationOutboxEvent.findMany({
    where: { eventType: { in: ["RIDE_START_REMINDER", "BOOKING_PAYMENT_REMINDER"] }, status: { in: ["PENDING", "FAILED"] } },
    select: {
      id: true,
      eventType: true,
      payload: true,
      booking: { select: { status: true, ride: { select: { status: true, startsAt: true } } } },
      bookingPayment: { select: { status: true, dueAt: true, booking: { select: { status: true, ride: { select: { status: true } } } } } },
    },
    take: 500,
  });
  const obsoleteIds = events.flatMap((event) => {
    const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload) ? event.payload as Prisma.JsonObject : {};
    const scheduledFor = typeof payload.scheduledFor === "string" ? payload.scheduledFor : "";
    if (event.eventType === "RIDE_START_REMINDER") {
      const valid = event.booking?.status === "CONFIRMED"
        && ACTIVE_RIDE_STATUSES.includes(event.booking.ride.status as (typeof ACTIVE_RIDE_STATUSES)[number])
        && iso(event.booking.ride.startsAt) === scheduledFor;
      return valid ? [] : [event.id];
    }
    const payment = event.bookingPayment;
    const valid = Boolean(payment?.dueAt)
      && ACTIONABLE_PAYMENT_STATUSES.includes(payment!.status as (typeof ACTIONABLE_PAYMENT_STATUSES)[number])
      && ["RESERVED", "CONFIRMED"].includes(payment!.booking.status)
      && ACTIVE_RIDE_STATUSES.includes(payment!.booking.ride.status as (typeof ACTIVE_RIDE_STATUSES)[number])
      && iso(payment!.dueAt!) === scheduledFor;
    return valid ? [] : [event.id];
  });
  if (obsoleteIds.length) await db.notificationOutboxEvent.deleteMany({ where: { id: { in: obsoleteIds } } });
  return obsoleteIds.length;
}

export async function processDueReminders(options: { now?: Date; limit?: number } = {}) {
  const now = options.now ?? new Date();
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
  const rideHorizon = new Date(now.getTime() + 24 * 60 * 60_000);
  const paymentHorizon = new Date(now.getTime() + 48 * 60 * 60_000);
  const contactSelection = {
    where: { type: "EMAIL" as const, verifiedAt: { not: null } },
    orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
    take: 1,
    select: { normalizedValue: true },
  };
  const [bookings, payments, invalidated] = await Promise.all([
    db.rideBooking.findMany({
      where: {
        status: "CONFIRMED",
        ride: { status: { in: [...ACTIVE_RIDE_STATUSES] }, startsAt: { gt: now, lte: rideHorizon } },
        user: { contacts: { some: { type: "EMAIL", verifiedAt: { not: null } } } },
      },
      select: {
        id: true,
        communityId: true,
        userId: true,
        user: { select: { displayName: true, contacts: contactSelection } },
        ride: { select: { slug: true, title: true, startsAt: true, community: { select: { name: true } } } },
      },
      orderBy: { ride: { startsAt: "asc" } },
      take: limit,
    }),
    db.bookingPayment.findMany({
      where: {
        status: { in: [...ACTIONABLE_PAYMENT_STATUSES] },
        dueAt: { not: null, lte: paymentHorizon },
        booking: {
          status: { in: ["RESERVED", "CONFIRMED"] },
          ride: { status: { in: [...ACTIVE_RIDE_STATUSES] }, startsAt: { gt: now } },
          user: { contacts: { some: { type: "EMAIL", verifiedAt: { not: null } } } },
        },
      },
      select: {
        id: true,
        bookingId: true,
        amountPaise: true,
        dueAt: true,
        booking: {
          select: {
            communityId: true,
            userId: true,
            user: { select: { displayName: true, contacts: contactSelection } },
            ride: { select: { slug: true, title: true, community: { select: { name: true } } } },
          },
        },
      },
      orderBy: { dueAt: "asc" },
      take: limit,
    }),
    invalidateObsoleteReminderEvents(),
  ]);
  const baseUrl = applicationUrl();
  const rideEvents = bookings.flatMap((booking) => {
    const email = verifiedEmail(booking.user);
    if (!email) return [];
    const scheduledFor = iso(booking.ride.startsAt);
    return [{
      eventType: "RIDE_START_REMINDER" as const,
      eventKey: `ride-start-24h:${booking.id}:${booking.ride.startsAt.getTime()}`,
      communityId: booking.communityId,
      bookingId: booking.id,
      recipientUserId: booking.userId,
      recipientEmail: email,
      recipientName: booking.user.displayName,
      payload: { reminderKind: "RIDE_START_24H", guildName: booking.ride.community.name, rideTitle: booking.ride.title, startsAt: scheduledFor, scheduledFor, bookingUrl: `${baseUrl}/rides/${encodeURIComponent(booking.ride.slug)}#ride-updates` },
    }];
  });
  const paymentEvents = payments.flatMap((payment) => {
    if (!payment.dueAt) return [];
    const email = verifiedEmail(payment.booking.user);
    if (!email) return [];
    const overdue = payment.dueAt <= now;
    const scheduledFor = iso(payment.dueAt);
    return [{
      eventType: "BOOKING_PAYMENT_REMINDER" as const,
      eventKey: `payment-${overdue ? "overdue" : "due"}:${payment.id}:${payment.dueAt.getTime()}`,
      communityId: payment.booking.communityId,
      bookingId: payment.bookingId,
      bookingPaymentId: payment.id,
      recipientUserId: payment.booking.userId,
      recipientEmail: email,
      recipientName: payment.booking.user.displayName,
      payload: { reminderKind: overdue ? "PAYMENT_OVERDUE" : "PAYMENT_DUE", guildName: payment.booking.ride.community.name, rideTitle: payment.booking.ride.title, dueAt: scheduledFor, scheduledFor, amountPaise: payment.amountPaise, bookingUrl: `${baseUrl}/account/bookings` },
    }];
  });
  const events = [...rideEvents, ...paymentEvents];
  if (events.length) await db.notificationOutboxEvent.createMany({ data: events, skipDuplicates: true });
  return { eventKeys: events.map(({ eventKey }) => eventKey), rideReminders: rideEvents.length, paymentReminders: paymentEvents.length, invalidated };
}
