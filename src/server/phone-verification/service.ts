import { db } from "@/lib/db";
import { getAuthSecret } from "@/server/auth/config";
import { createSessionToken, hashNetworkValue, hashSessionToken } from "@/server/auth/crypto";
import { AuthError } from "@/server/auth/auth-service";
import { normalizePhone } from "@/server/profile/validation";
import { FIREBASE_PHONE_AUTH_MAX_AGE_SECONDS, isSupportedIndianMobile, verifiedFirebasePhone } from "./claims";
import { getFirebaseAdminAuth } from "./firebase-admin";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_USER_REQUESTS_PER_DAY = 5;
const MAX_IP_REQUESTS_PER_DAY = 10;

export async function startPhoneVerification(userId: string, phoneValue: string, ipAddress?: string) {
  const phone = normalizePhone(phoneValue);
  if (!isSupportedIndianMobile(phone)) {
    throw new AuthError("INVALID_PHONE", "Enter a valid Indian mobile number.");
  }

  const profile = await db.participantProfile.findUnique({
    where: { userId },
    select: { operationalPhone: true, phoneVerifiedAt: true },
  });
  if (!profile?.operationalPhone || profile.operationalPhone !== phone) {
    throw new AuthError("SAVE_PHONE_FIRST", "Save this phone number in your profile before verifying it.", 409);
  }
  if (profile.phoneVerifiedAt) {
    throw new AuthError("ALREADY_VERIFIED", "This phone number is already verified.", 409);
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recent = await db.phoneVerificationChallenge.findFirst({
    where: { userId, status: "PENDING", createdAt: { gt: new Date(now.getTime() - RESEND_COOLDOWN_MS) } },
  });
  if (recent) throw new AuthError("RESEND_COOLDOWN", "Please wait before requesting another code.", 429);

  const userRequests = await db.phoneVerificationChallenge.count({ where: { userId, createdAt: { gt: dayAgo } } });
  if (userRequests >= MAX_USER_REQUESTS_PER_DAY) {
    throw new AuthError("DAILY_LIMIT", "The daily verification limit has been reached. Try again tomorrow.", 429);
  }

  const ipHash = ipAddress ? hashNetworkValue(ipAddress, getAuthSecret()) : null;
  if (ipHash) {
    const ipRequests = await db.phoneVerificationChallenge.count({ where: { requestIpHash: ipHash, createdAt: { gt: dayAgo } } });
    if (ipRequests >= MAX_IP_REQUESTS_PER_DAY) {
      throw new AuthError("DAILY_LIMIT", "The daily verification limit has been reached. Try again tomorrow.", 429);
    }
  }

  const challengeToken = createSessionToken();
  await db.$transaction([
    db.phoneVerificationChallenge.updateMany({
      where: { userId, status: "PENDING", expiresAt: { lte: now } },
      data: { status: "FAILED", consumedAt: now },
    }),
    db.phoneVerificationChallenge.create({
      data: {
        userId,
        normalizedPhone: phone,
        tokenHash: hashSessionToken(challengeToken),
        requestIpHash: ipHash,
        expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
      },
    }),
  ]);

  return { phone, challengeToken };
}

export async function confirmPhoneVerification(userId: string, challengeToken: string, idToken: string) {
  if (!challengeToken || !idToken) throw new AuthError("INVALID_VERIFICATION", "The verification request is invalid.");
  const now = new Date();
  const tokenHash = hashSessionToken(challengeToken);
  const challenge = await db.phoneVerificationChallenge.findFirst({
    where: {
      userId,
      tokenHash,
      status: "PENDING",
      consumedAt: null,
      expiresAt: { gt: now },
      attemptCount: { lt: 5 },
    },
  });
  if (!challenge) throw new AuthError("INVALID_VERIFICATION", "The verification request is invalid or expired.");

  let verifiedPhone: string | null = null;
  try {
    const claims = await getFirebaseAdminAuth().verifyIdToken(idToken, true);
    const authenticatedAfterChallengeStarted = Boolean(
      claims.auth_time && claims.auth_time >= Math.floor(challenge.createdAt.getTime() / 1000) - 30,
    );
    verifiedPhone = authenticatedAfterChallengeStarted
      ? verifiedFirebasePhone(claims, Math.floor(now.getTime() / 1000), FIREBASE_PHONE_AUTH_MAX_AGE_SECONDS)
      : null;
  } catch (error) {
    const firebaseCode = typeof error === "object" && error && "code" in error && typeof error.code === "string"
      ? error.code
      : "unknown";
    console.error("Firebase Admin rejected a phone verification token", { firebaseCode });
    verifiedPhone = null;
  }
  if (!verifiedPhone || verifiedPhone !== challenge.normalizedPhone) {
    await db.phoneVerificationChallenge.updateMany({
      where: { id: challenge.id, status: "PENDING", attemptCount: { lt: challenge.maxAttempts } },
      data: { attemptCount: { increment: 1 } },
    });
    throw new AuthError("INVALID_VERIFICATION", "Firebase could not verify this phone number.");
  }

  await db.$transaction(async (tx) => {
    const profile = await tx.participantProfile.findUnique({
      where: { userId },
      select: { operationalPhone: true, phoneVerifiedAt: true },
    });
    if (!profile || profile.operationalPhone !== verifiedPhone) {
      throw new AuthError("PHONE_CHANGED", "The profile phone number changed during verification.", 409);
    }
    if (profile.phoneVerifiedAt) {
      await tx.phoneVerificationChallenge.update({
        where: { id: challenge.id },
        data: { status: "VERIFIED", consumedAt: now },
      });
      return;
    }

    const existing = await tx.userContact.findUnique({
      where: { type_normalizedValue: { type: "PHONE", normalizedValue: verifiedPhone } },
    });
    if (existing && existing.userId !== userId) {
      throw new AuthError("PHONE_IN_USE", "This phone number is already verified by another account.", 409);
    }

    await tx.userContact.deleteMany({
      where: { userId, type: "PHONE", normalizedValue: { not: verifiedPhone } },
    });
    if (existing) {
      await tx.userContact.update({ where: { id: existing.id }, data: { displayValue: verifiedPhone, verifiedAt: now } });
    } else {
      await tx.userContact.create({
        data: {
          userId,
          type: "PHONE",
          normalizedValue: verifiedPhone,
          displayValue: verifiedPhone,
          isPrimary: true,
          verifiedAt: now,
        },
      });
    }
    await tx.participantProfile.update({
      where: { userId },
      data: { phoneVerifiedAt: now, phoneVerificationProvider: "FIREBASE" },
    });
    await tx.phoneVerificationChallenge.update({
      where: { id: challenge.id },
      data: { status: "VERIFIED", consumedAt: now },
    });
  });

  return { phone: verifiedPhone, verifiedAt: now };
}
