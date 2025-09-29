// /app/api/admin/supplier-docs/[id]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

/**
 * Admin verify/reject a supplier document.
 * Expects body: { verified: boolean, rejectionReason?: string }
 * Creates an AuditLog entry for the action.
 * If Admin record for session.user.id doesn't exist, it will be created automatically.
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminUserId = session.user.id;
  // ensure an Admin record exists for this user (safe creation)
  let admin = await prisma.admin.findUnique({ where: { userId: adminUserId } });
  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        userId: adminUserId,
        role: "ADMIN",
      },
    });
  }

  const docId = params.id;
  const body = await req.json().catch(() => ({}));
  const { verified, rejectionReason } = body as {
    verified?: boolean;
    rejectionReason?: string;
  };

  if (typeof verified !== "boolean") {
    return NextResponse.json(
      { error: "Missing 'verified' boolean" },
      { status: 400 }
    );
  }

  const existing = await prisma.supplierDocument.findUnique({
    where: { id: docId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    const updated = await prisma.supplierDocument.update({
      where: { id: docId },
      data: {
        verified,
        verifiedBy: verified ? admin.id : admin.id, // keep who acted
        verifiedAt: verified ? new Date() : new Date(),
        rejectionReason: verified ? null : rejectionReason || null,
      },
    });

    // Create AuditLog entry
    const action = verified ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED";
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action,
        entityId: updated.id,
        entityType: "SupplierDocument",
        details: {
          supplierId: updated.supplierId,
          fileUrl: updated.fileUrl,
          verified,
          rejectionReason: updated.rejectionReason,
        },
        reason: rejectionReason || null,
      },
    });

    // OPTIONAL: Auto-flag supplier.isVerified (disabled by default).
    // If you want to enable auto-verify when all required docs are verified,
    // set env AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS=true and optionally configure REQUIRED_DOC_TYPES.
    if (process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS === "true") {
      // define required doc types here or via env
      const requiredTypes = (
        process.env.REQUIRED_DOC_TYPES || "License,Certificate"
      ).split(",");
      // check supplier docs
      const docs = await prisma.supplierDocument.findMany({
        where: { supplierId: updated.supplierId, type: { in: requiredTypes } },
      });
      const allRequiredVerified =
        docs.length > 0 && docs.every((d) => d.verified === true);
      if (allRequiredVerified) {
        await prisma.supplier.update({
          where: { id: updated.supplierId },
          data: { isVerified: true },
        });
        // audit that too
        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            action: "SUPPLIER_AUTO_VERIFIED",
            entityId: updated.supplierId,
            entityType: "Supplier",
            details: { reason: "All required documents verified" },
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Admin verify error:", err);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}
