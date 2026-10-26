jest.mock("@/db/prisma", () => ({
  prisma: { order: { findUnique: jest.fn(), updateMany: jest.fn() } },
}));
jest.mock("@/lib/zenopay", () => ({ getZenopayStatus: jest.fn() }));
jest.mock("@/lib/order-fulfillment", () => ({ fulfillOrder: jest.fn() }));
import { prisma } from "@/db/prisma";
import { getZenopayStatus } from "@/lib/zenopay";
import { fulfillOrder } from "@/lib/order-fulfillment";
import { reconcileZenopay } from "@/lib/zenopay-reconciliation";
let order;
beforeEach(() => {
  order = {
    id: "id",
    isPaid: false,
    paymentMethod: "ZENOPAY",
    paymentResult: { zenopay_order_id: "id=attempt" },
    totalPrice: "1000",
    paymentStatus: "PENDING",
  };
  prisma.order.findUnique.mockImplementation(async () => ({ ...order }));
  prisma.order.updateMany.mockImplementation(async ({ data }) => {
    Object.assign(order, data);
    return { count: 1 };
  });
  fulfillOrder.mockImplementation(async () => {
    order.paymentStatus = "COMPLETED";
  });
  getZenopayStatus.mockResolvedValue({
    payment_status: "COMPLETED",
    amount: 1000,
    reference: "verified",
  });
});
test("amount mismatch never settles", async () => {
  getZenopayStatus.mockResolvedValue({
    amount: 1,
    payment_status: "COMPLETED",
  });
  await expect(reconcileZenopay("id", "id=attempt")).rejects.toThrow("amount");
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
    payment_status: "PENDING",
  });
  expect(await reconcileZenopay("id", "id=attempt")).toBe("PENDING");
  expect(prisma.order.updateMany).not.toHaveBeenCalled();
});
test("failed is conditionally written against exact unpaid attempt", async () => {
  getZenopayStatus.mockResolvedValue({
    amount: 1000,
    payment_status: "FAILED",
  });
  expect(await reconcileZenopay("id", "id=attempt")).toBe("FAILED");
  expect(prisma.order.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        id: "id",
        isPaid: false,
        paymentResult: { path: ["zenopay_order_id"], equals: "id=attempt" },
      },
    }),
  );
});
test("paid replay cannot downgrade", async () => {
  order.isPaid = true;
  expect(await reconcileZenopay("id", "id=attempt")).toBe("COMPLETED");
  expect(getZenopayStatus).not.toHaveBeenCalled();
});
test("stale attempts never query provider", async () => {
  await expect(reconcileZenopay("id", "id=old")).rejects.toThrow();
  expect(getZenopayStatus).not.toHaveBeenCalled();
});
test("fulfillment errors propagate for retry", async () => {
  fulfillOrder.mockRejectedValueOnce(new Error("stock"));
  await expect(reconcileZenopay("id", "id=attempt")).rejects.toThrow("stock");
  expect(prisma.order.updateMany).not.toHaveBeenCalled();
});
