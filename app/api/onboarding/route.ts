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

  await prisma.$transaction(async (tx) => {
    // Update user
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        name,
        role,
        country,
        location,
      },
    });

    // If supplier → create supplier profile
    if (role === "SUPPLIER") {
      const existingSupplier = await tx.supplier.findUnique({
        where: { userId: session.user.id },
      });

      if (!existingSupplier) {
        await tx.supplier.create({
          data: {
            userId: session.user.id,
            name,
            email: session.user.email || `${session.user.id}@noemail.com`,
            country,
            location,
            companyName: name,
            yearsActive: 1,
            isVerified: false,
            rating: 0,
            deliveryRate: 0,
          },
        });
      }
    }
  });

  return NextResponse.json({ success: true });
}
