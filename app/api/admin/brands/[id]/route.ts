import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const data = await req.json();
  const { id } = await params;
  const brand = await prisma.brand.update({ where: { id: id }, data });
  return NextResponse.json(brand);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.brand.delete({ where: { id: id } });
  return NextResponse.json({ success: true });
}
