import { draftSupplierTransferReview } from "@/lib/supplier-transfer-review";
import { prepareSupplierCatalogTransfer } from "@/lib/supplier-catalog-transfer";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const source = () => ({
  version: 1,
  status: "SOURCE_SNAPSHOT_NOT_REVIEWED",
  capturedAt: "2026-01-01T00:00:00Z",
  suppliers: [{ id: id(1), sourceUserId: id(2) }],
  products: [
    {
      id: id(3),
      supplierId: id(1),
      categoryId: id(4),
      subcategoryId: id(6),
      sourceStockSnapshot: 999,
    },
  ],
  categories: [{ id: id(4) }, { id: id(5) }],
  subcategories: [{ id: id(6), categoryId: id(5) }],
  brands: [],
  tiers: [],
  variants: [],
});
test("deterministic proposal uses existing subcategory parent without modifying source", () => {
  const s = source(),
    before = JSON.stringify(s),
    d = draftSupplierTransferReview(s);
  expect(d.categoryCorrections).toEqual([
    {
      productId: id(3),
      categoryId: id(5),
      subcategoryId: id(6),
      reviewed: false,
    },
  ]);
  expect(JSON.stringify(s)).toBe(before);
  expect(
    draftSupplierTransferReview([
      { supplier_catalog_snapshot: JSON.stringify(s) },
    ]),
  ).toEqual(d);
});
test("draft never infers target account, approval or opening stock from source", () => {
  const d = draftSupplierTransferReview(source());
  expect(d.accounts[0]).toEqual({
    sourceUserId: id(2),
    targetUserId: null,
    ownershipReviewed: false,
  });
  expect(d.stock[0]).toEqual({
    kind: "product",
    id: id(3),
    openingStock: null,
    stockReviewed: false,
  });
  expect(d.completenessReviewed).toBe(false);
  expect(() => prepareSupplierCatalogTransfer(source(), d)).toThrow();
});
test.each([
  (s) => s.categories.push(s.categories[0]),
  (s) => s.subcategories.push(s.subcategories[0]),
  (s) => (s.products[0].subcategoryId = id(99)),
  (s) => s.suppliers.push({ ...s.suppliers[0], id: id(99) }),
  (s) => s.variants.push({ id: id(8), productId: id(99) }),
])("ambiguous or missing relationships refuse proposals", (alter) => {
  const s = source();
  alter(s);
  expect(() => draftSupplierTransferReview(s)).toThrow();
});
test("consistent products do not get gratuitous corrections", () => {
  const s = source();
  s.products[0].categoryId = id(5);
  expect(draftSupplierTransferReview(s).categoryCorrections).toEqual([]);
});
test("CLI draft writes private file, reports counts only and refuses overwrite", () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path"),
    cp = require("child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "transfer-draft-"));
  try {
    const src = path.join(dir, "source.json"),
      out = path.join(dir, "review.json");
    fs.writeFileSync(src, JSON.stringify(source()));
    const run = () =>
      cp.spawnSync(
        process.execPath,
        ["scripts/supplier-catalog-prepare.cjs", "--draft", src, out],
        { encoding: "utf8" },
      );
    const r = run();
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).approved).toBe(false);
    expect(r.stdout).not.toContain(id(2));
    expect(fs.statSync(out).mode & 0o777).toBe(0o600);
    expect(run().status).toBe(2);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
