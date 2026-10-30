import {
  supplierCatalogTransferPlan,
  prepareSupplierCatalogTransfer,
  supplierSnapshotDigest,
} from "@/lib/supplier-catalog-transfer";
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
  const catalog = manifest();
  catalog.suppliers[0].targetId = catalog.suppliers[0].sourceId;
  return {
    version: 1,
    priorTransactionsAreTrials: true,
    preserveSourceDatabase: true,
    catalog,
    suppliers: [
      {
        id: id(4),
        sourceUserId: id(20),
        targetUserId: id(21),
        ownershipReviewed: true,
        name: "Synthetic shop",
        companyName: null,
        username: "synthetic-shop",
        about: null,
        tagLine: null,
        logo: null,
        bannerUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}
test("transfer preserves shop IDs without copying financial or auth state", () => {
  const p = supplierCatalogTransferPlan(setup());
  expect(p.catalog.data.suppliers[0].sourceId).toBe(p.suppliers[0].id);
  expect(p.productionExecutionEnabled).toBe(false);
});
test.each([
  "password",
  "phone",
  "email",
  "isVerified",
  "walletBalance",
  "rating",
])("reject unapproved private or financial field %s", (field) => {
  const p = setup();
  p.suppliers[0][field] = "private";
  expect(() => supplierCatalogTransferPlan(p)).toThrow();
});
test.each([
  "javascript:alert(1)",
  "https://user:password@example.test/image",
  "//evil.test/image",
])("reject unsafe media %s", (url) => {
  const p = setup();
  p.suppliers[0].logo = url;
  expect(() => supplierCatalogTransferPlan(p)).toThrow();
});
test("reject private contact in public profile and changed shop identity", () => {
  const p = setup();
  p.suppliers[0].about = "Email me at seller@example.test";
  expect(() => supplierCatalogTransferPlan(p)).toThrow();
  const q = setup();
  q.catalog.suppliers[0].targetId = id(99);
  expect(() => supplierCatalogTransferPlan(q)).toThrow();
});
function source() {
  const p = setup();
  const { targetUserId, ownershipReviewed, ...profile } = p.suppliers[0];
  const { openingStock, stockReviewed, ...product } = p.catalog.products[0];
  return {
    snapshot: {
      version: 1,
      status: "SOURCE_SNAPSHOT_NOT_REVIEWED",
      capturedAt: "2026-10-30T00:00:00+00:00",
      suppliers: [profile],
      brands: p.catalog.brands,
      categories: p.catalog.categories,
      subcategories: p.catalog.subcategories,
      products: [{ ...product, sourceStockSnapshot: 1 }],
      tiers: [],
      variants: [],
    },
    review: {
      version: 1,
      priorTransactionsAreTrials: true,
      preserveSourceDatabase: true,
      completenessReviewed: true,
      accounts: [
        {
          sourceUserId: profile.sourceUserId,
          targetUserId,
          ownershipReviewed: true,
        },
      ],
      stock: [
        {
          kind: "product",
          id: product.id,
          openingStock: 7,
          stockReviewed: true,
        },
      ],
    },
  };
}
test("source stock never blindly restored from trials; explicit reviewed stock wins", () => {
  const { snapshot, review } = source();
  review.snapshotDigest = supplierSnapshotDigest(snapshot);
  const r = prepareSupplierCatalogTransfer(snapshot, review);
  expect(r.plan.catalog.data.products[0].openingStock).toBe(7);
  snapshot.products[0].name = "changed";
  expect(() => prepareSupplierCatalogTransfer(snapshot, review)).toThrow(
    "changed",
  );
});
test("missing stock or ownership review refused", () => {
  for (const k of ["stock", "accounts"]) {
    const { snapshot, review } = source();
    review.snapshotDigest = supplierSnapshotDigest(snapshot);
    review[k] = [];
    expect(() => prepareSupplierCatalogTransfer(snapshot, review)).toThrow();
  }
});
test("offline preparation writes private new file and refuses overwrite without leaking values", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path"),
    cp = require("child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "supplier-transfer-test-"));
  try {
    const { snapshot, review } = source();
    review.snapshotDigest = supplierSnapshotDigest(snapshot);
    const files = ["source.json", "review.json", "output.json"].map((f) =>
      path.join(dir, f),
    );
    fs.writeFileSync(files[0], JSON.stringify(snapshot));
    fs.writeFileSync(files[1], JSON.stringify(review));
    const run = () =>
      cp.spawnSync(
        process.execPath,
        ["scripts/supplier-catalog-prepare.cjs", ...files],
        { encoding: "utf8", env: { ...process.env, TZ: "America/New_York" } },
      );
    const r = run();
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).digest).toBe(prepareSupplierCatalogTransfer(snapshot,review).plan.digest);
    expect(r.stdout).not.toContain("Synthetic shop");
    expect(fs.statSync(files[2]).mode & 0o777).toBe(0o600);
    expect(run().status).toBe(2);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("zoneless exported dates are refused rather than interpreted in operator timezone", () => {
  const { snapshot, review } = source();
  snapshot.products[0].createdAt = "2026-01-01T00:00:00";
  review.snapshotDigest = supplierSnapshotDigest(snapshot);
  expect(() => prepareSupplierCatalogTransfer(snapshot, review)).toThrow(
    "date",
  );
});
