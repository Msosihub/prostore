// app/api/admin/banner-items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const item = await prisma.bannerItem.create({ data: body });
  return NextResponse.json(item);
}
