import { describe, expect, it } from "vitest";

import { createSesAuthorizationHeaders } from "./ses-http-provider";

describe("SES Signature Version 4 authorization", () => {
  const config = {
    region: "ap-south-2",
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "test-secret-access-key",
  };
  const now = new Date("2026-07-10T08:30:45.000Z");

  it("signs only the canonical SES request headers", () => {
    const signed = createSesAuthorizationHeaders('{"example":true}', config, now);

    expect(signed.host).toBe("email.ap-south-2.amazonaws.com");
    expect(signed.headers["x-amz-date"]).toBe("20260710T083045Z");
    expect(signed.headers.authorization).toContain("Credential=AKIDEXAMPLE/20260710/ap-south-2/ses/aws4_request");
    expect(signed.headers.authorization).toContain("SignedHeaders=content-type;host;x-amz-date");
    expect(signed.headers.authorization).not.toContain(config.secretAccessKey);
  });

  it("changes the signature when the payload changes", () => {
    const first = createSesAuthorizationHeaders('{"example":true}', config, now);
    const second = createSesAuthorizationHeaders('{"example":false}', config, now);

    expect(first.headers.authorization).not.toBe(second.headers.authorization);
  });

  it("signs a temporary session token when supplied", () => {
    const signed = createSesAuthorizationHeaders("{}", { ...config, sessionToken: "temporary-token" }, now);

    expect(signed.headers["x-amz-security-token"]).toBe("temporary-token");
    expect(signed.headers.authorization).toContain("SignedHeaders=content-type;host;x-amz-date;x-amz-security-token");
  });
});
