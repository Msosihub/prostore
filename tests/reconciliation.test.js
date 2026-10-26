jest.mock("@/db/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    paymentAttempt: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/zenopay", () => ({ getZenopayStatus: jest.fn() }));
jest.mock("@/lib/order-fulfillment", () => ({ fulfillOrder: jest.fn() }));
import { prisma } from "@/db/prisma";
import { getZenopayStatus } from "@/lib/zenopay";
import { fulfillOrder } from "@/lib/order-fulfillment";
import { reconcileZenopay } from "@/lib/zenopay-reconciliation";
let order, attempt;
beforeEach(() => {
  order = {
    id: "id",
    isPaid: false,
    paymentMethod: "ZENOPAY",
    paymentResult: { zenopay_order_id: "id=attempt" },
    totalPrice: "1000",
    paymentStatus: "PENDING",
  };
  attempt = {
    id: "attempt",
    orderId: "id",
    providerOrderId: "id=attempt",
    amount: 1000,
    state: "AMBIGUOUS",
    verifiedAt: null,
  };
  prisma.$transaction.mockImplementation((fn) => fn(prisma));
  prisma.paymentAttempt.findUnique.mockImplementation(async () => ({
    ...attempt,
  }));
  prisma.paymentAttempt.findUniqueOrThrow.mockImplementation(async () => ({
    ...attempt,
  }));
  prisma.paymentAttempt.update.mockImplementation(async ({ data }) => {
    Object.assign(attempt, data);
    return { ...attempt };
  });
  prisma.paymentAttempt.updateMany.mockImplementation(async ({ data }) => {
    Object.assign(attempt, data);
    return { count: 1 };
  });
  prisma.order.findUniqueOrThrow.mockImplementation(async () => ({ ...order }));
  prisma.order.findUnique.mockImplementation(async () => ({ ...order }));
  prisma.order.updateMany.mockImplementation(async ({ data }) => {
    Object.assign(order, data);
    return { count: 1 };
  });
  fulfillOrder.mockImplementation(async () => {
    order.paymentStatus = "COMPLETED";
    order.isPaid = true;
  });
  getZenopayStatus.mockResolvedValue({
    order_id: "id=attempt",
    payment_status: "COMPLETED",
    amount: 1000,
    reference: "verified",
  });
});
test("amount mismatch never settles", async () => {
  getZenopayStatus.mockResolvedValue({
    amount: 1,
    order_id: "id=attempt",
    payment_status: "COMPLETED",
  });
  await expect(reconcileZenopay("id", "id=attempt")).rejects.toThrow(
    "verification",
  );
  expect(fulfillOrder).not.toHaveBeenCalled();
});
test("verified completion settles with verified reference", async () => {
  await expect(reconcileZenopay("id", "id=attempt")).resolves.toBe("COMPLETED");
  expect(fulfillOrder).toHaveBeenCalledWith(
    "id",
    "id=attempt",
    "verified",
    1000,
  );
});
test("pending does not become failed", async () => {
  getZenopayStatus.mockResolvedValue({
    amount: 1000,
    order_id: "id=attempt",
    payment_status: "PENDING",
  });
  expect(await reconcileZenopay("id", "id=attempt")).toBe("PENDING");
  expect(prisma.order.updateMany).not.toHaveBeenCalled();
});
test("failed is conditionally written against exact unpaid attempt", async () => {
  getZenopayStatus.mockResolvedValue({
    amount: 1000,
    order_id: "id=attempt",
    payment_status: "FAILED",
  });
  expect(await reconcileZenopay("id", "id=attempt")).toBe("FAILED");
  expect(prisma.order.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        id: "id",
        isPaid: false,
      },
    }),
  );
});
test("paid replay cannot downgrade", async () => {
  order.isPaid = true;
  attempt.state = "SETTLED";
  expect(await reconcileZenopay("id", "id=attempt")).toBe("COMPLETED");
  expect(getZenopayStatus).not.toHaveBeenCalled();
});
test("stale attempts never query provider", async () => {
  await expect(reconcileZenopay("id", "id=old")).rejects.toThrow();
  expect(getZenopayStatus).not.toHaveBeenCalled();
});
test("fulfillment errors retain verified proof for review", async () => {
  fulfillOrder.mockRejectedValueOnce(new Error("stock"));
  expect(await reconcileZenopay("id", "id=attempt")).toBe("REQUIRES_REVIEW");
  expect(attempt.verifiedAt).toBeTruthy();
});
