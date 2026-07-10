import { describe, expect, it } from "vitest";

import { renderOtpEmail } from "./otp-template";

describe("OTP email template", () => {
  it("renders branded text and HTML without exposing the code in the subject", () => {
    const message = renderOtpEmail({ to: "rider@example.com", code: "482193", expiresInMinutes: 10 });

    expect(message.subject).toBe("Your @Ride sign-in code");
    expect(message.subject).not.toContain("482193");
    expect(message.text).toContain("482193");
    expect(message.text).toContain("10 minutes");
    expect(message.html).toContain("482193");
    expect(message.html).toContain("@</span>Ride");
  });
});
