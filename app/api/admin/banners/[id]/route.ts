// app/api/admin/banners/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const banner = await prisma.banner.update({
    where: { id: params.id },
    data: {
      image: body.image,
      title: body.title,
      subtitle: body.subtitle,
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
  { params }: { params: { id: string } }
) {
  await prisma.banner.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
