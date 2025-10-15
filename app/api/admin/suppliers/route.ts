// app/api/admin/suppliers/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/admin/suppliers
 * Query params:
 *  - page (default 1)
 *  - pageSize (default 25)
 *  - q (search - name/username/email)
 *  - isVerified (true|false)
 *  - nation
 */
export async function GET(req: Request) {
  // console.log("GET /api/admin/suppliers called");

  const session = await auth();
  //role
  //   console.log("Authenticating user...", session);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    // console.log("Parsed URL:", url);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(url.searchParams.get("pageSize") || "25", 10), 1),
      200
    );
    const q = (url.searchParams.get("q") || "").trim();
    const isVerifiedParam = url.searchParams.get("isVerified");
    const nation = url.searchParams.get("nation") || undefined;

    const where: Prisma.SupplierWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    if (typeof isVerifiedParam === "string") {
      if (isVerifiedParam === "true") where.isVerified = true;
      else if (isVerifiedParam === "false") where.isVerified = false;
    }

    if (nation) where.nation = { equals: nation, mode: "insensitive" };

    // count + page
    const [total, items] = await prisma.$transaction([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          SupplierDocument: { take: 1, orderBy: { uploadedAt: "desc" } }, // preview
        },
      }),
    ]);

    // Return list with minimal fields
    const data = items.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.name,
      username: s.username,
      email: s.email,
      phone: s.phone,
      about: s.about,
      responseTime: s.responseTime,
      companyName: s.companyName,
      nation: s.nation,
      location: s.location,
      isVerified: s.isVerified,
      yearsActive: s.yearsActive,
      rating: s.rating,
      logo: s.logo,
      banner: s.banner,
      latestDocument: s.SupplierDocument?.[0]
        ? {
            id: s.SupplierDocument[0].id,
            label: s.SupplierDocument[0].label,
            uploadedAt: s.SupplierDocument[0].uploadedAt,
          }
        : null,
    }));
    // console.log("Responding with data:", { total, page, pageSize, data });

    return NextResponse.json({ total, page, pageSize, data });
  } catch (err: unknown) {
    console.error("GET /api/admin/suppliers error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: POST to create supplier via admin (rare). If you don't want this, remove or restrict.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { name, username, email, companyName } = body;
    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email required" },
        { status: 400 }
      );
    }
    const created = await prisma.supplier.create({
      data: {
        name,
        username: username || undefined,
        email,
        companyName: companyName || undefined,
        user: {
          // Create linked user for supplier if needed
          create: {
            name,
            email,
            role: "SUPPLIER",
          },
        },
      },
      include: { user: true },
    });
    return NextResponse.json(created);
  } catch (err: unknown) {
    console.error("POST /api/admin/suppliers error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed" },
      { status: 500 }
    );
  }
}
