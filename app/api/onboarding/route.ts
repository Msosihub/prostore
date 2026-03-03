// /api/onboarding/route.ts

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { name, role, country, location } = body;

  if (!name || !role) {
    return NextResponse.json(
      { success: false, message: "Missing fields" },
      { status: 400 }
    );
  }

  console.log("THE BODY", body);

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
