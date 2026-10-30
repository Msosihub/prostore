jest.mock("@/db/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
import { catalogLaunchPlan } from "@/lib/catalog-launch";
import { prisma } from "@/db/prisma";
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
test("stable manifest preserves product identity and exact price", () => {
  const m = manifest();
  const a = catalogLaunchPlan(m);
  expect(a.data.products[0].slug).toBe("demo-product");
  expect(a.data.products[0].price).toBe("10.20");
  expect(a.digest).toBe(catalogLaunchPlan(m).digest);
});
test.each(["orders", "balances", "password", "accounts"])(
  "rejects extra %s payload",
  (key) =>
    expect(() => catalogLaunchPlan({ ...manifest(), [key]: [] })).toThrow(),
);
test.each(["-1", "NaN", "1.001", "1e3", "0"])(
  "reject invalid money %s",
  (price) => {
    const m = manifest();
    m.products[0].price = price;
    expect(() => catalogLaunchPlan(m)).toThrow();
  },
);
test("missing ownership, stock acknowledgement and dependencies refused", () => {
  for (const alter of [
    (m) => (m.suppliers = []),
    (m) => (m.products[0].stockReviewed = false),
    (m) => (m.legacyStockCommitmentsReviewed = false),
    (m) => (m.subcategories[0].categoryId = id(9)),
  ]) {
    const m = manifest();
    alter(m);
    expect(() => catalogLaunchPlan(m)).toThrow();
  }
});
test("duplicate slug and category cycle refused", () => {
  const m = manifest();
  m.products.push({ ...m.products[0], id: id(7) });
  expect(() => catalogLaunchPlan(m)).toThrow();
  const c = manifest();
  c.categories[0].parentId = c.categories[0].id;
  expect(() => catalogLaunchPlan(c)).toThrow();
});
test('mismatched actual datasource refuses before database module load',()=>{
 const previous=process.env.PROSTORE_TEST_DATABASE_URL,actual=process.env.DATABASE_URL;
 process.env.PROSTORE_TEST_DATABASE_URL='postgresql://postgres:local-test-only@127.0.0.1:1234/prostore_payment_test';process.env.DATABASE_URL='not-the-disposable-target';
 try{jest.isolateModules(()=>expect(()=>require('./integration/catalog-launch.cjs')).toThrow('datasource mismatch'));}finally{if(previous===undefined)delete process.env.PROSTORE_TEST_DATABASE_URL;else process.env.PROSTORE_TEST_DATABASE_URL=previous;if(actual===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=actual;}
});
