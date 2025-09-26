import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

type IncomingPolicy = {
  type: string;
  content: string;
  customLabel?: string;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
    include: {
      SupplierPolicy: true, // ✅ include policies
    },
  });
  console.log("Supplier:", supplier);

  return NextResponse.json(supplier);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  console.log("Request body:", body);
  const {
    username,
    name,
    email,
    phone,
    about,
    tagLine,
    banner,
    logo,
    gallery,
    businessHours,
    // ❌ exclude policies and other non-Supplier fields
  } = body;

  try {
    const supplier = await prisma.$transaction(async (tx) => {
      const updatedSupplier = await tx.supplier.update({
        where: { userId: session.user.id },
        data: {
          username,
          name,
          email,
          phone,
          about,
          tagLine,
          bannerUrl: banner,
          logo,
          gallery,
          businessHours,
        },
      });

      // Delete old policies
      await tx.supplierPolicy.deleteMany({
        where: { supplierId: updatedSupplier.id },
      });

      // Create new policies
      if (Array.isArray(body.policies)) {
        await tx.supplierPolicy.createMany({
          data: (body.policies as IncomingPolicy[]).map((p) => ({
            supplierId: updatedSupplier.id,
            type: p.type,
            content: p.content,
            additionalInfo: p.customLabel
              ? { label: p.customLabel }
              : undefined,
          })),
        });
      }

      return updatedSupplier;
    });
    console.log("Updated supplier:", supplier);

    return NextResponse.json(supplier);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update" }, { status: 400 });
  }
}
