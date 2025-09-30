// app/api/admin/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  // Admin guard (assumes next-auth session contains user.role)
  console.log("GET /api/admin/dashboard called", req.url);
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Basic counts
    const [
      totalSuppliers,
      verifiedSuppliers,
      totalProducts,
      totalCategories,
      totalUsers,
    ] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { isVerified: true } }),
      prisma.product.count(),
      prisma.category.count(),
      prisma.user.count(),
    ]);

    // pending documents: verified=false AND rejectionReason IS NULL -> "awaiting review"
    const pendingDocs = await prisma.supplierDocument.count({
      where: { verified: false, rejectionReason: null },
    });

    // Recent audit logs (10)
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { admin: { include: { user: true } } },
    });

    // Recent pending supplier documents (preview 5)
    const recentDocs = await prisma.supplierDocument.findMany({
      where: { verified: false, rejectionReason: null },
      orderBy: { uploadedAt: "desc" },
      take: 5,
      include: { supplier: { select: { id: true, name: true } } },
    });

    // Suppliers by month (last 6 months) — returns months even if 0
    const suppliersByMonth = await prisma.$queryRaw<
      { month: string; count: number }[]
    >`
      SELECT to_char(months.month, 'YYYY-MM') as month,
             COALESCE(cnt.count, 0) AS count
      FROM (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) AS month
      ) months
      LEFT JOIN (
        SELECT date_trunc('month', "createdAt") AS m, COUNT(*) AS count
        FROM "Supplier"
        GROUP BY m
      ) cnt ON date_trunc('month', months.month) = cnt.m
      ORDER BY months.month;
    `;

    // Products by category (top 20)
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      take: 20,
    });

    const productsByCategory = categories.map((c) => ({
      category: c.name_en,
      count: c._count.products,
    }));

    // Top performing suppliers (by rating, then product count)
    const topSuppliersRaw = await prisma.supplier.findMany({
      take: 8,
      orderBy: [{ rating: "desc" }, { yearsActive: "desc" }],
      include: { _count: { select: { products: true } } },
    });
    const topSuppliers = topSuppliersRaw.map((s) => ({
      id: s.id,
      name: s.name,
      rating: Number(s.rating),
      productsCount: s._count?.products ?? 0,
      isVerified: s.isVerified,
    }));

    // Suppliers by nation (grouped)
    const suppliersByNationRaw = await prisma.supplier.groupBy({
      by: ["nation"],
      where: { nation: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 30,
    });
    const suppliersByNation = suppliersByNationRaw.map((r) => ({
      nation: r.nation,
      count: r._count.id,
    }));

    // package response
    return NextResponse.json({
      stats: {
        totalSuppliers,
        verifiedSuppliers,
        pendingDocs,
        totalProducts,
        totalCategories,
        totalUsers,
      },
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        reason: l.reason ?? null,
        details: l.details ?? null,
        createdAt: l.createdAt,
        admin: {
          id: l.admin?.id,
          name: l.admin?.user?.name ?? l.admin?.user?.email ?? "Admin",
        },
      })),
      recentDocs: recentDocs.map((d) => ({
        id: d.id,
        label: d.label,
        fileUrl: d.fileUrl,
        uploadedAt: d.uploadedAt,
        supplier: d.supplier
          ? { id: d.supplier.id, name: d.supplier.name }
          : null,
      })),
      charts: {
        suppliersByMonth, // {month: 'YYYY-MM', count}
        productsByCategory, // {category, count}
        suppliersByNation, // {country, count}
      },
      topSuppliers,
    });
  } catch (err) {
    console.error("GET /api/admin/dashboard error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
