import { describe, expect, it } from "vitest";

import { isAllowedSnsUrl, parseSesDeliveryEvent, parseSnsEnvelope, snsStringToSign } from "./ses-events";

describe("SES provider events", () => {
  it("allows only HTTPS SNS certificate and subscription hosts", () => {
    expect(isAllowedSnsUrl("https://sns.ap-south-2.amazonaws.com/cert.pem")).toBe(true);
    expect(isAllowedSnsUrl("http://sns.ap-south-2.amazonaws.com/cert.pem")).toBe(false);
    expect(isAllowedSnsUrl("https://sns.ap-south-2.amazonaws.com.evil.test/cert.pem")).toBe(false);
  });

  it("creates the canonical SNS notification string", () => {
    const envelope = parseSnsEnvelope({
      Type: "Notification", MessageId: "sns-1", TopicArn: "arn:aws:sns:ap-south-2:1:atride",
      Message: "payload", Timestamp: "2026-07-22T00:00:00.000Z", SignatureVersion: "2",
      Signature: "signature", SigningCertURL: "https://sns.ap-south-2.amazonaws.com/cert.pem",
    });
    expect(snsStringToSign(envelope)).toBe("Message\npayload\nMessageId\nsns-1\nTimestamp\n2026-07-22T00:00:00.000Z\nTopicArn\narn:aws:sns:ap-south-2:1:atride\nType\nNotification\n");
  });

  it("maps delivery and permanent bounce events without retaining the raw payload", () => {
    expect(parseSesDeliveryEvent(JSON.stringify({ eventType: "DELIVERY", mail: { messageId: "ses-1", destination: ["Rider@Example.com"] }, delivery: { timestamp: "2026-07-22T01:00:00.000Z" } }))).toMatchObject({
      providerMessageId: "ses-1", deliveryStatus: "DELIVERED", recipients: ["rider@example.com"], suppressRecipients: false,
    });
    expect(parseSesDeliveryEvent(JSON.stringify({ eventType: "BOUNCE", mail: { messageId: "ses-2" }, bounce: { bounceType: "Permanent", bouncedRecipients: [{ emailAddress: "bad@example.com" }] } }))).toMatchObject({
      deliveryStatus: "BOUNCED", recipients: ["bad@example.com"], suppressRecipients: true,
    });
  });
});
