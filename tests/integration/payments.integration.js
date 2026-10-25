// Keep Prisma null sentinels and the injected client on the same generated runtime.
jest.mock("@prisma/client", () => require(process.env.PROSTORE_TEST_CLIENT));
jest.mock("@/db/prisma", () => ({ prisma: require("./database.cjs").prisma }));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
jest.mock("@/lib/zenopay", () => ({
  getZenopayStatus: jest.fn(),
  zenopayRequest: jest.fn(),
}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
import { fulfillOrder } from "@/lib/order-fulfillment";
import { reconcileZenopay } from "@/lib/zenopay-reconciliation";
import { sendSms } from "@/lib/africasTalking";
import { auth } from "@/auth";
import { POST as createPayment } from "@/app/api/zenopay/create-payment/route";
import { getZenopayStatus, zenopayRequest } from "@/lib/zenopay";
const {
  prisma,
  Prisma,
  prepare,
  reset,
  fixture,
  newOrder,
} = require("./database.cjs");
beforeAll(prepare);
beforeEach(async () => {
  await reset();
  sendSms.mockResolvedValue(undefined);
});
afterAll(async () => {
  await prisma.$disconnect();
});
const attempt = (order) => `${order.id}=test`;

test("concurrent callbacks commit inventory, wallet, ledger and notifications once", async () => {
  const { order, product, supplier } = await fixture();
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      fulfillOrder(order.id, attempt(order), "verified"),
    ),
  );
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(
    (await prisma.order.findUnique({ where: { id: order.id } })).isPaid,
  ).toBe(true);
  expect(
    (await prisma.product.findUnique({ where: { id: product.id } })).stock,
  ).toBe(3);
  expect(
    Number(
      (await prisma.supplier.findUnique({ where: { id: supplier.id } }))
        .pendingBalance,
    ),
  ).toBe(2000);
  expect(await prisma.supplierLedger.count()).toBe(1);
  expect(sendSms).toHaveBeenCalledTimes(2);
});
test("two orders competing for stock cannot oversell; loser rolls back", async () => {
  const first = await fixture({ stock: 3 });
  const second = await newOrder(first);
  const results = await Promise.allSettled(
    [first.order, second].map((order) =>
      fulfillOrder(order.id, attempt(order), "verified"),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (await prisma.product.findUnique({ where: { id: first.product.id } }))
      .stock,
  ).toBe(1);
  expect(await prisma.order.count({ where: { isPaid: true } })).toBe(1);
  expect(await prisma.supplierLedger.count()).toBe(1);
});
test("stock failure rolls back paid state and retry succeeds after restock", async () => {
  const { order, product } = await fixture({ stock: 0 });
  await expect(
    fulfillOrder(order.id, attempt(order), "verified"),
  ).rejects.toThrow();
  expect(
    (await prisma.order.findUnique({ where: { id: order.id } })).isPaid,
  ).toBe(false);
  expect(await prisma.supplierLedger.count()).toBe(0);
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: 5 },
  });
  await fulfillOrder(order.id, attempt(order), "verified");
  expect(await prisma.supplierLedger.count()).toBe(1);
});
test.each([Prisma.DbNull, Prisma.JsonNull])(
  "JSON null reservation permits only one concurrent claim (%s)",
  async (paymentResult) => {
    const { order } = await fixture({ paymentResult });
    const claims = await Promise.all(
      Array.from({ length: 8 }, (_, n) =>
        prisma.order.updateMany({
          where: {
            id: order.id,
            isPaid: false,
            paymentResult: { equals: Prisma.AnyNull },
          },
          data: { paymentResult: { zenopay_order_id: `attempt-${n}` } },
        }),
      ),
    );
    expect(claims.reduce((sum, result) => sum + result.count, 0)).toBe(1);
  },
);
test("stale attempt cannot mark an order paid", async () => {
  const { order } = await fixture();
  expect(await fulfillOrder(order.id, "old-attempt", "verified")).toBe(false);
  expect(await prisma.order.count({ where: { isPaid: true } })).toBe(0);
  expect(await prisma.supplierLedger.count()).toBe(0);
});
test("failure/completion race cannot downgrade completed payment", async () => {
  const { order } = await fixture();
  getZenopayStatus
    .mockResolvedValueOnce({ payment_status: "FAILED", amount: 2000 })
    .mockResolvedValueOnce({
      payment_status: "COMPLETED",
      amount: 2000,
      reference: "verified",
    });
  await Promise.all([
    reconcileZenopay(order.id, attempt(order)),
    reconcileZenopay(order.id, attempt(order)),
  ]);
  const current = await prisma.order.findUnique({ where: { id: order.id } });
  expect(current.isPaid).toBe(true);
  expect(current.paymentStatus).toBe("COMPLETED");
  expect(await prisma.supplierLedger.count()).toBe(1);
});

test("ledger failure rolls back inventory, wallet, paid flag and item state together", async () => {
  const { order, product, supplier } = await fixture();
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "SupplierLedger" ADD CONSTRAINT test_reject_ledger CHECK (amount < 0)',
  );
  try {
    await expect(
      fulfillOrder(order.id, attempt(order), "verified"),
    ).rejects.toThrow();
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } })).stock,
    ).toBe(5);
    expect(
      Number(
        (await prisma.supplier.findUnique({ where: { id: supplier.id } }))
          .pendingBalance,
      ),
    ).toBe(0);
    expect(
      (await prisma.order.findUnique({ where: { id: order.id } })).isPaid,
    ).toBe(false);
    expect((await prisma.orderItem.findFirst()).status).toBe("PREPARING");
    expect(sendSms).not.toHaveBeenCalled();
  } finally {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "SupplierLedger" DROP CONSTRAINT test_reject_ledger',
    );
  }
  expect(await fulfillOrder(order.id, attempt(order), "verified")).toBe(true);
});
test("verified amount mismatch leaves financial state untouched", async () => {
  const { order, product } = await fixture();
  getZenopayStatus.mockResolvedValue({
    payment_status: "COMPLETED",
    amount: 1,
    reference: "verified",
  });
  await expect(reconcileZenopay(order.id, attempt(order))).rejects.toThrow(
    "amount",
  );
  expect(
    (await prisma.order.findUnique({ where: { id: order.id } })).isPaid,
  ).toBe(false);
  expect(
    (await prisma.product.findUnique({ where: { id: product.id } })).stock,
  ).toBe(5);
  expect(await prisma.supplierLedger.count()).toBe(0);
});
test("existing legacy escrow blocks another stock decrement", async () => {
  const { order, product, supplier } = await fixture();
  await prisma.supplierLedger.create({
    data: {
      supplierId: supplier.id,
      orderId: order.id,
      amount: 2000,
      type: "ESCROW_CREDIT",
      status: "COMPLETED",
      reference: `ESCROW_CREDIT_${order.id}_${product.id}`,
    },
  });
  await expect(
    fulfillOrder(order.id, attempt(order), "verified"),
  ).rejects.toThrow("reconciliation");
  expect(
    (await prisma.product.findUnique({ where: { id: product.id } })).stock,
  ).toBe(5);
  expect(
    (await prisma.order.findUnique({ where: { id: order.id } })).isPaid,
  ).toBe(false);
});
test("fixture uses native json and PostgreSQL default read committed isolation", async () => {
  const columns = await prisma.$queryRawUnsafe(
    "SELECT data_type FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'paymentResult'",
  );
  expect(columns[0].data_type).toBe("json");
  const isolation = await prisma.$queryRawUnsafe("SHOW transaction_isolation");
  expect(isolation[0].transaction_isolation).toBe("read committed");
});

test("real initiation route reserves once across concurrent HTTP requests", async () => {
  const { order, user } = await fixture({ paymentResult: Prisma.DbNull });
  await prisma.user.update({
    where: { id: user.id },
    data: { paymentPhone: "+255700000000" },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { shippingAddress: { fullName: "Test Buyer" } },
  });
  auth.mockResolvedValue({ user: { id: user.id } });
  process.env.ZENOPAY_API_KEY = "test-only";
  process.env.NEXT_PUBLIC_SERVER_URL = "https://example.test";
  zenopayRequest.mockResolvedValue({ status: "success" });
  getZenopayStatus.mockResolvedValue({
    payment_status: "PENDING",
    amount: 2000,
  });
  try {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        createPayment(
          new Request("https://example.test", {
            method: "POST",
            body: JSON.stringify({ orderId: order.id }),
          }),
        ),
      ),
    );
    expect(zenopayRequest).toHaveBeenCalledTimes(1);
    expect(responses.some((response) => response.status === 200)).toBe(true);
    expect(
      responses.every((response) => [200, 409].includes(response.status)),
    ).toBe(true);
  } finally {
    delete process.env.ZENOPAY_API_KEY;
    delete process.env.NEXT_PUBLIC_SERVER_URL;
  }
});
