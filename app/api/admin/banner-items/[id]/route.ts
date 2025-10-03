// app/api/admin/banner-items/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const item = await prisma.bannerItem.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  await prisma.bannerItem.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
