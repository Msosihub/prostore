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
import { createOrder, createBuyNowOrder } from "@/lib/actions/order.actions";
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
        supplierName: "Forged seller name",
      },
    ],
  });
  prisma.product.findUnique.mockResolvedValue({
    id: "p",
    price: "1000",
    stock: 500,
    supplierId: "real",
    name: "Real",
    slug: "real",
    images: ["image"],
    pricingTiers: [],
  });
  tx = {
    supplier: {
      findUnique: jest.fn().mockResolvedValue({
        name: "Canonical Seller",
        companyName: "Canonical Store",
      }),
    },
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
      supplierName: "Canonical Store",
      name: "Real",
    }),
  });
});
test("unavailable stock does not create order or clear cart", async () => {
  prisma.product.findUnique.mockResolvedValue({ price: "1000", stock: 0 });
  expect((await createOrder()).success).toBe(false);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test("buy now snapshots canonical supplier name with legal-name fallback", async () => {
  tx.supplier.findUnique.mockResolvedValue({
    name: "Canonical Seller",
    companyName: null,
  });
  const result = await createBuyNowOrder({ productId: "real", qty: 1 });
  expect(result.success).toBe(true);
  expect(tx.orderItem.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      supplierId: "real",
      supplierName: "Canonical Seller",
    }),
  });
});

test.each([4, 5, 9, 10])(
  "Buy Now and cart quote the same tiers and ownership at quantity %s",
  async (qty) => {
    prisma.product.findUnique.mockResolvedValue({
      id: "p",
      price: "1000",
      stock: 100,
      supplierId: "real",
      name: "Real",
      slug: "real",
      images: ["image"],
      pricingTiers: [
        { minQty: 5, price: "800" },
        { minQty: 10, price: "700" },
      ],
    });
    const cart = await getMyCart();
    cart.items[0].qty = qty;
    expect((await createOrder()).success).toBe(true);
    const orderData = tx.order.create.mock.calls[0][0].data;
    const lineData = tx.orderItem.create.mock.calls[0][0].data;
    tx.order.create.mockClear();
    tx.orderItem.create.mockClear();
    tx.cart.update.mockClear();
    expect(
      (
        await createBuyNowOrder({
          productId: "real",
          qty,
          supplierId: "forged",
          price: "0.01",
          userId: "other",
        })
      ).success,
    ).toBe(true);
    expect(tx.order.create.mock.calls[0][0].data).toEqual(orderData);
    expect(tx.orderItem.create.mock.calls[0][0].data).toMatchObject({
      price: lineData.price,
      qty,
      supplierId: "real",
      supplierName: "Canonical Store",
      status: lineData.status,
    });
    expect(tx.cart.update).not.toHaveBeenCalled();
  },
);
test.each([150, 151])(
  "Buy Now preserves existing shipping threshold at quantity %s",
  async (qty) => {
    expect((await createBuyNowOrder({ productId: "real", qty })).success).toBe(
      true,
    );
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({
      itemsPrice: (qty * 1000).toFixed(2),
      shippingPrice: qty === 150 ? "3000.00" : "0.00",
      taxPrice: "0.00",
    });
  },
);
test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "5", 501])(
  "Buy Now rejects invalid/unavailable quantity %s",
  async (qty) => {
    expect((await createBuyNowOrder({ productId: "real", qty })).success).toBe(
      false,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  },
);
test.each([null, {}, { user: {} }])(
  "Buy Now rejects missing authenticated identity %p before reads",
  async (session) => {
    auth.mockResolvedValue(session);
    expect(
      (await createBuyNowOrder({ productId: "real", qty: 1 })).success,
    ).toBe(false);
    expect(getUserById).not.toHaveBeenCalled();
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  },
);
test.each(["BUYER", "SUPPLIER", "ADMIN"])(
  "%s buys only for authenticated self",
  async (role) => {
    auth.mockResolvedValue({
      user: { id: "11111111-1111-4111-8111-111111111111", role },
    });
    expect(
      (await createBuyNowOrder({ productId: "real", qty: 1, userId: "victim" }))
        .success,
    ).toBe(true);
    expect(tx.order.create.mock.calls[0][0].data.userId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  },
);
test.each(["address"])(
  "Buy Now requires saved %s like cart checkout",
  async (field) => {
    const user = await getUserById();
    user[field] = null;
    expect(
      (await createBuyNowOrder({ productId: "real", qty: 1 })).success,
    ).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  },
);
test("Buy Now rejects deleted product", async () => {
  prisma.product.findUnique.mockResolvedValue(null);
  expect(
    (await createBuyNowOrder({ productId: "missing", qty: 1 })).success,
  ).toBe(false);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test("Buy Now preserves existing Mobile default when no method is saved", async () => {
  const user = await getUserById();
  user.paymentMethod = null;
  expect((await createBuyNowOrder({ productId: "real", qty: 1 })).success).toBe(
    true,
  );
  expect(tx.order.create.mock.calls[0][0].data.paymentMethod).toBe("Mobile");
});
