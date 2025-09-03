import { prisma } from "@/db/prisma";
import { NextResponse } from "next/server";

export default async function getSupplier(supplierId: string) {
  let supplier;
  try {
    supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        products: {
          where: { isFeatured: true },
          take: 6, // limit to avoid overload
        },
      },
    });
    return supplier;
  } catch (error) {
    throw NextResponse.json(error);
  }
}
