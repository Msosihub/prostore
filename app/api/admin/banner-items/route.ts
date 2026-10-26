import { requireAdmin } from "@/lib/auth-guard";
// app/api/admin/banner-items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function POST(req: Request) {
  if (!await requireAdmin().catch(() => null)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const item = await prisma.bannerItem.create({ data: body });
  return NextResponse.json(item);
}
