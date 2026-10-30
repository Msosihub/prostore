import { requireAdmin } from "@/lib/auth-guard";
// app/api/admin/banners/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin().catch(() => null)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id } = await params;
  const banner = await prisma.banner.update({
    where: { id: id },
    data: {
      image: body.image,
      title: body.title,
      subtitle: body.subtitle,
      category: body.category,
      text: body.text,
      link: body.link,
      type: body.type,
      mode: body.mode,
      data: body.data,
      isActive: body.isActive, // ✅ NEW
    },
  });
  return NextResponse.json(banner);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin().catch(() => null)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.banner.delete({ where: { id: id } });
  return NextResponse.json({ success: true });
}
