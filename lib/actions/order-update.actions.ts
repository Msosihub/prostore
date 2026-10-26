// This action updates the JSON shippingAddress metadata stored within that specific order record in your database
"use server";

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { shippingAddressSchema } from "@/lib/validators";
import { ShippingAddress } from "@/types";

export async function updateOrderShippingAddress(
  orderId: string,
  rawAddressData: unknown,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Mtumiaji hajaingia kwenye mfumo.");

    // Validate incoming parameters using your existing address Zod validation criteria
    const validatedAddress = shippingAddressSchema.parse(rawAddressData);

    // Update the JSON column properties specifically on this single target order record row
    const updated = await prisma.order.updateMany({
      where: {
        id: orderId,
        userId: session.user.id,
        isPaid: false,
        isDelivered: false,
      },
      data: {
        shippingAddress: validatedAddress as ShippingAddress,
      },
    });

    if (!updated.count) throw new Error("Order cannot be updated");
    revalidatePath(`/order/${orderId}`);
    return { success: true, message: "Taarifa za agizo zimesasishwa vyema!" };
  } catch {
    return {
      success: false,
      message: "Imeshindikana kusasisha taarifa za agizo.",
    };
  }
}
