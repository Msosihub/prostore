import { z } from "zod";
import { catalogLaunchPlan } from "./catalog-launch";
const id = z.string().uuid();
const count = z.number().int().min(0).max(2147483647);
const ids = z.array(id).max(100000);
const evidenceSchema = z
  .object({
    version: z.literal(1),
    manifestDigest: z.string().regex(/^[a-f0-9]{64}$/),
    // Private evidence labels only; no names, phones, passwords or documents.
    snapshotReference: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
    capturedAt: z.string().datetime(),
    catalogEditsFrozenForSnapshot: z.literal(true),
    sourceInventory: z
      .object({
        brands: ids,
        categories: ids,
        subcategories: ids,
        products: ids,
        tiers: ids,
        variants: ids,
        suppliers: ids,
      })
      .strict(),
    accounts: z
      .array(
        z
          .object({
            sourceId: id,
            targetId: id,
            targetUserId: id,
            ownershipVerified: z.literal(true),
            role: z.literal("SUPPLIER"),
            phoneVerified: z.literal(true),
            approved: z.literal(true),
            // Existing public URLs use supplier IDs. A changed ID needs a separately
            // implemented redirect; this verifier cannot claim that exists.
            publicShopId: id,
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
            physicalSellable: count,
            legacyCommitted: count,
            withheld: count,
            // Disjoint physical units; pending returns are not sellable inventory.
            disjointCountsReviewed: z.literal(true),
            pendingReturnsExcluded: z.literal(true),
          })
          .strict(),
      )
      .max(110000),
  })
  .strict();

// Offline comparison only. Evidence must come from an authorized snapshot and
// seller review, not synthetic checkboxes. This function cannot prove its truth.
export function verifyCatalogLaunch(input: unknown, evidenceInput: unknown) {
  const plan = catalogLaunchPlan(input);
  const evidence = evidenceSchema.parse(evidenceInput);
  const blockers: string[] = [];
  if (evidence.manifestDigest !== plan.digest)
    blockers.push("MANIFEST_CHANGED");
  for (const key of [
    "brands",
    "categories",
    "subcategories",
    "products",
    "tiers",
    "variants",
    "suppliers",
  ] as const) {
    const expected =
      key === "suppliers"
        ? plan.data.suppliers.map((s) => s.sourceId)
        : plan.data[key].map((r) => r.id);
    const actual = evidence.sourceInventory[key];
    const actualIds = new Set(actual);
    if (
      new Set(actual).size !== actual.length ||
      actual.length !== expected.length ||
      expected.some((value) => !actualIds.has(value))
    )
      blockers.push(`SOURCE_INVENTORY_${key.toUpperCase()}`);
  }
  const accounts = new Map(evidence.accounts.map((a) => [a.sourceId, a]));
  if (
    accounts.size !== evidence.accounts.length ||
    accounts.size !== plan.data.suppliers.length ||
    new Set(evidence.accounts.map((a) => a.targetUserId)).size !==
      evidence.accounts.length
  )
    blockers.push("ACCOUNT_MAPPING_INVENTORY");
  for (const seller of plan.data.suppliers) {
    const account = accounts.get(seller.sourceId);
    if (!account || account.targetId !== seller.targetId)
      blockers.push("ACCOUNT_MAPPING_MISMATCH");
    if (
      !account ||
      account.publicShopId !== seller.sourceId ||
      seller.targetId !== seller.sourceId
    )
      blockers.push("PUBLIC_SHOP_URL_REQUIRES_MIGRATION");
  }
  const stock = new Map(evidence.stock.map((s) => [`${s.kind}:${s.id}`, s]));
  if (
    stock.size !== evidence.stock.length ||
    stock.size !== plan.data.products.length + plan.data.variants.length
  )
    blockers.push("STOCK_INVENTORY");
  for (const [kind, rows] of [
    ["product", plan.data.products],
    ["variant", plan.data.variants],
  ] as const) {
    for (const row of rows) {
      const review = stock.get(`${kind}:${row.id}`);
      if (
        !review ||
        review.physicalSellable - review.legacyCommitted - review.withheld !==
          row.openingStock
      )
        blockers.push("OPENING_STOCK_MISMATCH");
    }
  }
  return {
    manifestDigest: plan.digest,
    snapshotReference: evidence.snapshotReference,
    capturedAt: evidence.capturedAt,
    blockers: [...new Set(blockers)],
    readyForRehearsal: blockers.length === 0,
    productionExecutionEnabled: false,
  };
}
