// app/api/admin/banner-items/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  // console.log("Body: ", body);
  const { id } = await params;
  const item = await prisma.bannerItem.update({
    where: { id: id },
    data: body,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.bannerItem.delete({ where: { id: id } });
  return NextResponse.json({ success: true });
}
