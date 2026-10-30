jest.mock("@/db/prisma", () => ({
  prisma: {
    order: { findUnique: jest.fn() },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));
jest.mock("@/lib/auth-guard", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/lib/zenopay-reconciliation", () => ({
  paymentAttempt: jest.fn(),
  reconcileZenopay: jest.fn(),
}));
import { prisma } from "@/db/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { reconcileZenopay } from "@/lib/zenopay-reconciliation";
import { unmatchedPaymentNotices } from "@/lib/unmatched-payment-notice";
import { POST } from "@/app/api/zenopay/webhook/route";
const req = (body, key = "synthetic-key") =>
  new Request("https://example.test", {
    method: "POST",
    headers: { "x-api-key": key },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  process.env.ZENOPAY_API_KEY = "synthetic-key";
  prisma.order.findUnique.mockResolvedValue(null);
  prisma.$executeRaw.mockResolvedValue(1);
});
afterEach(() => {
  delete process.env.ZENOPAY_API_KEY;
});
test("authenticated legacy non-UUID reference retained but never acknowledged processed", async () => {
  const res = await POST(
    req({
      order_id: "old_123",
      payment_status: "COMPLETED",
      phone: "private",
      reference: "untrusted",
    }),
  );
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({
    error: "Payment reference requires ownership review; not processed",
  });
  expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(prisma.$executeRaw.mock.calls)).not.toMatch(
    /private|untrusted|synthetic-key/,
  );
  expect(reconcileZenopay).not.toHaveBeenCalled();
});
test.each(["", "wrong"])(
  "untrusted key %s cannot fill evidence store",
  async (key) => {
    expect((await POST(req({ order_id: "old_123" }, key))).status).toBe(404);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  },
);
test("missing configured key cannot authenticate", async () => {
  delete process.env.ZENOPAY_API_KEY;
  expect((await POST(req({ order_id: "old_123" }))).status).toBe(404);
  expect(prisma.$executeRaw).not.toHaveBeenCalled();
});
test("failed persistence returns retry without internal information", async () => {
  prisma.$executeRaw.mockRejectedValueOnce(Error("database credential"));
  const response = await POST(req({ order_id: "old_123" }));
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("credential");
});
test.each([
  { order_id: "../invalid" },
  { order_id: "old_123", extra: "x".repeat(9000) },
])("invalid/oversized body cannot write", async (body) => {
  expect((await POST(req(body))).status).toBe(400);
  expect(prisma.$executeRaw).not.toHaveBeenCalled();
});
test.each([null, "BUYER", "SUPPLIER", "revoked-admin"])(
  "admin gate refuses %s before querying",
  async () => {
    requireAdmin.mockRejectedValueOnce(Error("Unauthorized"));
    await expect(unmatchedPaymentNotices("1")).rejects.toThrow("Unauthorized");
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  },
);
test("authorized bounded page does not return hidden extra row", async () => {
  requireAdmin.mockResolvedValue({ id: "admin" });
  prisma.$queryRaw.mockResolvedValue(
    Array.from({ length: 21 }, (_, i) => ({ id: String(i) })),
  );
  const result = await unmatchedPaymentNotices("2");
  expect(result.items).toHaveLength(20);
  expect(result.hasNext).toBe(true);
  expect(result.page).toBe(2);
});
