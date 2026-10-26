jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/db/prisma", () => ({
  prisma: { product: { findUnique: jest.fn() } },
}));
import { prisma } from "@/db/prisma";
import { calcPriceWithTiers } from "@/lib/cart-pricing";
const product = {
  price: "1000",
  stock: 10,
  supplierId: "real-supplier",
  name: "Real product",
  slug: "real-product",
  images: ["real-image"],
  pricingTiers: [{ minQty: 5, price: "800" }],
};
beforeEach(() => prisma.product.findUnique.mockResolvedValue(product));
test("ignores forged price/supplier and persists canonical item values", async () => {
  const items = [
    {
      productId: "id",
      qty: 2,
      price: "0.01",
      supplierId: "attacker",
      name: "forged",
    },
  ];
  expect(await calcPriceWithTiers(items)).toMatchObject({
    itemsPrice: "2000.00",
    totalPrice: "5000.00",
  });
  expect(items[0]).toMatchObject({
    price: "1000",
    supplierId: "real-supplier",
    name: "Real product",
  });
});
test("tier price and stored line price agree", async () => {
  const items = [{ productId: "id", qty: 5, price: "1" }];
  expect(await calcPriceWithTiers(items)).toMatchObject({
    itemsPrice: "4000.00",
  });
  expect(items[0].price).toBe("800");
});
test.each([0, -1, 1.5, 11])(
  "rejects invalid or unavailable quantity %s including first cart",
  async (qty) => {
    await expect(
      calcPriceWithTiers([{ productId: "id", qty, price: "1" }]),
    ).rejects.toThrow();
  },
);
test("deleted product cannot be checked out at a stale price", async () => {
  prisma.product.findUnique.mockResolvedValue(null);
  await expect(
    calcPriceWithTiers([{ productId: "id", qty: 1 }]),
  ).rejects.toThrow();
});

test.each([
  [4, "1000"],
  [5, "800"],
  [9, "800"],
  [10, "700"],
])("quantity %i selects exactly the eligible tier", async (qty, expected) => {
  prisma.product.findUnique.mockResolvedValue({
    ...product,
    pricingTiers: [
      { minQty: 10, price: "700" },
      { minQty: 5, price: "800" },
    ],
  });
  const items = [{ productId: "id", qty, price: "1" }];
  const totals = await calcPriceWithTiers(items);
  expect(items[0].price).toBe(expected);
  expect(totals.itemsPrice).toBe((Number(expected) * qty).toFixed(2));
});
test("decreasing below a tier resets previously discounted stored price", async () => {
  const items = [{ productId: "id", qty: 4, price: "800" }];
  await calcPriceWithTiers(items);
  expect(items[0].price).toBe("1000");
});
