import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/db/prisma";
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
import { normalizeIdentifier } from "@/lib/utils";
import { sendSms } from "@/lib/africasTalking";
const WINDOW_MS = 15 * 60 * 1000;
const RESEND_MS = 45 * 1000;
export class OtpError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function otpIdentifier(value: unknown) {
  if (typeof value !== "string" || value.length > 100)
    throw new OtpError(400, "Ingiza namba sahihi ya simu.");
  if (value.includes("@"))
    throw new OtpError(
      400,
      "OTP ya barua pepe haipatikani. Tumia SMS au chaguo lingine la kuingia.",
    );
  const normalized = normalizeIdentifier(value.trim());
  if (!/^\+[1-9]\d{7,14}$/.test(normalized))
    throw new OtpError(400, "Ingiza namba sahihi ya simu.");
  return normalized;
}
async function lock(tx: Tx, identifier: string) {
  // A transaction-scoped lock also serializes the first request before a limiter row exists.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identifier}, 0))`;
  const now = new Date();
  let limits = await tx.otpThrottle.upsert({
    where: { identifier },
    create: { identifier, windowStartedAt: now },
    update: {},
  });
  if (now.getTime() - limits.windowStartedAt.getTime() >= WINDOW_MS)
    limits = await tx.otpThrottle.update({
      where: { identifier },
      data: {
        windowStartedAt: now,
        sendCount: 0,
        failedAttempts: 0,
        lastSentAt: null,
      },
    });
  return { limits, now };
}
export async function requestOtp(value: unknown) {
  const identifier = otpIdentifier(value);
  const token = randomInt(100000, 1000000).toString();
  await prisma.$transaction(async (tx) => {
    const { now, limits } = await lock(tx, identifier);
    const remaining = Math.max(
      1,
      Math.ceil(
        (limits.windowStartedAt.getTime() + WINDOW_MS - now.getTime()) / 1000,
      ),
    );
    if (limits.sendCount >= 3 || limits.failedAttempts >= 5)
      throw new OtpError(
        429,
        "Umezidisha majaribio. Jaribu tena baada ya dakika 15.",
        remaining,
      );
    if (
      limits.lastSentAt &&
      now.getTime() - limits.lastSentAt.getTime() < RESEND_MS
    )
      throw new OtpError(
        429,
        "Subiri kabla ya kuomba msimbo mwingine.",
        Math.ceil(
          (limits.lastSentAt.getTime() + RESEND_MS - now.getTime()) / 1000,
        ),
      );
    await tx.otpThrottle.update({
      where: { identifier },
      data: { sendCount: { increment: 1 }, lastSentAt: now },
    });
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({
      data: {
        identifier,
        token,
        expires: new Date(now.getTime() + 5 * 60 * 1000),
        attempts: limits.sendCount + 1,
      },
    });
  });
  try {
    await sendSms(identifier, `Namba yako ya kuhakiki ni ${token}`);
  } catch {
    // Do not leave a failed-delivery credential active or delete a newer resend.
    await prisma.verificationToken.deleteMany({ where: { identifier, token } });
    throw new OtpError(
      503,
      "SMS haikutumwa. Subiri kidogo kisha omba msimbo mpya.",
    );
  }
}
export async function consumeOtp(value: unknown, suppliedToken: unknown) {
  let identifier: string;
  try {
    identifier = otpIdentifier(value);
  } catch {
    return null;
  }
  const token =
    typeof suppliedToken === "string" && suppliedToken.length <= 100
      ? suppliedToken.trim()
      : "";
  return prisma.$transaction(async (tx) => {
    const { now, limits } = await lock(tx, identifier);
    if (limits.failedAttempts >= 5) return null;
    const record = /^\d{6}$/.test(token)
      ? await tx.verificationToken.findFirst({
          where: { identifier, token, expires: { gt: now } },
        })
      : null;
    if (!record) {
      await tx.otpThrottle.update({
        where: { identifier },
        data: { failedAttempts: { increment: 1 } },
      });
      if (limits.failedAttempts + 1 >= 5)
        await tx.verificationToken.deleteMany({ where: { identifier } });
      return null; // Commit failed-attempt accounting; do not throw and roll it back.
    }
    await tx.verificationToken.deleteMany({ where: { identifier } });
    const existing = await tx.user.findUnique({ where: { phone: identifier } });
    if (existing)
      return tx.user.update({
        where: { id: existing.id },
        data: { phoneVerified: now, isVerified: true },
      });
    return tx.user.create({
      data: {
        phone: identifier,
        phoneVerified: now,
        isVerified: true,
        role: "BUYER",
        onboarded: false,
      },
    });
  });
}
