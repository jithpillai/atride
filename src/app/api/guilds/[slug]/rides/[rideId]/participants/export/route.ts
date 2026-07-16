import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { summarizeBookingPayments } from "@/server/booking/payment-summary";
import { AuthError } from "@/server/auth/auth-service";
import { getCurrentSession } from "@/server/auth/session";
import { bookingVehicleLabel, humanize, loadRideManifest } from "@/server/ride/manifest";

type Context = { params: Promise<{ slug: string; rideId: string }> };

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function money(paise: number) { return (paise / 100).toFixed(2); }

export async function GET(_request: Request, { params }: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ ok: false, code: "AUTH_REQUIRED" }, { status: 401 });
  const { slug, rideId } = await params;
  try {
    const manifest = await loadRideManifest(session, slug, rideId);
    const { ride, scope } = manifest;
    const headings = [
      "No.", "Booking status", "Participant name", "Booking lead", "Participant role", "Starting city", "Meeting point",
      "Lead phone", "Phone verified", "Lead email", "Blood group", "Dietary preference", "Medical/accessibility notes",
      "Emergency contact", "Emergency phone", "Vehicle", "Accommodation", "Payment method", "Payment status",
      "Total amount (INR)", "Paid (INR)", "Outstanding (INR)", "Booked at",
    ];
    const rows: unknown[][] = [];
    let number = 1;
    for (const booking of ride.bookings) {
      const payment = summarizeBookingPayments(booking);
      const participants = booking.participants.length ? booking.participants : [{
        displayName: booking.user.displayName, role: booking.occupantRole, dietaryPreference: booking.dietaryPreference,
        accessibilityNotes: booking.accessibilityNotes, emergencyContactName: null, emergencyContactPhone: null, isBookingLead: true,
      }];
      for (const participant of participants) {
        rows.push([
          number++, humanize(booking.status), participant.displayName, participant.isBookingLead ? "Yes" : "No", humanize(participant.role),
          booking.origin?.city ?? ride.originCity, booking.origin?.meetingPoint ?? "",
          participant.isBookingLead ? booking.user.profile?.operationalPhone ?? "" : "",
          participant.isBookingLead && booking.user.profile?.phoneVerifiedAt ? "Yes" : participant.isBookingLead ? "No" : "",
          participant.isBookingLead ? booking.user.contacts[0]?.displayValue ?? "" : "",
          participant.isBookingLead ? booking.user.profile?.bloodGroup ?? "" : "",
          participant.dietaryPreference ?? "", participant.accessibilityNotes ?? "",
          participant.emergencyContactName ?? "", participant.emergencyContactPhone ?? "", bookingVehicleLabel(booking),
          booking.accommodationSelections.map(({ optionName, guestCount }) => `${optionName} (${guestCount})`).join("; ") || booking.accommodationSelection || "",
          humanize(booking.paymentMethodPreference), payment.fullyPaid ? "Paid" : payment.activePayment ? humanize(payment.activePayment.status) : "Pending",
          money(booking.totalPricePaise), money(payment.paidPaise), money(payment.outstandingPaise), booking.createdAt.toISOString(),
        ]);
      }
    }
    const csv = `\uFEFF${[headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    await db.communityAuditEvent.create({
      data: {
        communityId: ride.community.id,
        actorUserId: session.userId,
        action: "PARTICIPANT_MANIFEST_EXPORTED",
        metadata: { rideId, format: "CSV", scope: scope.kind, originIds: scope.originIds, bookingCount: ride.bookings.length, participantCount: rows.length },
      },
    });
    const filename = `${ride.slug}-participants.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status });
    throw error;
  }
}
