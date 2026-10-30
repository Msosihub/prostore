import { z } from "zod";
import {
  decodeSupplierCatalogSnapshot,
  supplierSnapshotDigest,
} from "./supplier-catalog-transfer";
const id = z.string().uuid();

// Structural proposal, never an approval. Preserves the chosen subcategory and
// uses its existing parent; it cannot decide whether that subcategory is correct.
export function draftSupplierTransferReview(input: unknown) {
  const snapshot = decodeSupplierCatalogSnapshot(input);
  const categories = z
    .array(z.object({ id }).passthrough())
    .parse(snapshot.categories);
  const subcategories = z
    .array(z.object({ id, categoryId: id }).passthrough())
    .parse(snapshot.subcategories);
  const products = z
    .array(
      z
        .object({ id, categoryId: id, subcategoryId: id, supplierId: id })
        .passthrough(),
    )
    .parse(snapshot.products);
  const suppliers = z
    .array(z.object({ id, sourceUserId: id }).passthrough())
    .parse(snapshot.suppliers);
  const variants = z
    .array(z.object({ id, productId: id }).passthrough())
    .parse(snapshot.variants);
  const unique = (values: string[]) => {
    if (new Set(values).size !== values.length)
      throw Error("Ambiguous source identities");
  };
  for (const rows of [categories, subcategories, products, suppliers, variants])
    unique(rows.map((r) => r.id));
  unique(suppliers.map((s) => s.sourceUserId));
  const cats = new Set(categories.map((c) => c.id)),
    subs = new Map(subcategories.map((s) => [s.id, s.categoryId]));
  const sellers = new Set(suppliers.map((s) => s.id)),
    productIds = new Set(products.map((p) => p.id));
  if (
    subcategories.some((s) => !cats.has(s.categoryId)) ||
    products.some(
      (p) =>
        !cats.has(p.categoryId) ||
        !subs.has(p.subcategoryId) ||
        !sellers.has(p.supplierId),
    ) ||
    variants.some((v) => !productIds.has(v.productId))
  )
    throw Error("Source relationships require repair before drafting");
  const categoryCorrections = products
    .filter((p) => subs.get(p.subcategoryId) !== p.categoryId)
    .map((p) => ({
      productId: p.id,
      categoryId: subs.get(p.subcategoryId)!,
      subcategoryId: p.subcategoryId,
      reviewed: false,
    }));
  return {
    version: 1,
    snapshotDigest: supplierSnapshotDigest(snapshot),
    priorTransactionsAreTrials: true,
    preserveSourceDatabase: true,
    completenessReviewed: false,
    categoryCorrections,
    accounts: suppliers.map((s) => ({
      sourceUserId: s.sourceUserId,
      targetUserId: null,
      ownershipReviewed: false,
    })),
    stock: [
      ...products.map((p) => ({
        kind: "product",
        id: p.id,
        openingStock: null,
        stockReviewed: false,
      })),
      ...variants.map((v) => ({
        kind: "variant",
        id: v.id,
        openingStock: null,
        stockReviewed: false,
      })),
    ],
  };
}
