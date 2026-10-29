import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { requireSupplier } from "@/lib/auth-guard";
import { shopSlug } from "@/lib/seller-registration-policy";
export async function POST(req: Request) {
  const session = await requireSupplier().catch(() => null);
  if (!session?.user?.id)
    return NextResponse.json({ available: false }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.username !== "string" || body.username.length > 200)
    return NextResponse.json({ available: false }, { status: 400 });
  const own = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
    select: { username: true, registration: { select: { id: true } } },
  });
  if (!own) return NextResponse.json({ available: false }, { status: 403 });
  if (body.username === own.username)
    return NextResponse.json({ available: true });
  if (own.registration || !shopSlug.safeParse(body.username).success)
    return NextResponse.json({ available: false });
  const existing = await prisma.supplier.findUnique({
    where: { username: body.username },
    select: { id: true },
  });
  return NextResponse.json({ available: !existing });
}
