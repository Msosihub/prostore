import "server-only";
import { prisma } from "@/db/prisma";
import { calcPriceWithTiers } from "@/lib/cart-pricing";
import type { CartItem } from "@/types";

// The existing Buy Now URL calls its slug parameter productId.
// Resolve it to the database ID before using the same quote as cart checkout.
export async function getBuyNowQuote(slug: string, qty: number) {
  if (
    typeof slug !== "string" ||
    !slug.trim() ||
    !Number.isSafeInteger(qty) ||
    qty < 1
  )
    throw new Error("Invalid product or quantity");
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!product) throw new Error("Product not found");
  const items = [{ productId: product.id, qty } as CartItem];
  const totals = await calcPriceWithTiers(items);
  return { items, ...totals };
}
