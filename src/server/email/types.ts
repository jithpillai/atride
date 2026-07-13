export type OtpEmailMessage = {
  to: string;
  code: string;
  expiresInMinutes: number;
};

export type TransactionalEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface EmailProvider {
  readonly name: "mock" | "ses";
  readonly revealsDevelopmentCode: boolean;
  sendOtp(message: OtpEmailMessage): Promise<{ messageId?: string }>;
  sendTransactional(message: TransactionalEmailMessage): Promise<{ messageId?: string }>;
}

export class EmailDeliveryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmailDeliveryError";
  }
}
