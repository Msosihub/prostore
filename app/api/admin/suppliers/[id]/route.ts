// app/api/admin/suppliers/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

type AuditLog = {
  adminId: string;
  action: string;
  entityId: string;
  entityType: string;
  reason: string | null;
  details?: {
    changedBy?: string;
    isVerified?: boolean;
    label?: string;
    deletedBy?: string;
  };
};

/**
 * Helper: ensure Admin row exists (creates one if missing)
 */
async function ensureAdminRecord(userId: string) {
  let admin = await prisma.admin.findUnique({ where: { userId } });
  if (!admin) {
    admin = await prisma.admin.create({ data: { userId, role: "ADMIN" } });
  }
  return admin;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        user: true,
        SupplierDocument: { orderBy: { uploadedAt: "desc" } },
        SupplierPolicy: true,
        products: { take: 10 },
      },
    });
    if (!supplier)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(supplier);
  } catch (err) {
    console.error("GET /api/admin/suppliers/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT updates supplier fields OR toggles verification.
 * Accepts a payload with fields to update, e.g.:
 * { label, companyName, businessType, yearsActive, isVerified, reason }
 *
 * If isVerified is toggled, an AuditLog entry is written.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  console.log("PUT Admin user verified:", session.user.id);
  const adminUserId = session.user.id;
  const adminRecord = await ensureAdminRecord(adminUserId);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  console.log("PUT body:", body);

  try {
    // Only allow explicit fields to be updated
    const updatable: Prisma.SupplierUpdateInput = {};
    const fields = [
      "label",
      "name",
      "username",
      "companyName",
      "businessType",
      "yearsActive",
      "responseTime",
      "country",
      "location",
      "nation",
      "website",
      "about",
      "logo",
      "banner",
      "phone",
      "email",
      "isVerified",
    ];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(body, f)) {
        updatable[f as keyof Prisma.SupplierUpdateInput] = body[f];
      }
    }
    console.log("Updatable fields:", updatable);
    const updated = await prisma.supplier.update({
      where: { id },
      data: updatable,
    });
    console.log("Updated supplier:", updated);

    // Audit logging for verification toggle or label change
    const logEntries: AuditLog[] = [];
    if (body.hasOwnProperty("isVerified")) {
      logEntries.push({
        adminId: adminRecord.id,
        action: body.isVerified ? "SUPPLIER_VERIFIED" : "SUPPLIER_UNVERIFIED",
        entityId: id,
        entityType: "Supplier",
        reason: body.reason ?? null,
        details: { changedBy: adminUserId, isVerified: body.isVerified },
      });
    }
    if (body.hasOwnProperty("label")) {
      logEntries.push({
        adminId: adminRecord.id,
        action: "SUPPLIER_LABEL_UPDATED",
        entityId: id,
        entityType: "Supplier",
        reason: null,
        details: { label: body.label },
      });
    }

    if (logEntries.length > 0) {
      // write logs
      await Promise.all(
        logEntries.map((e) => prisma.auditLog.create({ data: e }))
      );
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/admin/suppliers/[id] error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminUserId = session.user.id;
  const adminRecord = await ensureAdminRecord(adminUserId);

  const { id } = await params;
  try {
    // Prevent deleting supplier with products (safe guard)
    const productCount = await prisma.product.count({
      where: { supplierId: id },
    });
    if (productCount > 0) {
      return NextResponse.json(
        { error: "Supplier has products and cannot be deleted" },
        { status: 400 }
      );
    }

    // Optionally set user.role back to BUYER or delete the user — we will only delete supplier row
    const deleted = await prisma.supplier.delete({ where: { id } });
    console.log("Deleted supplier:", deleted);

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminRecord.id,
        action: "SUPPLIER_DELETED",
        entityId: id,
        entityType: "Supplier",
        reason: null,
        details: { deletedBy: adminUserId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/suppliers/[id] error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to delete" },
      { status: 500 }
    );
  }
}
