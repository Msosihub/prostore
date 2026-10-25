jest.mock("@/db/prisma", () => ({
  prisma: {
    order: { findUnique: jest.fn() },
    product: { findUnique: jest.fn() },
    supplier: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
import { prisma } from "@/db/prisma";
import { sendSms } from "@/lib/africasTalking";
import { fulfillOrder } from "@/lib/order-fulfillment";
let state, tx, queue;
beforeEach(() => {
  state = { paid: false, stock: 5, balance: 0, ledger: false };
  queue = Promise.resolve();
  prisma.order.findUnique.mockResolvedValue({
    id: "order",
    paymentMethod: "ZENOPAY",
    user: { phone: "test-phone", name: "Buyer" },
    totalPrice: "2000",
    orderitems: [
      {
        productId: "product",
        supplierId: "supplier",
        qty: 2,
        name: "Item",
        price: "1000",
        orderId: "order",
      },
    ],
  });
  prisma.supplier.findUnique.mockResolvedValue({
    id: "supplier",
    name: "Supplier",
    phone: "test-phone",
  });
  sendSms.mockResolvedValue(undefined);
  tx = {
    order: {
      updateMany: jest.fn(async () => {
        if (state.paid) return { count: 0 };
        state.paid = true;
        return { count: 1 };
      }),
    },
    product: {
      findUnique: jest.fn(async () => ({
        stock: state.stock,
        supplierId: "supplier",
      })),
      updateMany: jest.fn(async ({ where, data }) => {
        if (state.stock < where.stock.gte) return { count: 0 };
        state.stock -= data.stock.decrement;
        return { count: 1 };
      }),
    },
    orderItem: { update: jest.fn() },
    supplier: {
      update: jest.fn(async ({ data }) => {
        state.balance += data.pendingBalance.increment;
      }),
    },
    supplierLedger: {
      findUnique: jest.fn(async () => state.ledger),
      create: jest.fn(async () => {
        state.ledger = true;
      }),
    },
  };
  // Models transaction serialization and rollback, without a database or network.
  prisma.$transaction.mockImplementation((fn) => {
    const pending = queue.then(async () => {
      const previous = { ...state };
      try {
        return await fn(tx);
      } catch (e) {
        state = previous;
        throw e;
      }
    });
    queue = pending.catch(() => {});
    return pending;
  });
});
test("sequential callbacks settle stock, escrow and notifications once", async () => {
  await fulfillOrder("order", "attempt", "ref");
  await fulfillOrder("order", "attempt", "ref");
  expect(state).toEqual({ paid: true, stock: 3, balance: 2000, ledger: true });
  expect(sendSms).toHaveBeenCalledTimes(2);
  expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
});
test("concurrent callbacks have one transaction winner", async () => {
  await Promise.all([
    fulfillOrder("order", "attempt", "ref"),
    fulfillOrder("order", "attempt", "ref"),
  ]);
  expect(state.stock).toBe(3);
  expect(state.balance).toBe(2000);
  expect(sendSms).toHaveBeenCalledTimes(2);
});
test("inventory failure rolls back paid claim and can retry", async () => {
  state.stock = 0;
  await expect(fulfillOrder("order", "attempt", "ref")).rejects.toThrow();
  expect(state.paid).toBe(false);
  expect(sendSms).not.toHaveBeenCalled();
  state.stock = 5;
  await fulfillOrder("order", "attempt", "ref");
  expect(state.paid).toBe(true);
  expect(state.stock).toBe(3);
});
test("ledger failure rolls back stock and payment", async () => {
  tx.supplierLedger.create.mockRejectedValueOnce(new Error("database error"));
  await expect(fulfillOrder("order", "attempt", "ref")).rejects.toThrow();
  expect(state).toEqual({ paid: false, stock: 5, balance: 0, ledger: false });
  expect(sendSms).not.toHaveBeenCalled();
  await fulfillOrder("order", "attempt", "ref");
  expect(state.balance).toBe(2000);
});
test("SMS failure never rolls back or repeats financial fulfillment", async () => {
  sendSms.mockRejectedValue(new Error("SMS down"));
  await fulfillOrder("order", "attempt", "ref");
  await fulfillOrder("order", "attempt", "ref");
  expect(state.stock).toBe(3);
  expect(sendSms).toHaveBeenCalledTimes(2);
});

test("legacy escrow with an unpaid header requires review without another decrement", async () => {
  state.ledger = true;
  await expect(fulfillOrder("order", "attempt", "ref")).rejects.toThrow(
    "reconciliation",
  );
  expect(state.stock).toBe(5);
  expect(state.paid).toBe(false);
  expect(sendSms).not.toHaveBeenCalled();
});

test("supplier reassignment cannot credit the wrong wallet", async () => {
  tx.product.findUnique.mockResolvedValue({
    supplierId: "other-supplier",
    stock: 5,
  });
  await expect(fulfillOrder("order", "attempt", "ref")).rejects.toThrow();
  expect(state.paid).toBe(false);
  expect(tx.product.updateMany).not.toHaveBeenCalled();
  expect(tx.supplier.update).not.toHaveBeenCalled();
});
test("orders without items cannot settle", async () => {
  prisma.order.findUnique.mockResolvedValue({ id: "order", orderitems: [] });
  await expect(fulfillOrder("order", "attempt", "ref")).rejects.toThrow();
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
