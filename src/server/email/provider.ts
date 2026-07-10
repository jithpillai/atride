import { SesHttpEmailProvider } from "./ses-http-provider";
import { EmailDeliveryError, type EmailProvider } from "./types";

const mockProvider: EmailProvider = {
  name: "mock",
  revealsDevelopmentCode: process.env.NODE_ENV !== "production",
  async sendOtp() {
    if (process.env.NODE_ENV === "production") {
      throw new EmailDeliveryError("The mock email provider is disabled in production.");
    }
    return {};
  },
};

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider === "mock") return mockProvider;
  if (provider === "ses") return new SesHttpEmailProvider();
  throw new EmailDeliveryError("EMAIL_PROVIDER must be set to mock or ses.");
}
