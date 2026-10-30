import { createHash } from "node:crypto";
import { z } from "zod";
import { catalogLaunchPlan } from "./catalog-launch";
import { publicShopText } from "./seller-registration-policy";
const id = z.string().uuid();
const media = z
  .string()
  .max(2000)
  .refine((value) => {
    if (/^\/(?!\/)/.test(value)) return !/[\\\x00-\x1f]/.test(value);
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  })
  .nullable();
const envelope = z
  .object({
    version: z.literal(1),
    priorTransactionsAreTrials: z.literal(true),
    preserveSourceDatabase: z.literal(true),
    catalog: z.unknown(),
    suppliers: z
      .array(
        z
          .object({
            id,
            sourceUserId: id,
            targetUserId: id,
            ownershipReviewed: z.literal(true),
            name: publicShopText(100).pipe(z.string().min(2)),
            companyName: publicShopText(100).nullable(),
            // Legacy safe identifiers retain the existing supplier-ID URL fallback.
            username: z
              .string()
              .regex(/^[A-Za-z0-9_-]{1,100}$/)
              .nullable(),
            about: publicShopText(2000).nullable(),
            tagLine: publicShopText(300).nullable(),
            logo: media,
            bannerUrl: media,
            createdAt: z.string().datetime(),
          })
          .strict(),
      )
      .min(1)
      .max(10000),
  })
  .strict();

// Pure plan. Account ownership must be independently reviewed; no credential,
// role grant, phone verification or supplier approval is manufactured here.
export function supplierCatalogTransferPlan(input: unknown) {
  const data = envelope.parse(input);
  const catalog = catalogLaunchPlan(data.catalog);
  const unique = (values: string[]) => {
    if (new Set(values).size !== values.length)
      throw Error("Duplicate seller identity");
  };
  unique(data.suppliers.map((s) => s.id));
  unique(data.suppliers.map((s) => s.sourceUserId));
  unique(data.suppliers.map((s) => s.targetUserId));
  unique(data.suppliers.flatMap((s) => (s.username ? [s.username] : [])));
  const bindings = new Map(
    catalog.data.suppliers.map((s) => [s.sourceId, s.targetId]),
  );
  if (
    bindings.size !== data.suppliers.length ||
    data.suppliers.some((s) => bindings.get(s.id) !== s.id)
  )
    throw Error("Supplier IDs and public shop URLs must be preserved");
  return {
    catalog,
    suppliers: data.suppliers,
    digest: createHash("sha256")
      .update(
        JSON.stringify({
          catalogDigest: catalog.digest,
          suppliers: data.suppliers,
        }),
      )
      .digest("hex"),
    productionExecutionEnabled: false as const,
  };
}

const rows = z.array(z.record(z.unknown())).max(100000);
const snapshotSchema = z
  .object({
    version: z.literal(1),
    status: z.literal("SOURCE_SNAPSHOT_NOT_REVIEWED"),
    capturedAt: z.string(),
    suppliers: rows,
    brands: rows,
    categories: rows,
    subcategories: rows,
    products: rows,
    tiers: rows,
    variants: rows,
  })
  .strict();
export function decodeSupplierCatalogSnapshot(input: unknown) {
  // Neon SQL Editor downloads one result row with the json value encoded as
  // text. Accept exactly that envelope, never concatenate rows or drop columns.
  let value = input;
  if (Array.isArray(value)) {
    const rows = z
      .array(
        z
          .object({
            supplier_catalog_snapshot: z.union([
              z.string().max(16 * 1024 * 1024),
              z.record(z.unknown()),
            ]),
          })
          .strict(),
      )
      .length(1)
      .parse(value);
    value = rows[0].supplier_catalog_snapshot;
    if (typeof value === "string") value = JSON.parse(value);
  }
  return snapshotSchema.parse(value);
}
export function supplierSnapshotDigest(snapshot: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(decodeSupplierCatalogSnapshot(snapshot)))
    .digest("hex");
}
export function prepareSupplierCatalogTransfer(
  snapshotInput: unknown,
  reviewInput: unknown,
) {
  const snapshot = decodeSupplierCatalogSnapshot(snapshotInput);
  const review = z
    .object({
      version: z.literal(1),
      snapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
      priorTransactionsAreTrials: z.literal(true),
      preserveSourceDatabase: z.literal(true),
      completenessReviewed: z.literal(true),
      categoryCorrections: z
        .array(
          z
            .object({
              productId: id,
              categoryId: id,
              subcategoryId: id,
              reviewed: z.literal(true),
            })
            .strict(),
        )
        .max(10000)
        .default([]),
      accounts: z
        .array(
          z
            .object({
              sourceUserId: id,
              targetUserId: id,
              ownershipReviewed: z.literal(true),
            })
            .strict(),
        )
        .max(10000),
      stock: z
        .array(
          z
            .object({
              kind: z.enum(["product", "variant"]),
              id,
              openingStock: z.number().int().min(0).max(2147483647),
              stockReviewed: z.literal(true),
            })
            .strict(),
        )
        .max(110000),
    })
    .strict()
    .parse(reviewInput);
  if (review.snapshotDigest !== supplierSnapshotDigest(snapshot))
    throw Error("Source snapshot changed");
  const productIds = new Set(snapshot.products.map((p) => p.id));
  const corrections = new Map(
    review.categoryCorrections.map((c) => [c.productId, c]),
  );
  if (
    corrections.size !== review.categoryCorrections.length ||
    [...corrections.keys()].some((id) => !productIds.has(id))
  )
    throw Error("Invalid category correction review");
  const accounts = new Map(review.accounts.map((a) => [a.sourceUserId, a]));
  const stock = new Map(review.stock.map((s) => [`${s.kind}:${s.id}`, s]));
  if (
    accounts.size !== review.accounts.length ||
    accounts.size !== snapshot.suppliers.length ||
    stock.size !== review.stock.length ||
    stock.size !== snapshot.products.length + snapshot.variants.length
  )
    throw Error("Review inventory mismatch");
  const date = (value: unknown) => {
    if (
      typeof value !== "string" ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))
    )
      throw Error("Invalid snapshot date");
    return new Date(value).toISOString();
  };
  date(snapshot.capturedAt);
  const inventory = (
    kind: "product" | "variant",
    row: Record<string, unknown>,
  ) => {
    const reviewed = stock.get(`${kind}:${row.id}`);
    if (!reviewed) throw Error("Opening stock review missing");
    const { sourceStockSnapshot, ...rest } = row;
    z.number().int().parse(sourceStockSnapshot); // No automatic reversal of trial deductions.
    return {
      ...rest,
      openingStock: reviewed.openingStock,
      stockReviewed: true,
      ...(kind === "product"
        ? {
            createdAt: date(rest.createdAt),
            ...(corrections.has(String(row.id))
              ? {
                  categoryId: corrections.get(String(row.id))!.categoryId,
                  subcategoryId: corrections.get(String(row.id))!.subcategoryId,
                }
              : {}),
          }
        : {}),
    };
  };
  const input = {
    version: 1,
    priorTransactionsAreTrials: true,
    preserveSourceDatabase: true,
    catalog: {
      version: 1,
      historicalObligationsRetained: true,
      catalogCompletenessReviewed: true,
      legacyStockCommitmentsReviewed: true,
      brands: snapshot.brands,
      categories: snapshot.categories,
      subcategories: snapshot.subcategories,
      suppliers: snapshot.suppliers.map((s) => ({
        sourceId: s.id,
        targetId: s.id,
        ownershipReviewed: true,
      })),
      products: snapshot.products.map((r) => inventory("product", r)),
      tiers: snapshot.tiers,
      variants: snapshot.variants.map((r) => inventory("variant", r)),
    },
    suppliers: snapshot.suppliers.map((s) => {
      const binding = accounts.get(String(s.sourceUserId));
      if (!binding) throw Error("Account ownership review missing");
      return {
        ...s,
        targetUserId: binding.targetUserId,
        ownershipReviewed: true,
        createdAt: date(s.createdAt),
      };
    }),
  };
  return { input, plan: supplierCatalogTransferPlan(input) };
}
