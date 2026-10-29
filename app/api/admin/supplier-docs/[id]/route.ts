import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
const decision = z
  .object({
    verified: z.boolean(),
    rejectionReason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict()
  .refine((data) => data.verified || Boolean(data.rejectionReason));
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin().catch(() => null);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = decision.safeParse(await req.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !body.success)
    return NextResponse.json(
      { error: "A valid document decision and rejection reason are required" },
      { status: 400 },
    );
  const { verified, rejectionReason } = body.data;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.supplierDocument.findUnique({
        where: { id },
        select: { supplierId: true },
      });
      if (!existing) throw new Error("Document unavailable");
      // Serialize decisions for all documents of this supplier before reading their states.
      await tx.$queryRaw`SELECT id FROM "Supplier" WHERE id = ${existing.supplierId}::uuid FOR UPDATE`;
      const admin = await tx.admin.upsert({
        where: { userId: session.user.id! },
        create: { userId: session.user.id!, role: "ADMIN" },
        update: {},
      });
      const doc = await tx.supplierDocument.update({
        where: { id },
        data: {
          verified,
          verifiedBy: admin.id,
          verifiedAt: new Date(),
          rejectionReason: verified ? null : rejectionReason,
        },
      });
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: verified ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
          entityId: doc.id,
          entityType: "SupplierDocument",
          reason: verified ? null : rejectionReason,
          details: { supplierId: doc.supplierId, verified },
        },
      });
      // Preserve the existing opt-in policy, but never treat a missing required type as approved.
      if (
        process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS === "true" &&
        !(await tx.sellerRegistration.findUnique({
          where: { supplierId: doc.supplierId },
          select: { id: true },
        }))
      ) {
        const required = [
          ...new Set(
            (process.env.REQUIRED_DOC_TYPES || "License,Certificate")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          ),
        ];
        const docs = await tx.supplierDocument.findMany({
          where: { supplierId: doc.supplierId, type: { in: required } },
          select: { type: true, verified: true },
        });
        if (
          required.length &&
          required.every((type) => docs.some((d) => d.type === type)) &&
          docs.every((d) => d.verified)
        ) {
          const changed = await tx.supplier.updateMany({
            where: { id: doc.supplierId, isVerified: false },
            data: { isVerified: true },
          });
          if (changed.count)
            await tx.auditLog.create({
              data: {
                adminId: admin.id,
                action: "SUPPLIER_AUTO_VERIFIED",
                entityId: doc.supplierId,
                entityType: "Supplier",
                details: { reason: "All required document types verified" },
              },
            });
        }
      }
      return { id: doc.id, verified: doc.verified };
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
}
