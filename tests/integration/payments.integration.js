jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: (fn) => fn,
}));
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
  getOrderSummary,
  getMyOrders,
  createBuyNowOrder,
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
  expect(sendSms).not.toHaveBeenCalled();
  expect(
    await prisma.orderNotification.count({
      where: { kind: { in: ["BUYER_PAYMENT", "SELLER_PAYMENT"] } },
    }),
  ).toBe(2);
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
  getZenopayStatus.mockResolvedValue({
    order_id: attempt(order),
    payment_status: "COMPLETED",
    amount: 2000,
    reference: "verified",
  });
  await Promise.all(
    Array.from({ length: 5 }, () => reconcileZenopay(order.id, attempt(order))),
  );
  expect(getZenopayStatus).toHaveBeenCalledTimes(1);
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
    "verification",
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
  expect(sendSms).not.toHaveBeenCalled();
  expect(
    await prisma.orderNotification.count({
      where: { kind: "SELLER_DELIVERY" },
    }),
  ).toBe(2);
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

import { markItemDispatched } from "@/lib/actions/supplier-order.actions";
import { getFulfillmentOrder } from "@/lib/fulfillment-view";
async function multiSellerFixture() {
  const f = await fixture({ stock: 10 });
  const a = await prisma.user.create({
    data: { name: "Seller A", role: "SUPPLIER" },
  });
  const b = await prisma.user.create({
    data: { name: "Seller B", role: "SUPPLIER" },
  });
  await prisma.supplier.update({
    where: { id: f.supplier.id },
    data: { userId: a.id },
  });
  const sellerB = await prisma.supplier.create({
    data: {
      userId: b.id,
      name: "Seller B",
      email: "b@example.test",
      phone: "+255700000008",
    },
  });
  const { id, createdAt, ...data } = f.product;
  const second = await prisma.product.create({
    data: {
      ...data,
      name: "Other seller private item",
      slug: "other-item",
      supplierId: sellerB.id,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: f.order.id,
      productId: second.id,
      supplierId: sellerB.id,
      name: second.name,
      slug: second.slug,
      image: "test",
      qty: 1,
      price: 1000,
    },
  });
  await prisma.order.update({
    where: { id: f.order.id },
    data: {
      itemsPrice: 3000,
      totalPrice: 3000,
      shippingAddress: {
        fullName: "Snapshot Recipient",
        phone: "+255700000009",
        paymentPhone: "private-payment-marker",
      },
    },
  });
  await fulfillOrder(f.order.id, attempt(f.order), "verified");
  sendSms.mockClear();
  auth.mockResolvedValue({ user: { id: a.id, role: "SUPPLIER" } });
  return { ...f, a, b, sellerB, second };
}
test("concurrent seller dispatch retries preserve one event/time and one notification", async () => {
  const f = await multiSellerFixture();
  const args = {
    orderId: f.order.id,
    productId: f.product.id,
    note: "Manual reference A",
  };
  const results = await Promise.all(
    Array.from({ length: 6 }, () => markItemDispatched(args)),
  );
  expect(results.every((r) => r.success)).toBe(true);
  expect(
    await prisma.orderItemEvent.count({
      where: { orderId: f.order.id, type: "DISPATCHED" },
    }),
  ).toBe(1);
  expect(sendSms).not.toHaveBeenCalled();
  expect(
    await prisma.orderNotification.count({ where: { kind: "BUYER_DISPATCH" } }),
  ).toBe(1);
  const first = await prisma.orderItem.findUnique({
    where: {
      orderId_productId: { orderId: f.order.id, productId: f.product.id },
    },
  });
  await markItemDispatched({ ...args, note: "Overwrite attempt" });
  const retry = await prisma.orderItem.findUnique({
    where: {
      orderId_productId: { orderId: f.order.id, productId: f.product.id },
    },
  });
  expect(retry.dispatchedAt).toEqual(first.dispatchedAt);
  expect(retry.dispatchNote).toBe("Manual reference A");
  expect(
    (await markItemDispatched({ ...args, productId: f.second.id })).success,
  ).toBe(false);
});
test("scoped fulfillment snapshot and partial seller release remain isolated", async () => {
  const f = await multiSellerFixture();
  let view = await getFulfillmentOrder(f.order.id);
  expect(view.orderitems.map((i) => i.productId)).toEqual([f.product.id]);
  expect(JSON.stringify(view)).not.toContain("private-payment-marker");
  expect(JSON.stringify(view)).not.toContain("Other seller private item");
  expect(view.shippingAddress.fullName).toBe("Snapshot Recipient");
  auth.mockResolvedValue({ user: { id: f.user.id } });
  expect((await getFulfillmentOrder(f.order.id)).orderitems).toHaveLength(2);
  await confirmDelivery(f.order.id, f.product.id, {
    kind: "buyer",
    userId: f.user.id,
  });
  expect(
    (await prisma.order.findUnique({ where: { id: f.order.id } })).isDelivered,
  ).toBe(false);
  expect(
    Number(
      (await prisma.supplier.findUnique({ where: { id: f.sellerB.id } }))
        .pendingBalance,
    ),
  ).toBe(1000);
  await openOrderDispute(
    f.order.id,
    f.second.id,
    f.user.id,
    "Synthetic second-seller dispute",
  );
  auth.mockResolvedValue({ user: { id: f.b.id, role: "SUPPLIER" } });
  expect(
    (await markItemDispatched({ orderId: f.order.id, productId: f.second.id }))
      .success,
  ).toBe(false);
  view = await getFulfillmentOrder(f.order.id);
  expect(view.orderitems[0].disputeStatus).toBe("REQUESTED");
  const admin = await prisma.user.create({ data: { role: "ADMIN" } });
  auth.mockResolvedValue({ user: { id: admin.id } });
  expect((await getFulfillmentOrder(f.order.id)).orderitems).toHaveLength(2);
  const stranger = await prisma.user.create({ data: { role: "BUYER" } });
  auth.mockResolvedValue({ user: { id: stranger.id } });
  expect(await getFulfillmentOrder(f.order.id)).toBeNull();
});
test("dispatch vs dispute uses shared parent lock and never releases escrow", async () => {
  const f = await multiSellerFixture();
  await Promise.allSettled([
    markItemDispatched({
      orderId: f.order.id,
      productId: f.product.id,
      note: "Actual manual reference",
    }),
    openOrderDispute(f.order.id, f.product.id, f.user.id, "Synthetic dispute"),
  ]);
  const item = await prisma.orderItem.findUnique({
    where: {
      orderId_productId: { orderId: f.order.id, productId: f.product.id },
    },
  });
  expect(item.isDelivered).toBe(false);
  expect(item.payoutStatus).toBe("ESCROW");
  expect(
    await prisma.supplierLedger.count({
      where: { orderId: f.order.id, type: "ESCROW_RELEASE" },
    }),
  ).toBe(0);
  expect(
    (
      await prisma.returnRequest.findUnique({
        where: {
          orderId_productId: { orderId: f.order.id, productId: f.product.id },
        },
      })
    ).status,
  ).toBe("REQUESTED");
});
test("final items from different sellers release once under concurrent confirmations", async () => {
  const f = await multiSellerFixture();
  await Promise.all(
    [f.product.id, f.second.id].map((productId) =>
      confirmDelivery(f.order.id, productId, {
        kind: "buyer",
        userId: f.user.id,
      }),
    ),
  );
  expect(
    (await prisma.order.findUnique({ where: { id: f.order.id } })).isDelivered,
  ).toBe(true);
  expect(
    await prisma.supplierLedger.count({
      where: { orderId: f.order.id, type: "ESCROW_RELEASE" },
    }),
  ).toBe(2);
  expect(
    Number(
      (await prisma.supplier.findUnique({ where: { id: f.supplier.id } }))
        .walletBalance,
    ),
  ).toBe(2000);
  expect(
    Number(
      (await prisma.supplier.findUnique({ where: { id: f.sellerB.id } }))
        .walletBalance,
    ),
  ).toBe(1000);
});
test("dispatch racing receipt cannot regress delivered item or double release", async () => {
  const f = await multiSellerFixture();
  await Promise.all([
    markItemDispatched({ orderId: f.order.id, productId: f.product.id }),
    confirmDelivery(f.order.id, f.product.id, {
      kind: "buyer",
      userId: f.user.id,
    }),
  ]);
  const item = await prisma.orderItem.findUnique({
    where: {
      orderId_productId: { orderId: f.order.id, productId: f.product.id },
    },
  });
  expect(item.status).toBe("DELIVERED");
  expect(item.isDelivered).toBe(true);
  expect(
    await prisma.supplierLedger.count({
      where: { orderId: f.order.id, type: "ESCROW_RELEASE" },
    }),
  ).toBe(1);
  expect(
    (await prisma.order.findUnique({ where: { id: f.order.id } })).isDelivered,
  ).toBe(false);
});

test("workspace summaries match each seller ledger and buyer partial receipt", async () => {
  const f = await multiSellerFixture();
  await confirmDelivery(f.order.id, f.product.id, {
    kind: "buyer",
    userId: f.user.id,
  });
  const a = await getOrderSummary(f.a.id);
  expect(a.totalSales).toBe(2000);
  expect(a.walletBalance).toBe(2000);
  expect(a.pendingEscrow).toBe(0);
  expect(a.usersCount).toBe(1);
  expect(a.latestSales[0].totalPrice).toBe(2000);
  auth.mockResolvedValue({ user: { id: f.b.id, role: "SUPPLIER" } });
  const b = await getOrderSummary(f.b.id);
  expect(b.totalSales).toBe(1000);
  expect(b.walletBalance).toBe(0);
  expect(b.pendingEscrow).toBe(1000);
  expect(b.latestSales[0].totalPrice).toBe(1000);
  expect(b.salesData.reduce((sum, p) => sum + p.totalSales, 0)).toBe(1000);
  const denied = await getOrderSummary(f.a.id);
  expect(denied.totalSales).toBe(0);
  expect(denied.latestSales).toEqual([]);
  auth.mockResolvedValue({ user: { id: f.user.id, role: "BUYER" } });
  const mine = await getMyOrders({ page: 1 });
  expect(mine.data).toHaveLength(1);
  expect(mine.data[0].isPaid).toBe(true);
  expect(mine.data[0].orderitems.filter((i) => i.isDelivered)).toHaveLength(1);
});

test("Buy Now tier totals settle into the same seller item-value report, excluding shipping", async () => {
  const f = await fixture({ stock: 20 });
  await prisma.productPricing.create({
    data: { productId: f.product.id, minQty: 5, price: 800 },
  });
  await prisma.user.update({
    where: { id: f.user.id },
    data: {
      role: "SUPPLIER",
      paymentMethod: "Mobile",
      address: {
        fullName: "Test Buyer",
        streetAddress: "Test street",
        city: "Dar",
        postalCode: "12345",
        country: "Tanzania",
        phone: "+255700000000",
        paymentPhone: "+255700000000",
      },
    },
  });
  auth.mockResolvedValue({ user: { id: f.user.id, role: "SUPPLIER" } });
  const created = await createBuyNowOrder({
    productId: f.product.slug,
    qty: 5,
  });
  expect(created.success).toBe(true);
  const order = await prisma.order.findUnique({
    where: { id: created.orderData.id },
    include: { orderitems: true },
  });
  expect(Number(order.totalPrice)).toBe(7000);
  expect(Number(order.itemsPrice)).toBe(4000);
  expect(Number(order.shippingPrice)).toBe(3000);
  expect(Number(order.taxPrice)).toBe(0);
  expect(order.orderitems[0]).toMatchObject({
    qty: 5,
    supplierId: f.supplier.id,
    status: "PREPARING",
  });
  expect(Number(order.orderitems[0].price)).toBe(800);
  expect(
    (await prisma.product.findUnique({ where: { id: f.product.id } })).stock,
  ).toBe(20);
  // Bind a synthetic verified attempt; browser coverage exercises actual initiation.
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: "ZENOPAY",
      paymentResult: { zenopay_order_id: attempt(order) },
    },
  });
  await Promise.all([
    fulfillOrder(order.id, attempt(order), "verified"),
    fulfillOrder(order.id, attempt(order), "verified"),
  ]);
  expect(
    (await prisma.product.findUnique({ where: { id: f.product.id } })).stock,
  ).toBe(15);
  const summary = await getOrderSummary(f.user.id);
  expect(summary.available).toBe(true);
  expect(summary.totalSales).toBe(4000);
  expect(summary.pendingEscrow).toBe(4000);
  expect(summary.walletBalance).toBe(0);
  const credits = await prisma.supplierLedger.findMany({
    where: { orderId: order.id, type: "ESCROW_CREDIT" },
  });
  expect(credits).toHaveLength(1);
  expect(Number(credits[0].amount)).toBe(4000);
});

// First-party tables are created by the actual additive migration in prepare().
import * as market from "@/lib/market-chat";
import {
  sendMarketMessage,
  createMarketProposal,
} from "@/lib/actions/market-chat.actions";
const { randomUUID: marketId } = require("node:crypto");
async function marketFixture() {
  const f = await fixture({ stock: 30 });
  const seller = await prisma.user.create({
    data: { name: "Market Seller", role: "SUPPLIER" },
  });
  await prisma.supplier.update({
    where: { id: f.supplier.id },
    data: { userId: seller.id },
  });
  await prisma.user.update({
    where: { id: f.user.id },
    data: {
      address: {
        fullName: "Buyer",
        streetAddress: "Test street",
        city: "Dar",
        postalCode: "12345",
        country: "Tanzania",
        phone: "+255700000000",
        paymentPhone: "+255700000000",
      },
      paymentMethod: "Mobile",
    },
  });
  await prisma.productPricing.create({
    data: { productId: f.product.id, minQty: 5, price: 800 },
  });
  const outsider = await prisma.user.create({ data: { name: "Other buyer" } });
  const sellerB = await prisma.user.create({
    data: { name: "Other seller", role: "SUPPLIER" },
  });
  auth.mockResolvedValue({ user: { id: f.user.id } });
  const t = await market.startThread(f.product.id);
  return { ...f, seller, outsider, sellerB, threadId: t.id };
}
const marketActor = (user) => auth.mockResolvedValue({ user: { id: user.id } });
async function marketProposal(f, quantity = 5) {
  marketActor(f.seller);
  const p = await market.propose({
    id: marketId(),
    threadId: f.threadId,
    quantity,
  });
  marketActor(f.user);
  return p;
}
test("product chat starts once concurrently, binds canonical seller and isolates all participants", async () => {
  const f = await marketFixture();
  const threads = await Promise.all(
    Array.from({ length: 5 }, () => market.startThread(f.product.id)),
  );
  expect(new Set(threads.map((t) => t.id))).toEqual(new Set([f.threadId]));
  for (const other of [f.outsider, f.sellerB]) {
    marketActor(other);
    await expect(market.loadThread(f.threadId)).rejects.toThrow();
    await expect(
      market.sendMessage({
        id: marketId(),
        threadId: f.threadId,
        content: "forged",
      }),
    ).rejects.toThrow();
  }
  marketActor(f.user);
  expect((await market.listThreads("buyer")).items).toHaveLength(1);
  marketActor(f.seller);
  expect((await market.listThreads("seller")).items).toHaveLength(1);
  await expect(market.startThread(f.product.id)).rejects.toThrow();
});
test("messages persist once across concurrent retries and reject changed payload/sender replay", async () => {
  const f = await marketFixture();
  const input = {
    id: marketId(),
    threadId: f.threadId,
    content: "Nahitaji vipande 5",
  };
  await Promise.all(Array.from({ length: 6 }, () => market.sendMessage(input)));
  expect(await prisma.marketMessage.count()).toBe(1);
  await expect(
    market.sendMessage({ ...input, content: "Changed" }),
  ).rejects.toThrow();
  marketActor(f.seller);
  await expect(market.sendMessage(input)).rejects.toThrow();
  expect((await market.listThreads("seller")).items[0]._count.messages).toBe(1);
  await market.markSeen({ threadId: f.threadId, ids: [input.id] });
  expect((await market.listThreads("seller")).items[0]._count.messages).toBe(0);
});
test("paged history recovers older messages without crossing thread cursor", async () => {
  const f = await marketFixture();
  for (let i = 0; i < 55; i++)
    await market.sendMessage({
      id: marketId(),
      threadId: f.threadId,
      content: "Bidhaa " + i,
    });
  const latest = await market.loadThread(f.threadId);
  expect(latest.messages).toHaveLength(50);
  expect(latest.hasOlder).toBe(true);
  const older = await market.loadThread(f.threadId, latest.messages[0].id);
  expect(older.messages).toHaveLength(5);
  expect(older.hasOlder).toBe(false);
  expect(
    new Set([...older.messages, ...latest.messages].map((m) => m.id)).size,
  ).toBe(55);
  await expect(market.loadThread(f.threadId, marketId())).rejects.toThrow();
});
test("server actions block contact obfuscations and do not echo or persist sensitive text", async () => {
  const f = await marketFixture();
  for (const content of [
    "０７１２３４５６７８",
    "n [at] example [dot] com",
    "@account",
    "wa.me/255700000000",
  ]) {
    const result = await sendMarketMessage({
      id: marketId(),
      threadId: f.threadId,
      content,
    });
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain(content);
  }
  expect(await prisma.marketMessage.count()).toBe(0);
  expect(
    (
      await sendMarketMessage({
        id: marketId(),
        threadId: f.threadId,
        content: "Naomba 5 kwa 800 TZS",
      })
    ).ok,
  ).toBe(true);
  marketActor(f.seller);
  const result = await createMarketProposal({
    id: marketId(),
    threadId: f.threadId,
    quantity: 5,
    notes: "0712345678",
  });
  expect(result.ok).toBe(false);
  expect(await prisma.marketProposal.count()).toBe(0);
});
test("anonymous actions and forged sender fields cannot persist messages", async () => {
  const f = await marketFixture();
  auth.mockResolvedValue(null);
  expect(
    (
      await sendMarketMessage({
        id: marketId(),
        threadId: f.threadId,
        content: "Test",
      })
    ).ok,
  ).toBe(false);
  marketActor(f.user);
  expect(
    (
      await sendMarketMessage({
        id: marketId(),
        threadId: f.threadId,
        content: "Test",
        senderId: f.seller.id,
      })
    ).ok,
  ).toBe(false);
  expect(await prisma.marketMessage.count()).toBe(0);
});
test("only bound seller proposes; structured price and duplicate IDs cannot be forged", async () => {
  const f = await marketFixture();
  await expect(
    market.propose({ id: marketId(), threadId: f.threadId, quantity: 5 }),
  ).rejects.toThrow();
  marketActor(f.sellerB);
  await expect(
    market.propose({ id: marketId(), threadId: f.threadId, quantity: 5 }),
  ).rejects.toThrow();
  marketActor(f.seller);
  const input = { id: marketId(), threadId: f.threadId, quantity: 5 };
  await Promise.all(Array.from({ length: 5 }, () => market.propose(input)));
  expect(await prisma.marketProposal.count()).toBe(1);
  await expect(market.propose({ ...input, quantity: 6 })).rejects.toThrow();
  expect((await createMarketProposal({ ...input, price: "1" })).ok).toBe(false);
  const p = await prisma.marketProposal.findUnique({ where: { id: input.id } });
  expect(p.snapshot.itemsPrice).toBe("4000.00");
  expect(p.snapshot.totalPrice).toBe("7000.00");
});
test("duplicate/replayed acceptance produces exactly one ordinary unpaid order and immutable snapshot", async () => {
  const f = await marketFixture();
  const p = await marketProposal(f);
  const checked = await market.reviewProposal(p.id);
  const before = await prisma.order.count();
  const results = await Promise.all(
    Array.from({ length: 6 }, () =>
      market.acceptProposal({ id: p.id, fingerprint: checked.fingerprint }),
    ),
  );
  expect(new Set(results.map((r) => r.orderId)).size).toBe(1);
  expect(await prisma.order.count()).toBe(before + 1);
  const order = await prisma.order.findUnique({
    where: { id: results[0].orderId },
    include: { orderitems: true },
  });
  expect(order.isPaid).toBe(false);
  expect(Number(order.totalPrice)).toBe(7000);
  expect(Number(order.orderitems[0].price)).toBe(800);
  expect(order.orderitems[0].supplierId).toBe(f.supplier.id);
  expect(await prisma.supplierLedger.count()).toBe(0);
  expect(
    (await prisma.product.findUnique({ where: { id: f.product.id } })).stock,
  ).toBe(30);
  marketActor(f.outsider);
  await expect(
    market.acceptProposal({ id: p.id, fingerprint: checked.fingerprint }),
  ).rejects.toThrow();
  marketActor(f.seller);
  await expect(market.reviewProposal(p.id)).rejects.toThrow();
});
test("changed address forces fresh review; failed accept leaves proposal recoverable", async () => {
  const f = await marketFixture();
  const p = await marketProposal(f);
  const old = await market.reviewProposal(p.id);
  const user = await prisma.user.findUnique({ where: { id: f.user.id } });
  await prisma.user.update({
    where: { id: f.user.id },
    data: { address: { ...user.address, streetAddress: "Updated street" } },
  });
  await expect(
    market.acceptProposal({ id: p.id, fingerprint: old.fingerprint }),
  ).rejects.toThrow("Hakiki tena");
  expect(
    (await prisma.marketProposal.findUnique({ where: { id: p.id } })).status,
  ).toBe("OPEN");
  const current = await market.reviewProposal(p.id);
  const result = await market.acceptProposal({
    id: p.id,
    fingerprint: current.fingerprint,
  });
  expect(
    (await prisma.order.findUnique({ where: { id: result.orderId } }))
      .shippingAddress.streetAddress,
  ).toBe("Updated street");
});
test.each(["price", "stock", "supplier", "role"])(
  "changed %s cannot silently accept stale proposal",
  async (change) => {
    const f = await marketFixture();
    const p = await marketProposal(f);
    const old = await market.reviewProposal(p.id);
    if (change === "price")
      await prisma.productPricing.updateMany({
        where: { productId: f.product.id },
        data: { price: 900 },
      });
    if (change === "stock")
      await prisma.product.update({
        where: { id: f.product.id },
        data: { stock: 1 },
      });
    if (change === "supplier") {
      const s = await prisma.supplier.create({
        data: {
          userId: f.sellerB.id,
          name: "Other",
          email: "other@example.test",
        },
      });
      await prisma.product.update({
        where: { id: f.product.id },
        data: { supplierId: s.id },
      });
    }
    if (change === "role")
      await prisma.user.update({
        where: { id: f.seller.id },
        data: { role: "BUYER" },
      });
    await expect(
      market.acceptProposal({ id: p.id, fingerprint: old.fingerprint }),
    ).rejects.toThrow();
    expect(
      (await prisma.marketProposal.findUnique({ where: { id: p.id } })).orderId,
    ).toBeNull();
  },
);
test("cancel versus accept race yields a single consistent terminal state", async () => {
  const f = await marketFixture();
  const p = await marketProposal(f);
  const checked = await market.reviewProposal(p.id);
  const before = await prisma.order.count();
  auth.mockReset();
  auth
    .mockResolvedValueOnce({ user: { id: f.user.id } })
    .mockResolvedValueOnce({ user: { id: f.seller.id } });
  const results = await Promise.allSettled([
    market.acceptProposal({ id: p.id, fingerprint: checked.fingerprint }),
    market.cancelProposal(p.id),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const saved = await prisma.marketProposal.findUnique({ where: { id: p.id } });
  expect(["ACCEPTED", "CANCELLED"]).toContain(saved.status);
  expect(await prisma.order.count()).toBe(
    before + (saved.status === "ACCEPTED" ? 1 : 0),
  );
});

test("display labels cannot leak contact-like profile data and no private fields are selected", async () => {
  const f = await marketFixture();
  await prisma.user.update({
    where: { id: f.user.id },
    data: {
      name: "person@example.com",
      paymentPhone: "+255711111111",
      password: "private-value",
    },
  });
  await prisma.supplier.update({
    where: { id: f.supplier.id },
    data: { companyName: "telegram sellername" },
  });
  const loaded = await market.loadThread(f.threadId);
  expect(loaded.thread.buyer.name).toBe("Mnunuzi");
  expect(loaded.thread.supplier.companyName).toBe(loaded.thread.supplier.name);
  const json = JSON.stringify(loaded);
  for (const privateText of [
    "person@example.com",
    "telegram sellername",
    "paymentPhone",
    "password",
    "private-value",
  ])
    expect(json).not.toContain(privateText);
  marketActor(f.seller);
  expect(
    (
      await createMarketProposal({
        id: marketId(),
        threadId: f.threadId,
        quantity: 5,
      })
    ).ok,
  ).toBe(false);
});
test("actual migration keeps accepted proposal/order link restrictive", async () => {
  const f = await marketFixture();
  const p = await marketProposal(f);
  const review = await market.reviewProposal(p.id);
  const result = await market.acceptProposal({
    id: p.id,
    fingerprint: review.fingerprint,
  });
  await prisma.orderItem.deleteMany({ where: { orderId: result.orderId } });
  await expect(
    prisma.order.delete({ where: { id: result.orderId } }),
  ).rejects.toThrow();
  expect(
    (await prisma.marketProposal.findUnique({ where: { id: p.id } })).orderId,
  ).toBe(result.orderId);
});

test("seller inbox cursor pages all own buyers and never another seller", async () => {
  const f = await marketFixture();
  for (let i = 0; i < 33; i++) {
    const buyer = await prisma.user.create({
      data: { name: "Paged buyer " + i },
    });
    await prisma.marketThread.create({
      data: {
        buyerId: buyer.id,
        supplierId: f.supplier.id,
        productId: f.product.id,
      },
    });
  }
  marketActor(f.seller);
  const first = await market.listThreads("seller");
  expect(first.items).toHaveLength(30);
  expect(first.hasMore).toBe(true);
  const last = await market.listThreads("seller", first.items.at(-1).id);
  expect(last.items).toHaveLength(4);
  expect(last.hasMore).toBe(false);
  expect(new Set([...first.items, ...last.items].map((t) => t.id)).size).toBe(
    34,
  );
  marketActor(f.sellerB);
  await expect(
    market.listThreads("seller", first.items[0].id),
  ).rejects.toThrow();
});

// Admin operations use canonical records and fresh authorization, without financial mutations.
import {
  getAdminOverview,
  getAdminOrders,
  getAdminDisputes,
} from "@/lib/admin-operations";
test("admin overview distinguishes unpaid totals and held/available balances", async () => {
  const { user, order, supplier } = await fixture();
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  auth.mockResolvedValue({ user: { id: user.id, role: "BUYER" } });
  await prisma.supplier.update({
    where: { id: supplier.id },
    data: { pendingBalance: 1200, walletBalance: 300 },
  });
  let overview = await getAdminOverview();
  expect(overview).toMatchObject({
    orders: 1,
    unpaid: 1,
    paidOrders: 0,
    paidTotal: "0",
    pendingBalance: "1200",
    walletBalance: "300",
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { isPaid: true },
  });
  overview = await getAdminOverview();
  expect(overview.paidTotal).toBe(String(order.totalPrice));
  expect(overview.unpaid).toBe(0);
});
test("admin order paging preserves paid filter and product search without private fields", async () => {
  const { user, product, order } = await fixture();
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  auth.mockResolvedValue({ user: { id: user.id } });
  for (let i = 0; i < 21; i++) await newOrder({ user, product });
  await prisma.order.update({
    where: { id: order.id },
    data: { isPaid: true },
  });
  const result = await getAdminOrders({
    status: "unpaid",
    q: "Test Item",
    page: "999",
  });
  expect(result).toMatchObject({ total: 21, page: 2, pages: 2 });
  expect(result.items).toHaveLength(1);
  expect(result.items[0]).not.toHaveProperty("shippingAddress");
  const exact = await getAdminOrders({ q: order.id, status: "paid" });
  expect(exact.items.map((o) => o.id)).toEqual([order.id]);
});
test("admin dispute queue excludes terminal requests by default and never changes money", async () => {
  const { user, product, supplier, order } = await fixture();
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  auth.mockResolvedValue({ user: { id: user.id } });
  await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      productId: product.id,
      supplierId: supplier.id,
      buyerId: user.id,
      reason: "Synthetic private reason",
    },
  });
  expect((await getAdminDisputes({})).total).toBe(1);
  await prisma.returnRequest.updateMany({ data: { status: "REJECTED" } });
  expect((await getAdminDisputes({})).total).toBe(0);
  const all = await getAdminDisputes({ status: "all" });
  expect(all.total).toBe(1);
  expect(all.items[0]).not.toHaveProperty("reason");
  expect(await prisma.supplierLedger.count()).toBe(0);
});
test("database revocation blocks admin operational queries despite stale session", async () => {
  const { user } = await fixture();
  auth.mockResolvedValue({ user: { id: user.id, role: "ADMIN" } });
  for (const fn of [getAdminOverview, getAdminOrders, getAdminDisputes])
    await expect(fn({})).rejects.toThrow("Unauthorized");
});
import { getAdminDocuments } from "@/lib/admin-operations";
import { PUT as reviewAdminDocument } from "@/app/api/admin/supplier-docs/[id]/route";
test("admin documents pending queue excludes rejected records and honors seller scope", async () => {
  const { user, supplier } = await fixture();
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  auth.mockResolvedValue({ user: { id: user.id } });
  for (const [label, verified, rejectionReason] of [
    ["Pending", false, null],
    ["Rejected", false, "Unreadable"],
    ["Approved", true, null],
  ])
    await prisma.supplierDocument.create({
      data: {
        supplierId: supplier.id,
        label,
        name: label,
        fileUrl: "",
        verified,
        rejectionReason,
      },
    });
  const pending = await getAdminDocuments({ supplierId: supplier.id });
  expect(pending.items.map((d) => d.label)).toEqual(["Pending"]);
  expect(
    (await getAdminDocuments({ status: "rejected" })).items.map((d) => d.label),
  ).toEqual(["Rejected"]);
  expect((await getAdminOverview()).pendingDocuments).toBe(pending.total);
});
test("document review saves audit atomically and requires every configured document type", async () => {
  const { user, supplier } = await fixture();
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  auth.mockResolvedValue({ user: { id: user.id } });
  const doc = await prisma.supplierDocument.create({
    data: {
      supplierId: supplier.id,
      label: "Synthetic license",
      name: "License",
      type: "License",
      fileUrl: "",
    },
  });
  const old = process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS;
  process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS = "true";
  try {
    const invoke = (id, body) =>
      reviewAdminDocument(
        new Request("http://localhost", {
          method: "PUT",
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id }) },
      );
    expect(
      (await invoke(doc.id, { verified: false, rejectionReason: " " })).status,
    ).toBe(400);
    expect((await invoke(doc.id, { verified: true })).status).toBe(200);
    expect(
      await prisma.auditLog.count({ where: { action: "DOCUMENT_APPROVED" } }),
    ).toBe(1);
    expect(
      (await prisma.supplier.findUnique({ where: { id: supplier.id } }))
        .isVerified,
    ).toBe(false);
    const certificate = await prisma.supplierDocument.create({
      data: {
        supplierId: supplier.id,
        label: "Synthetic certificate",
        name: "Certificate",
        type: "Certificate",
        fileUrl: "",
      },
    });
    expect((await invoke(certificate.id, { verified: true })).status).toBe(200);
    expect(
      (await prisma.supplier.findUnique({ where: { id: supplier.id } }))
        .isVerified,
    ).toBe(true);
    expect(
      await prisma.auditLog.count({
        where: { action: "SUPPLIER_AUTO_VERIFIED" },
      }),
    ).toBe(1);
  } finally {
    if (old === undefined) delete process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS;
    else process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS = old;
  }
});
test("concurrent final document approvals verify seller once and retain every attachment", async () => {
  const { user, supplier } = await fixture();
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  auth.mockResolvedValue({ user: { id: user.id } });
  const docs = [];
  for (const type of ["License", "Certificate"])
    docs.push(
      await prisma.supplierDocument.create({
        data: {
          supplierId: supplier.id,
          label: type,
          name: type,
          type,
          fileUrl: "https://example.test/one",
          files: ["https://example.test/one", "https://example.test/two"],
          description: "Review both pages",
        },
      }),
    );
  expect((await getAdminDocuments({})).items[0].files).toHaveLength(2);
  const old = process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS;
  process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS = "true";
  try {
    const results = await Promise.all(
      docs.map((doc) =>
        reviewAdminDocument(
          new Request("http://localhost", {
            method: "PUT",
            body: JSON.stringify({ verified: true }),
          }),
          { params: Promise.resolve({ id: doc.id }) },
        ),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(
      (await prisma.supplier.findUnique({ where: { id: supplier.id } }))
        .isVerified,
    ).toBe(true);
    expect(
      await prisma.auditLog.count({
        where: { action: "SUPPLIER_AUTO_VERIFIED" },
      }),
    ).toBe(1);
  } finally {
    if (old === undefined) delete process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS;
    else process.env.AUTO_VERIFY_SUPPLIER_ON_ALL_DOCS = old;
  }
});

import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  createBrandAction,
  createCategoryAction,
} from "@/lib/actions/product.actions";
import { requestOtp, consumeOtp } from "@/lib/otp";
async function catalogFixture() {
  const f = await fixture();
  await prisma.user.update({
    where: { id: f.user.id },
    data: { role: "SUPPLIER" },
  });
  auth.mockResolvedValue({ user: { id: f.user.id, role: "SUPPLIER" } });
  const input = {
    name: "Secure test product",
    slug: "secure-test",
    description: "Synthetic product",
    images: ["https://example.test/item.png"],
    price: "1000.00",
    stock: 5,
    brandId: f.product.brandId,
    categoryId: f.product.categoryId,
    subcategoryId: f.product.subcategoryId,
    supplierId: f.supplier.id,
    pricingTiers: [{ minQty: 5, price: 800 }],
  };
  return { ...f, input };
}
test("catalog actions reject anonymous, buyer, revoked supplier and forged owner", async () => {
  const f = await catalogFixture();
  for (const session of [null, { user: { id: f.user.id, role: "ADMIN" } }]) {
    await prisma.user.update({
      where: { id: f.user.id },
      data: { role: "BUYER" },
    });
    auth.mockResolvedValue(session);
    expect((await createProduct(f.input)).success).toBe(false);
    expect(
      (await updateProduct({ ...f.input, id: f.product.id, expectedStock: 5 }))
        .success,
    ).toBe(false);
    expect((await deleteProduct(f.product.id)).success).toBe(false);
  }
  await prisma.user.update({
    where: { id: f.user.id },
    data: { role: "SUPPLIER" },
  });
  auth.mockResolvedValue({ user: { id: f.user.id } });
  expect(
    (await createProduct({ ...f.input, supplierId: crypto.randomUUID() }))
      .success,
  ).toBe(false);
  expect(await prisma.product.count()).toBe(1);
});
test("seller catalog isolation, admin targeting and reassignment rejection", async () => {
  const f = await catalogFixture();
  const stranger = await prisma.user.create({
    data: { role: "SUPPLIER", name: "Other seller" },
  });
  const shop = await prisma.supplier.create({
    data: {
      userId: stranger.id,
      name: "Other shop",
      email: "other@example.test",
      phone: "+255700000009",
    },
  });
  auth.mockResolvedValue({ user: { id: stranger.id } });
  expect(
    (
      await updateProduct({
        ...f.input,
        supplierId: shop.id,
        id: f.product.id,
        expectedStock: 5,
      })
    ).success,
  ).toBe(false);
  expect((await deleteProduct(f.product.id)).success).toBe(false);
  expect(await getProductById(f.product.slug)).toBeNull();
  expect((await createBrandAction("Forged")).success).toBe(false);
  expect((await createCategoryAction("Forged")).success).toBe(false);
  const admin = await prisma.user.create({
    data: { role: "ADMIN", name: "Admin" },
  });
  auth.mockResolvedValue({ user: { id: admin.id } });
  expect((await createProduct(f.input)).success).toBe(true);
  expect(
    (
      await updateProduct({
        ...f.input,
        supplierId: shop.id,
        id: f.product.id,
        expectedStock: 5,
      })
    ).success,
  ).toBe(false);
});
test.each([
  { stock: 1.5 },
  { stock: -1 },
  { price: "-1" },
  { price: "1.001" },
  { pricingTiers: [{ minQty: 1.5, price: 5 }] },
  {
    pricingTiers: [
      { minQty: 5, price: 800 },
      { minQty: 5, price: 700 },
    ],
  },
])("invalid catalog quantities/prices cannot write %#", async (override) => {
  const f = await catalogFixture();
  expect((await createProduct({ ...f.input, ...override })).success).toBe(
    false,
  );
  expect(await prisma.product.count()).toBe(1);
});
test("concurrent stale-stock edits produce one winner and atomic tiers", async () => {
  const f = await catalogFixture();
  const result = await Promise.all(
    [6, 7].map((stock) =>
      updateProduct({ ...f.input, id: f.product.id, stock, expectedStock: 5 }),
    ),
  );
  expect(result.filter((r) => r.success)).toHaveLength(1);
  const product = await prisma.product.findUnique({
    where: { id: f.product.id },
    include: { pricingTiers: true },
  });
  expect([6, 7]).toContain(product.stock);
  expect(product.pricingTiers.map((t) => Number(t.price))).toEqual([800]);
  expect((await getProductById(f.product.id)).id).toBe(f.product.id);
  expect((await getProductById(f.input.slug)).id).toBe(f.product.id);
});
test("catalog edit after stock deduction cannot overwrite new stock", async () => {
  const f = await catalogFixture();
  await prisma.product.update({
    where: { id: f.product.id },
    data: { stock: { decrement: 1 } },
  });
  expect(
    (await updateProduct({ ...f.input, id: f.product.id, expectedStock: 5 }))
      .success,
  ).toBe(false);
  expect(
    (await prisma.product.findUnique({ where: { id: f.product.id } })).stock,
  ).toBe(4);
});
test("referenced product delete rolls back tier deletion", async () => {
  const f = await catalogFixture();
  await prisma.productPricing.create({
    data: { productId: f.product.id, minQty: 5, price: 800 },
  });
  expect((await deleteProduct(f.product.id)).success).toBe(false);
  expect(
    await prisma.productPricing.count({ where: { productId: f.product.id } }),
  ).toBe(1);
});
test("unreferenced product can be deleted without removing order history", async () => {
  const f = await catalogFixture();
  await prisma.orderItem.deleteMany({ where: { orderId: f.order.id } });
  expect((await deleteProduct(f.product.id)).success).toBe(true);
  expect(await prisma.order.count({ where: { id: f.order.id } })).toBe(1);
});
test("product deletion racing a new order cannot erase committed purchase items", async () => {
  const f = await catalogFixture();
  await prisma.orderItem.deleteMany({ where: { orderId: f.order.id } });
  const [deletion, creation] = await Promise.allSettled([
    deleteProduct(f.product.id),
    newOrder({ user: f.user, product: f.product, qty: 1 }),
  ]);
  if (creation.status === "fulfilled") {
    expect(
      await prisma.orderItem.count({ where: { orderId: creation.value.id } }),
    ).toBe(1);
    expect(await prisma.product.count({ where: { id: f.product.id } })).toBe(1);
    expect(deletion.status === "rejected" || !deletion.value.success).toBe(
      true,
    );
  } else {
    expect(deletion.status === "fulfilled" && deletion.value.success).toBe(
      true,
    );
    expect(
      await prisma.orderItem.count({ where: { productId: f.product.id } }),
    ).toBe(0);
  }
});
test("OTP parallel send is bounded and token is cryptographic six-digit server content", async () => {
  const phone = "+255700000011";
  const result = await Promise.allSettled(
    Array.from({ length: 6 }, () => requestOtp(phone)),
  );
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(sendSms).toHaveBeenCalledTimes(1);
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: phone },
  });
  expect(record.token).toMatch(/^\d{6}$/);
  expect(sendSms).toHaveBeenCalledWith(
    phone,
    expect.stringContaining(record.token),
  );
});
test("concurrent failed guesses commit cap and valid token cannot bypass lockout", async () => {
  const phone = "+255700000012";
  await requestOtp(phone);
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: phone },
  });
  const wrong = record.token === "111111" ? "222222" : "111111";
  await Promise.all(Array.from({ length: 8 }, () => consumeOtp(phone, wrong)));
  expect(
    (await prisma.otpThrottle.findUnique({ where: { identifier: phone } }))
      .failedAttempts,
  ).toBe(5);
  expect(await consumeOtp(phone, record.token)).toBeNull();
  await expect(requestOtp(phone)).rejects.toMatchObject({ status: 429 });
});
test("OTP expires, replays fail and resend limit survives successful consumption", async () => {
  const phone = "+255700000013";
  for (let i = 0; i < 3; i++) {
    if (i)
      await prisma.otpThrottle.update({
        where: { identifier: phone },
        data: { lastSentAt: new Date(0) },
      });
    await requestOtp(phone);
    const record = await prisma.verificationToken.findFirst({
      where: { identifier: phone },
    });
    if (!i) {
      const results = await Promise.all([
        consumeOtp(phone, record.token),
        consumeOtp(phone, record.token),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
    } else expect(await consumeOtp(phone, record.token)).not.toBeNull();
  }
  await expect(requestOtp(phone)).rejects.toMatchObject({ status: 429 });
  await prisma.otpThrottle.update({
    where: { identifier: phone },
    data: { windowStartedAt: new Date(0) },
  });
  await requestOtp(phone);
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: phone },
  });
  await prisma.verificationToken.updateMany({
    where: { identifier: phone },
    data: { expires: new Date(0) },
  });
  expect(await consumeOtp(phone, record.token)).toBeNull();
});
test("undelivered SMS invalidates credential and email never reports fake success", async () => {
  sendSms.mockRejectedValueOnce(new Error("private provider payload"));
  await expect(requestOtp("+255700000014")).rejects.toMatchObject({
    status: 503,
  });
  expect(await prisma.verificationToken.count()).toBe(0);
  await expect(requestOtp("buyer@example.test")).rejects.toMatchObject({
    status: 400,
  });
  expect(sendSms).toHaveBeenCalledTimes(1);
});
test("pre-migration unexpired phone OTP remains usable once with new throttling", async () => {
  const phone = "+255700000015";
  await prisma.verificationToken.create({
    data: {
      identifier: phone,
      token: "654321",
      expires: new Date(Date.now() + 60000),
      attempts: 2,
    },
  });
  expect(await consumeOtp(phone, "654321")).not.toBeNull();
  expect(await consumeOtp(phone, "654321")).toBeNull();
  expect(await prisma.otpThrottle.count({ where: { identifier: phone } })).toBe(
    1,
  );
});
test("OTP expiry is checked after a blocked verifier acquires its lock", async () => {
  const phone = "+255700000016";
  await requestOtp(phone);
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: phone },
  });
  let unlock, acquired;
  const ready = new Promise((resolve) => {
    acquired = resolve;
  });
  const release = new Promise((resolve) => {
    unlock = resolve;
  });
  const holder = prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${phone}, 0))`;
    acquired();
    await release;
    await tx.verificationToken.updateMany({
      where: { identifier: phone },
      data: { expires: new Date(0) },
    });
  });
  await ready;
  const verifying = consumeOtp(phone, record.token);
  unlock();
  await holder;
  expect(await verifying).toBeNull();
});
test("failed older SMS delivery cannot delete a newer resend", async () => {
  const phone = "+255700000017";
  let fail, reached;
  const ready = new Promise((resolve) => {
    reached = resolve;
  });
  sendSms.mockImplementationOnce(() => {
    reached();
    return new Promise((_, reject) => {
      fail = reject;
    });
  });
  const first = requestOtp(phone).catch((error) => error.status);
  await ready;
  await prisma.otpThrottle.update({
    where: { identifier: phone },
    data: { lastSentAt: new Date(0) },
  });
  await requestOtp(phone);
  const latest = await prisma.verificationToken.findFirst({
    where: { identifier: phone },
  });
  fail(new Error("Synthetic delivery failure"));
  expect(await first).toBe(503);
  expect(await consumeOtp(phone, latest.token)).not.toBeNull();
});
test("seller creates and deletes own unreferenced product with tiers", async () => {
  const f = await catalogFixture();
  const created = await createProduct(f.input);
  expect(created.success).toBe(true);
  expect((await deleteProduct(created.product.id)).success).toBe(true);
  expect(
    await prisma.productPricing.count({
      where: { productId: created.product.id },
    }),
  ).toBe(0);
});
test("product and original tiers roll back when replacement tier persistence fails", async () => {
  const f = await catalogFixture();
  await prisma.productPricing.create({
    data: { productId: f.product.id, minQty: 2, price: 900 },
  });
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION reject_test_tier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic tier failure'; END $$`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER reject_test_tier BEFORE INSERT ON "ProductPricing" FOR EACH ROW EXECUTE FUNCTION reject_test_tier()`,
  );
  try {
    expect(
      (
        await updateProduct({
          ...f.input,
          id: f.product.id,
          expectedStock: 5,
          stock: 7,
          price: "1200.00",
        })
      ).success,
    ).toBe(false);
    const unchanged = await prisma.product.findUnique({
      where: { id: f.product.id },
      include: { pricingTiers: true },
    });
    expect(unchanged.stock).toBe(5);
    expect(Number(unchanged.price)).toBe(1000);
    expect(unchanged.pricingTiers.map((t) => Number(t.price))).toEqual([900]);
  } finally {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER reject_test_tier ON "ProductPricing"`,
    );
    await prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_tier()`);
  }
});
import { POST as uploadSellerDocument } from "@/app/api/suppliers/documents/route";
import { PUT as updateSellerProfile } from "@/app/api/suppliers/me/route";
test("revoked seller profile/document writes fail before mutation; malformed files rejected", async () => {
  const f = await catalogFixture();
  await prisma.user.update({
    where: { id: f.user.id },
    data: { role: "BUYER" },
  });
  const request = () =>
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ label: "Demo", files: null }),
    });
  expect((await uploadSellerDocument(request())).status).toBe(401);
  expect((await updateSellerProfile(request())).status).toBe(401);
  await prisma.user.update({
    where: { id: f.user.id },
    data: { role: "SUPPLIER" },
  });
  expect((await uploadSellerDocument(request())).status).toBe(400);
  expect(await prisma.supplierDocument.count()).toBe(0);
});

import { reservePayment, reconciliationBatch } from "@/lib/payment-recovery";
import { POST as refreshPayment } from "@/app/api/zenopay/status/route";
const due = async (orderId) =>
  prisma.paymentAttempt.update({
    where: { orderId },
    data: { nextCheckAt: new Date(0) },
  });
const confirmed = (order) => ({
  order_id: attempt(order),
  payment_status: "COMPLETED",
  amount: 2000,
  reference: `verified-${order.id}`,
});
test("recovery preserves verified money through stock failure and settles once after restock", async () => {
  const { order, product } = await fixture({ stock: 0 });
  getZenopayStatus.mockResolvedValue(confirmed(order));
  expect(await reconcileZenopay(order.id, attempt(order))).toBe(
    "REQUIRES_REVIEW",
  );
  expect(
    await prisma.paymentAttempt.findUnique({ where: { orderId: order.id } }),
  ).toMatchObject({
    state: "REVIEW",
    providerReference: `verified-${order.id}`,
  });
  expect(
    await prisma.order.findUnique({ where: { id: order.id } }),
  ).toMatchObject({ isPaid: false, paymentStatus: "REQUIRES_REVIEW" });
  expect(await prisma.supplierLedger.count()).toBe(0);
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: 5 },
  });
  await due(order.id);
  expect(await reconcileZenopay(order.id, attempt(order))).toBe("COMPLETED");
  await reconcileZenopay(order.id, attempt(order));
  expect(await prisma.supplierLedger.count()).toBe(1);
  expect(
    (await prisma.product.findUnique({ where: { id: product.id } })).stock,
  ).toBe(3);
});
test("failed then completed can recover; pending cannot erase verified money", async () => {
  const { order } = await fixture({ stock: 0 });
  getZenopayStatus.mockResolvedValue({
    ...confirmed(order),
    payment_status: "FAILED",
  });
  expect(await reconcileZenopay(order.id, attempt(order))).toBe("FAILED");
  await due(order.id);
  getZenopayStatus.mockResolvedValue(confirmed(order));
  await reconcileZenopay(order.id, attempt(order));
  await due(order.id);
  getZenopayStatus.mockResolvedValue({
    ...confirmed(order),
    payment_status: "PENDING",
  });
  expect(await reconcileZenopay(order.id, attempt(order))).toBe(
    "REQUIRES_REVIEW",
  );
  expect(
    (await prisma.order.findUnique({ where: { id: order.id } })).paymentStatus,
  ).toBe("REQUIRES_REVIEW");
});
test("crash after atomic settlement recovers journal without duplicate stock or notifications", async () => {
  const { order } = await fixture({ stock: 0 });
  getZenopayStatus.mockResolvedValue(confirmed(order));
  await reconcileZenopay(order.id, attempt(order));
  await prisma.product.updateMany({ data: { stock: 5 } });
  await fulfillOrder(
    order.id,
    attempt(order),
    confirmed(order).reference,
    2000,
  );
  await due(order.id);
  expect(await reconcileZenopay(order.id, attempt(order))).toBe("COMPLETED");
  expect(await prisma.supplierLedger.count()).toBe(1);
  expect(sendSms).not.toHaveBeenCalled();
  expect(await prisma.orderNotification.count()).toBe(2);
});
test("legacy paid orders remain review across repeated verification; never replay inventory", async () => {
  const { order } = await fixture();
  await prisma.order.update({
    where: { id: order.id },
    data: { isPaid: true },
  });
  getZenopayStatus.mockResolvedValue(confirmed(order));
  expect(await reconcileZenopay(order.id, attempt(order))).toBe(
    "REQUIRES_REVIEW",
  );
  await due(order.id);
  expect(await reconcileZenopay(order.id, attempt(order))).toBe(
    "REQUIRES_REVIEW",
  );
  expect(await prisma.supplierLedger.count()).toBe(0);
});
test.each([{ order_id: "wrong" }, { amount: 1 }, { reference: "" }])(
  "invalid verified contract never settles %j",
  async (patch) => {
    const { order } = await fixture();
    getZenopayStatus.mockResolvedValue({ ...confirmed(order), ...patch });
    await expect(reconcileZenopay(order.id, attempt(order))).rejects.toThrow(
      "verification",
    );
    expect(await prisma.supplierLedger.count()).toBe(0);
    expect(
      (await prisma.paymentAttempt.findUnique({ where: { orderId: order.id } }))
        .verifiedAt,
    ).toBeNull();
  },
);
test("durable reservation and order claim roll back together on duplicate provider reference", async () => {
  const first = await fixture({ paymentResult: Prisma.DbNull });
  const second = await newOrder(first);
  await prisma.order.update({
    where: { id: second.id },
    data: { paymentResult: Prisma.DbNull },
  });
  expect(
    await reservePayment(first.order.id, first.user.id, "unique-ref", 2000),
  ).toBe(true);
  await expect(
    reservePayment(second.id, first.user.id, "unique-ref", 2000),
  ).rejects.toThrow();
  expect(
    (await prisma.order.findUnique({ where: { id: second.id } })).paymentResult,
  ).toBeNull();
});
test("owner refresh rejects anonymous, other buyer and revoked admin before provider", async () => {
  const { order, user } = await fixture();
  const req = (admin) =>
    new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ orderId: order.id, admin }),
    });
  auth.mockResolvedValue(null);
  expect((await refreshPayment(req(false))).status).toBe(401);
  auth.mockResolvedValue({ user: { id: user.id, role: "ADMIN" } });
  expect((await refreshPayment(req(true))).status).toBe(403);
  const stranger = await prisma.user.create({
    data: { name: "Other", email: "other@example.test", role: "BUYER" },
  });
  auth.mockResolvedValue({ user: { id: stranger.id } });
  expect((await refreshPayment(req(false))).status).toBe(404);
  expect(getZenopayStatus).not.toHaveBeenCalled();
  auth.mockResolvedValue({ user: { id: user.id } });
  getZenopayStatus.mockResolvedValue(confirmed(order));
  expect((await refreshPayment(req(false))).status).toBe(200);
});
test("batch defaults to dry run and is bounded; unavailable provider retains durable reference", async () => {
  const { order } = await fixture();
  getZenopayStatus.mockRejectedValue(new Error("secret"));
  await expect(reconcileZenopay(order.id, attempt(order))).rejects.toThrow(
    "unavailable",
  );
  await due(order.id);
  getZenopayStatus.mockClear();
  expect(await reconciliationBatch()).toHaveLength(1);
  expect(getZenopayStatus).not.toHaveBeenCalled();
  await expect(reconciliationBatch({ limit: 51 })).rejects.toThrow();
  expect(await reconciliationBatch({ dryRun: false })).toEqual([
    { orderId: order.id, state: "UNAVAILABLE" },
  ]);
  expect(
    JSON.stringify(await prisma.paymentAttemptEvent.findMany()),
  ).not.toContain("secret");
});
test("stored verified proof recovers after crash without requiring provider availability", async () => {
  const { order, product } = await fixture({ stock: 0 });
  getZenopayStatus.mockResolvedValue(confirmed(order));
  await reconcileZenopay(order.id, attempt(order));
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: 5 },
  });
  await due(order.id);
  getZenopayStatus.mockReset();
  getZenopayStatus.mockRejectedValue(new Error("offline"));
  expect(await reconcileZenopay(order.id, attempt(order))).toBe("COMPLETED");
  expect(getZenopayStatus).not.toHaveBeenCalled();
});
test("expired lease worker cannot overwrite newer settled proof", async () => {
  const { order } = await fixture();
  let release;
  let started;
  const ready = new Promise((resolve) => (started = resolve));
  getZenopayStatus
    .mockImplementationOnce(() => {
      started();
      return new Promise((resolve) => (release = resolve));
    })
    .mockResolvedValue(confirmed(order));
  const old = reconcileZenopay(order.id, attempt(order));
  await ready;
  await prisma.paymentAttempt.update({
    where: { orderId: order.id },
    data: { leaseUntil: new Date(0), nextCheckAt: new Date(0) },
  });
  expect(await reconcileZenopay(order.id, attempt(order))).toBe("COMPLETED");
  release({ ...confirmed(order), payment_status: "FAILED" });
  await expect(old).rejects.toThrow("unavailable");
  expect(
    (await prisma.paymentAttempt.findUnique({ where: { orderId: order.id } }))
      .state,
  ).toBe("SETTLED");
  expect(
    (await prisma.order.findUnique({ where: { id: order.id } })).paymentStatus,
  ).toBe("COMPLETED");
  expect(await prisma.supplierLedger.count()).toBe(1);
});

import { paymentQueue, paymentDetail } from "@/lib/admin-payment-recovery";
test("recovery admin queries enforce fresh roles, validate UUID and clamp pages", async () => {
  const { order, user } = await fixture();
  auth.mockResolvedValue({ user: { id: user.id, role: "ADMIN" } });
  await expect(paymentQueue({})).rejects.toThrow("Unauthorized");
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  getZenopayStatus.mockResolvedValue({
    ...confirmed(order),
    payment_status: "PENDING",
  });
  await reconcileZenopay(order.id, attempt(order));
  const result = await paymentQueue({ page: "99", q: "-".repeat(36) });
  expect(result.filters.page).toBe(1);
  expect(result.items).toHaveLength(1);
  expect(await paymentDetail("-".repeat(36))).toBeNull();
  expect(
    (await paymentDetail(result.items[0].id)).events.length,
  ).toBeGreaterThan(0);
  await prisma.user.update({ where: { id: user.id }, data: { role: "BUYER" } });
  await expect(paymentDetail(result.items[0].id)).rejects.toThrow(
    "Unauthorized",
  );
});
test("provider transaction reference cannot settle a second order", async () => {
  const first = await fixture();
  getZenopayStatus.mockResolvedValue(confirmed(first.order));
  await reconcileZenopay(first.order.id, attempt(first.order));
  const second = await newOrder(first);
  getZenopayStatus.mockResolvedValue({
    ...confirmed(second),
    reference: confirmed(first.order).reference,
  });
  await expect(reconcileZenopay(second.id, attempt(second))).rejects.toThrow(
    "verification",
  );
  expect(
    (await prisma.order.findUnique({ where: { id: second.id } })).isPaid,
  ).toBe(false);
  expect(await prisma.supplierLedger.count()).toBe(1);
});
test("read-only recovery operator report executes without mutations", async () => {
  const { order } = await fixture();
  getZenopayStatus.mockResolvedValue({
    ...confirmed(order),
    payment_status: "PENDING",
  });
  await reconcileZenopay(order.id, attempt(order));
  const sql = require("fs").readFileSync(
    require("path").join(
      __dirname,
      "../../scripts/payment-recovery-dry-run.sql",
    ),
    "utf8",
  );
  const statements = sql
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    for (const stmt of statements.filter(
      (s) => !s.startsWith("BEGIN") && s !== "ROLLBACK",
    ))
      expect(await tx.$queryRawUnsafe(stmt)).toBeDefined();
  });
  expect(await prisma.paymentAttempt.count()).toBe(1);
  expect(await prisma.supplierLedger.count()).toBe(0);
});
test("callback during cooldown requests retry instead of acknowledging unverified hint", async () => {
  const { order } = await fixture();
  getZenopayStatus.mockResolvedValue({
    ...confirmed(order),
    payment_status: "PENDING",
  });
  await reconcileZenopay(order.id, attempt(order));
  await expect(
    reconcileZenopay(order.id, attempt(order), true),
  ).rejects.toThrow("busy");
  expect(getZenopayStatus).toHaveBeenCalledTimes(1);
  expect(await prisma.supplierLedger.count()).toBe(0);
});

import {
  notificationBatch,
  notificationRetention,
} from "@/lib/order-notification-outbox";
import { queueOrderNotification } from "@/lib/order-notification-events";
import {
  retryOrderNotification,
  setOrderSmsPreference,
} from "@/lib/actions/order-notification.actions";
import { notificationQueue } from "@/lib/admin-notifications";
const acceptedSms = (to) =>
  Response.json({
    SMSMessageData: {
      Recipients: [
        { number: to, statusCode: 101, messageId: "synthetic-provider-id" },
      ],
    },
  });
async function queuedNotification() {
  const data = await fixture();
  await fulfillOrder(data.order.id, attempt(data.order), "verified");
  await prisma.orderNotification.updateMany({
    where: { kind: "SELLER_PAYMENT" },
    data: { state: "SUPPRESSED", reason: "TEST_FIXTURE_ONLY" },
  });
  return {
    ...data,
    notification: await prisma.orderNotification.findFirst({
      where: { kind: "BUYER_PAYMENT" },
    }),
  };
}
test("outbox persistence failure rolls back payment, stock and escrow", async () => {
  const { order, product } = await fixture();
  await prisma.$executeRawUnsafe(
    "ALTER TABLE \"OrderNotification\" ADD CONSTRAINT reject_seller_notification CHECK (kind <> 'SELLER_PAYMENT')",
  );
  try {
    await expect(
      fulfillOrder(order.id, attempt(order), "verified"),
    ).rejects.toThrow();
    expect(await prisma.orderNotification.count()).toBe(0);
    expect(await prisma.supplierLedger.count()).toBe(0);
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } })).stock,
    ).toBe(5);
  } finally {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "OrderNotification" DROP CONSTRAINT reject_seller_notification',
    );
  }
});
test("delivery outbox and escrow release roll back together", async () => {
  const data = await paidFixture();
  await prisma.$executeRawUnsafe(
    "ALTER TABLE \"OrderNotification\" ADD CONSTRAINT reject_delivery_notification CHECK (kind <> 'SELLER_DELIVERY')",
  );
  try {
    await expect(
      confirmDelivery(data.order.id, data.product.id, buyer(data)),
    ).rejects.toThrow();
    expect(await releases()).toBe(0);
    expect(
      (
        await prisma.supplier.findUnique({ where: { id: data.supplier.id } })
      ).walletBalance.toString(),
    ).toBe("0");
  } finally {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "OrderNotification" DROP CONSTRAINT reject_delivery_notification',
    );
  }
});
test("worker dry-run sends nothing; concurrent workers claim each event once", async () => {
  const data = await queuedNotification();
  sendSms.mockImplementation(async (to) => acceptedSms(to));
  expect(await notificationBatch()).toHaveLength(1);
  expect(sendSms).not.toHaveBeenCalled();
  await Promise.all(
    Array.from({ length: 6 }, () => notificationBatch({ dryRun: false })),
  );
  expect(sendSms).toHaveBeenCalledTimes(1);
  expect(
    await prisma.orderNotification.findUnique({
      where: { id: data.notification.id },
    }),
  ).toMatchObject({
    state: "ACCEPTED",
    attempts: 1,
    providerMessageId: "synthetic-provider-id",
  });
  await notificationBatch({ dryRun: false });
  expect(sendSms).toHaveBeenCalledTimes(1);
});
test("repeated event enqueue does not recreate accepted notification", async () => {
  const data = await queuedNotification();
  sendSms.mockImplementation(async (to) => acceptedSms(to));
  await notificationBatch({ dryRun: false });
  await prisma.$transaction((tx) =>
    queueOrderNotification(tx, {
      orderId: data.order.id,
      kind: "BUYER_PAYMENT",
      targetId: data.user.id,
    }),
  );
  await notificationBatch({ dryRun: false });
  expect(sendSms).toHaveBeenCalledTimes(1);
});
test("expired worker lease becomes unknown without automatic duplicate send", async () => {
  const data = await queuedNotification();
  await prisma.orderNotification.update({
    where: { id: data.notification.id },
    data: {
      state: "SENDING",
      attempts: 1,
      leaseToken: "crashed",
      leaseUntil: new Date(0),
    },
  });
  await notificationBatch({ dryRun: false });
  await notificationBatch({ dryRun: false });
  expect(sendSms).not.toHaveBeenCalled();
  expect(
    (
      await prisma.orderNotification.findUnique({
        where: { id: data.notification.id },
      })
    ).state,
  ).toBe("UNKNOWN");
});
test("stale worker completion cannot overwrite expired-lease review state", async () => {
  const data = await queuedNotification();
  let release, started;
  const ready = new Promise((r) => (started = r));
  sendSms.mockImplementationOnce((to) => {
    started();
    return new Promise((resolve) => (release = () => resolve(acceptedSms(to))));
  });
  const old = notificationBatch({ dryRun: false });
  await ready;
  await prisma.orderNotification.update({
    where: { id: data.notification.id },
    data: { leaseUntil: new Date(0) },
  });
  await notificationBatch({ dryRun: false });
  release();
  await old;
  expect(
    (
      await prisma.orderNotification.findUnique({
        where: { id: data.notification.id },
      })
    ).state,
  ).toBe("UNKNOWN");
  expect(sendSms).toHaveBeenCalledTimes(1);
});
test("ambiguous network outcomes remain unknown and provider errors are redacted", async () => {
  const data = await queuedNotification();
  sendSms.mockRejectedValue(new Error("secret-contact-body"));
  await notificationBatch({ dryRun: false });
  await notificationBatch({ dryRun: false });
  expect(sendSms).toHaveBeenCalledTimes(1);
  expect(
    (
      await prisma.orderNotification.findUnique({
        where: { id: data.notification.id },
      })
    ).state,
  ).toBe("UNKNOWN");
  expect(
    JSON.stringify(await prisma.orderNotificationEvent.findMany()),
  ).not.toContain("secret-contact-body");
});
test("explicit provider transient rejection backs off and caps attempts at five", async () => {
  const data = await queuedNotification();
  sendSms.mockImplementation(async (to) =>
    Response.json({
      SMSMessageData: { Recipients: [{ number: to, statusCode: 500 }] },
    }),
  );
  for (let i = 0; i < 5; i++) {
    await notificationBatch({ dryRun: false });
    await notificationBatch({ dryRun: false });
    expect(sendSms).toHaveBeenCalledTimes(i + 1);
    await prisma.orderNotification.update({
      where: { id: data.notification.id },
      data: { nextAttemptAt: new Date(0) },
    });
  }
  expect(
    await prisma.orderNotification.findUnique({
      where: { id: data.notification.id },
    }),
  ).toMatchObject({ state: "FAILED", attempts: 5 });
  await notificationBatch({ dryRun: false });
  expect(sendSms).toHaveBeenCalledTimes(5);
});
test("permanent invalid route fails without provider call", async () => {
  const data = await queuedNotification();
  await prisma.user.update({
    where: { id: data.user.id },
    data: { phone: "invalid", paymentPhone: null },
  });
  await notificationBatch({ dryRun: false });
  expect(sendSms).not.toHaveBeenCalled();
  expect(
    (
      await prisma.orderNotification.findUnique({
        where: { id: data.notification.id },
      })
    ).state,
  ).toBe("FAILED");
});
test("account opt-out suppresses queued SMS, preserves OTP preference and cannot replay", async () => {
  const data = await queuedNotification();
  auth.mockResolvedValue({ user: { id: data.user.id } });
  expect((await setOrderSmsPreference(false)).success).toBe(true);
  await notificationBatch({ dryRun: false });
  expect(sendSms).not.toHaveBeenCalled();
  expect(
    (
      await prisma.orderNotification.findUnique({
        where: { id: data.notification.id },
      })
    ).state,
  ).toBe("SUPPRESSED");
  await setOrderSmsPreference(true);
  await notificationBatch({ dryRun: false });
  expect(sendSms).not.toHaveBeenCalled();
});
test("provider opt-out is suppressed and admin cannot override it", async () => {
  const data = await queuedNotification();
  sendSms.mockImplementation(async (to) =>
    Response.json({
      SMSMessageData: { Recipients: [{ number: to, statusCode: 406 }] },
    }),
  );
  await notificationBatch({ dryRun: false });
  await prisma.user.update({
    where: { id: data.user.id },
    data: { role: "ADMIN" },
  });
  auth.mockResolvedValue({ user: { id: data.user.id } });
  expect(
    (
      await retryOrderNotification({
        id: data.notification.id,
        acknowledgeUnknown: true,
      })
    ).success,
  ).toBe(false);
});
test("admin retry requires fresh role, unknown acknowledgement and remaining attempt budget", async () => {
  const data = await queuedNotification();
  await prisma.orderNotification.update({
    where: { id: data.notification.id },
    data: { state: "UNKNOWN", attempts: 1 },
  });
  auth.mockResolvedValue(null);
  expect(
    (
      await retryOrderNotification({
        id: data.notification.id,
        acknowledgeUnknown: true,
      })
    ).success,
  ).toBe(false);
  auth.mockResolvedValue({ user: { id: data.user.id, role: "ADMIN" } });
  expect(
    (
      await retryOrderNotification({
        id: data.notification.id,
        acknowledgeUnknown: true,
      })
    ).success,
  ).toBe(false);
  await expect(notificationQueue({})).rejects.toThrow("Unauthorized");
  await prisma.user.update({
    where: { id: data.user.id },
    data: { role: "ADMIN" },
  });
  expect(
    (
      await retryOrderNotification({
        id: data.notification.id,
        acknowledgeUnknown: false,
      })
    ).success,
  ).toBe(false);
  expect(
    (
      await retryOrderNotification({
        id: data.notification.id,
        acknowledgeUnknown: true,
      })
    ).success,
  ).toBe(true);
  expect(sendSms).not.toHaveBeenCalled();
  await prisma.orderNotification.update({
    where: { id: data.notification.id },
    data: { state: "FAILED", attempts: 5 },
  });
  expect(
    (
      await retryOrderNotification({
        id: data.notification.id,
        acknowledgeUnknown: true,
      })
    ).success,
  ).toBe(false);
  expect((await notificationQueue({ page: "999" })).filters.page).toBe(1);
});
test("retention only removes old terminal event history and preserves replay tombstones", async () => {
  const data = await queuedNotification();
  const old = new Date(Date.now() - 120 * 86400000),
    cutoff = new Date(Date.now() - 100 * 86400000);
  await prisma.orderNotification.update({
    where: { id: data.notification.id },
    data: { state: "ACCEPTED", completedAt: old },
  });
  await prisma.orderNotificationEvent.updateMany({ data: { createdAt: old } });
  expect((await notificationRetention({ olderThan: cutoff })).eligible).toBe(1);
  expect(await prisma.orderNotificationEvent.count()).toBe(2);
  await notificationRetention({ olderThan: cutoff, dryRun: false });
  expect(await prisma.orderNotificationEvent.count()).toBe(1);
  expect(await prisma.orderNotification.count()).toBe(2);
  await expect(
    notificationRetention({ olderThan: new Date() }),
  ).rejects.toThrow();
  await prisma.$transaction((tx) =>
    queueOrderNotification(tx, {
      orderId: data.order.id,
      kind: "BUYER_PAYMENT",
      targetId: data.user.id,
    }),
  );
  expect(await prisma.orderNotification.count()).toBe(2);
});

test("delayed seller alert includes remaining escrow items after partial delivery", async () => {
  const data = await paidFixture({ twoItems: true });
  const seller = await prisma.user.create({
    data: { name: "Synthetic Seller", role: "SUPPLIER" },
  });
  await prisma.supplier.update({
    where: { id: data.supplier.id },
    data: { userId: seller.id },
  });
  await confirmDelivery(data.order.id, data.product.id, buyer(data));
  sendSms.mockImplementation(async (to) => acceptedSms(to));
  await notificationBatch({ dryRun: false });
  const sellerAlert = sendSms.mock.calls.find(([, body]) =>
    body.includes("umepokea agizo jipya"),
  );
  expect(sellerAlert).toBeDefined();
  expect(sellerAlert[1]).toContain("Second");
  expect(sellerAlert[1]).not.toContain(`2x ${data.product.name}`);
});
test("revoked supplier is suppressed before queued financial SMS is sent", async () => {
  const data = await fixture();
  await fulfillOrder(data.order.id, attempt(data.order), "verified");
  await prisma.user.update({
    where: { id: data.user.id },
    data: { role: "BUYER" },
  });
  sendSms.mockImplementation(async (to) => acceptedSms(to));
  await notificationBatch({ dryRun: false });
  expect(sendSms).toHaveBeenCalledTimes(1);
  expect(
    (
      await prisma.orderNotification.findFirst({
        where: { kind: "SELLER_PAYMENT" },
      })
    ).reason,
  ).toBe("SELLER_ACCESS_REVOKED");
});
test("provider optout persists account preference for later order notifications", async () => {
  const data = await queuedNotification();
  sendSms.mockImplementation(async (to) =>
    Response.json({
      SMSMessageData: { Recipients: [{ number: to, statusCode: 406 }] },
    }),
  );
  await notificationBatch({ dryRun: false });
  expect(
    (await prisma.user.findUnique({ where: { id: data.user.id } }))
      .orderSmsEnabled,
  ).toBe(false);
});
test("release preflight and notification report execute read-only", async () => {
  for (const name of [
    "release-preflight.sql",
    "notification-outbox-dry-run.sql",
    "runtime-baseline-preflight.sql",
    "worker-health-preflight.sql",
  ]) {
    const sql = require("fs").readFileSync(
      require("path").join(__dirname, "../../scripts", name),
      "utf8",
    );
    const statements = sql
      .replace(/--[^\n]*/g, "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("BEGIN") && s !== "ROLLBACK");
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      for (const statement of statements) {
        const rows = await tx.$queryRawUnsafe(statement);
        if (name === "release-preflight.sql")
          for (const row of rows)
            expect(Object.values(row).includes(false)).toBe(false);
      }
    });
  }
});

test("SMS preference migration preserves existing accounts with transactional default", async () => {
  const data = await fixture();
  const sql = require("fs")
    .readFileSync(
      require("path").join(
        __dirname,
        "../../prisma/migrations/20261026203000_order_notification_outbox/migration.sql",
      ),
      "utf8",
    )
    .split(";")[0];
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'ALTER TABLE "User" DROP COLUMN "orderSmsEnabled"',
    );
    await tx.$executeRawUnsafe(sql);
    const user = await tx.user.findUnique({ where: { id: data.user.id } });
    expect(user.orderSmsEnabled).toBe(true);
    expect(user.name).toBe(data.user.name);
  });
});
import { remindBuyerToConfirmDelivery } from "@/lib/actions/supplier-order.actions";
test("delivery reminder retries queue once and revoked/disputed paths cannot send", async () => {
  const data = await paidFixture();
  await prisma.order.update({
    where: { id: data.order.id },
    data: { shippingAddress: { phone: "+255700000000" } },
  });
  const seller = await prisma.user.create({
    data: { name: "Synthetic Reminder Seller", role: "SUPPLIER" },
  });
  await prisma.supplier.update({
    where: { id: data.supplier.id },
    data: { userId: seller.id },
  });
  await prisma.orderItem.updateMany({
    where: { orderId: data.order.id },
    data: { status: "DISPATCHED" },
  });
  auth.mockResolvedValue({ user: { id: seller.id, role: "SUPPLIER" } });
  const args = { orderId: data.order.id, productId: data.product.id };
  const results = await Promise.all(
    Array.from({ length: 4 }, () => remindBuyerToConfirmDelivery(args)),
  );
  expect(results.every((r) => r.success)).toBe(true);
  expect(
    await prisma.orderNotification.count({ where: { kind: "BUYER_REMINDER" } }),
  ).toBe(1);
  expect(sendSms).not.toHaveBeenCalled();
  await prisma.user.update({
    where: { id: seller.id },
    data: { role: "BUYER" },
  });
  expect((await remindBuyerToConfirmDelivery(args)).success).toBe(false);
  await prisma.user.update({
    where: { id: seller.id },
    data: { role: "SUPPLIER" },
  });
  await openOrderDispute(
    data.order.id,
    data.product.id,
    data.user.id,
    "Synthetic dispute",
  );
  expect((await remindBuyerToConfirmDelivery(args)).success).toBe(false);
  await prisma.orderNotification.updateMany({
    where: { kind: { not: "BUYER_REMINDER" } },
    data: { state: "SUPPRESSED" },
  });
  await notificationBatch({ dryRun: false });
  expect(sendSms).not.toHaveBeenCalled();
  expect(
    (
      await prisma.orderNotification.findFirst({
        where: { kind: "BUYER_REMINDER" },
      })
    ).state,
  ).toBe("SUPPRESSED");
});
// Manual money reviews: real PostgreSQL locking, holds and audit boundaries.
import {
  submitMoneyRequest,
  decideMoneyRequest,
  withdrawalBalance,
} from "@/lib/money-review";
import {
  requestMoneyReview,
  reviewMoneyCase,
} from "@/lib/actions/money-review.actions";
import { moneyReviewView } from "@/lib/money-review-views";
const moneyKey = () => require("node:crypto").randomUUID();
async function moneyFixture() {
  const f = await fixture();
  const seller = await prisma.user.create({
    data: {
      name: "Seller",
      role: "SUPPLIER",
      email: "money-seller@example.test",
    },
  });
  const admin = await prisma.user.create({
    data: { name: "Admin", role: "ADMIN", email: "money-admin@example.test" },
  });
  const other = await prisma.user.create({
    data: {
      name: "Other",
      role: "SUPPLIER",
      email: "money-other@example.test",
    },
  });
  await prisma.supplier.update({
    where: { id: f.supplier.id },
    data: { userId: seller.id, walletBalance: 1000 },
  });
  return { ...f, seller, admin, other };
}
const withdrawal = (amount = "600.00") => ({
  kind: "WITHDRAWAL",
  requestKey: moneyKey(),
  amount,
  reason: "Synthetic withdrawal request",
});
const refund = (f) => ({
  kind: "REFUND",
  requestKey: moneyKey(),
  orderId: f.order.id,
  productId: f.product.id,
  quantity: 1,
  reason: "Synthetic item issue",
});
const decision = (id, state) => ({
  id,
  state,
  reason: "Synthetic reviewed decision",
});
test("money actions deny anonymous, buyer withdrawal and revoked seller; no holds created", async () => {
  const f = await moneyFixture();
  auth.mockResolvedValue(null);
  expect((await requestMoneyReview(withdrawal())).success).toBe(false);
  auth.mockResolvedValue({ user: { id: f.user.id, role: "SUPPLIER" } });
  expect((await requestMoneyReview(withdrawal())).success).toBe(false);
  await prisma.user.update({
    where: { id: f.seller.id },
    data: { role: "BUYER" },
  });
  auth.mockResolvedValue({ user: { id: f.seller.id, role: "SUPPLIER" } });
  expect((await requestMoneyReview(withdrawal())).success).toBe(false);
  expect(await prisma.moneyReviewCase.count()).toBe(0);
});
test("concurrent same-key requests create one hold and one audit event", async () => {
  const f = await moneyFixture(),
    input = withdrawal();
  const ids = await Promise.all(
    Array.from({ length: 5 }, () => submitMoneyRequest(f.seller.id, input)),
  );
  expect(new Set(ids).size).toBe(1);
  expect(await prisma.moneyReviewEvent.count()).toBe(1);
  expect(
    (
      await prisma.supplier.findUnique({ where: { id: f.supplier.id } })
    ).walletBalance.toString(),
  ).toBe("1000");
  await expect(
    submitMoneyRequest(f.seller.id, { ...input, amount: "700" }),
  ).rejects.toThrow();
});
test("concurrent independent holds cannot oversubscribe wallet", async () => {
  const f = await moneyFixture();
  const results = await Promise.allSettled([
    submitMoneyRequest(f.seller.id, withdrawal()),
    submitMoneyRequest(f.seller.id, withdrawal()),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const b = await prisma.$transaction((tx) =>
    withdrawalBalance(tx, f.supplier.id),
  );
  expect(b.reserved.toString()).toBe("600");
  expect(b.available.toString()).toBe("400");
  expect(await prisma.supplierLedger.count()).toBe(0);
});
test("approval retains hold, cancel/reject races release exactly once with no wallet debit", async () => {
  const f = await moneyFixture(),
    id = await submitMoneyRequest(f.seller.id, withdrawal());
  await decideMoneyRequest(f.admin.id, decision(id, "APPROVED"));
  expect(
    (
      await prisma.$transaction((tx) => withdrawalBalance(tx, f.supplier.id))
    ).reserved.toString(),
  ).toBe("600");
  const results = await Promise.allSettled([
    decideMoneyRequest(f.seller.id, decision(id, "CANCELLED")),
    decideMoneyRequest(f.admin.id, decision(id, "REJECTED")),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const b = await prisma.$transaction((tx) =>
    withdrawalBalance(tx, f.supplier.id),
  );
  expect(b.available.toString()).toBe("1000");
  expect(b.reserved.toString()).toBe("0");
  expect(await prisma.moneyReviewEvent.count()).toBe(3);
});
test("wrong seller cannot read/cancel and revoked admin cannot review direct action", async () => {
  const f = await moneyFixture(),
    id = await submitMoneyRequest(f.seller.id, withdrawal());
  await expect(
    decideMoneyRequest(f.other.id, decision(id, "CANCELLED")),
  ).rejects.toThrow("Unauthorized");
  await prisma.supplier.create({
    data: {
      userId: f.other.id,
      name: "Other",
      email: "other-supplier@example.test",
    },
  });
  auth.mockResolvedValue({ user: { id: f.other.id } });
  expect((await moneyReviewView("supplier", { id })).cases).toHaveLength(0);
  await prisma.user.update({
    where: { id: f.admin.id },
    data: { role: "BUYER" },
  });
  auth.mockResolvedValue({ user: { id: f.admin.id, role: "ADMIN" } });
  expect((await reviewMoneyCase(decision(id, "APPROVED"))).success).toBe(false);
});
test("legacy transferred payouts pause new holds rather than guessing prior wallet accounting", async () => {
  const f = await moneyFixture();
  await prisma.payoutRequest.create({
    data: {
      supplierId: f.supplier.id,
      userId: f.seller.id,
      amount: 1,
      status: "TRANSFERRED",
      paymentMethod: "fixture",
      accountNumber: "synthetic",
    },
  });
  await expect(submitMoneyRequest(f.seller.id, withdrawal())).rejects.toThrow();
});
test("refund ownership, unpaid and legacy refunded boundaries", async () => {
  const f = await moneyFixture();
  await expect(submitMoneyRequest(f.other.id, refund(f))).rejects.toThrow(
    "Unauthorized",
  );
  await expect(submitMoneyRequest(f.user.id, refund(f))).rejects.toThrow();
  await fulfillOrder(f.order.id, attempt(f.order), "verified");
  await prisma.returnRequest.create({
    data: {
      orderId: f.order.id,
      productId: f.product.id,
      buyerId: f.user.id,
      supplierId: f.supplier.id,
      reason: "legacy",
      status: "REFUNDED",
    },
  });
  await expect(submitMoneyRequest(f.user.id, refund(f))).rejects.toThrow(
    "Existing refund",
  );
});
test("partial refund requests snapshot item prices and cannot over-allocate under concurrency", async () => {
  const f = await moneyFixture();
  await fulfillOrder(f.order.id, attempt(f.order), "verified");
  const results = await Promise.allSettled(
    Array.from({ length: 3 }, () => submitMoneyRequest(f.user.id, refund(f))),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
  const rows = await prisma.moneyReviewCase.findMany();
  expect(
    rows.every((r) => r.amount.toString() === "1000" && !r.paymentVerified),
  ).toBe(true);
  await expect(
    decideMoneyRequest(f.admin.id, decision(rows[0].id, "APPROVED")),
  ).rejects.toThrow("Refund approval unavailable");
  expect(await prisma.moneyReviewEvent.count()).toBe(2);
});
test("refund review blocks whole/item escrow release and seller withdrawal approval", async () => {
  const f = await moneyFixture();
  await fulfillOrder(f.order.id, attempt(f.order), "verified");
  const wid = await submitMoneyRequest(f.seller.id, withdrawal());
  const rid = await submitMoneyRequest(f.user.id, refund(f));
  await expect(
    confirmDelivery(f.order.id, f.product.id, {
      kind: "buyer",
      userId: f.user.id,
    }),
  ).rejects.toThrow("Refund review");
  await expect(
    confirmDelivery(f.order.id, undefined, {
      kind: "admin",
      userId: f.admin.id,
    }),
  ).rejects.toThrow("Refund review");
  await expect(
    decideMoneyRequest(f.admin.id, decision(wid, "APPROVED")),
  ).rejects.toThrow();
  await expect(
    submitMoneyRequest(f.seller.id, withdrawal("1")),
  ).rejects.toThrow();
  await decideMoneyRequest(f.user.id, decision(rid, "CANCELLED"));
  await confirmDelivery(f.order.id, f.product.id, {
    kind: "buyer",
    userId: f.user.id,
  });
  expect(
    await prisma.supplierLedger.count({ where: { type: "ESCROW_RELEASE" } }),
  ).toBe(1);
});
test("delivered item refund remains a review case and never claws back wallet or invents payment", async () => {
  const f = await moneyFixture();
  await fulfillOrder(f.order.id, attempt(f.order), "verified");
  await confirmDelivery(f.order.id, f.product.id, {
    kind: "buyer",
    userId: f.user.id,
  });
  const before = await prisma.supplier.findUnique({
    where: { id: f.supplier.id },
  });
  const id = await submitMoneyRequest(f.user.id, refund(f));
  await decideMoneyRequest(f.admin.id, decision(id, "UNDER_REVIEW"));
  const after = await prisma.supplier.findUnique({
    where: { id: f.supplier.id },
  });
  expect(after.walletBalance.equals(before.walletBalance)).toBe(true);
  expect(await prisma.supplierLedger.count({ where: { type: "REFUND" } })).toBe(
    0,
  );
});
test("refund/delivery race serializes parent; unresolved request never triggers subsequent release", async () => {
  const f = await moneyFixture();
  await fulfillOrder(f.order.id, attempt(f.order), "verified");
  await Promise.allSettled([
    submitMoneyRequest(f.user.id, refund(f)),
    confirmDelivery(f.order.id, f.product.id, {
      kind: "buyer",
      userId: f.user.id,
    }),
  ]);
  expect(await prisma.moneyReviewCase.count()).toBe(1);
  expect(
    await prisma.supplierLedger.count({ where: { type: "ESCROW_RELEASE" } }),
  ).toBeLessThanOrEqual(1);
  const item = await prisma.orderItem.findUnique({
    where: {
      orderId_productId: { orderId: f.order.id, productId: f.product.id },
    },
  });
  if (!item.isDelivered)
    await expect(
      confirmDelivery(f.order.id, undefined, {
        kind: "admin",
        userId: f.admin.id,
      }),
    ).rejects.toThrow();
});
test("audit insert failure rolls back case and reservation", async () => {
  const f = await moneyFixture();
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "MoneyReviewEvent" ADD CONSTRAINT "fixture_reject_event" CHECK ("state" != \'REQUESTED\')',
  );
  try {
    await expect(
      submitMoneyRequest(f.seller.id, withdrawal()),
    ).rejects.toThrow();
    expect(await prisma.moneyReviewCase.count()).toBe(0);
  } finally {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "MoneyReviewEvent" DROP CONSTRAINT "fixture_reject_event"',
    );
  }
});
test("refund idempotency and rejected quantity recovery preserve immutable history", async () => {
  const f = await moneyFixture();
  await fulfillOrder(f.order.id, attempt(f.order), "verified");
  const input = { ...refund(f), quantity: 2 };
  const ids = await Promise.all([
    submitMoneyRequest(f.user.id, input),
    submitMoneyRequest(f.user.id, input),
  ]);
  expect(ids[0]).toBe(ids[1]);
  await decideMoneyRequest(f.admin.id, decision(ids[0], "REJECTED"));
  await decideMoneyRequest(f.admin.id, decision(ids[0], "REJECTED"));
  await submitMoneyRequest(f.user.id, { ...input, requestKey: moneyKey() });
  expect(await prisma.moneyReviewEvent.count()).toBe(3);
});

test("admin-only seller identity and owner role views minimize disclosure", async () => {
  const f = await moneyFixture();
  const id = await submitMoneyRequest(f.seller.id, withdrawal());
  auth.mockResolvedValue({ user: { id: f.admin.id } });
  const adminView = await moneyReviewView("admin", { id });
  expect(adminView.cases[0].adminContext.supplierId).toBe(f.supplier.id);
  expect(adminView.cases[0].adminContext.actorId).toBe(f.seller.id);
  expect(JSON.stringify(adminView)).not.toContain("money-seller@example.test");
  auth.mockResolvedValue({ user: { id: f.seller.id } });
  const own = await moneyReviewView("supplier", { id });
  expect(own.cases[0].adminContext).toBeNull();
  expect(own.cases[0].supplierId).toBeUndefined();
  auth.mockResolvedValue({ user: { id: f.user.id } });
  await expect(moneyReviewView("admin")).rejects.toThrow("Unauthorized");
  expect((await moneyReviewView("buyer", { id })).cases).toHaveLength(0);
});
test("forward refund quantity guard rejects NULL independently of action validation", async () => {
  const f = await moneyFixture();
  await expect(
    prisma.moneyReviewCase.create({
      data: {
        actorId: f.user.id,
        supplierId: f.supplier.id,
        kind: "REFUND",
        requestKey: moneyKey(),
        amount: 1,
        reason: "Synthetic constraint check",
        orderId: f.order.id,
        productId: f.product.id,
        quantity: null,
      },
    }),
  ).rejects.toThrow();
  expect(await prisma.moneyReviewCase.count()).toBe(0);
});
test("forward quantity guard refuses invalid existing cases without repairing or deleting them", async () => {
  const f = await moneyFixture();
  const guard = `ALTER TABLE "MoneyReviewCase" ADD CONSTRAINT "MoneyReviewCase_refund_quantity_required" CHECK ("kind" <> 'REFUND' OR "quantity" IS NOT NULL)`;
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "MoneyReviewCase" DROP CONSTRAINT "MoneyReviewCase_refund_quantity_required"',
  );
  let bad;
  try {
    bad = await prisma.moneyReviewCase.create({
      data: {
        actorId: f.user.id,
        supplierId: f.supplier.id,
        kind: "REFUND",
        requestKey: moneyKey(),
        amount: 1,
        reason: "Synthetic pre-guard row",
        orderId: f.order.id,
        productId: f.product.id,
        quantity: null,
      },
    });
    await expect(prisma.$executeRawUnsafe(guard)).rejects.toThrow();
    expect(
      (await prisma.moneyReviewCase.findUnique({ where: { id: bad.id } }))
        .quantity,
    ).toBeNull();
  } finally {
    if (bad) await prisma.moneyReviewCase.delete({ where: { id: bad.id } });
    await prisma.$executeRawUnsafe(guard);
  }
});
// Seller applications: same database and mocked transport as the payment suite.
import {
  submitSellerApplication,
  reviewSellerApplication,
  mySellerApplication,
  phoneDigest,
} from "@/lib/seller-registration";
import { sellerNoticeBatch } from "@/lib/seller-notification-outbox";
import { getPublicShop, shopCatalog } from "@/lib/public-shop";
const applicationInput = {
  name: "Synthetic Shop",
  username: "synthetic-shop",
  about: "Kitchen and household products",
  smsConsent: true,
};
async function applicant() {
  const user = await prisma.user.create({
    data: {
      name: "Synthetic applicant",
      phone: "+255712345678",
      phoneVerified: new Date(),
      role: "BUYER",
    },
  });
  auth.mockResolvedValue({ user: { id: user.id, role: "BUYER" } });
  return user;
}
async function applicationAdmin() {
  const user = await prisma.user.create({
    data: { name: "Synthetic reviewer", role: "ADMIN" },
  });
  auth.mockResolvedValue({ user: { id: user.id, role: "ADMIN" } });
  return user;
}
test("seller application rejects anonymous, unverified and admin role changes", async () => {
  auth.mockResolvedValue(null);
  await expect(submitSellerApplication(applicationInput)).rejects.toThrow(
    "Sign in",
  );
  const user = await applicant();
  await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerified: null },
  });
  await expect(submitSellerApplication(applicationInput)).rejects.toThrow(
    "Verify",
  );
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN", phoneVerified: new Date() },
  });
  await expect(submitSellerApplication(applicationInput)).rejects.toThrow(
    "workspace",
  );
  expect(await prisma.supplier.count()).toBe(0);
  expect(sendSms).not.toHaveBeenCalled();
});
test("concurrent application retries create one profile and one durable receipt", async () => {
  const user = await applicant();
  const results = await Promise.all(
    Array.from({ length: 6 }, () => submitSellerApplication(applicationInput)),
  );
  expect(new Set(results.map((r) => r.id)).size).toBe(1);
  expect(await prisma.supplier.count()).toBe(1);
  expect(await prisma.sellerNotice.count()).toBe(1);
  expect((await prisma.user.findUnique({ where: { id: user.id } })).role).toBe(
    "SUPPLIER",
  );
  expect((await mySellerApplication()).registration.state).toBe("PENDING");
  expect(sendSms).not.toHaveBeenCalled();
  expect(await getPublicShop("synthetic-shop")).toBeNull();
});
test("registration rejects caller role/supplier binding and contact content", async () => {
  await applicant();
  for (const extra of [
    { role: "ADMIN" },
    { supplierId: crypto.randomUUID() },
    { about: "Call +255712345678" },
    { name: "mail@example.com" },
    { username: "../shop" },
  ])
    await expect(
      submitSellerApplication({ ...applicationInput, ...extra }),
    ).rejects.toThrow();
  expect(await prisma.supplier.count()).toBe(0);
});
test("review requires current DB admin, commits audit and deduplicates repeated approval", async () => {
  await applicant();
  const app = await submitSellerApplication(applicationInput);
  await expect(
    reviewSellerApplication({
      id: app.id,
      version: 1,
      decision: "APPROVED",
      reason: "Reviewed documents",
    }),
  ).rejects.toThrow();
  const admin = await applicationAdmin();
  const input = {
    id: app.id,
    version: 1,
    decision: "APPROVED",
    reason: "Reviewed profile",
  };
  await Promise.all(
    Array.from({ length: 4 }, () => reviewSellerApplication(input)),
  );
  expect(await prisma.sellerNotice.count()).toBe(2);
  expect(
    await prisma.auditLog.count({
      where: { action: "SELLER_APPLICATION_APPROVED" },
    }),
  ).toBe(1);
  const shop = await getPublicShop("synthetic-shop");
  expect(shop.name).toBe(applicationInput.name);
  for (const key of ["email", "phone", "user", "phoneDigest", "walletBalance"])
    expect(shop).not.toHaveProperty(key);
  await prisma.user.update({
    where: { id: admin.id },
    data: { role: "BUYER" },
  });
  await expect(
    reviewSellerApplication({ ...input, version: 2, decision: "REJECTED" }),
  ).rejects.toThrow();
});
test("competing review decisions cannot silently overwrite the winner", async () => {
  await applicant();
  const app = await submitSellerApplication(applicationInput);
  await applicationAdmin();
  const results = await Promise.allSettled(
    ["APPROVED", "REJECTED"].map((decision) =>
      reviewSellerApplication({
        id: app.id,
        version: 1,
        decision,
        reason: "Synthetic review",
      }),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await prisma.sellerNotice.count()).toBe(2);
  expect(await prisma.auditLog.count()).toBe(1);
});
test("application rollback on duplicate shop link leaves no role or notice", async () => {
  const user = await applicant();
  await prisma.supplier.create({
    data: {
      user: { create: { name: "Other", role: "SUPPLIER" } },
      name: "Other",
      email: "other@example.invalid",
      username: applicationInput.username,
    },
  });
  await expect(submitSellerApplication(applicationInput)).rejects.toThrow();
  expect((await prisma.user.findUnique({ where: { id: user.id } })).role).toBe(
    "BUYER",
  );
  expect(await prisma.sellerRegistration.count()).toBe(0);
  expect(await prisma.sellerNotice.count()).toBe(0);
});
test("seller notice dry run has no claims and concurrent workers accept receipt once", async () => {
  await applicant();
  await submitSellerApplication(applicationInput);
  sendSms.mockImplementation(async (recipient) => ({
    json: async () => ({
      SMSMessageData: {
        Recipients: [
          {
            number: recipient,
            statusCode: 101,
            messageId: "synthetic-message",
          },
        ],
      },
    }),
  }));
  await sellerNoticeBatch();
  expect(sendSms).not.toHaveBeenCalled();
  expect((await prisma.sellerNotice.findFirst()).attempts).toBe(0);
  await Promise.all([
    sellerNoticeBatch({ dryRun: false }),
    sellerNoticeBatch({ dryRun: false }),
  ]);
  expect(sendSms).toHaveBeenCalledTimes(1);
  expect((await prisma.sellerNotice.findFirst()).state).toBe("ACCEPTED");
});
test("seller notice consent and phone binding stop arbitrary or changed recipients", async () => {
  const user = await applicant();
  await submitSellerApplication({ ...applicationInput, smsConsent: false });
  await sellerNoticeBatch({ dryRun: false });
  expect(sendSms).not.toHaveBeenCalled();
  await prisma.sellerRegistration.updateMany({ data: { smsConsent: true } });
  await prisma.sellerNotice.updateMany({ data: { state: "QUEUED" } });
  await prisma.user.update({
    where: { id: user.id },
    data: { phone: "+255712345679" },
  });
  await sellerNoticeBatch({ dryRun: false });
  expect(sendSms).not.toHaveBeenCalled();
  expect((await prisma.sellerNotice.findFirst()).reason).toBe(
    "RECIPIENT_UNAVAILABLE",
  );
});
test("seller worker crash lease and ambiguous timeout never blindly resend", async () => {
  await applicant();
  await submitSellerApplication(applicationInput);
  sendSms.mockRejectedValue(new Error("private provider response"));
  await sellerNoticeBatch({ dryRun: false });
  expect((await prisma.sellerNotice.findFirst()).state).toBe("UNKNOWN");
  await sellerNoticeBatch({ dryRun: false });
  expect(sendSms).toHaveBeenCalledTimes(1);
  await prisma.sellerNotice.updateMany({
    data: { state: "SENDING", leaseToken: "dead", leaseUntil: new Date(0) },
  });
  await sellerNoticeBatch({ dryRun: false });
  expect((await prisma.sellerNotice.findFirst()).reason).toBe(
    "LEASE_EXPIRED_REVIEW",
  );
  expect(sendSms).toHaveBeenCalledTimes(1);
});
test("stale approval notice is suppressed after revocation and shop becomes unavailable", async () => {
  await applicant();
  const app = await submitSellerApplication(applicationInput);
  await applicationAdmin();
  await reviewSellerApplication({
    id: app.id,
    version: 1,
    decision: "APPROVED",
    reason: "Reviewed profile",
  });
  await reviewSellerApplication({
    id: app.id,
    version: 2,
    decision: "REJECTED",
    reason: "Review needs correction",
  });
  sendSms.mockImplementation(async (recipient) => ({
    json: async () => ({
      SMSMessageData: {
        Recipients: [
          {
            number: recipient,
            statusCode: 101,
            messageId: "synthetic-message",
          },
        ],
      },
    }),
  }));
  await sellerNoticeBatch({ dryRun: false });
  expect(
    (await prisma.sellerNotice.findFirst({ where: { kind: "APPROVED" } }))
      .reason,
  ).toBe("EVENT_NO_LONGER_APPLIES");
  expect(await getPublicShop("synthetic-shop")).toBeNull();
});
test("shop catalog filters stay bound to seller and new unapproved products stay private", async () => {
  const f = await fixture();
  const other = await prisma.supplier.create({
    data: {
      user: { create: { name: "Other", role: "SUPPLIER" } },
      name: "Other",
      email: "other@example.invalid",
      username: "other-shop",
      isVerified: true,
    },
  });
  expect((await shopCatalog(other.id, {})).count).toBe(0);
  expect((await shopCatalog(f.supplier.id, {})).count).toBe(1);
  await prisma.sellerRegistration.create({
    data: {
      supplierId: f.supplier.id,
      phoneDigest: phoneDigest("+255712345678"),
    },
  });
  expect((await shopCatalog(f.supplier.id, {})).count).toBe(0);
});

import {
  getAllProducts,
  getManagedProducts,
} from "@/lib/actions/product.actions";
import { calcPriceWithTiers } from "@/lib/cart-pricing";
import { setSellerNoticeConsent } from "@/lib/seller-registration";
import { PUT as saveShopProfile } from "@/app/api/suppliers/me/route";
import {
  applyToSell,
  changeSellerNoticeConsent,
} from "@/lib/actions/seller-registration.actions";
test("pending owner catalog is manageable but cannot be purchased or start product chat", async () => {
  const f = await fixture();
  await prisma.sellerRegistration.create({
    data: {
      supplierId: f.supplier.id,
      phoneDigest: phoneDigest("+255712345678"),
    },
  });
  const owner = await prisma.supplier.findUnique({
    where: { id: f.supplier.id },
  });
  await prisma.user.update({
    where: { id: owner.userId },
    data: { role: "SUPPLIER" },
  });
  auth.mockResolvedValue({ user: { id: owner.userId } });
  const input = { query: "", page: 1, supplierId: f.supplier.id };
  expect((await getManagedProducts(input)).data).toHaveLength(1);
  expect((await getAllProducts(input)).data).toHaveLength(0);
  await expect(
    calcPriceWithTiers([{ productId: f.product.id, qty: 1 }]),
  ).rejects.toThrow("Product not found");
  const unrelated = await prisma.user.create({
    data: { name: "Unrelated buyer", role: "BUYER" },
  });
  auth.mockResolvedValue({ user: { id: unrelated.id } });
  await expect(getManagedProducts(input)).rejects.toThrow("Unauthorized");
  await expect(market.startThread(f.product.id)).rejects.toThrow();
  auth.mockResolvedValue(null);
  await expect(getManagedProducts(input)).rejects.toThrow("Unauthorized");
});
test("managed catalog refuses a different seller scope and revoked role", async () => {
  const f = await fixture();
  const owner = await prisma.supplier.findUnique({
    where: { id: f.supplier.id },
  });
  await prisma.user.update({
    where: { id: owner.userId },
    data: { role: "SUPPLIER" },
  });
  auth.mockResolvedValue({ user: { id: owner.userId, role: "SUPPLIER" } });
  await expect(
    getManagedProducts({ query: "", page: 1, supplierId: crypto.randomUUID() }),
  ).rejects.toThrow("Unauthorized");
  await prisma.user.update({
    where: { id: owner.userId },
    data: { role: "BUYER" },
  });
  await expect(getManagedProducts({ query: "", page: 1 })).rejects.toThrow(
    "Unauthorized",
  );
});
test("legacy owner profile preserves unchanged username and array business hours", async () => {
  const f = await fixture();
  const owner = await prisma.supplier.findUnique({
    where: { id: f.supplier.id },
  });
  await prisma.user.update({
    where: { id: owner.userId },
    data: { role: "SUPPLIER" },
  });
  await prisma.supplier.update({
    where: { id: owner.id },
    data: { username: "Old_Shop" },
  });
  auth.mockResolvedValue({ user: { id: owner.userId } });
  const response = await saveShopProfile(
    new Request("http://local.test", {
      method: "PUT",
      body: JSON.stringify({
        username: "Old_Shop",
        about: "Household products",
        businessHours: [{ day: "Monday", open: "09:00", close: "17:00" }],
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(
    (await prisma.supplier.findUnique({ where: { id: owner.id } })).username,
  ).toBe("Old_Shop");
});
test("notice preference is owner scoped and opt-out suppresses queued receipt", async () => {
  const user = await applicant();
  const result = await applyToSell(applicationInput);
  expect(result.ok).toBe(true);
  expect((await changeSellerNoticeConsent(false)).ok).toBe(true);
  await sellerNoticeBatch({ dryRun: false });
  expect(sendSms).not.toHaveBeenCalled();
  expect((await prisma.sellerNotice.findFirst()).state).toBe("SUPPRESSED");
  expect((await changeSellerNoticeConsent(true)).ok).toBe(true);
  expect(await prisma.sellerNotice.count()).toBe(1);
  await prisma.user.update({ where: { id: user.id }, data: { role: "BUYER" } });
  await expect(setSellerNoticeConsent(false)).rejects.toThrow();
  auth.mockResolvedValue(null);
  expect((await applyToSell(applicationInput)).ok).toBe(false);
});
test("delayed receipt is suppressed after approval and repeated search values remain bounded", async () => {
  await applicant();
  const app = await submitSellerApplication(applicationInput);
  await applicationAdmin();
  await reviewSellerApplication({
    id: app.id,
    version: 1,
    decision: "APPROVED",
    reason: "Synthetic review",
  });
  sendSms.mockImplementation(async (recipient) => ({
    json: async () => ({
      SMSMessageData: {
        Recipients: [
          {
            number: recipient,
            statusCode: 101,
            messageId: "synthetic-message",
          },
        ],
      },
    }),
  }));
  await sellerNoticeBatch({ dryRun: false });
  expect(
    (await prisma.sellerNotice.findFirst({ where: { kind: "RECEIVED" } }))
      .state,
  ).toBe("SUPPRESSED");
  expect(sendSms).toHaveBeenCalledTimes(1);
  const shop = await getPublicShop("synthetic-shop");
  expect(
    (await shopCatalog(shop.id, { q: ["first", "second"], page: ["1", "2"] }))
      .q,
  ).toBe("first");
});

import { lockPurchasableSellers } from "@/lib/seller-purchase-guard";
test("checkout seller guard waits for concurrent rejection and then refuses new purchase", async () => {
  const f = await fixture();
  await prisma.supplier.update({
    where: { id: f.supplier.id },
    data: { isVerified: true },
  });
  await prisma.sellerRegistration.create({
    data: {
      supplierId: f.supplier.id,
      state: "APPROVED",
      phoneDigest: phoneDigest("+255712345678"),
    },
  });
  let locked, release;
  const ready = new Promise((r) => (locked = r)),
    gate = new Promise((r) => (release = r));
  const rejection = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id"=${f.supplier.id}::uuid FOR UPDATE`;
    await tx.sellerRegistration.update({
      where: { supplierId: f.supplier.id },
      data: { state: "REJECTED" },
    });
    await tx.supplier.update({
      where: { id: f.supplier.id },
      data: { isVerified: false },
    });
    locked();
    await gate;
  });
  await ready;
  let completed = false;
  const checkout = prisma.$transaction(async (tx) => {
    await lockPurchasableSellers(tx, [f.supplier.id]);
    completed = true;
  });
  const result = checkout.then(
    () => "allowed",
    () => "refused",
  );
  await new Promise((r) => setTimeout(r, 100));
  expect(completed).toBe(false);
  release();
  await rejection;
  expect(await result).toBe("refused");
});
test("release preflight rejects partial seller dedupe index and missing latest table", async () => {
  const sql = require("fs").readFileSync(require("path").join(__dirname, "../../scripts/release-preflight.sql"), "utf8");
  const statements = sql.replace(/--[^\n]*/g, "").split(";").map(s=>s.trim()).filter(s=>s&&!s.startsWith("BEGIN")&&s!=="ROLLBACK");
  const uniqueness = statements.find(s=>s.includes("pg_index"));
  const tables = statements.find(s=>s.includes("table_present"));
  const rollback = new Error("Synthetic rollback");
  await expect(prisma.$transaction(async tx=>{
    await tx.$executeRawUnsafe('DROP INDEX "SellerNotice_eventKey_key"');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX "SellerNotice_eventKey_key" ON "SellerNotice"("eventKey") WHERE "state"=\'QUEUED\'');
    const rows=await tx.$queryRawUnsafe(uniqueness);
    expect(rows.find(r=>r.name==="SellerNotice_eventKey_key").unique_index_present).toBe(false);
    await tx.$executeRawUnsafe('ALTER TABLE "SellerNoticeEvent" RENAME TO "SyntheticHiddenSellerNoticeEvent"');
    const missing=await tx.$queryRawUnsafe(tables);
    expect(missing.find(r=>r.name==="SellerNoticeEvent").table_present).toBe(false);
    throw rollback;
  })).rejects.toThrow("Synthetic rollback");
  const restored=await prisma.$queryRawUnsafe(uniqueness);
  expect(restored.every(r=>r.unique_index_present)).toBe(true);
});


import { legacyReviewQueue } from '@/lib/admin-legacy-review';
test('legacy paid order is review-only while unrelated new order settles once', async () => {
  const f = await fixture();
  await prisma.order.update({where:{id:f.order.id},data:{isPaid:true}});
  await prisma.user.update({where:{id:f.user.id},data:{role:'ADMIN'}});
  auth.mockResolvedValue({user:{id:f.user.id}});
  const before = await prisma.supplier.findUnique({where:{id:f.supplier.id}});
  const queue = await legacyReviewQueue();
  expect(queue.items.map(x=>x.id)).toEqual([f.order.id]);
  await expect(confirmDelivery(f.order.id,f.product.id,{kind:'admin',userId:f.user.id})).rejects.toThrow('Escrow credit requires reconciliation');
  await expect(fulfillOrder(f.order.id,attempt(f.order),'legacy-no-replay')).resolves.toBe(false);
  expect(await prisma.supplier.findUnique({where:{id:f.supplier.id}})).toEqual(before);
  expect(await prisma.supplierLedger.count()).toBe(0);
  const fresh = await newOrder(f);
  await Promise.all([fulfillOrder(fresh.id,attempt(fresh),'new-proof'),fulfillOrder(fresh.id,attempt(fresh),'new-proof')]);
  expect(await prisma.supplierLedger.count()).toBe(1);
  expect((await legacyReviewQueue()).items.map(x=>x.id)).toEqual([f.order.id]);
  await prisma.user.update({where:{id:f.user.id},data:{role:'BUYER'}});
  await expect(legacyReviewQueue()).rejects.toThrow('Unauthorized');
});
test('credit with canonical reference but wrong order cannot release funds', async()=>{
  const f=await paidFixture();
  const other=await newOrder(f);
  await prisma.supplierLedger.updateMany({where:{orderId:f.order.id},data:{orderId:other.id}});
  const before=await prisma.supplier.findUnique({where:{id:f.supplier.id}});
  await expect(confirmDelivery(f.order.id,f.product.id,buyer(f))).rejects.toThrow('Escrow credit requires reconciliation');
  expect(await prisma.supplier.findUnique({where:{id:f.supplier.id}})).toEqual(before);
  expect(await releases()).toBe(0);
});

test('nonfinite legacy allocation stays visible and cannot release', async()=>{
 const f=await paidFixture();
 await prisma.user.update({where:{id:f.user.id},data:{role:'ADMIN'}});auth.mockResolvedValue({user:{id:f.user.id}});
 await prisma.$executeRaw`UPDATE "OrderItem" SET price='NaN'::numeric WHERE "orderId"=${f.order.id}::uuid`;
 await prisma.$executeRaw`UPDATE "SupplierLedger" SET amount='NaN'::numeric WHERE "orderId"=${f.order.id}::uuid`;
 expect((await legacyReviewQueue()).items.map(x=>x.id)).toEqual([f.order.id]);
 await expect(confirmDelivery(f.order.id,f.product.id,buyer(f))).rejects.toThrow('Escrow credit requires reconciliation');
 expect(await releases()).toBe(0);
});

import { catalogLaunchPlan } from '@/lib/catalog-launch';
const {rehearseCatalogLaunch}=require('./catalog-launch.cjs');
async function catalogLaunchFixture() {
 const f=await fixture();
 const pick=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));
 const brand=await prisma.brand.findUnique({where:{id:f.product.brandId}}),cat=await prisma.category.findUnique({where:{id:f.product.categoryId}}),sub=await prisma.subcategory.findUnique({where:{id:f.product.subcategoryId}});
 const manifest={version:1,historicalObligationsRetained:true,catalogCompletenessReviewed:true,legacyStockCommitmentsReviewed:true,
 brands:[pick(brand,['id','name','description','image'])],categories:[pick(cat,['id','name_en','name_sw','image','description','parentId','sortOrder'])],subcategories:[pick(sub,['id','name_en','name_sw','categoryId','image','description','sortOrder'])],suppliers:[{sourceId:f.supplier.id,targetId:f.supplier.id,ownershipReviewed:true}],products:[{...pick(f.product,['id','name','slug','description','images','banner','color','size','supplierId','isFeatured','brandId','categoryId','subcategoryId','thumbnail','tags','videoUrl']),price:String(f.product.price),createdAt:f.product.createdAt.toISOString(),openingStock:3,stockReviewed:true}],tiers:[],variants:[]};
 return {f,manifest};
}
async function emptySyntheticCatalog(f){
 await prisma.orderItem.deleteMany();await prisma.order.deleteMany();await prisma.product.deleteMany();await prisma.subcategory.deleteMany();await prisma.category.deleteMany();await prisma.brand.deleteMany();
 await prisma.user.update({where:{id:f.user.id},data:{role:'SUPPLIER',phoneVerified:new Date()}});await prisma.supplier.update({where:{id:f.supplier.id},data:{isVerified:true}});
}
test('catalog launch refuses historical target without changing original orders or balances',async()=>{
 const {f,manifest}=await catalogLaunchFixture();const before=await prisma.order.findUnique({where:{id:f.order.id}});
 await expect(rehearseCatalogLaunch(manifest)).rejects.toThrow('not an empty');
 expect(await prisma.order.findUnique({where:{id:f.order.id}})).toEqual(before);expect(await prisma.product.count()).toBe(1);
});
test('catalog-only import preserves URLs; concurrent replay creates one catalog; new settlement isolated from late callback',async()=>{
 const {f,manifest}=await catalogLaunchFixture();await emptySyntheticCatalog(f);
 const sourceSeller=require('node:crypto').randomUUID();manifest.suppliers[0].sourceId=sourceSeller;manifest.products[0].supplierId=sourceSeller;
 manifest.tiers=[{id:require('node:crypto').randomUUID(),productId:f.product.id,minQty:5,price:'800.00'}];manifest.variants=[{id:require('node:crypto').randomUUID(),productId:f.product.id,sku:'synthetic-variant',name:'Synthetic variant',price:'1100.00',openingStock:2,stockReviewed:true,image:null}];
 const result=await Promise.allSettled([rehearseCatalogLaunch(manifest),rehearseCatalogLaunch(manifest)]);
 expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await prisma.product.count()).toBe(1);
 const product=await prisma.product.findUnique({where:{id:f.product.id}});expect(product.slug).toBe(f.product.slug);expect(product.stock).toBe(3);expect(product.numReviews).toBe(0);expect(product.supplierId).toBe(f.supplier.id);expect(await prisma.productPricing.count()).toBe(1);expect(await prisma.productVariant.count()).toBe(1);expect(await prisma.order.count()).toBe(0);
 const late=await require('@/app/api/zenopay/webhook/route').POST(new Request('https://example.test',{method:'POST',body:JSON.stringify({order_id:attempt(f.order)})}));expect(late.status).toBe(404);expect(getZenopayStatus).not.toHaveBeenCalled();expect(await prisma.supplierLedger.count()).toBe(0);
 const order=await newOrder({user:f.user,product,qty:1});expect(order.id).not.toBe(f.order.id);
 await Promise.all([fulfillOrder(order.id,attempt(order),'new-catalog-proof'),fulfillOrder(order.id,attempt(order),'new-catalog-proof')]);
 expect((await prisma.product.findUnique({where:{id:product.id}})).stock).toBe(2);expect(await prisma.supplierLedger.count()).toBe(1);
 await confirmDelivery(order.id,product.id,{kind:'buyer',userId:f.user.id});expect(await releases()).toBe(1);
 expect(Number((await prisma.supplier.findUnique({where:{id:f.supplier.id}})).walletBalance)).toBe(1000);
});
test('catalog import rollback, existing balance and revoked seller protections',async()=>{
 const {f,manifest}=await catalogLaunchFixture();await emptySyntheticCatalog(f);
 await prisma.supplier.update({where:{id:f.supplier.id},data:{pendingBalance:1}});await expect(rehearseCatalogLaunch(manifest)).rejects.toThrow('balances');expect(await prisma.product.count()).toBe(0);
 await prisma.supplier.update({where:{id:f.supplier.id},data:{pendingBalance:0,isVerified:false}});await expect(rehearseCatalogLaunch(manifest)).rejects.toThrow('verification');
 await prisma.supplier.update({where:{id:f.supplier.id},data:{isVerified:true}});
 await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD CONSTRAINT synthetic_import_failure CHECK (stock < 0)');
 try{await expect(rehearseCatalogLaunch(manifest)).rejects.toThrow();expect(await prisma.brand.count()).toBe(0);expect(await prisma.category.count()).toBe(0);}finally{await prisma.$executeRawUnsafe('ALTER TABLE "Product" DROP CONSTRAINT synthetic_import_failure');}
 expect(catalogLaunchPlan(manifest).digest).toHaveLength(64);
});

test('pending seller registration cannot receive imported products',async()=>{
 const {f,manifest}=await catalogLaunchFixture();await emptySyntheticCatalog(f);
 await prisma.sellerRegistration.create({data:{supplierId:f.supplier.id,state:'PENDING',phoneDigest:'synthetic'}});
 await expect(rehearseCatalogLaunch(manifest)).rejects.toThrow('verification');expect(await prisma.product.count()).toBe(0);
 await prisma.sellerRegistration.update({where:{supplierId:f.supplier.id},data:{state:'APPROVED'}});
 await expect(rehearseCatalogLaunch(manifest)).resolves.toMatchObject({products:1});
});

import { retainUnmatchedNotice, unmatchedPaymentNotices } from "@/lib/unmatched-payment-notice";

test("unmatched authenticated callbacks persist once per status concurrently without financial mutations", async () => {
 const {POST}=require("@/app/api/zenopay/webhook/route");
 const previous=process.env.ZENOPAY_API_KEY;process.env.ZENOPAY_API_KEY="synthetic-key";
 try {
  const responses=await Promise.all(Array.from({length:8},()=>POST(new Request("https://example.test",{method:"POST",headers:{"x-api-key":"synthetic-key"},body:JSON.stringify({order_id:"legacy_reference",payment_status:"COMPLETED",phone:"private"})}))));
  expect(responses.every(r=>r.status===503)).toBe(true);
  const rows=await prisma.$queryRaw`SELECT * FROM "UnmatchedPaymentNotice"`;
  expect(rows).toHaveLength(1);expect(rows[0].occurrences).toBe(8);
  expect(JSON.stringify(rows)).not.toContain("private");
  expect(await prisma.order.count()).toBe(0);expect(await prisma.supplierLedger.count()).toBe(0);
  expect(getZenopayStatus).not.toHaveBeenCalled();
  await retainUnmatchedNotice("legacy_reference","PENDING");
  expect((await prisma.$queryRaw`SELECT * FROM "UnmatchedPaymentNotice"`)).toHaveLength(2);
 } finally {if(previous===undefined)delete process.env.ZENOPAY_API_KEY;else process.env.ZENOPAY_API_KEY=previous;}
});
test("unmatched retry cannot move observation timestamp backwards",async()=>{
 await retainUnmatchedNotice("legacy_time","PENDING");
 await prisma.$executeRaw`UPDATE "UnmatchedPaymentNotice" SET "lastSeenAt" = '2099-01-01'::timestamp WHERE "attemptReference" = 'legacy_time'`;
 await retainUnmatchedNotice("legacy_time","PENDING");
 const rows=await prisma.$queryRaw`SELECT "lastSeenAt", "occurrences" FROM "UnmatchedPaymentNotice"`;
 expect(rows[0].lastSeenAt.toISOString()).toBe("2099-01-01T00:00:00.000Z");expect(rows[0].occurrences).toBe(2);
});
test("unmatched queue checks current database role and preserves evidence after revocation",async()=>{
 const f=await fixture();await retainUnmatchedNotice("legacy_reference","COMPLETED");
 auth.mockResolvedValue(null);await expect(unmatchedPaymentNotices("1")).rejects.toThrow("Unauthorized");
 auth.mockResolvedValue({user:{id:f.user.id,role:"ADMIN"}});
 await expect(unmatchedPaymentNotices("1")).rejects.toThrow("Unauthorized");
 await prisma.user.update({where:{id:f.user.id},data:{role:"ADMIN"}});
 expect((await unmatchedPaymentNotices("1")).items).toHaveLength(1);
 await prisma.user.update({where:{id:f.user.id},data:{role:"SUPPLIER"}});
 await expect(unmatchedPaymentNotices("1")).rejects.toThrow("Unauthorized");
 expect((await prisma.$queryRaw`SELECT * FROM "UnmatchedPaymentNotice"`)).toHaveLength(1);
});
test("unmatched storage failure never acknowledges processed",async()=>{
 const {POST}=require("@/app/api/zenopay/webhook/route");
 const previous=process.env.ZENOPAY_API_KEY;process.env.ZENOPAY_API_KEY="synthetic-key";
 await prisma.$executeRawUnsafe('ALTER TABLE "UnmatchedPaymentNotice" ADD CONSTRAINT synthetic_notice_failure CHECK ("occurrences" < 0)');
 try {
  const response=await POST(new Request("https://example.test",{method:"POST",headers:{"x-api-key":"synthetic-key"},body:JSON.stringify({order_id:"legacy_reference"})}));
  expect(response.status).toBe(503);expect((await prisma.$queryRaw`SELECT * FROM "UnmatchedPaymentNotice"`)).toHaveLength(0);
 }finally{await prisma.$executeRawUnsafe('ALTER TABLE "UnmatchedPaymentNotice" DROP CONSTRAINT synthetic_notice_failure');if(previous===undefined)delete process.env.ZENOPAY_API_KEY;else process.env.ZENOPAY_API_KEY=previous;}
});


import {prepareSupplierCatalogTransfer,supplierSnapshotDigest} from "@/lib/supplier-catalog-transfer";
const {rehearseSupplierCatalogTransfer}=require('./catalog-launch.cjs');
async function supplierTransferFixture(){
 const f=await fixture();
 const before=await prisma.order.findUnique({where:{id:f.order.id}});
 const client=new (require('pg').Client)({connectionString:process.env.PROSTORE_TEST_DATABASE_URL});await client.connect();
 let snapshot;
 try{const results=await client.query(require('fs').readFileSync(require('path').join(__dirname,'../../scripts/supplier-catalog-export.sql'),'utf8'));snapshot=results.find(r=>r.rows?.[0]?.supplier_catalog_snapshot).rows[0].supplier_catalog_snapshot;}finally{await client.end();}
 expect(await prisma.order.findUnique({where:{id:f.order.id}})).toEqual(before);
 const encoded=JSON.stringify(snapshot);expect(encoded).not.toContain('buyer@example.test');expect(encoded).not.toContain('supplier@example.test');expect(encoded).not.toContain('+255700000000');expect(encoded).not.toContain(f.order.id);
 const review={version:1,snapshotDigest:supplierSnapshotDigest(snapshot),priorTransactionsAreTrials:true,preserveSourceDatabase:true,completenessReviewed:true,accounts:[{sourceUserId:f.user.id,targetUserId:f.user.id,ownershipReviewed:true}],stock:[{kind:'product',id:f.product.id,openingStock:7,stockReviewed:true}]};
 const result=prepareSupplierCatalogTransfer(snapshot,review);
 // Reset only this disposable fixture to model an empty target. Real source is never touched by importer.
 await emptySyntheticCatalog(f);await prisma.supplier.delete({where:{id:f.supplier.id}});
 return {f,input:result.input};
}
test('supplier/catalog export and atomic transfer preserve URLs; approval then new settlement works',async()=>{
 const {f,input}=await supplierTransferFixture();
 const beforeUser=await prisma.user.findUnique({where:{id:f.user.id}});
 const r=await rehearseSupplierCatalogTransfer(input);expect(r.pendingSuppliers).toBe(1);
 const supplier=await prisma.supplier.findUnique({where:{id:f.supplier.id},include:{registration:true}});
 expect(supplier.userId).toBe(f.user.id);expect(supplier.registration.state).toBe('PENDING');expect(supplier.isVerified).toBe(false);expect(Number(supplier.walletBalance)).toBe(0);expect(supplier.phone).toBeNull();
 expect(await prisma.user.findUnique({where:{id:f.user.id}})).toEqual(beforeUser);
 expect(await prisma.order.count()).toBe(0);expect(await prisma.supplierLedger.count()).toBe(0);expect(await prisma.sellerNotice.count()).toBe(0);
 expect(await getPublicShop(f.supplier.id,true)).toBeNull();expect((await shopCatalog(f.supplier.id,{})).count).toBe(0);
 const admin=await prisma.user.create({data:{name:'Synthetic transfer admin',role:'ADMIN'}});
 auth.mockResolvedValue({user:{id:admin.id}});
 await reviewSellerApplication({id:supplier.registration.id,version:1,decision:'APPROVED',reason:'Synthetic transfer identity reviewed'});
 expect(await getPublicShop(f.supplier.id,true)).not.toBeNull();expect((await shopCatalog(f.supplier.id,{})).count).toBe(1);
 expect((await prisma.sellerNotice.findFirst()).state).toBe('SUPPRESSED');expect(sendSms).not.toHaveBeenCalled();
 const product=await prisma.product.findUnique({where:{id:f.product.id}});expect(product.slug).toBe(f.product.slug);expect(product.stock).toBe(7);
 const buyerUser=await prisma.user.create({data:{name:'Synthetic new buyer',role:'BUYER'}});
 const order=await newOrder({user:buyerUser,product,qty:1});expect(order.id).not.toBe(f.order.id);
 await Promise.all([fulfillOrder(order.id,attempt(order),'new-book-confirmed'),fulfillOrder(order.id,attempt(order),'new-book-confirmed')]);
 expect((await prisma.product.findUnique({where:{id:product.id}})).stock).toBe(6);expect(await prisma.supplierLedger.count()).toBe(1);
 await confirmDelivery(order.id,product.id,{kind:'buyer',userId:buyerUser.id});expect(Number((await prisma.supplier.findUnique({where:{id:f.supplier.id}})).walletBalance)).toBe(1000);
});
test('supplier transfer concurrent replay imports once and parent categories work in reverse order',async()=>{
 const {f,input}=await supplierTransferFixture();const parent={...input.catalog.categories[0],id:require('crypto').randomUUID(),name_en:'Synthetic parent category',parentId:null};input.catalog.categories[0].parentId=parent.id;input.catalog.categories.push(parent);
 const results=await Promise.allSettled([rehearseSupplierCatalogTransfer(input),rehearseSupplierCatalogTransfer(input)]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await prisma.supplier.count()).toBe(1);expect(await prisma.product.count()).toBe(1);expect(await prisma.category.count()).toBe(2);
});
test('supplier transfer refuses revoked or unverified account and rolls back profiles with catalog failure',async()=>{
 const {f,input}=await supplierTransferFixture();
 await prisma.user.update({where:{id:f.user.id},data:{role:'BUYER'}});await expect(rehearseSupplierCatalogTransfer(input)).rejects.toThrow('Verified');expect(await prisma.supplier.count()).toBe(0);
 await prisma.user.update({where:{id:f.user.id},data:{role:'SUPPLIER',phoneVerified:null}});await expect(rehearseSupplierCatalogTransfer(input)).rejects.toThrow('Verified');
 await prisma.user.update({where:{id:f.user.id},data:{phoneVerified:new Date()}});
 await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD CONSTRAINT synthetic_supplier_transfer_fail CHECK (stock < 0)');
 try{await expect(rehearseSupplierCatalogTransfer(input)).rejects.toThrow();expect(await prisma.supplier.count()).toBe(0);expect(await prisma.sellerRegistration.count()).toBe(0);expect(await prisma.brand.count()).toBe(0);}finally{await prisma.$executeRawUnsafe('ALTER TABLE "Product" DROP CONSTRAINT synthetic_supplier_transfer_fail');}
});

if (process.env.PROSTORE_BACKUP_FIXTURE === "1")
  test("prepare synthetic recovery fixture for independent pg_dump/restore", async () => {
    const data = await fixture();
    await retainUnmatchedNotice("synthetic_legacy_restore", "COMPLETED");
    getZenopayStatus.mockResolvedValue(confirmed(data.order));
    await reconcileZenopay(data.order.id, attempt(data.order));
    await confirmDelivery(data.order.id, data.product.id, buyer(data), {
      rating: 5,
      comment: "Synthetic restore check",
    });
    const adminProfile = await prisma.admin.create({
      data: { userId: data.user.id },
    });
    await prisma.auditLog.create({
      data: {
        adminId: adminProfile.id,
        action: "SYNTHETIC_BACKUP_CHECK",
        entityId: data.order.id,
        entityType: "Order",
      },
    });
    await submitMoneyRequest(data.user.id, {
      kind: "REFUND",
      requestKey: moneyKey(),
      orderId: data.order.id,
      productId: data.product.id,
      quantity: 1,
      reason: "Synthetic restored review",
    });
    await applicant();
    await submitSellerApplication(applicationInput);
    expect(await prisma.sellerNotice.count()).toBe(1);
    expect(await prisma.orderNotification.count()).toBe(3);
    expect(await prisma.paymentAttempt.count()).toBe(1);
    expect(await prisma.auditLog.count()).toBe(1);
  });
