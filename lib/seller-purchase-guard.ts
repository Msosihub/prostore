import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { visibleSeller } from "@/lib/catalog-visibility";
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
// Share application review's lock. Existing orders remain fulfillable; this only
// gates new purchases, in deterministic order for multi-seller checkouts.
export async function lockPurchasableSellers(
  tx: Tx,
  supplierIds: (string | undefined)[],
) {
  if (supplierIds.some((id) => typeof id !== "string" || !id))
    throw new Error("Supplier unavailable");
  const ids = [...new Set(supplierIds as string[])].sort();
  if (!ids.length) throw new Error("Supplier unavailable");
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Supplier" WHERE "id" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR UPDATE`,
  );
  const count = await tx.supplier.count({
    where: { id: { in: ids }, ...visibleSeller },
  });
  if (count !== ids.length)
    throw new Error("Supplier unavailable. Refresh your cart.");
}
