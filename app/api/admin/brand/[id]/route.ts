import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const data = await req.json();
  const brand = await prisma.brand.update({ where: { id: params.id }, data });
  return NextResponse.json(brand);
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  await prisma.brand.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
