import { createHash, createHmac } from "node:crypto";

import { renderOtpEmail } from "./otp-template";
import { EmailDeliveryError, type EmailProvider, type OtpEmailMessage } from "./types";

type SesConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new EmailDeliveryError(`${name} is required when EMAIL_PROVIDER=ses.`);
  return value;
}

function getSesConfig(): SesConfig {
  return {
    region: required("AWS_REGION"),
    accessKeyId: required("AWS_ACCESS_KEY_ID"),
    secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
    sessionToken: process.env.AWS_SESSION_TOKEN?.trim() || undefined,
    fromEmail: required("SES_FROM_EMAIL"),
    fromName: process.env.SES_FROM_NAME?.trim() || "@Ride",
    replyToEmail: process.env.SES_REPLY_TO_EMAIL?.trim() || undefined,
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function safeDisplayName(value: string) {
  return value.replace(/[\r\n"<>]/g, "").slice(0, 80) || "@Ride";
}

export function createSesAuthorizationHeaders(
  body: string,
  config: Pick<SesConfig, "region" | "accessKeyId" | "secretAccessKey" | "sessionToken">,
  now = new Date(),
) {
  const host = `email.${config.region}.amazonaws.com`;
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host,
    "x-amz-date": amzDate,
  };
  if (config.sessionToken) headers["x-amz-security-token"] = config.sessionToken;

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((name) => `${name}:${headers[name]}\n`).join("");
  const canonicalRequest = [
    "POST",
    "/v2/email/outbound-emails",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256(body),
  ].join("\n");
  const scope = `${dateStamp}/${config.region}/ses/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, "ses");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
  const requestHeaders: Record<string, string> = {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };

  return {
    host,
    headers: requestHeaders,
  };
}

export class SesHttpEmailProvider implements EmailProvider {
  readonly name = "ses" as const;
  readonly revealsDevelopmentCode = false;

  async sendOtp(message: OtpEmailMessage) {
    const config = getSesConfig();
    const content = renderOtpEmail(message);
    const payload = JSON.stringify({
      FromEmailAddress: `${safeDisplayName(config.fromName)} <${config.fromEmail}>`,
      Destination: { ToAddresses: [message.to] },
      ReplyToAddresses: config.replyToEmail ? [config.replyToEmail] : undefined,
      Content: {
        Simple: {
          Subject: { Data: content.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: content.text, Charset: "UTF-8" },
            Html: { Data: content.html, Charset: "UTF-8" },
          },
        },
      },
    });
    const signed = createSesAuthorizationHeaders(payload, config);

    try {
      const response = await fetch(`https://${signed.host}/v2/email/outbound-emails`, {
        method: "POST",
        headers: signed.headers,
        body: payload,
        signal: AbortSignal.timeout(8_000),
      });
      const responseBody = await response.text();
      let result: { MessageId?: string; message?: string; __type?: string } = {};
      try {
        result = JSON.parse(responseBody) as typeof result;
      } catch {
        // AWS may return a plain-text proxy or signing error before SES handles the request.
      }
      if (!response.ok) {
        const providerDetail = ([result.__type, result.message].filter(Boolean).join(": ") || responseBody)
          .replace(/[\r\n]/g, " ")
          .slice(0, 500);
        throw new EmailDeliveryError(
          `Amazon SES rejected the message with status ${response.status}${providerDetail ? ` (${providerDetail})` : ""}.`,
        );
      }
      return { messageId: result.MessageId };
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      throw new EmailDeliveryError("Amazon SES could not be reached.", { cause: error });
    }
  }
}
