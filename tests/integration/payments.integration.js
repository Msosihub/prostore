jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// Keep Prisma null sentinels and the injected client on the same generated runtime.
jest.mock("@prisma/client", () => require(process.env.PROSTORE_TEST_CLIENT));
jest.mock("@/db/prisma", () => ({ prisma: require("./database.cjs").prisma }));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
jest.mock("@/lib/zenopay", () => ({
  getZenopayStatus: jest.fn(),
  zenopayRequest: jest.fn(),
}));
jest.mock("@/lib/pesapal", () => ({ getPesapalStatus: jest.fn() }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
import { getPesapalStatus } from "@/lib/pesapal";
import { POST as pesapalIpn } from "@/app/api/pesapal/ipn/route";
import {
  markOrderAsDelivered,
  markOrderItemAsDelivered,
  updateOrderToPaidCOD,
} from "@/lib/actions/order.actions";
import { confirmDelivery, openOrderDispute } from "@/lib/order-delivery";
import { fulfillOrder, settleOrder } from "@/lib/order-fulfillment";
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

async function paidFixture({ twoItems = false } = {}) {
  const data = await fixture();
  if (twoItems) {
    const { randomUUID } = require("node:crypto");
    const second = await prisma.product.create({
      data: { ...data.product, id: randomUUID(), slug: "second", price: 500 },
    });
    await prisma.orderItem.create({
      data: {
        orderId: data.order.id,
        productId: second.id,
        supplierId: data.supplier.id,
        qty: 1,
        price: 500,
        name: "Second",
        slug: "second",
        image: "test",
      },
    });
    await prisma.order.update({
      where: { id: data.order.id },
      data: { itemsPrice: 2500, totalPrice: 2500 },
    });
    data.second = second;
  }
  await fulfillOrder(data.order.id, attempt(data.order), "verified");
  sendSms.mockClear();
  return data;
}
const buyer = (data) => ({ kind: "buyer", userId: data.user.id });
const admin = (data) => ({ kind: "admin", userId: data.user.id });
const releases = () =>
  prisma.supplierLedger.count({ where: { type: "ESCROW_RELEASE" } });

test("duplicate COD settlement creates escrow and decrements inventory once", async () => {
  const data = await fixture({ paymentResult: Prisma.DbNull });
  await prisma.order.update({
    where: { id: data.order.id },
    data: { paymentMethod: "CashOnDelivery" },
  });
  const results = await Promise.all(
    Array.from({ length: 6 }, () =>
      settleOrder(data.order.id, { gateway: "COD", actorId: data.user.id }),
    ),
  );
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(
    (await prisma.product.findUnique({ where: { id: data.product.id } })).stock,
  ).toBe(3);
  expect(await prisma.supplierLedger.count()).toBe(1);
  expect(
    Number(
      (await prisma.supplier.findUnique({ where: { id: data.supplier.id } }))
        .pendingBalance,
    ),
  ).toBe(2000);
});
test("COD versus Pesapal notification cannot cross payment methods", async () => {
  const data = await fixture({ paymentResult: Prisma.DbNull });
  await prisma.order.update({
    where: { id: data.order.id },
    data: { paymentMethod: "COD" },
  });
  const tracking = require("node:crypto").randomUUID();
  getPesapalStatus.mockResolvedValue({
    merchant_reference: data.order.id,
    amount: 2000,
    currency: "TZS",
    payment_status_description: "COMPLETED",
    confirmation_code: "verified",
  });
  const [cash, callback] = await Promise.all([
    settleOrder(data.order.id, { gateway: "COD", actorId: data.user.id }),
    pesapalIpn(
      new Request("https://example.test", {
        method: "POST",
        body: JSON.stringify({ OrderTrackingId: tracking }),
      }),
    ),
  ]);
  expect(cash).toBe(true);
  expect(callback.status).toBe(409);
  expect(await prisma.supplierLedger.count()).toBe(1);
  expect(
    (await prisma.product.findUnique({ where: { id: data.product.id } })).stock,
  ).toBe(3);
});
test("COD cannot settle a ZenoPay attempt during webhook settlement", async () => {
  const data = await fixture();
  const results = await Promise.allSettled([
    settleOrder(data.order.id, { gateway: "COD", actorId: data.user.id }),
    fulfillOrder(data.order.id, attempt(data.order), "verified"),
  ]);
  expect(results[0].status).toBe("rejected");
  expect(results[1].status).toBe("fulfilled");
  expect(await prisma.supplierLedger.count()).toBe(1);
});
test.each(["id", "trackingId"])(
  "verified Pesapal duplicate callbacks settle legacy %s reference once",
  async (key) => {
    const tracking = require("node:crypto").randomUUID();
    const data = await fixture({ paymentResult: { [key]: tracking } });
    await prisma.order.update({
      where: { id: data.order.id },
      data: { paymentMethod: "Pesapal" },
    });
    getPesapalStatus.mockResolvedValue({
      merchant_reference: data.order.id,
      amount: 2000,
      currency: "TZS",
      payment_status_description: "COMPLETED",
      confirmation_code: "verified",
    });
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        pesapalIpn(
          new Request("https://example.test", {
            method: "POST",
            body: JSON.stringify({ OrderTrackingId: tracking }),
          }),
        ),
      ),
    );
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await prisma.supplierLedger.count()).toBe(1);
    expect(
      (await prisma.order.findUnique({ where: { id: data.order.id } })).isPaid,
    ).toBe(true);
  },
);
test("whole-order and single-item delivery race release each escrow credit once", async () => {
  const data = await paidFixture({ twoItems: true });
  await Promise.all([
    confirmDelivery(data.order.id, undefined, admin(data)),
    confirmDelivery(data.order.id, data.product.id, buyer(data)),
  ]);
  const supplier = await prisma.supplier.findUnique({
    where: { id: data.supplier.id },
  });
  expect(Number(supplier.pendingBalance)).toBe(0);
  expect(Number(supplier.walletBalance)).toBe(2500);
  expect(await releases()).toBe(2);
  expect(sendSms).toHaveBeenCalledTimes(2);
  expect(
    (await prisma.order.findUnique({ where: { id: data.order.id } }))
      .isDelivered,
  ).toBe(true);
});
test("simultaneous final two item confirmations complete the parent order", async () => {
  const data = await paidFixture({ twoItems: true });
  await Promise.all(
    [data.product.id, data.second.id].map((id) =>
      confirmDelivery(data.order.id, id, buyer(data)),
    ),
  );
  expect(
    (await prisma.order.findUnique({ where: { id: data.order.id } }))
      .isDelivered,
  ).toBe(true);
  expect(await releases()).toBe(2);
});
test.each([true, false])(
  "dispute/delivery race has one financial winner (dispute first: %s)",
  async (disputeFirst) => {
    const data = await paidFixture();
    const dispute = () =>
      openOrderDispute(
        data.order.id,
        data.product.id,
        data.user.id,
        "Item is damaged",
      );
    const delivery = () =>
      confirmDelivery(data.order.id, data.product.id, buyer(data));
    const outcomes = await Promise.allSettled(
      (disputeFirst ? [dispute, delivery] : [delivery, dispute]).map((run) =>
        run(),
      ),
    );
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    const item = await prisma.orderItem.findFirst();
    expect(await releases()).toBe(item.isDelivered ? 1 : 0);
    expect(await prisma.returnRequest.count()).toBe(item.isDelivered ? 0 : 1);
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplier.id },
    });
    expect(Number(supplier.pendingBalance)).toBe(item.isDelivered ? 0 : 2000);
  },
);
test.each(["REJECTED", "RETURNED", "CANCELLED"])(
  "%s item cannot release escrow",
  async (status) => {
    const data = await paidFixture();
    await prisma.orderItem.updateMany({ data: { status } });
    await expect(
      confirmDelivery(data.order.id, data.product.id, buyer(data)),
    ).rejects.toThrow();
    expect(await releases()).toBe(0);
    expect(sendSms).not.toHaveBeenCalled();
  },
);
test.each(["REQUESTED", "APPROVED", "REFUNDED"])(
  "active or resolved refund state %s blocks release even with stale item status",
  async (status) => {
    const data = await paidFixture();
    await prisma.returnRequest.create({
      data: {
        orderId: data.order.id,
        productId: data.product.id,
        buyerId: data.user.id,
        supplierId: data.supplier.id,
        reason: "Problem reported",
        status,
      },
    });
    await expect(
      confirmDelivery(data.order.id, data.product.id, buyer(data)),
    ).rejects.toThrow();
    expect(await releases()).toBe(0);
  },
);
test("whole-order delivery rolls back all items if any item is disputed", async () => {
  const data = await paidFixture({ twoItems: true });
  await openOrderDispute(
    data.order.id,
    data.second.id,
    data.user.id,
    "Problem reported",
  );
  await expect(
    confirmDelivery(data.order.id, undefined, admin(data)),
  ).rejects.toThrow();
  expect(await releases()).toBe(0);
  expect(await prisma.orderItem.count({ where: { isDelivered: true } })).toBe(
    0,
  );
});
test("insufficient wallet escrow cannot become a negative balance", async () => {
  const data = await paidFixture();
  await prisma.supplier.update({
    where: { id: data.supplier.id },
    data: { pendingBalance: 1 },
  });
  await expect(
    confirmDelivery(data.order.id, data.product.id, buyer(data)),
  ).rejects.toThrow();
  expect(await releases()).toBe(0);
  expect((await prisma.orderItem.findFirst()).isDelivered).toBe(false);
});
test("feedback commits with delivery and duplicate confirmation cannot overwrite it", async () => {
  const data = await paidFixture();
  await confirmDelivery(data.order.id, data.product.id, buyer(data), {
    rating: 5,
    comment: "Received",
  });
  await confirmDelivery(data.order.id, data.product.id, buyer(data), {
    rating: 1,
    comment: "Replay",
  });
  expect((await prisma.orderDeliveryFeedback.findFirst()).rating).toBe(5);
  expect(await releases()).toBe(1);
});
test("a foreign buyer or an unpaid order cannot release escrow", async () => {
  const data = await paidFixture();
  await expect(
    confirmDelivery(data.order.id, data.product.id, {
      kind: "buyer",
      userId: require("node:crypto").randomUUID(),
    }),
  ).rejects.toThrow();
  await prisma.order.update({
    where: { id: data.order.id },
    data: { isPaid: false },
  });
  await expect(
    confirmDelivery(data.order.id, data.product.id, admin(data)),
  ).rejects.toThrow();
  expect(await releases()).toBe(0);
});

test("public whole-order and item actions share one release transaction", async () => {
  const data = await paidFixture({ twoItems: true });
  await prisma.user.update({
    where: { id: data.user.id },
    data: { role: "ADMIN" },
  });
  auth.mockResolvedValue({ user: { id: data.user.id, role: "ADMIN" } });
  const results = await Promise.all([
    markOrderAsDelivered(data.order.id),
    markOrderItemAsDelivered(data.order.id, data.product.id),
  ]);
  expect(results.every((result) => result.success)).toBe(true);
  expect(await releases()).toBe(2);
  expect(
    Number(
      (await prisma.supplier.findUnique({ where: { id: data.supplier.id } }))
        .walletBalance,
    ),
  ).toBe(2500);
});
test("admin COD action cannot mark a digital order paid", async () => {
  const data = await fixture();
  await prisma.user.update({
    where: { id: data.user.id },
    data: { role: "ADMIN" },
  });
  auth.mockResolvedValue({ user: { id: data.user.id, role: "ADMIN" } });
  expect((await updateOrderToPaidCOD(data.order.id)).success).toBe(false);
  expect(await prisma.supplierLedger.count()).toBe(0);
  expect(
    (await prisma.order.findUnique({ where: { id: data.order.id } })).isPaid,
  ).toBe(false);
});

const reconciliationSql = require("node:fs").readFileSync(
  require("node:path").join(
    __dirname,
    "../../scripts/reconciliation-report.sql",
  ),
  "utf8",
);
async function readOnlyReport() {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '5s'");
      return tx.$queryRawUnsafe(reconciliationSql);
    },
    { isolationLevel: "RepeatableRead" },
  );
}
test("read-only reconciliation accepts canonical settlement and release without changing data", async () => {
  const { order, user, supplier } = await fixture();
  await fulfillOrder(order.id, attempt(order), "verified");
  expect(await readOnlyReport()).toEqual([]);
  await confirmDelivery(order.id, undefined, {
    kind: "admin",
    userId: user.id,
  });
  const before = await prisma.supplier.findUnique({
    where: { id: supplier.id },
  });
  expect(await readOnlyReport()).toEqual([]);
  expect(
    await prisma.supplier.findUnique({ where: { id: supplier.id } }),
  ).toEqual(before);
  expect(await prisma.supplierLedger.count()).toBe(2);
});
test("read-only reconciliation flags legacy paid-without-credit and delivered-without-release", async () => {
  const { order, product } = await fixture();
  await prisma.order.update({
    where: { id: order.id },
    data: { isPaid: true, paymentStatus: "COMPLETED" },
  });
  await prisma.orderItem.update({
    where: { orderId_productId: { orderId: order.id, productId: product.id } },
    data: { isDelivered: true },
  });
  const rows = await readOnlyReport();
  expect(rows.map((row) => row.code)).toEqual(
    expect.arrayContaining([
      "PAID_CREDIT_MISSING_OR_INCONSISTENT",
      "DELIVERED_RELEASE_MISSING_OR_INCONSISTENT",
      "PARENT_DELIVERY_MISMATCH",
    ]),
  );
  expect(
    rows.every(
      (row) => Object.keys(row).sort().join() === "code,record_id,scope",
    ),
  ).toBe(true);
  expect(await prisma.supplierLedger.count()).toBe(0);
});
test("reconciliation distinguishes unsupported balance history instead of prescribing a repair", async () => {
  const { order, supplier } = await fixture();
  await fulfillOrder(order.id, attempt(order), "verified");
  await prisma.supplierLedger.create({
    data: {
      supplierId: supplier.id,
      orderId: order.id,
      type: "ADJUSTMENT",
      amount: 1,
      status: "COMPLETED",
    },
  });
  expect(await readOnlyReport()).toContainEqual({
    code: "SUPPLIER_BALANCE_REQUIRES_HISTORY",
    scope: "supplier",
    record_id: supplier.id,
  });
});
test("diagnostic transaction enforces database read-only mode", async () => {
  await fixture();
  await expect(
    prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$queryRawUnsafe(reconciliationSql);
      await tx.supplier.updateMany({ data: { walletBalance: 999 } });
    }),
  ).rejects.toThrow(/read-only/i);
  expect(Number((await prisma.supplier.findFirst()).walletBalance)).toBe(0);
});

test.each([
  Prisma.DbNull,
  Prisma.JsonNull,
  123,
  "scalar",
  { zenopay_order_id: 123 },
  { zenopay_order_id: false },
  { zenopay_order_id: {} },
  { zenopay_order_id: [] },
  { zenopay_order_id: " " },
])(
  "read-only report flags malformed legacy attempt %p",
  async (paymentResult) => {
    const { order } = await fixture({ paymentResult });
    expect(await readOnlyReport()).toContainEqual({
      code: "UNBOUND_PENDING_PAYMENT_REVIEW",
      scope: "order",
      record_id: order.id,
    });
  },
);
test("read-only report accepts a pending string attempt", async () => {
  await fixture();
  expect(await readOnlyReport()).toEqual([]);
});

const { getConversation } = require("@/lib/actions/chat.actions");
const { POST: markChatSeen } = require("@/app/api/chat/mark-seen/route");
const { POST: createChatInquiry } = require("@/app/api/inquiries/route");
async function chatFixture() {
  const f = await fixture();
  const vendor = await prisma.user.create({
    data: { name: "Chat Vendor", role: "SUPPLIER" },
  });
  const outsider = await prisma.user.create({
    data: { name: "Other Buyer", role: "BUYER" },
  });
  await prisma.user.update({
    where: { id: f.user.id },
    data: {
      password: "private-password-fixture",
      address: { private: "private-address-fixture" },
    },
  });
  await prisma.supplier.update({
    where: { id: f.supplier.id },
    data: { userId: vendor.id },
  });
  const conversation = await prisma.conversation.create({
    data: {
      buyerId: f.user.id,
      supplierId: vendor.id,
      productId: f.product.id,
    },
  });
  const other = await prisma.conversation.create({
    data: { buyerId: outsider.id, supplierId: vendor.id },
  });
  const privateMessage = await prisma.message.create({
    data: {
      conversationId: other.id,
      senderId: outsider.id,
      content: "private-other-thread-fixture",
    },
  });
  const privateInquiry = await prisma.inquiry.create({
    data: { conversationId: other.id, details: "private-inquiry-fixture" },
  });
  const incoming = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: vendor.id,
      content: "Participant message",
      replyToId: privateMessage.id,
      inquiryId: privateInquiry.id,
      moderationNote: "private-moderation-fixture",
    },
  });
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: f.user.id,
      content: "Buyer message",
    },
  });
  return { ...f, vendor, outsider, conversation, other, incoming };
}
const chatRequest = (data) =>
  new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(data),
  });
test("participant conversation projection excludes credentials and cross-thread reply/inquiry data", async () => {
  const f = await chatFixture();
  auth.mockResolvedValue({ user: { id: f.user.id, role: "BUYER" } });
  const conversation = await getConversation(f.conversation.id);
  expect(conversation.id).toBe(f.conversation.id);
  expect(
    conversation.messages.find((m) => m.id === f.incoming.id),
  ).toMatchObject({ replyTo: null, inquiry: null });
  for (const marker of [
    "private-password-fixture",
    "private-address-fixture",
    "private-other-thread-fixture",
    "private-inquiry-fixture",
    "private-moderation-fixture",
  ])
    expect(JSON.stringify(conversation)).not.toContain(marker);
  auth.mockResolvedValue({ user: { id: f.vendor.id, role: "SUPPLIER" } });
  expect((await getConversation(f.conversation.id)).id).toBe(f.conversation.id);
  auth.mockResolvedValue({ user: { id: f.outsider.id, role: "ADMIN" } });
  expect(await getConversation(f.conversation.id)).toBeNull();
});
test("mark seen cannot mutate foreign threads or broaden a missing ID; own outgoing messages stay unread", async () => {
  const f = await chatFixture();
  auth.mockResolvedValue({ user: { id: f.outsider.id } });
  expect(
    (await markChatSeen(chatRequest({ conversationId: f.conversation.id })))
      .status,
  ).toBe(404);
  auth.mockResolvedValue({ user: { id: f.user.id } });
  expect((await markChatSeen(chatRequest({}))).status).toBe(400);
  expect(await prisma.message.count({ where: { seen: true } })).toBe(0);
  expect(
    (await markChatSeen(chatRequest({ conversationId: f.conversation.id })))
      .status,
  ).toBe(200);
  expect(await prisma.message.count({ where: { seen: true } })).toBe(1);
  expect(
    (await prisma.message.findUnique({ where: { id: f.incoming.id } })).seen,
  ).toBe(true);
});
test("inquiry creation is buyer-owned and product-vendor scoped with no nested write authority", async () => {
  const f = await chatFixture();
  const body = {
    conversationId: f.conversation.id,
    productId: f.product.id,
    quantity: 3,
  };
  for (const user of [f.vendor, f.outsider]) {
    auth.mockResolvedValue({ user: { id: user.id } });
    expect((await createChatInquiry(chatRequest(body))).status).toBe(404);
  }
  auth.mockResolvedValue({ user: { id: f.user.id } });
  expect(
    (await createChatInquiry(chatRequest({ ...body, buyerId: f.outsider.id })))
      .status,
  ).toBe(400);
  expect((await createChatInquiry(chatRequest(body))).status).toBe(200);
  expect(
    await prisma.inquiry.findFirst({
      where: { conversationId: f.conversation.id },
    }),
  ).toMatchObject({ buyerId: f.user.id, status: "PENDING" });
});

test("inquiry decimals cannot round a positive quantity to zero or overflow storage", async () => {
  const f = await chatFixture();
  auth.mockResolvedValue({ user: { id: f.user.id } });
  const body = { conversationId: f.conversation.id, productId: f.product.id };
  for (const fields of [
    { quantity: 0.001 },
    { quantity: 10000000000 },
    { targetPrice: 0.001 },
    { targetPrice: 10000000000 },
  ])
    expect(
      (await createChatInquiry(chatRequest({ ...body, ...fields }))).status,
    ).toBe(400);
  expect(
    await prisma.inquiry.count({
      where: { conversationId: f.conversation.id },
    }),
  ).toBe(0);
  expect(
    (
      await createChatInquiry(
        chatRequest({ ...body, quantity: 0.01, targetPrice: 9999999999.99 }),
      )
    ).status,
  ).toBe(200);
  const row = await prisma.inquiry.findFirst({
    where: { conversationId: f.conversation.id },
  });
  expect(row.quantity.toString()).toBe("0.01");
  expect(row.targetPrice.toString()).toBe("9999999999.99");
});
