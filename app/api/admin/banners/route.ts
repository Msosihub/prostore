// app/api/admin/banners/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function GET() {
  const banners = await prisma.banner.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(banners);
}

export async function POST(req: Request) {
  const body = await req.json();
  const banner = await prisma.banner.create({
    data: {
      image: body.image,
      title: body.title,
      subtitle: body.subtitle,
      text: body.text,
      link: body.link,
      type: body.type,
      mode: body.mode || "MANUAL",
      data: body.data || {},
      isActive: body.isActive ?? false, // ✅ NEW
    },
  });
  return NextResponse.json(banner);
}
