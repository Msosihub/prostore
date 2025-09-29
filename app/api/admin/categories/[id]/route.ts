// /app/api/admin/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";

export async function PUT(
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

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name_en,
        name_sw,
        description,
        image,
        sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("Update category error:", err);
    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message ?? "Failed to update" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = params;

  try {
    // Prevent deleting categories that still have subcategories or products
    const counts = await prisma.$transaction([
      prisma.subcategory.count({ where: { categoryId: id } }),
      prisma.product.count({ where: { categoryId: id } }),
    ]);
    if (counts[0] > 0 || counts[1] > 0) {
      return NextResponse.json(
        { error: "Cannot delete: has subcategories or products" },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete category error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
