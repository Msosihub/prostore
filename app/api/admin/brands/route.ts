import { requireAdmin } from "@/lib/auth-guard";
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(brands);
}

export async function POST(req: Request) {
  if (!await requireAdmin().catch(() => null)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const brand = await prisma.brand.create({ data });
  return NextResponse.json(brand);
}
