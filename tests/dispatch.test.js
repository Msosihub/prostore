jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    supplier: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/order-delivery", () => ({ lockPaidOrder: jest.fn() }));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { lockPaidOrder } from "@/lib/order-delivery";
import { sendSms } from "@/lib/africasTalking";
import { markItemDispatched } from "@/lib/actions/supplier-order.actions";
const input = {
  orderId: "11111111-1111-4111-8111-111111111111",
  productId: "22222222-2222-4222-8222-222222222222",
  note: "Actual manual reference",
};
let item, tx;
beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "seller", role: "SUPPLIER" } });
  prisma.user.findUnique.mockResolvedValue({ role: "SUPPLIER" });
  prisma.supplier.findUnique.mockResolvedValue({ id: "vendor" });
  item = {
    productId: input.productId,
    supplierId: "vendor",
    name: "Item",
    status: "PAID",
    isDelivered: false,
  };
  lockPaidOrder.mockImplementation(async () => ({
    shippingAddress: { phone: "+255700000009" },
    orderitems: [item],
  }));
  tx = {
    orderNotification: {upsert: jest.fn()},
    returnRequest: { findUnique: jest.fn().mockResolvedValue(null) },
    orderItem: {
      update: jest.fn().mockImplementation(async () => {
        item.status = "DISPATCHED";
      }),
    },
    orderItemEvent: { create: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  sendSms.mockResolvedValue(undefined);
});
test("dispatch and repeated retry write/notify only once", async () => {
  expect((await markItemDispatched(input)).success).toBe(true);
  expect((await markItemDispatched(input)).success).toBe(true);
  expect(tx.orderItemEvent.create).toHaveBeenCalledTimes(1);
  expect(sendSms).not.toHaveBeenCalled();
  expect(tx.orderNotification.upsert).toHaveBeenCalledTimes(1);

});
test.each(["anonymous", "wrong seller", "unpaid", "disputed", "revoked"])(
  "%s cannot dispatch",
  async (kind) => {
    if (kind === "anonymous") auth.mockResolvedValue(null);
    if (kind === "wrong seller") item.supplierId = "other";
    if (kind === "unpaid")
      lockPaidOrder.mockRejectedValueOnce(new Error("Unpaid"));
    if (kind === "disputed")
      tx.returnRequest.findUnique.mockResolvedValue({ status: "REQUESTED" });
    if (kind === "revoked")
      prisma.user.findUnique.mockResolvedValue({ role: "BUYER" });
    expect((await markItemDispatched(input)).success).toBe(false);
    expect(tx.orderItem.update).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
  },
);
test("failed SMS does not report committed dispatch as failed or retry it", async () => {
  sendSms.mockRejectedValueOnce(new Error("sensitive provider detail"));
  expect((await markItemDispatched(input)).success).toBe(true);
  expect((await markItemDispatched(input)).success).toBe(true);
  expect(sendSms).not.toHaveBeenCalled();
  expect(tx.orderNotification.upsert).toHaveBeenCalledTimes(1);
  expect(tx.orderItemEvent.create).toHaveBeenCalledTimes(1);
});
test("oversized manual notes rejected on server", async () => {
  expect(
    (await markItemDispatched({ ...input, note: "a".repeat(181) })).success,
  ).toBe(false);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test.each([
  "+255700000001,+255700000002",
  "+255700000001;+255700000002",
  "invalid",
])(
  "malformed snapshot %s skips SMS while retaining dispatch",
  async (phone) => {
    lockPaidOrder.mockResolvedValue({
      shippingAddress: { phone },
      orderitems: [item],
    });
    expect((await markItemDispatched(input)).success).toBe(true);
    expect(tx.orderItem.update).toHaveBeenCalledTimes(1);
    expect(sendSms).not.toHaveBeenCalled();
  },
);
