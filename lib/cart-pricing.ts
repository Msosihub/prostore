import "server-only";
import { prisma } from "@/db/prisma";
import type { CartItem } from "@/types";
import { round2 } from "@/lib/utils";

// Helper function to calculate prices using your database wholesale tiers
export const calcPriceWithTiers = async (
  items: CartItem[],
  { forRemoval = false }: { forRemoval?: boolean } = {},
  db?: Pick<
    Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    "product"
  >,
) => {
  let itemsPrice = 0;

  for (const item of [...items]) {
    const args = {
      where: { id: item.productId },
      include: { pricingTiers: true as const },
    };
    const product = db
      ? await db.product.findUnique(args)
      : await prisma.product.findUnique(args);

    if (!product) {
      if (!forRemoval) throw new Error("Product not found");
      // Deleted catalog entries cannot be bought; let cart cleanup remove them.
      items.splice(items.indexOf(item), 1);
      continue;
    }
    if (
      !Number.isSafeInteger(item.qty) ||
      item.qty < 1 ||
      (!forRemoval && product.stock < item.qty)
    ) {
      throw new Error("Invalid quantity or insufficient stock");
    }
    let currentUnitPrice = Number(product.price);

    if (product && product.pricingTiers && product.pricingTiers.length > 0) {
      const sortedTiers = [...product.pricingTiers].sort(
        (a, b) => b.minQty - a.minQty,
      );
      const matchedTier = sortedTiers.find((tier) => item.qty >= tier.minQty);

      if (matchedTier) {
        currentUnitPrice = Number(matchedTier.price);
      }
    }

    item.price = currentUnitPrice.toString();
    item.supplierId = product.supplierId;
    item.name = product.name;
    item.slug = product.slug;
    item.image = product.images[0] || "";
    itemsPrice += currentUnitPrice * item.qty;
  }

  const roundedItemsPrice = round2(itemsPrice);
  const shippingPrice = round2(
    !items.length || roundedItemsPrice > 150000 ? 0 : 3000,
  );
  const taxPrice = round2(0.0 * roundedItemsPrice);
  const totalPrice = round2(roundedItemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: roundedItemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};
