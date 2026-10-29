import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { sellerApplication } from "@/lib/seller-registration-policy";
import { deliverySmsRecipient } from "@/lib/fulfillment-view";
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
export class RegistrationError extends Error {}
export const phoneDigest = (phone: string) =>
  createHash("sha256").update(phone).digest("hex");
export async function registrationResult<T>(fn: () => Promise<T>) {
  try {
    return { ok: true as const, data: await fn() };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof RegistrationError
          ? error.message
          : error instanceof z.ZodError
            ? "Check the fields. Use plain business information without contact details or links."
            : "Unable to save. The shop link may already be taken. Refresh your status before retrying.",
    };
  }
}
async function actor(tx: Tx, role?: "ADMIN") {
  const session = await auth();
  if (!session?.user?.id) throw new RegistrationError("Sign in to continue.");
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${session.user.id}::uuid FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: session.user.id } });
  if (!user || (role && user.role !== role))
    throw new RegistrationError("This account cannot perform that action.");
  return user;
}
async function queue(
  tx: Tx,
  registrationId: string,
  version: number,
  kind: string,
  consent: boolean,
) {
  return tx.sellerNotice.upsert({
    where: { eventKey: `${registrationId}:${version}:${kind}` },
    update: {},
    create: {
      registrationId,
      version,
      kind,
      eventKey: `${registrationId}:${version}:${kind}`,
      state: consent ? "QUEUED" : "SUPPRESSED",
      reason: consent ? "REGISTRATION_EVENT_COMMITTED" : "NO_SMS_CONSENT",
      events: {
        create: {
          state: consent ? "QUEUED" : "SUPPRESSED",
          reason: consent ? "REGISTRATION_EVENT_COMMITTED" : "NO_SMS_CONSENT",
        },
      },
    },
  });
}
export async function submitSellerApplication(input: unknown) {
  const data = sellerApplication.parse(input);
  return prisma.$transaction(async (tx) => {
    const user = await actor(tx);
    if (!["BUYER", "SUPPLIER"].includes(user.role))
      throw new RegistrationError("Use your existing account workspace.");
    const phone = deliverySmsRecipient(user.phone);
    if (!user.phoneVerified || !phone)
      throw new RegistrationError(
        "Verify your phone by signing in with an SMS code before applying.",
      );
    const existing = await tx.supplier.findUnique({
      where: { userId: user.id },
      select: { id: true, registration: { select: { id: true } } },
    });
    if (existing) {
      if (existing.registration) return { id: existing.registration.id };
      throw new RegistrationError(
        "You already have a seller profile. Manage it in your seller workspace.",
      );
    }
    const supplier = await tx.supplier.create({
      data: {
        userId: user.id,
        name: data.name,
        companyName: data.name,
        username: data.username,
        about: data.about,
        email: user.email || `${user.id}@seller.invalid`,
        isVerified: false,
      },
    });
    const registration = await tx.sellerRegistration.create({
      data: {
        supplierId: supplier.id,
        smsConsent: data.smsConsent,
        phoneDigest: phoneDigest(phone),
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { role: "SUPPLIER", onboarded: true },
    });
    await queue(tx, registration.id, 1, "RECEIVED", data.smsConsent);
    return { id: registration.id };
  });
}
export async function reviewSellerApplication(input: unknown) {
  const data = z
    .object({
      id: z.string().uuid(),
      version: z.number().int().positive(),
      decision: z.enum(["APPROVED", "REJECTED"]),
      reason: z.string().trim().min(3).max(500),
    })
    .strict()
    .parse(input);
  return prisma.$transaction(async (tx) => {
    const user = await actor(tx, "ADMIN");
    const initial = await tx.sellerRegistration.findUnique({
      where: { id: data.id },
      select: { supplierId: true },
    });
    if (!initial) throw new RegistrationError("Application not found.");
    await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id"=${initial.supplierId}::uuid FOR UPDATE`;
    const row = await tx.sellerRegistration.findUniqueOrThrow({
      where: { id: data.id },
    });
    if (row.version !== data.version) {
      if (row.version === data.version + 1 && row.state === data.decision)
        return { id: row.id };
      throw new RegistrationError(
        "This application changed. Refresh before reviewing.",
      );
    }
    if (row.state === data.decision) return { id: row.id };
    const admin = await tx.admin.upsert({
      where: { userId: user.id },
      create: { userId: user.id, role: "ADMIN" },
      update: {},
    });
    await tx.sellerRegistration.update({
      where: { id: row.id },
      data: {
        state: data.decision,
        version: { increment: 1 },
        reviewReason: data.reason,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });
    await tx.supplier.update({
      where: { id: row.supplierId },
      data: {
        isVerified: data.decision === "APPROVED",
        verifiedAt: data.decision === "APPROVED" ? new Date() : null,
        verifiedBy: user.id,
      },
    });
    await tx.auditLog.create({
      data: {
        adminId: admin.id,
        action: `SELLER_APPLICATION_${data.decision}`,
        entityType: "Supplier",
        entityId: row.supplierId,
        reason: data.reason,
        details: { registrationId: row.id, version: row.version + 1 },
      },
    });
    await queue(tx, row.id, row.version + 1, data.decision, row.smsConsent);
    return { id: row.id };
  });
}
export async function mySellerApplication() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.supplier.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      isVerified: true,
      registration: {
        select: {
          id: true,
          state: true,
          version: true,
          smsConsent: true,
          reviewReason: true,
          createdAt: true,
          notices: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { kind: true, state: true },
          },
        },
      },
    },
  });
}

export async function setSellerNoticeConsent(enabled: unknown) {
  const consent = z.boolean().parse(enabled);
  return prisma.$transaction(async (tx) => {
    const user = await actor(tx);
    if (user.role !== "SUPPLIER")
      throw new RegistrationError("Use your seller account.");
    const supplier = await tx.supplier.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!supplier) throw new RegistrationError("Application not found.");
    await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id"=${supplier.id}::uuid FOR UPDATE`;
    const row = await tx.sellerRegistration.findUnique({
      where: { supplierId: supplier.id },
    });
    if (!row) throw new RegistrationError("Application not found.");
    const phone = deliverySmsRecipient(user.phone);
    if (
      consent &&
      (!user.phoneVerified || !phone || phoneDigest(phone) !== row.phoneDigest)
    )
      throw new RegistrationError(
        "The verified application phone has changed. Keep checking your status here.",
      );
    await tx.sellerRegistration.update({
      where: { id: row.id },
      data: { smsConsent: consent },
    });
    return { enabled: consent };
  });
}
