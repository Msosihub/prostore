// app/api/admin/audit-logs/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";

// type AuditLog = {
//   id: string;
//   admin: { name: string };
//   action: string;
//   entityId: string;
//   entityType: string;
//   reason: string | null;
//   createdAt: string;
// };

export async function GET(req: Request) {
  // require admin
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "25", 10);
    const pageSize = Math.min(Math.max(pageSizeRaw || 25, 1), 100);
    const action = url.searchParams.get("action") || undefined;
    const entityType = url.searchParams.get("entityType") || undefined;
    const adminName = url.searchParams.get("adminName") || undefined;
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;

    // Build where clause progressively
    const where: Prisma.AuditLogWhereInput = {};

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) where.createdAt.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) where.createdAt.lte = d;
      }
    }

    if (adminName) {
      // search admin.user.name case-insensitive
      where.admin = {
        user: {
          name: {
            contains: adminName,
            mode: "insensitive",
          },
        },
      };
    }

    // Use a transaction to get count + paged data
    const [total, items] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          // include admin -> user so we can display admin name
          admin: {
            include: { user: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Normalize shape for client
    const data = items.map((i) => ({
      id: i.id,
      action: i.action,
      entityType: i.entityType,
      entityId: i.entityId,
      reason: i.reason ?? null,
      details: i.details ?? null,
      createdAt: i.createdAt,
      admin: {
        id: i.admin?.id,
        name: i.admin?.user?.name ?? i.admin?.user?.email ?? "Admin",
      },
    }));

    return NextResponse.json({ total, page, pageSize, data });
  } catch (err) {
    console.error("GET /api/admin/audit-logs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
//It returns { total, page, pageSize, data: AuditLog[] } where each item includes admin.name.
