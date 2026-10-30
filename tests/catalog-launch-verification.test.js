import { catalogLaunchPlan } from "@/lib/catalog-launch";
import { verifyCatalogLaunch } from "@/lib/catalog-launch-verification";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const manifest = () => ({
  version: 1,
  historicalObligationsRetained: true,
  catalogCompletenessReviewed: true,
  legacyStockCommitmentsReviewed: true,
  brands: [{ id: id(1), name: "Demo", description: null, image: null }],
  categories: [
    {
      id: id(2),
      name_en: "Demo",
      name_sw: "Demo",
      image: null,
      description: "",
      parentId: null,
      sortOrder: 0,
    },
  ],
  subcategories: [
    {
      id: id(3),
      categoryId: id(2),
      name_en: "Demo",
      name_sw: "Demo",
      image: null,
      description: null,
      sortOrder: 0,
    },
  ],
  suppliers: [{ sourceId: id(4), targetId: id(5), ownershipReviewed: true }],
  products: [
    {
      id: id(6),
      name: "Demo product",
      slug: "demo-product",
      description: "Synthetic",
      images: [],
      banner: null,
      price: "10.20",
      color: null,
      size: null,
      supplierId: id(4),
      isFeatured: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      brandId: id(1),
      categoryId: id(2),
      subcategoryId: id(3),
      thumbnail: null,
      tags: [],
      videoUrl: null,
      openingStock: 3,
      stockReviewed: true,
    },
  ],
  tiers: [],
  variants: [],
});

function setup() {
  const m = manifest();
  m.suppliers[0].targetId = m.suppliers[0].sourceId;
  const e = {
    version: 1,
    manifestDigest: catalogLaunchPlan(m).digest,
    snapshotReference: "synthetic-review-1",
    capturedAt: "2026-10-30T00:00:00.000Z",
    catalogEditsFrozenForSnapshot: true,
    sourceInventory: Object.fromEntries(
      [
        "brands",
        "categories",
        "subcategories",
        "products",
        "tiers",
        "variants",
        "suppliers",
      ].map((k) => [
        k,
        m[k].map((r) => (k === "suppliers" ? r.sourceId : r.id)),
      ]),
    ),
    accounts: [
      {
        sourceId: id(4),
        targetId: id(4),
        targetUserId: id(10),
        publicShopId: id(4),
        role: "SUPPLIER",
        phoneVerified: true,
        approved: true,
        ownershipVerified: true,
      },
    ],
    stock: [
      {
        kind: "product",
        id: id(6),
        physicalSellable: 8,
        legacyCommitted: 3,
        withheld: 2,
        disjointCountsReviewed: true,
        pendingReturnsExcluded: true,
      },
    ],
  };
  return { m, e };
}
test("complete bound review permits only rehearsal", () => {
  const { m, e } = setup();
  expect(verifyCatalogLaunch(m, e)).toMatchObject({
    readyForRehearsal: true,
    productionExecutionEnabled: false,
    blockers: [],
  });
});
test("changed reviewed manifest is refused", () => {
  const { m, e } = setup();
  m.products[0].price = "10.30";
  expect(verifyCatalogLaunch(m, e).blockers).toContain("MANIFEST_CHANGED");
});
test.each(["products", "tiers", "variants", "suppliers", "categories"])(
  "independent %s inventory catches omissions and extras",
  (k) => {
    const { m, e } = setup();
    e.sourceInventory[k].push(id(99));
    expect(verifyCatalogLaunch(m, e).readyForRehearsal).toBe(false);
  },
);
test("stock accounts for legacy commitments and withheld units", () => {
  const { m, e } = setup();
  e.stock[0].legacyCommitted = 9;
  expect(verifyCatalogLaunch(m, e).blockers).toContain(
    "OPENING_STOCK_MISMATCH",
  );
});
test("changed seller ID cannot silently break public shop URLs", () => {
  const { m, e } = setup();
  m.suppliers[0].targetId = id(20);
  e.accounts[0].targetId = id(20);
  e.manifestDigest = catalogLaunchPlan(m).digest;
  expect(verifyCatalogLaunch(m, e).blockers).toContain(
    "PUBLIC_SHOP_URL_REQUIRES_MIGRATION",
  );
});
test("extra account, duplicate stock and stale approval fail", () => {
  for (const mutate of [
    (e) => e.accounts.push({ ...e.accounts[0] }),
    (e) => e.stock.push({ ...e.stock[0] }),
  ]) {
    const { m, e } = setup();
    mutate(e);
    expect(verifyCatalogLaunch(m, e).readyForRehearsal).toBe(false);
  }
  const { m, e } = setup();
  e.accounts[0].approved = false;
  expect(() => verifyCatalogLaunch(m, e)).toThrow();
});
test("private account fields are rejected", () => {
  const { m, e } = setup();
  e.accounts[0].phone = "private";
  expect(() => verifyCatalogLaunch(m, e)).toThrow();
});

test("offline CLI compares private files without emitting catalog or account rows", () => {
  const fs = require("node:fs"),
    os = require("node:os"),
    path = require("node:path"),
    cp = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-review-test-"));
  const { m, e } = setup();
  try {
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(m));
    fs.writeFileSync(path.join(dir, "review.json"), JSON.stringify(e));
    const run = () =>
      cp.spawnSync(
        process.execPath,
        [
          "scripts/catalog-launch-review.cjs",
          path.join(dir, "manifest.json"),
          path.join(dir, "review.json"),
        ],
        { encoding: "utf8" },
      );
    const result = run();
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).productionExecutionEnabled).toBe(false);
    expect(result.stdout).not.toContain(m.products[0].name);
    expect(result.stdout).not.toContain(e.accounts[0].targetUserId);
    e.stock[0].legacyCommitted = 9;
    fs.writeFileSync(path.join(dir, "review.json"), JSON.stringify(e));
    expect(run().status).toBe(1);
    e.accounts[0].phone = "private-contact";
    fs.writeFileSync(path.join(dir, "review.json"), JSON.stringify(e));
    const denied = run();
    expect(denied.status).toBe(2);
    expect(denied.stderr).not.toContain("private-contact");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
