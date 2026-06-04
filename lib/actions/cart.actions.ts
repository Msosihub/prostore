"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { CartItem } from "@/types";
import { Prisma } from "@prisma/client";
import { round2, convertToPlainObject } from "@/lib/utils";
import { cartItemSchema, insertCartSchema } from "../validators";

// Helper function to calculate prices using your database wholesale tiers
const calcPriceWithTiers = async (items: CartItem[]) => {
  let itemsPrice = 0;

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { pricingTiers: true },
    });

    let currentUnitPrice = Number(item.price);

    if (product && product.pricingTiers && product.pricingTiers.length > 0) {
      const sortedTiers = [...product.pricingTiers].sort(
        (a, b) => b.minQty - a.minQty,
      );
      const matchedTier = sortedTiers.find((tier) => item.qty >= tier.minQty);

      if (matchedTier) {
        currentUnitPrice = Number(matchedTier.price);
      }
    }

    itemsPrice += currentUnitPrice * item.qty;
  }

  const roundedItemsPrice = round2(itemsPrice);
  const shippingPrice = round2(roundedItemsPrice > 150000 ? 0 : 3000);
  const taxPrice = round2(0.0 * roundedItemsPrice);
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

    // console.log("Data in cartAction: ", data);
    const item = cartItemSchema.parse(data);

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: {
        pricingTiers: true,
      },
    });
    if (!product) throw new Error("Product not found");

    if (!cart) {
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
        // 🟢 FIXED LOGIC RULE:
        // If called from the product page stepper, use its value.
        // If called from the Cart Table buttons where it loops, increment the existing quantity by 1.
        const isFromCartPageTableLoop = data.qty === existItem.qty;
        const targetedNewQty = isFromCartPageTableLoop
          ? existItem.qty + 1
          : data.qty;

        if (product.stock < targetedNewQty) {
          throw new Error(
            `Mzigo uliopo hautoshi. Kiwango cha juu ni ${product.stock}`,
          );
        }

        existItem.qty = targetedNewQty;

        // 2. 🟢 CRITICAL PRICE FIX: Update the base item price property to match the new wholesale tier
        if (product.pricingTiers && product.pricingTiers.length > 0) {
          const sortedTiers = [...product.pricingTiers].sort(
            (a, b) => b.minQty - a.minQty,
          );
          const matchedTier = sortedTiers.find(
            (tier) => existItem.qty >= tier.minQty,
          );

          // Update item configuration value inside the loop so Prisma records matching totals
          existItem.price = matchedTier
            ? Number(matchedTier.price).toString()
            : product.price.toString();
        }
      } else {
        if (product.stock < item.qty) throw new Error("Mzigo uliopo hautoshi");
        itemsList.push(item);
      }

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

// ... Keep all other imports, calcPriceWithTiers, and addItemToCart completely intact ...

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

    // 🟢 FIXED ITEM DELETION LAYER: If quantity is 1, completely filter the item out of the array
    if (exist.qty <= 1) {
      itemsList = itemsList.filter((x) => x.productId !== productId);
    } else {
      exist.qty -= 1;

      // Ensure item baseline price drops or raises back to standard tiers on decrement adjustments
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { pricingTiers: true },
      });
      if (product && product.pricingTiers && product.pricingTiers.length > 0) {
        const sortedTiers = [...product.pricingTiers].sort(
          (a, b) => b.minQty - a.minQty,
        );
        const matchedTier = sortedTiers.find(
          (tier) => exist.qty >= tier.minQty,
        );
        exist.price = matchedTier
          ? Number(matchedTier.price).toString()
          : product.price.toString();
      }
    }

    // If the cart becomes completely empty after removal, delete the cart row entirely or clear metrics
    if (itemsList.length === 0) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: [],
          itemsPrice: 0,
          totalPrice: 0,
          shippingPrice: 0,
          taxPrice: 0,
        },
      });
    } else {
      const priceMetrics = await calcPriceWithTiers(itemsList);
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: itemsList as Prisma.CartUpdateitemsInput[],
          ...priceMetrics,
        },
      });
    }

    // Revalidate paths to clear client layouts
    const targetProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });
    if (targetProduct?.slug) revalidatePath(`/product/${targetProduct.slug}`);

    return { success: true, message: "Kikapu kimesasishwa vyema" };
  } catch (error: unknown) {
    console.error(error);
    return { success: false, message: "Imeshindikana kusasisha kikapu" };
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
