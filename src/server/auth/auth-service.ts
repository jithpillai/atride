import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { getEmailProvider } from "@/server/email/provider";
import { EmailDeliveryError } from "@/server/email/types";
import { getAuthSecret, OTP_RESEND_SECONDS, OTP_TTL_SECONDS, SESSION_MAX_AGE_SECONDS } from "@/server/auth/config";
import {
  createOtpCode,
  createSessionToken,
  hashesMatch,
  hashNetworkValue,
  hashOtp,
  hashSessionToken,
  isEmail,
  normalizeEmail,
} from "@/server/auth/crypto";

export class AuthError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export async function requestEmailOtp(emailValue: string, ipAddress?: string) {
  const email = normalizeEmail(emailValue);
  if (!isEmail(email)) throw new AuthError("INVALID_EMAIL", "Enter a valid email address.");

  const now = new Date();
  const activeChallenge = await db.otpChallenge.findFirst({
    where: {
      contactType: "EMAIL",
      normalizedDestination: email,
      purpose: "SIGN_IN",
      consumedAt: null,
      resendAvailableAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (activeChallenge) {
    throw new AuthError("RESEND_COOLDOWN", "Please wait before requesting another code.", 429);
  }

  const id = randomUUID();
  const code = createOtpCode();
  const secret = getAuthSecret();
  await db.otpChallenge.create({
    data: {
      id,
      contactType: "EMAIL",
      normalizedDestination: email,
      purpose: "SIGN_IN",
      codeHash: hashOtp(id, email, code, secret),
      expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_SECONDS * 1000),
      requestIpHash: ipAddress ? hashNetworkValue(ipAddress, secret) : null,
    },
  });

  let provider: ReturnType<typeof getEmailProvider>;
  try {
    provider = getEmailProvider();
    await provider.sendOtp({ to: email, code, expiresInMinutes: OTP_TTL_SECONDS / 60 });
  } catch (error) {
    await db.otpChallenge.deleteMany({ where: { id, consumedAt: null } });
    if (error instanceof EmailDeliveryError) {
      throw new AuthError("EMAIL_DELIVERY_UNAVAILABLE", "We could not send the verification email. Please try again shortly.", 503);
    }
    throw error;
  }

  return { email, developmentCode: provider.revealsDevelopmentCode ? code : undefined };
}

export async function verifyEmailOtp(emailValue: string, code: string) {
  const email = normalizeEmail(emailValue);
  if (!isEmail(email) || !/^\d{6}$/.test(code)) {
    throw new AuthError("INVALID_CODE", "The verification code is invalid.");
  }

  const now = new Date();
  const challenge = await db.otpChallenge.findFirst({
    where: {
      contactType: "EMAIL",
      normalizedDestination: email,
      purpose: "SIGN_IN",
      consumedAt: null,
      expiresAt: { gt: now },
      attemptCount: { lt: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) throw new AuthError("INVALID_CODE", "The verification code is invalid or expired.");

  const candidateHash = hashOtp(challenge.id, email, code, getAuthSecret());
  if (!hashesMatch(candidateHash, challenge.codeHash)) {
    await db.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, attemptCount: { lt: challenge.maxAttempts } },
      data: { attemptCount: { increment: 1 } },
    });
    throw new AuthError("INVALID_CODE", "The verification code is invalid or expired.");
  }

  const token = createSessionToken();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  const user = await db.$transaction(async (tx) => {
    const consumed = await tx.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw new AuthError("INVALID_CODE", "The verification code was already used.");

    const existingContact = await tx.userContact.findUnique({
      where: { type_normalizedValue: { type: "EMAIL", normalizedValue: email } },
      include: { user: true },
    });

    if (existingContact && existingContact.user.status !== "ACTIVE") {
      throw new AuthError("ACCOUNT_UNAVAILABLE", "This account is unavailable.", 403);
    }

    const account = existingContact?.user ?? await tx.user.create({
      data: {
        displayName: email.split("@")[0].replace(/[._-]+/g, " ").slice(0, 120) || "Rider",
        contacts: {
          create: {
            type: "EMAIL",
            normalizedValue: email,
            displayValue: email,
            isPrimary: true,
            verifiedAt: now,
          },
        },
      },
    });

    if (existingContact && !existingContact.verifiedAt) {
      await tx.userContact.update({ where: { id: existingContact.id }, data: { verifiedAt: now } });
    }

    await tx.session.create({
      data: { userId: account.id, tokenHash: hashSessionToken(token), expiresAt },
    });
    return account;
  });

  return { user, token, expiresAt };
}
