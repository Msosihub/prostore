jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), count: jest.fn() },
    supplier: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    product: { count: jest.fn() },
    category: { count: jest.fn(), findMany: jest.fn() },
    supplierDocument: { count: jest.fn(), findMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { GET } from "@/app/api/admin/dashboard/route";
beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "actor", role: "ADMIN" } });
  prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  for (const key of [
    "supplier",
    "product",
    "category",
    "user",
    "supplierDocument",
  ])
    prisma[key].count.mockResolvedValue(0);
  for (const key of ["supplier", "category", "supplierDocument", "auditLog"])
    prisma[key].findMany.mockResolvedValue([]);
  prisma.supplier.groupBy.mockResolvedValue([]);
  prisma.$queryRaw.mockResolvedValue([]);
});
test.each([null, "BUYER", "SUPPLIER"])(
  "database role %p cannot read global dashboard despite admin token",
  async (role) => {
    prisma.user.findUnique.mockResolvedValue(role ? { role } : null);
    expect((await GET()).status).toBe(403);
    expect(prisma.supplier.count).not.toHaveBeenCalled();
  },
);
test("anonymous dashboard does not query database", async () => {
  auth.mockResolvedValue(null);
  expect((await GET()).status).toBe(403);
  expect(prisma.user.findUnique).not.toHaveBeenCalled();
});
test("persisted admin can read global counts; audit profile selection is minimal", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect((await response.json()).stats.totalUsers).toBe(0);
  expect(
    prisma.auditLog.findMany.mock.calls[0][0].include.admin.select,
  ).toEqual({ id: true, user: { select: { name: true, email: true } } });
});
