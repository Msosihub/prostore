// This action updates the JSON shippingAddress metadata stored within that specific order record in your database
"use server";

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { shippingAddressSchema } from "@/lib/validators";
import { ShippingAddress } from "@/types";

export async function updateOrderShippingAddress(
  orderId: string,
  rawAddressData: unknown
) {
  try {
    const session = await auth();
    if (!session) throw new Error("Mtumiaji hajaingia kwenye mfumo.");

    // Validate incoming parameters using your existing address Zod validation criteria
    const validatedAddress = shippingAddressSchema.parse(rawAddressData);

    // Update the JSON column properties specifically on this single target order record row
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingAddress: validatedAddress as ShippingAddress,
      },
    });

    revalidatePath(`/order/${orderId}`);
    return { success: true, message: "Taarifa za agizo zimesasishwa vyema!" };
  } catch (error: unknown) {
    console.error("Order adjustment crash encountered:", error);
    return {
      success: false,
      message: "Imeshindikana kusasisha taarifa za agizo.",
    };
  }
}
