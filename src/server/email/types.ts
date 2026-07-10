export type OtpEmailMessage = {
  to: string;
  code: string;
  expiresInMinutes: number;
};

export interface EmailProvider {
  readonly name: "mock" | "ses";
  readonly revealsDevelopmentCode: boolean;
  sendOtp(message: OtpEmailMessage): Promise<{ messageId?: string }>;
}

export class EmailDeliveryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmailDeliveryError";
  }
}
