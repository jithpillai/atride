import { describe, expect, it } from "vitest";

import { canDeleteInboxItem, isAcknowledgementProtectedPayload } from "./retention-policy";

const now = new Date("2026-07-22T00:00:00.000Z");
const ago = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60_000);

describe("notification retention", () => {
  it("recycles ordinary read and unread items only after their own limits", () => {
    expect(canDeleteInboxItem({ now, createdAt: ago(31), readAt: ago(30) })).toBe(true);
    expect(canDeleteInboxItem({ now, createdAt: ago(31), readAt: null })).toBe(false);
    expect(canDeleteInboxItem({ now, createdAt: ago(91), readAt: null })).toBe(true);
  });

  it("keeps ride items until thirty days after the ride ends", () => {
    expect(canDeleteInboxItem({ now, createdAt: ago(100), readAt: ago(90), rideEndsAt: ago(20) })).toBe(false);
    expect(canDeleteInboxItem({ now, createdAt: ago(100), readAt: ago(90), rideEndsAt: ago(31) })).toBe(true);
  });

  it("protects acknowledgement-required items until ninety days after acknowledgement", () => {
    expect(canDeleteInboxItem({ now, createdAt: ago(200), readAt: ago(190), requiresAcknowledgement: true, acknowledgedAt: null })).toBe(false);
    expect(canDeleteInboxItem({ now, createdAt: ago(200), readAt: ago(190), requiresAcknowledgement: true, acknowledgedAt: ago(20) })).toBe(false);
    expect(canDeleteInboxItem({ now, createdAt: ago(200), readAt: ago(190), requiresAcknowledgement: true, acknowledgedAt: ago(91) })).toBe(true);
  });

  it("recognizes critical and explicitly acknowledged announcement payloads", () => {
    expect(isAcknowledgementProtectedPayload({ urgency: "CRITICAL" })).toBe(true);
    expect(isAcknowledgementProtectedPayload({ requiresAcknowledgement: true })).toBe(true);
    expect(isAcknowledgementProtectedPayload({ urgency: "NORMAL" })).toBe(false);
  });
});
