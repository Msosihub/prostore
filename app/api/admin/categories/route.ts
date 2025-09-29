// /app/api/admin/categories/route.ts - API route for managing categories GET (list) + POST (create)
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      subcategories: { orderBy: { sortOrder: "asc" } },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name_en, name_sw, description, image, sortOrder } = body;

  if (!name_en)
    return NextResponse.json({ error: "name_en required" }, { status: 400 });

  try {
    const created = await prisma.category.create({
      data: {
        name_en,
        name_sw: name_sw ?? name_en,
        description: description ?? "",
        image: image ?? null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });
    return NextResponse.json(created);
  } catch (err: unknown) {
    console.error("Create category error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Category name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
