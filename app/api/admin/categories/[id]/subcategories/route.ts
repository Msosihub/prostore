// /app/api/admin/categories/[id]/subcategories/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params; // category id
  const subs = await prisma.subcategory.findMany({
    where: { categoryId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(subs);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const { name_en, name_sw, description, image, sortOrder } = body;
  if (!name_en)
    return NextResponse.json({ error: "name_en required" }, { status: 400 });

  try {
    const created = await prisma.subcategory.create({
      data: {
        name_en,
        name_sw: name_sw ?? name_en,
        description: description ?? "",
        image: image ?? null,
        categoryId: id,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });
    return NextResponse.json(created);
  } catch (err) {
    console.error("Create subcategory error:", err);
    return NextResponse.json(
      { error: "Failed to create subcategory" },
      { status: 500 }
    );
  }
}
