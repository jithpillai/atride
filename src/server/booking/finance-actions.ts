"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireGuildFinance } from "@/server/auth/authorization";
import { dispatchNotificationOutbox } from "@/server/notifications/dispatcher";
import { queueParticipantPaymentReviewed } from "@/server/notifications/payment-events";
import { cleanBookingText } from "./validation";
import { moneyToPaise } from "@/server/ride/validation";

export async function reviewBookingPayment(formData: FormData) {
  const guildSlug = cleanBookingText(formData.get("guildSlug"), 80);
  const paymentId = cleanBookingText(formData.get("paymentId"), 36);
  const decision = cleanBookingText(formData.get("decision"), 20);
  const rejectionReason = cleanBookingText(formData.get("rejectionReason"), 1000);
  const { session } = await requireGuildFinance(guildSlug);
  if (decision !== "CONFIRM" && decision !== "REJECT") redirect(`/guilds/${guildSlug}/manage?section=finance&paymentError=invalid`);
  if (decision === "REJECT" && rejectionReason.length < 5) redirect(`/guilds/${guildSlug}/manage?section=finance&paymentError=reason`);

  let notificationEventKeys: string[] = [];
  let rideSlug = "";
  try {
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.bookingPayment.findFirst({
        where: {
          id: paymentId,
          status: decision === "CONFIRM" ? { in: ["SUBMITTED", "PENDING"] } : "SUBMITTED",
          booking: { community: { slug: guildSlug }, ride: { status: { in: ["PUBLISHED", "CLOSED"] } } },
          OR: [
            { purpose: { in: ["CONFIRMATION_DEPOSIT", "FULL_PAYMENT"] }, booking: { status: "RESERVED" } },
            { purpose: "BALANCE", booking: { status: "CONFIRMED" } },
          ],
        },
        include: { booking: { include: { ride: { select: { slug: true } } } } },
      });
      if (!payment || (payment.status === "PENDING" && payment.method !== "CASH")) throw new Error("payment-unavailable");
      const now = new Date();
      if (decision === "CONFIRM") {
        await tx.bookingPayment.update({ where: { id: payment.id }, data: { status: "CONFIRMED", reviewedById: session.userId, reviewedAt: now, rejectionReason: null } });
        if (payment.purpose === "CONFIRMATION_DEPOSIT" || payment.purpose === "FULL_PAYMENT") {
          await tx.rideBooking.update({ where: { id: payment.bookingId }, data: { status: "CONFIRMED", confirmedAt: now, reservationExpiresAt: null } });
          const membership = await tx.communityMembership.upsert({
            where: { communityId_userId: { communityId: payment.booking.communityId, userId: payment.booking.userId } },
            create: { communityId: payment.booking.communityId, userId: payment.booking.userId, status: "ACTIVE", joinedAt: now },
            update: { status: "ACTIVE" },
          });
          if (!membership.joinedAt) {
            await tx.communityMembership.update({ where: { id: membership.id }, data: { joinedAt: now } });
          }
          if (payment.booking.newcomerDisplayConsentAt) {
            await tx.guildWelcomeConsent.upsert({
              where: { membershipId: membership.id },
              create: { membershipId: membership.id, consentedAt: payment.booking.newcomerDisplayConsentAt },
              update: { consentedAt: payment.booking.newcomerDisplayConsentAt, revokedAt: null },
            });
          }
        }
      } else {
        await tx.bookingPayment.update({ where: { id: payment.id }, data: { status: "REJECTED", reviewedById: session.userId, reviewedAt: now, rejectionReason } });
      }
      await tx.communityAuditEvent.create({ data: {
        communityId: payment.booking.communityId,
        actorUserId: session.userId,
        targetUserId: payment.booking.userId,
        action: decision === "CONFIRM" ? "BOOKING_PAYMENT_CONFIRMED" : "BOOKING_PAYMENT_REJECTED",
        metadata: { bookingId: payment.bookingId, paymentId: payment.id, rideId: payment.booking.rideId, amountPaise: payment.amountPaise, method: payment.method, purpose: payment.purpose },
      } });
      const eventKeys = await queueParticipantPaymentReviewed(
        tx,
        payment.id,
        decision === "CONFIRM" ? "BOOKING_PAYMENT_CONFIRMED" : "BOOKING_PAYMENT_REJECTED",
        decision === "REJECT" ? rejectionReason : null,
      );
      return { eventKeys, rideSlug: payment.booking.ride.slug };
    });
    notificationEventKeys = result.eventKeys;
    rideSlug = result.rideSlug;
  } catch (error) {
    console.error("Booking payment review failed", { guildSlug, paymentId, decision, error });
    redirect(`/guilds/${guildSlug}/manage?section=finance&paymentError=unavailable`);
  }
  if (notificationEventKeys.length) {
    await dispatchNotificationOutbox({ eventKeys: notificationEventKeys }).catch((error) => {
      console.error("Immediate participant payment notification failed; the durable event remains queued", { error });
    });
  }
  revalidatePath(`/guilds/${guildSlug}/manage`);
  revalidatePath(`/guilds/${guildSlug}`);
  if (rideSlug) revalidatePath(`/rides/${rideSlug}`);
  revalidatePath("/");
  redirect(`/guilds/${guildSlug}/manage?section=finance&paymentSaved=${decision.toLowerCase()}`);
}

export async function reviewBookingRefund(formData: FormData) {
  const guildSlug = cleanBookingText(formData.get("guildSlug"), 80);
  const refundId = cleanBookingText(formData.get("refundId"), 36);
  const reference = cleanBookingText(formData.get("reference"), 180);
  const note = cleanBookingText(formData.get("note"), 1000);
  const { session } = await requireGuildFinance(guildSlug);
  let confirmedAmountPaise: number;
  let refundedAmountPaise: number;
  try {
    confirmedAmountPaise = moneyToPaise(cleanBookingText(formData.get("confirmedAmount"), 20));
    refundedAmountPaise = moneyToPaise(cleanBookingText(formData.get("refundedAmount"), 20));
  } catch {
    redirect(`/guilds/${guildSlug}/manage?section=finance&refundError=amount`);
  }
  if (refundedAmountPaise > confirmedAmountPaise || (refundedAmountPaise > 0 && reference.length < 6)) redirect(`/guilds/${guildSlug}/manage?section=finance&refundError=amount`);
  try {
    const refund = await db.bookingRefund.findFirst({
      where: { id: refundId, community: { slug: guildSlug } },
      include: { booking: { select: { id: true, userId: true, rideId: true, totalPricePaise: true, ride: { select: { slug: true } } } } },
    });
    if (!refund || confirmedAmountPaise > refund.booking.totalPricePaise) throw new Error("invalid-refund");
    const status = confirmedAmountPaise === 0
      ? "REVIEW_REQUIRED" as const
      : refundedAmountPaise === 0
      ? "PENDING" as const
      : refundedAmountPaise < confirmedAmountPaise
      ? "PARTIALLY_REFUNDED" as const
      : "REFUNDED" as const;
    await db.$transaction([
      db.bookingRefund.update({ where: { id: refund.id }, data: { confirmedAmountPaise, refundedAmountPaise, status, reference: reference || null, note: note || null, reviewedById: session.userId, reviewedAt: new Date() } }),
      db.communityAuditEvent.create({ data: {
        communityId: refund.communityId,
        actorUserId: session.userId,
        targetUserId: refund.booking.userId,
        action: "BOOKING_REFUND_REVIEWED",
        metadata: { bookingId: refund.booking.id, rideId: refund.booking.rideId, refundId: refund.id, confirmedAmountPaise, refundedAmountPaise, status, reference: reference || null },
      } }),
    ]);
    revalidatePath(`/rides/${refund.booking.ride.slug}`);
    revalidatePath("/account/bookings");
  } catch (error) {
    console.error("Booking refund review failed", { guildSlug, refundId, error });
    redirect(`/guilds/${guildSlug}/manage?section=finance&refundError=unavailable`);
  }
  revalidatePath(`/guilds/${guildSlug}/manage`);
  redirect(`/guilds/${guildSlug}/manage?section=finance&refundSaved=1#refund-queue`);
}
