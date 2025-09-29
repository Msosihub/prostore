// /app/api/admin/supplier-docs/route.ts
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * GET /api/admin/supplier-docs?verified=false
 * - Only accessible to ADMIN users.
 * - Query: verified = true|false|all (default: false => list pending)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const verifiedParam = url.searchParams.get("verified") ?? "false";

  //   const where: Record<string, any> = {};
  const where: Prisma.SupplierDocumentWhereInput = {};

  if (verifiedParam === "true") where.verified = true;
  else if (verifiedParam === "false") where.verified = false;
  // else if verifiedParam === "all" -> no filter

  const docs = await prisma.supplierDocument.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    include: {
      // include supplier basic info to display
      supplier: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          isVerified: true,
        },
      },
    },
    take: 200, // safety cap
  });

  return NextResponse.json(docs);
}
