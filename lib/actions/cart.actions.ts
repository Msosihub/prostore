"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { CartItem } from "@/types";
import { Prisma } from "@prisma/client";
import { cartItemSchema, insertCartSchema } from "../validators";
import { round2, convertToPlainObject } from "../utils";

// 🟢 NEW: Calculate prices dynamically by mapping items to their matching wholesale tiers
const calcPriceWithTiers = async (items: CartItem[]) => {
  let itemsPrice = 0;

  for (const item of items) {
    // 1. Fetch live product configurations containing pricing tiers
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { pricingTiers: true },
    });

    let currentUnitPrice = Number(item.price);

    if (product && product.pricingTiers && product.pricingTiers.length > 0) {
      // 2. Sort tiers descending to find the highest matching threshold met by the quantity
      const sortedTiers = [...product.pricingTiers].sort(
        (a, b) => b.minQty - a.minQty
      );
      const matchedTier = sortedTiers.find((tier) => item.qty >= tier.minQty);

      if (matchedTier) {
        currentUnitPrice = Number(matchedTier.price);
      }
    }

    itemsPrice += currentUnitPrice * item.qty;
  }

  // Calculate taxes, shipping fees, and final grand total metrics
  const roundedItemsPrice = round2(itemsPrice);
  const shippingPrice = round2(roundedItemsPrice > 150000 ? 0 : 3000); // TZS localized scale
  const taxPrice = round2(0.0 * roundedItemsPrice); // Adjusted down or kept per regional taxation code
  const totalPrice = round2(roundedItemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: roundedItemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

export async function addItemToCart(data: CartItem) {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Session cart ID not found");

    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    const cart = await prisma.cart.findFirst({
      where: {
        ...(userId ? { userId } : { sessionCartId }),
        isBuyNow: false,
      },
    });

    const item = cartItemSchema.parse(data);

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product) throw new Error("Product not found");

    if (!cart) {
      // Calculate tiered pricing totals for a new cart item
      const priceMetrics = await calcPriceWithTiers([item]);

      const newCart = insertCartSchema.parse({
        userId,
        items: [item],
        sessionCartId,
        isBuyNow: false,
        ...priceMetrics,
      });

      await prisma.cart.create({ data: newCart });
    } else {
      const itemsList = cart.items as CartItem[];
      const existItem = itemsList.find((x) => x.productId === item.productId);

      if (existItem) {
        // 🟢 FIX: Overwrite quantity if explicitly passed from input stepper, else increment by 1
        const targetedNewQty = data.qty > 1 ? data.qty : existItem.qty + 1;

        if (product.stock < targetedNewQty) {
          throw new Error(
            `Mzigo uliopo hautoshi. Kiwango cha juu ni ${product.stock}`
          );
        }

        existItem.qty = targetedNewQty;
      } else {
        if (product.stock < item.qty) throw new Error("Mzigo uliopo hautoshi");
        itemsList.push(item);
      }

      // Re-calculate dynamic wholesale prices across all cart items
      const priceMetrics = await calcPriceWithTiers(itemsList);

      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: itemsList as Prisma.CartUpdateitemsInput[],
          ...priceMetrics,
        },
      });
    }

    revalidatePath(`/product/${product.slug}`);
    return { success: true, message: "Kikapu kimesasishwa vyema" };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message: error || "Imeshindikana kusasisha kikapu",
    };
  }
}

export async function removeItemFromCart(productId: string) {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Session context missing");

    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    const cart = await prisma.cart.findFirst({
      where: {
        ...(userId ? { userId } : { sessionCartId }),
        isBuyNow: false,
      },
    });
    if (!cart) throw new Error("Cart not found");

    let itemsList = cart.items as CartItem[];
    const exist = itemsList.find((x) => x.productId === productId);
    if (!exist) throw new Error("Item not found");

    if (exist.qty <= 1) {
      itemsList = itemsList.filter((x) => x.productId !== productId);
    } else {
      exist.qty -= 1;
    }

    const priceMetrics = await calcPriceWithTiers(itemsList);

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: itemsList as Prisma.CartUpdateitemsInput[],
        ...priceMetrics,
      },
    });

    return { success: true, message: "Bidhaa imetolewa kikapuni" };
  } catch (error: unknown) {
    return {
      success: false,
      message: error || "Imeshindikana kutoa bidhaa",
    };
  }
}

export async function getMyCart({
  isBuyNow = false,
}: { isBuyNow?: boolean } = {}) {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) return undefined;

    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    const cart = await prisma.cart.findFirst({
      where: {
        ...(userId ? { userId } : { sessionCartId }),
        isBuyNow,
      },
    });

    if (!cart) return undefined;

    return convertToPlainObject({
      ...cart,
      items: cart.items as CartItem[],
    });
  } catch (error) {
    console.error("Error fetching cart data:", error);
    return undefined;
  }
}
