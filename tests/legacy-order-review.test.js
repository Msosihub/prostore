jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() }, $queryRaw: jest.fn() },
}));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { legacyReviewQueue } from "@/lib/admin-legacy-review";
import { validEscrowCredit } from "@/lib/escrow-credit";
beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "actor", role: "ADMIN" } });
  prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  prisma.$queryRaw.mockResolvedValue([]);
});
test.each([null, "BUYER", "SUPPLIER"])("fresh role %s denied", async (role) => {
  prisma.user.findUnique.mockResolvedValue(role ? { role } : null);
  await expect(legacyReviewQueue()).rejects.toThrow("Unauthorized");
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
test("anonymous denied", async () => {
  auth.mockResolvedValue(null);
  await expect(legacyReviewQueue()).rejects.toThrow("Unauthorized");
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
test("invalid cursor cannot reach query", async () => {
  await expect(legacyReviewQueue("unsafe")).rejects.toThrow(
    "Invalid review cursor",
  );
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
test("admin bounded page", async () => {
  prisma.$queryRaw.mockResolvedValue(
    Array.from({ length: 21 }, (_, i) => ({
      id: String(i),
      affectedItems: 1,
      deliveredItems: 0,
    })),
  );
  const r = await legacyReviewQueue();
  expect(r.items).toHaveLength(20);
  expect(r.next).toBe("19");
});
const item = { orderId: "order", supplierId: "seller", price: "0.10", qty: 3 };
const credit = {
  orderId: "order",
  supplierId: "seller",
  type: "ESCROW_CREDIT",
  status: "COMPLETED",
  amount: "0.30",
};
test("exact decimal credit allowed", () =>
  expect(validEscrowCredit(credit, item)).toBe(true));
test.each([
  { orderId: "other" },
  { supplierId: "other" },
  { type: "ESCROW_RELEASE" },
  { status: "PENDING" },
  { amount: "0.31" },
])("wrong allocation denied %p", (change) =>
  expect(validEscrowCredit({ ...credit, ...change }, item)).toBe(false),
);
test("missing credit and invalid quantity denied", () => {
  expect(validEscrowCredit(null, item)).toBe(false);
  expect(validEscrowCredit(credit, { ...item, qty: 0 })).toBe(false);
});
