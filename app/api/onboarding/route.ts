// /api/onboarding/route.ts

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const input = z
    .object({
      name: z.string().trim().min(1).max(200),
      role: z.enum(["BUYER", "SUPPLIER"]),
      country: z.string().max(100).optional(),
      location: z.string().max(200).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json(
      { success: false, message: "Invalid onboarding fields" },
      { status: 400 },
    );
  }
  const { name, role, country, location } = input.data;

  if (role === "SUPPLIER")
    return NextResponse.json(
      {
        success: false,
        message: "Complete your seller application at /sell.",
        redirectTo: "/sell",
      },
      { status: 409 },
    );
  const saved = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${session.user.id}::uuid FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role !== "BUYER") return false;
    await tx.user.update({
      where: { id: session.user.id },
      data: { name, country, location, onboarded: true },
    });
    return true;
  });
  if (!saved)
    return NextResponse.json(
      { success: false, message: "Use your existing account workspace." },
      { status: 403 },
    );

  return NextResponse.json({ success: true });
}
