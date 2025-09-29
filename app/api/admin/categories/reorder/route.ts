// /app/api/admin/categories/reorder/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await req.json().catch(() => []);
  if (!Array.isArray(items))
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const tx = items.map((it: { id: string; sortOrder?: number }) =>
    prisma.category.update({
      where: { id: it.id },
      data: { sortOrder: it.sortOrder ?? 0 },
    })
  );

  try {
    await prisma.$transaction(tx);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reorder error:", err);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
