import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const INVITE_CODE = /^[A-Za-z0-9_-]{8,128}$/;

function key() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return createHash("sha256").update(`atride:whatsapp-invite:${secret}`).digest();
}

export function normalizeWhatsAppInviteUrl(input: string) {
  const value = input.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid-whatsapp-invite");
  }
  const code = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "chat.whatsapp.com" || !INVITE_CODE.test(code)) {
    throw new Error("invalid-whatsapp-invite");
  }
  return `https://chat.whatsapp.com/${code}`;
}

export function encryptWhatsAppInviteUrl(url: string, rideId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(rideId, "utf8"));
  const encrypted = Buffer.concat([cipher.update(url, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptWhatsAppInviteUrl(value: string | null | undefined, rideId: string) {
  if (!value) return null;
  try {
    const [iv, tag, encrypted] = value.split(".");
    if (!iv || !tag || !encrypted) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(rideId, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
