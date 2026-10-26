const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript");
function load(file) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, process: { env: {} }, URL },
  );
  return exports;
}
const seo = load("lib/storefront-seo.ts"),
  catalog = load("lib/catalog-search.ts");
const p = {
  name: "Fixture",
  slug: "a b",
  description: "<p>description</p>",
  images: [],
  price: 1000,
  stock: 1,
  pricingTiers: [{ minQty: 5, price: 800 }],
};
assert.equal(
  seo.productStructuredData(p).offers.availability,
  "https://schema.org/InStock",
);
assert.equal(
  seo.productStructuredData({ ...p, stock: 0 }).offers.availability,
  "https://schema.org/OutOfStock",
);
assert.equal(seo.productStructuredData(p).offers.price, "1000.00");
assert.equal(
  seo.unitPrice({
    ...p,
    pricingTiers: [
      { minQty: 1, price: 900 },
      { minQty: 5, price: 800 },
    ],
  }),
  900,
);
assert(!seo.jsonLd({ name: "</script>" }).includes("<"));
assert.equal(seo.productPath("a/b"), "/product/a%2Fb");
assert.equal(seo.productStructuredData({ ...p, price: 0 }), null);
for (const path of ["/admin", "/user/orders", "/cart", "/supplier/products"])
  assert(seo.noindexPath(path));
for (const path of ["/", "/product/item", "/categories/id"])
  assert(!seo.noindexPath(path));
for (const value of ["NaN", "-1", "1.5", "Infinity"])
  assert.equal(catalog.catalogPage(value), 1);
assert.equal(catalog.catalogPage("2"), 2);
assert.equal(catalog.catalogPriceRange("broken"), undefined);
assert.equal(catalog.catalogRating("NaN"), undefined);
assert(seo.demoOrigin("127.0.0.1"));
assert(!("aggregateRating" in seo.productStructuredData(p)));
assert(!("hasMerchantReturnPolicy" in seo.productStructuredData(p).offers));
console.log(
  "PASS 24 storefront URL/schema/privacy/pagination/pricing assertions",
);
