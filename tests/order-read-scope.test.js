jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    supplier: { findFirst: jest.fn() },
    product: { count: jest.fn() },
    orderItem: { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    order: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/actions/cart.actions", () => ({ getMyCart: jest.fn() }));
jest.mock("@/lib/actions/user.actions", () => ({ getUserById: jest.fn() }));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import {
  getOrderSummary,
  getSupplierOrderItems,
  getMyOrders,
} from "@/lib/actions/order.actions";
const actions = [
  () => getOrderSummary("owner"),
  () => getSupplierOrderItems({ supplierId: "vendor" }),
];
beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "owner", role: "ADMIN" } });
  prisma.user.findUnique.mockResolvedValue({ role: "SUPPLIER" });
  prisma.supplier.findFirst.mockImplementation(async ({ where }) => {
    const [scope, owner] = where.AND;
    return (scope.id === "vendor" || scope.userId === "owner") &&
      (!owner || owner.userId === "owner")
      ? { id: "vendor", pendingBalance: 0, walletBalance: 0 }
      : null;
  });
  prisma.product.count.mockResolvedValue(0);
  prisma.orderItem.findMany.mockResolvedValue([]);
  prisma.orderItem.count.mockResolvedValue(0);
  prisma.orderItem.groupBy.mockResolvedValue([]);
  prisma.order.findMany.mockResolvedValue([]);
  prisma.order.count.mockResolvedValue(0);
  prisma.$transaction.mockImplementation((values) => Promise.all(values));
});
test.each([null, {}, { user: {} }])(
  "anonymous or missing identity cannot read supplier finances: %p",
  async (session) => {
    auth.mockResolvedValue(session);
    for (const action of actions) await action();
    expect(prisma.supplier.findFirst).not.toHaveBeenCalled();
    expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
    expect(prisma.product.count).not.toHaveBeenCalled();
  },
);
test.each(["BUYER", "USER", null])(
  "database role %p cannot use a forged admin session",
  async (role) => {
    prisma.user.findUnique.mockResolvedValue(role ? { role } : null);
    for (const action of actions) await action();
    expect(prisma.supplier.findFirst).not.toHaveBeenCalled();
    expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
  },
);
test("wrong supplier and nonexistent supplier fail before order queries", async () => {
  auth.mockResolvedValue({ user: { id: "other" } });
  for (const action of actions) await action();
  await getOrderSummary("missing");
  await getSupplierOrderItems({ supplierId: "missing" });
  expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
  expect(prisma.product.count).not.toHaveBeenCalled();
});
test.each(["SUPPLIER", "ADMIN"])(
  "database %s can access an allowed explicit scope",
  async (role) => {
    prisma.user.findUnique.mockResolvedValue({ role });
    if (role === "ADMIN") auth.mockResolvedValue({ user: { id: "admin" } });
    for (const action of actions) await action();
    expect(prisma.product.count).toHaveBeenCalledWith({
      where: { supplierId: "vendor" },
    });
    for (const [args] of prisma.orderItem.findMany.mock.calls)
      expect(args.where.supplierId).toBe("vendor");
    for (const [args] of prisma.orderItem.count.mock.calls)
      expect(args.where.supplierId).toBe("vendor");
    expect(prisma.orderItem.groupBy.mock.calls[0][0].where.supplierId).toBe(
      "vendor",
    );
    const select =
      prisma.orderItem.findMany.mock.calls[1][0].select.order.select.user
        .select;
    expect(select).toEqual({ name: true });
  },
);
test.each([undefined, "", " ", { not: "vendor" }])(
  "missing supplier scope %p never broadens queries",
  async (id) => {
    await getOrderSummary(id);
    await getSupplierOrderItems({ supplierId: id });
    expect(prisma.supplier.findFirst).not.toHaveBeenCalled();
    expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
  },
);
test.each([null, {}, { user: {} }])(
  "my orders rejects missing identity %p",
  async (session) => {
    auth.mockResolvedValue(session);
    await expect(getMyOrders({ page: 1 })).rejects.toThrow();
    expect(prisma.order.findMany).not.toHaveBeenCalled();
    expect(prisma.order.count).not.toHaveBeenCalled();
  },
);
test.each(["BUYER", "SUPPLIER", "ADMIN"])(
  "my orders stays self scoped for %s",
  async (role) => {
    auth.mockResolvedValue({ user: { id: "self", role } });
    await getMyOrders({ page: 1 });
    expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({
      userId: "self",
    });
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { userId: "self" },
    });
    expect(prisma.order.findMany.mock.calls[0][0].select).toEqual({
      id: true,
      createdAt: true,
      totalPrice: true,
      paymentStatus: true,
      isPaid: true,
      orderitems: { select: { isDelivered: true } },
      isDelivered: true,
    });
  },
);

test("empty seller summary has no invented chart points", async () => {
  const summary = await getOrderSummary("owner");
  expect(summary.available).toBe(true);
  expect(summary.totalSales).toBe(0);
  expect(summary.salesData).toEqual([]);
  expect(summary.salesByDayData).toEqual([]);
});
test("seller paid-item values, customer count and chronology remain separate from wallet", async () => {
  prisma.orderItem.findMany.mockResolvedValue([
    {
      orderId: "b",
      price: "2000",
      qty: 2,
      isDelivered: false,
      order: {
        id: "b",
        userId: "customer",
        createdAt: new Date("2026-02-03T12:00:00Z"),
        user: { name: "Buyer" },
      },
    },
    {
      orderId: "a",
      price: "1000",
      qty: 1,
      isDelivered: true,
      order: {
        id: "a",
        userId: "customer",
        createdAt: new Date("2025-12-03T12:00:00Z"),
        user: { name: "Buyer" },
      },
    },
  ]);
  const summary = await getOrderSummary("owner");
  expect(summary.totalSales).toBe(5000);
  expect(summary.deliveredValue).toBe(1000);
  expect(summary.walletBalance).toBe(0);
  expect(summary.usersCount).toBe(1);
  expect(summary.salesData).toEqual([
    { month: "12/25", totalSales: 1000 },
    { month: "02/26", totalSales: 4000 },
  ]);
  expect(prisma.orderItem.findMany.mock.calls[0][0].where).toEqual({
    supplierId: "vendor",
    order: { isPaid: true },
  });
  expect(prisma.orderItem.count).toHaveBeenCalledWith({
    where: {
      supplierId: "vendor",
      status: { in: ["PAID", "PREPARING"] },
      isDelivered: false,
      order: { isPaid: true },
    },
  });
});

test("failed summary read is explicitly unavailable", async () => {
  prisma.orderItem.findMany.mockRejectedValueOnce(
    new Error("database unavailable"),
  );
  expect((await getOrderSummary("owner")).available).toBe(false);
});
