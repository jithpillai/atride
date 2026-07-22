import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { SesDeliveryEvent } from "@/server/email/ses-events";

export async function recordSesDeliveryEvent(providerEventId: string, event: SesDeliveryEvent) {
  return db.$transaction(async (tx) => {
    const inserted = await tx.emailProviderEvent.createMany({
      data: [{
        provider: "SES",
        providerEventId: providerEventId.slice(0, 240),
        providerMessageId: event.providerMessageId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
      }],
      skipDuplicates: true,
    });
    if (!inserted.count) return { duplicate: true, matched: 0, suppressions: 0 };

    const matched = event.providerMessageId
      ? await tx.notificationOutboxEvent.updateMany({
          where: {
            providerMessageId: event.providerMessageId,
            OR: [{ providerStatusUpdatedAt: null }, { providerStatusUpdatedAt: { lte: event.occurredAt } }],
          },
          data: { providerDeliveryStatus: event.deliveryStatus, providerStatusUpdatedAt: event.occurredAt },
        })
      : { count: 0 };
    let suppressions = 0;
    if (event.suppressRecipients) {
      for (const normalizedEmail of event.recipients) {
        await tx.emailSuppression.upsert({
          where: { normalizedEmail },
          create: { normalizedEmail, reason: event.deliveryStatus, provider: "SES", providerEventId: providerEventId.slice(0, 240) },
          update: { reason: event.deliveryStatus, provider: "SES", providerEventId: providerEventId.slice(0, 240) },
        });
        suppressions += 1;
      }
    }
    return { duplicate: false, matched: matched.count, suppressions };
  }).catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { duplicate: true, matched: 0, suppressions: 0 };
    throw error;
  });
}
