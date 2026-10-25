jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/db/prisma", () => ({ prisma: {
  product: { findUnique: jest.fn() },
  cart: { findFirst: jest.fn(), update: jest.fn() },
} }));
import { cookies } from "next/headers";
import { prisma } from "@/db/prisma";
import { removeItemFromCart } from "@/lib/actions/cart.actions";
const line = (productId, qty) => ({ productId, qty, price: "1" });
beforeEach(() => {
  cookies.mockResolvedValue({ get: () => ({ value: "test-cart" }) });
  prisma.product.findUnique.mockImplementation(async ({ where }) => ({
    id: where.id, price: "1000", stock: 3, supplierId: "supplier",
    name: "Product", slug: where.id, images: [], pricingTiers: [],
  }));
});
test("can decrement a depleted line even while quantity still exceeds stock", async () => {
  prisma.cart.findFirst.mockResolvedValue({ id: "cart", items: [line("a", 5)] });
  expect(await removeItemFromCart("a")).toMatchObject({ success: true });
  expect(prisma.cart.update.mock.calls[0][0].data).toMatchObject({
    items: [{ productId: "a", qty: 4, price: "1000" }], itemsPrice: "4000.00",
  });
});
test("can remove another line while a remaining line exceeds stock", async () => {
  prisma.cart.findFirst.mockResolvedValue({ id: "cart", items: [line("a", 5), line("b", 1)] });
  expect(await removeItemFromCart("b")).toMatchObject({ success: true });
  expect(prisma.cart.update.mock.calls[0][0].data.items).toMatchObject([{ productId: "a", qty: 5 }]);
});
test("removal prunes deleted catalog entries and clears empty-cart totals", async () => {
  prisma.cart.findFirst.mockResolvedValue({ id: "cart", items: [line("gone", 5), line("b", 1)] });
  prisma.product.findUnique.mockResolvedValue(null);
  expect(await removeItemFromCart("b")).toMatchObject({ success: true });
  expect(prisma.cart.update.mock.calls[0][0].data).toMatchObject({
    items: [], itemsPrice: "0.00", shippingPrice: "0.00", totalPrice: "0.00",
  });
});
