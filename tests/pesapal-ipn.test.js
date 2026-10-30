jest.mock("@/lib/pesapal", () => ({ getPesapalStatus: jest.fn() }));
jest.mock("@/lib/order-fulfillment", () => ({ settleOrder: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: { order: { findUnique: jest.fn(), updateMany: jest.fn() } },
}));
import { getPesapalStatus } from "@/lib/pesapal";
import { settleOrder } from "@/lib/order-fulfillment";
import { prisma } from "@/db/prisma";
import { POST, GET } from "@/app/api/pesapal/ipn/route";
const id = "11111111-1111-4111-8111-111111111111",
  tracking = "22222222-2222-4222-8222-222222222222";
const request = (body) =>
  new Request("https://example.test", {
    method: "POST",
    body: JSON.stringify(body),
  });
let order, status;
beforeEach(() => {
  order = {
    id,
    paymentMethod: "PESAPAL",
    paymentResult: { id: tracking },
    totalPrice: "1000",
    isPaid: false,
  };
  status = {
    merchant_reference: id,
    amount: 1000,
    currency: "TZS",
    payment_status_description: "COMPLETED",
    confirmation_code: "verified",
  };
  prisma.order.findUnique.mockImplementation(async () => order);
  getPesapalStatus.mockImplementation(async () => status);
  settleOrder.mockResolvedValue(true);
});
test("completed callback delegates to canonical settlement with verified values", async () => {
  expect((await POST(request({ OrderTrackingId: tracking }))).status).toBe(200);
  expect(settleOrder).toHaveBeenCalledWith(id, {
    gateway: "PESAPAL",
    trackingId: tracking,
    reference: "verified",
    amount: 1000,
    currency: "TZS",
  });
  expect(prisma.order.updateMany).not.toHaveBeenCalled();
});
test("documented GET notification is supported", async () => {
  expect(
    (await GET(new Request(`https://example.test?OrderTrackingId=${tracking}`)))
      .status,
  ).toBe(200);
});
test.each(["COD", "ZENOPAY"])(
  "wrong gateway %s cannot be marked paid",
  async (method) => {
    order.paymentMethod = method;
    expect((await POST(request({ order_tracking_id: tracking }))).status).toBe(
      409,
    );
    expect(settleOrder).not.toHaveBeenCalled();
  },
);
test("unbound or ambiguous stored reference cannot settle", async () => {
  order.paymentResult = { id: id, trackingId: tracking };
  expect((await POST(request({ OrderTrackingId: tracking }))).status).toBe(409);
  expect(settleOrder).not.toHaveBeenCalled();
});
test.each([{ amount: 1 }, { currency: "KES" }])(
  "wrong amount/currency is rejected %j",
  async (change) => {
    Object.assign(status, change);
    expect((await POST(request({ OrderTrackingId: tracking }))).status).toBe(
      409,
    );
    expect(settleOrder).not.toHaveBeenCalled();
  },
);
test("failure update is guarded by unpaid exact gateway snapshot", async () => {
  status.payment_status_description = "FAILED";
  await POST(request({ OrderTrackingId: tracking }));
  expect(prisma.order.updateMany).toHaveBeenCalledWith({
    where: {
      id,
      isPaid: false,
      paymentMethod: { in: ["PESAPAL", "Pesapal"] },
      paymentResult: { equals: { id: tracking } },
    },
    data: { paymentStatus: "FAILED" },
  });
});
test("reversal requires review without undoing financial state", async () => {
  status.payment_status_description = "REVERSED";
  order.isPaid = true;
  expect((await POST(request({ OrderTrackingId: tracking }))).status).toBe(409);
  expect(settleOrder).not.toHaveBeenCalled();
  expect(prisma.order.updateMany).not.toHaveBeenCalled();
});
test("provider failure asks for retry without exposing provider details", async () => {
  getPesapalStatus.mockRejectedValueOnce(new Error("secret detail"));
  const response = await POST(request({ OrderTrackingId: tracking }));
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("secret");
});
test("invalid callback performs no lookup", async () => {
  expect((await POST(request({ OrderTrackingId: "invalid" }))).status).toBe(
    400,
  );
  expect(getPesapalStatus).not.toHaveBeenCalled();
});
