// /app/api/admin/categories/[id]/subcategories/[subId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { subId } = await params;
  const body = await req.json().catch(() => ({}));
  const { name_en, name_sw, description, image, sortOrder } = body;

  try {
    const updated = await prisma.subcategory.update({
      where: { id: subId },
      data: {
        name_en,
        name_sw,
        description,
        image,
        sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update subcategory error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { subId } = await params;

  try {
    // prevent deleting if products exist under subcategory
    const count = await prisma.product.count({
      where: { subcategoryId: subId },
    });
    if (count > 0) {
      return NextResponse.json(
        { error: "Cannot delete: has products" },
        { status: 400 }
      );
    }
    await prisma.subcategory.delete({ where: { id: subId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete subcategory error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
