jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: { product: { findUnique: jest.fn() }, $transaction: jest.fn() },
}));
jest.mock("@/lib/actions/cart.actions", () => ({ getMyCart: jest.fn() }));
jest.mock("@/lib/actions/user.actions", () => ({ getUserById: jest.fn() }));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { getMyCart } from "@/lib/actions/cart.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { createOrder } from "@/lib/actions/order.actions";
let tx;
beforeEach(() => {
  auth.mockResolvedValue({
    user: { id: "11111111-1111-4111-8111-111111111111" },
  });
  getUserById.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    address: {
      fullName: "Test Buyer",
      streetAddress: "Test street",
      city: "Dar",
      postalCode: "12345",
      country: "Tanzania",
      phone: "+255700000000",
      paymentPhone: "+255700000000",
    },
    paymentMethod: "Mobile",
  });
  getMyCart.mockResolvedValue({
    id: "cart",
    itemsPrice: "1",
    totalPrice: "1",
    shippingPrice: "0",
    taxPrice: "0",
    items: [
      {
        productId: "p",
        qty: 2,
        name: "forged",
        image: "image",
        price: "0.50",
        supplierId: "forged",
      },
    ],
  });
  prisma.product.findUnique.mockResolvedValue({
    price: "1000",
    stock: 5,
    supplierId: "real",
    name: "Real",
    slug: "real",
    images: ["image"],
    pricingTiers: [],
  });
  tx = {
    order: { create: jest.fn(async () => ({ id: "new-order" })) },
    orderItem: { create: jest.fn() },
    cart: { update: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
});
test("checkout reprices old carts and stores canonical supplier/line totals", async () => {
  const result = await createOrder();
  expect(result.success).toBe(true);
  expect(tx.order.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      totalPrice: "5000.00",
      itemsPrice: "2000.00",
    }),
  });
  expect(tx.orderItem.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      price: "1000",
      supplierId: "real",
      name: "Real",
    }),
  });
});
test("unavailable stock does not create order or clear cart", async () => {
  prisma.product.findUnique.mockResolvedValue({ price: "1000", stock: 0 });
  expect((await createOrder()).success).toBe(false);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
