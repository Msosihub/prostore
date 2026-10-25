jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: { order: { findUnique: jest.fn(), updateMany: jest.fn() } },
}));
jest.mock("@/lib/zenopay", () => ({ zenopayRequest: jest.fn() }));
jest.mock("@/lib/zenopay-reconciliation", () => ({
  paymentAttempt: jest.requireActual("@/lib/zenopay-reconciliation")
    .paymentAttempt,
  reconcileZenopay: jest.fn(),
}));
jest.mock("@/lib/order-fulfillment", () => ({ fulfillOrder: jest.fn() }));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { zenopayRequest } from "@/lib/zenopay";
import { reconcileZenopay } from "@/lib/zenopay-reconciliation";
import { POST } from "@/app/api/zenopay/create-payment/route";
import { POST as webhook } from "@/app/api/zenopay/webhook/route";
const id = "11111111-1111-4111-8111-111111111111";
const request = (body) =>
  new Request("https://example.test", {
    method: "POST",
    body: JSON.stringify(body),
  });
let order;
beforeEach(() => {
  process.env.ZENOPAY_API_KEY = "test-only";
  process.env.NEXT_PUBLIC_SERVER_URL = "https://example.test";
  order = {
    id,
    userId: "buyer",
    isPaid: false,
    paymentResult: null,
    paymentMethod: "ZENOPAY",
    totalPrice: "1000",
    shippingAddress: { fullName: "Test Buyer" },
    user: { email: "test@example.test", paymentPhone: "+255700000000" },
  };
  auth.mockResolvedValue({ user: { id: "buyer" } });
  prisma.order.findUnique.mockImplementation(async () => ({ ...order }));
  prisma.order.updateMany.mockImplementation(async ({ data }) => {
    if (order.paymentResult) return { count: 0 };
    Object.assign(order, data);
    return { count: 1 };
  });
  zenopayRequest.mockResolvedValue({ status: "success" });
  reconcileZenopay.mockResolvedValue("PENDING");
});
afterEach(() => {
  delete process.env.ZENOPAY_API_KEY;
  delete process.env.NEXT_PUBLIC_SERVER_URL;
});
test("unauthenticated request cannot read orders or charge", async () => {
  auth.mockResolvedValue(null);
  expect((await POST(request({ orderId: id }))).status).toBe(401);
  expect(prisma.order.findUnique).not.toHaveBeenCalled();
  expect(zenopayRequest).not.toHaveBeenCalled();
});
test("other buyer cannot initiate", async () => {
  order.userId = "someone-else";
  expect((await POST(request({ orderId: id }))).status).toBe(404);
  expect(zenopayRequest).not.toHaveBeenCalled();
});
test("paid orders are never charged again", async () => {
  order.isPaid = true;
  expect(await (await POST(request({ orderId: id }))).json()).toMatchObject({
    status: "COMPLETED",
  });
  expect(zenopayRequest).not.toHaveBeenCalled();
});
test.each([{}, { orderId: "invalid" }])(
  "invalid input rejected",
  async (input) => {
    expect((await POST(request(input))).status).toBe(400);
  },
);
test("malformed JSON rejected", async () => {
  expect(
    (
      await POST(
        new Request("https://example.test", { method: "POST", body: "{" }),
      )
    ).status,
  ).toBe(400);
});
test("invalid phone never charges", async () => {
  order.user.paymentPhone = "bad";
  expect((await POST(request({ orderId: id }))).status).toBe(400);
  expect(zenopayRequest).not.toHaveBeenCalled();
});
test("concurrent clicks reserve before sending and send only once", async () => {
  zenopayRequest.mockImplementation(async (_endpoint, payload) => {
    expect(order.paymentResult.zenopay_order_id).toBe(payload.order_id);
    return { status: "success" };
  });
  await Promise.all([
    POST(request({ orderId: id })),
    POST(request({ orderId: id })),
  ]);
  expect(zenopayRequest).toHaveBeenCalledTimes(1);
});
test("timeout retains attempt; retry reconciles instead of charging", async () => {
  zenopayRequest.mockRejectedValueOnce(new Error("sensitive details"));
  const response = await POST(request({ orderId: id }));
  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain("sensitive");
  expect(order.paymentResult.zenopay_order_id).toBeDefined();
  await POST(request({ orderId: id }));
  expect(reconcileZenopay).toHaveBeenCalled();
  expect(zenopayRequest).toHaveBeenCalledTimes(1);
});
test("failed attempt does not silently issue another charge", async () => {
  order.paymentResult = { zenopay_order_id: `${id}=attempt` };
  reconcileZenopay.mockResolvedValue("FAILED");
  expect(await (await POST(request({ orderId: id }))).json()).toMatchObject({
    success: false,
    status: "FAILED",
  });
  expect(zenopayRequest).not.toHaveBeenCalled();
});
test("spoofed callback cannot use another attempt", async () => {
  order.paymentResult = { zenopay_order_id: `${id}=correct` };
  expect(
    (
      await webhook(
        request({ order_id: `${id}=wrong`, payment_status: "COMPLETED" }),
      )
    ).status,
  ).toBe(404);
  expect(reconcileZenopay).not.toHaveBeenCalled();
});
test("callback uses server verification and ignores claimed success", async () => {
  order.paymentResult = { zenopay_order_id: `${id}=correct` };
  expect(
    (
      await webhook(
        request({
          order_id: `${id}=correct`,
          payment_status: "COMPLETED",
          reference: "forged",
        }),
      )
    ).status,
  ).toBe(200);
  expect(reconcileZenopay).toHaveBeenCalledWith(id, `${id}=correct`);
  expect(prisma.order.updateMany).not.toHaveBeenCalled();
});
test("verification failure asks for retry without details", async () => {
  order.paymentResult = { zenopay_order_id: id };
  reconcileZenopay.mockRejectedValueOnce(new Error("secret"));
  const response = await webhook(request({ order_id: id }));
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("secret");
});

test("phone-only OTP buyers retain checkout without an unrelated email fallback", async () => {
  order.user.email = null;
  expect((await POST(request({ orderId: id }))).status).toBe(200);
  expect(zenopayRequest).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ buyer_email: "buyer@payments.invalid" }),
  );
});
