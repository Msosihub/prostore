import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { insertProductSchema, updateProductSchema } from "@/lib/validators";
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
export class CatalogError extends Error {}
async function actor(tx: Tx) {
  const session = await auth();
  if (!session?.user?.id) throw new CatalogError("Unauthorized");
  const user = await tx.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !["ADMIN", "SUPPLIER"].includes(user.role))
    throw new CatalogError("Unauthorized");
  const supplier =
    user.role === "SUPPLIER"
      ? await tx.supplier.findUnique({
          where: { userId: user.id },
          select: { id: true },
        })
      : null;
  if (user.role === "SUPPLIER" && !supplier)
    throw new CatalogError("Supplier profile required");
  return { user, supplier };
}
function checkPrice(data: z.infer<typeof insertProductSchema>) {
  const valid = (n: number) =>
    Number.isFinite(n) &&
    n > 0 &&
    n <= 9999999999.99 &&
    Math.abs(n * 100 - Math.round(n * 100)) < 0.0001;
  if (
    !valid(Number(data.price)) ||
    !Number.isSafeInteger(data.stock) ||
    data.stock < 0 ||
    data.stock > 2147483647 ||
    data.pricingTiers.length > 100 ||
    data.pricingTiers.some(
      (t) =>
        !Number.isSafeInteger(t.minQty) ||
        t.minQty < 1 ||
        t.minQty > 2147483647 ||
        !valid(t.price),
    ) ||
    new Set(data.pricingTiers.map((t) => t.minQty)).size !==
      data.pricingTiers.length
  )
    throw new CatalogError(
      "Check price, whole quantities and unique tier boundaries",
    );
}
async function relations(tx: Tx, data: z.infer<typeof insertProductSchema>) {
  const sub = await tx.subcategory.findUnique({
    where: { id: data.subcategoryId },
    select: { categoryId: true },
  });
  if (!sub || sub.categoryId !== data.categoryId)
    throw new CatalogError("Subcategory does not belong to selected category");
}
export async function writeCatalogProduct(input: unknown, updating: boolean) {
  return prisma.$transaction(async (tx) => {
    const current = await actor(tx);
    const parsed = (updating ? updateProductSchema : insertProductSchema).parse(
      input,
    );
    checkPrice(parsed);
    await relations(tx, parsed);
    const requestedSupplier = z.string().uuid().parse(parsed.supplierId);
    const supplierId = current.supplier?.id ?? requestedSupplier;
    if (current.supplier && requestedSupplier !== supplierId)
      throw new CatalogError("Supplier ownership cannot be changed");
    const target = await tx.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, user: { select: { role: true } } },
    });
    if (!target || target.user.role !== "SUPPLIER")
      throw new CatalogError("Active supplier required");
    const data = {
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      images: parsed.images,
      price: parsed.price,
      stock: parsed.stock,
      brandId: parsed.brandId,
      categoryId: parsed.categoryId,
      subcategoryId: parsed.subcategoryId,
      supplierId,
    };
    if (!updating)
      return tx.product.create({
        data: {
          ...data,
          tags: [],
          pricingTiers: { create: parsed.pricingTiers },
        },
      });
    const update = updateProductSchema.parse(input);
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${update.id}::uuid FOR UPDATE`;
    const existing = await tx.product.findUnique({
      where: { id: update.id },
      select: { supplierId: true, stock: true },
    });
    if (!existing || existing.supplierId !== supplierId)
      throw new CatalogError("Product unavailable or ownership mismatch");
    if (existing.stock !== update.expectedStock)
      throw new CatalogError("Stock changed. Reload the product before saving");
    // Row lock serializes edits and stock deductions; all tier changes roll back together.
    const result = await tx.product.update({ where: { id: update.id }, data });
    await tx.productPricing.deleteMany({ where: { productId: update.id } });
    await tx.productPricing.createMany({
      data: parsed.pricingTiers.map((t) => ({ ...t, productId: update.id })),
    });
    return result;
  });
}
export async function removeCatalogProduct(id: string) {
  z.string().uuid().parse(id);
  return prisma.$transaction(async (tx) => {
    const current = await actor(tx);
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id}::uuid FOR UPDATE`;
    const product = await tx.product.findUnique({
      where: { id },
      select: { supplierId: true },
    });
    if (
      !product ||
      (current.supplier && product.supplierId !== current.supplier.id)
    )
      throw new CatalogError("Product unavailable");
    // Referenced products remain protected by their foreign keys; no history is deleted.
    await tx.productPricing.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });
}
export async function readCatalogEditor(idOrSlug: string) {
  return prisma.$transaction(async (tx) => {
    const current = await actor(tx);
    return tx.product.findFirst({
      where: {
        ...(current.supplier ? { supplierId: current.supplier.id } : {}),
        OR: [
          { slug: idOrSlug },
          ...(z.string().uuid().safeParse(idOrSlug).success
            ? [{ id: idOrSlug }]
            : []),
        ],
      },
      include: { pricingTiers: true },
    });
  });
}
