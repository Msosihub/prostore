import { z } from "zod";
import { createHash } from "node:crypto";
const id = z.string().uuid();
const text = z.string().max(20000);
const money = z
  .string()
  .regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/)
  .refine((v) => Number(v) > 0);
const manifest = z
  .object({
    version: z.literal(1),
    historicalObligationsRetained: z.literal(true),
    catalogCompletenessReviewed: z.literal(true),
    legacyStockCommitmentsReviewed: z.literal(true),
    brands: z
      .array(
        z
          .object({
            id,
            name: text,
            description: text.nullable(),
            image: text.nullable(),
          })
          .strict(),
      )
      .max(10000),
    categories: z
      .array(
        z
          .object({
            id,
            name_en: text,
            name_sw: text,
            image: text.nullable(),
            description: text,
            parentId: id.nullable(),
            sortOrder: z.number().int(),
          })
          .strict(),
      )
      .max(10000),
    subcategories: z
      .array(
        z
          .object({
            id,
            name_en: text,
            name_sw: text,
            categoryId: id,
            image: text.nullable(),
            description: text.nullable(),
            sortOrder: z.number().int(),
          })
          .strict(),
      )
      .max(10000),
    suppliers: z
      .array(
        z
          .object({
            sourceId: id,
            targetId: id,
            ownershipReviewed: z.literal(true),
          })
          .strict(),
      )
      .max(10000),
    products: z
      .array(
        z
          .object({
            id,
            name: text,
            slug: z.string().min(1).max(500),
            description: text,
            images: z.array(text).max(100),
            banner: text.nullable(),
            price: money,
            color: text.nullable(),
            size: text.nullable(),
            supplierId: id,
            isFeatured: z.boolean(),
            createdAt: z.string().datetime(),
            brandId: id,
            categoryId: id,
            subcategoryId: id,
            thumbnail: text.nullable(),
            tags: z.array(text).max(100),
            videoUrl: text.nullable(),
            openingStock: z.number().int().min(0).max(2147483647),
            stockReviewed: z.literal(true),
          })
          .strict(),
      )
      .min(1)
      .max(10000),
    variants: z
      .array(
        z
          .object({
            id,
            productId: id,
            sku: text.nullable(),
            name: text,
            price: money,
            openingStock: z.number().int().min(0).max(2147483647),
            stockReviewed: z.literal(true),
            image: text.nullable(),
          })
          .strict(),
      )
      .max(100000),
    tiers: z
      .array(
        z
          .object({
            id,
            productId: id,
            minQty: z.number().int().positive(),
            price: money,
          })
          .strict(),
      )
      .max(100000),
  })
  .strict();
export function catalogLaunchPlan(input: unknown) {
  const data = manifest.parse(input);
  const unique = (values: string[]) => {
    if (new Set(values).size !== values.length)
      throw Error("Duplicate catalog identity");
  };
  for (const rows of [
    data.brands,
    data.categories,
    data.subcategories,
    data.products,
    data.tiers,
    data.variants,
  ])
    unique(rows.map((r) => r.id));
  unique(data.variants.filter((v) => v.sku !== null).map((v) => v.sku!));
  unique(data.products.map((p) => p.slug));
  unique(data.suppliers.map((s) => s.sourceId));
  unique(data.suppliers.map((s) => s.targetId));
  unique(data.tiers.map((t) => `${t.productId}:${t.minQty}`));
  const brands = new Set(data.brands.map((r) => r.id)),
    categories = new Set(data.categories.map((r) => r.id));
  const subcategories = new Map(
    data.subcategories.map((r) => [r.id, r.categoryId]),
  );
  const suppliers = new Map(
    data.suppliers.map((r) => [r.sourceId, r.targetId]),
  );
  const products = new Set(data.products.map((r) => r.id));
  for (const c of data.categories)
    if (c.parentId && (!categories.has(c.parentId) || c.parentId === c.id))
      throw Error("Invalid category parent");
  for (const c of data.categories) {
    const seen = new Set<string>();
    let current: typeof c | undefined = c;
    while (current) {
      if (seen.has(current.id)) throw Error("Category cycle");
      seen.add(current.id);
      current = data.categories.find((x) => x.id === current!.parentId);
    }
  }
  for (const c of data.subcategories)
    if (!categories.has(c.categoryId))
      throw Error("Missing category dependency");
  for (const p of data.products)
    if (
      !brands.has(p.brandId) ||
      !categories.has(p.categoryId) ||
      subcategories.get(p.subcategoryId) !== p.categoryId ||
      !suppliers.has(p.supplierId)
    )
      throw Error("Missing catalog dependency");
  for (const v of data.variants)
    if (!products.has(v.productId)) throw Error("Missing variant product");
  for (const t of data.tiers)
    if (!products.has(t.productId)) throw Error("Missing tier product");
  return {
    data,
    digest: createHash("sha256").update(JSON.stringify(data)).digest("hex"),
  };
}
