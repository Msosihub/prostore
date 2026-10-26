jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    brand: { create: jest.fn() },
  },
}));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import {
  adminFilters,
  getAdminOverview,
  getAdminOrders,
  getAdminDisputes,
} from "@/lib/admin-operations";
import { POST as createBrand } from "@/app/api/admin/brands/route";
const mutations = [
  [require("@/app/api/admin/brands/route"), "POST"],
  [require("@/app/api/admin/brands/[id]/route"), "PUT"],
  [require("@/app/api/admin/brands/[id]/route"), "DELETE"],
  [require("@/app/api/admin/banners/route"), "POST"],
  [require("@/app/api/admin/banners/[id]/route"), "PUT"],
  [require("@/app/api/admin/banners/[id]/route"), "DELETE"],
  [require("@/app/api/admin/banner-items/route"), "POST"],
  [require("@/app/api/admin/banner-items/[id]/route"), "PUT"],
  [require("@/app/api/admin/banner-items/[id]/route"), "DELETE"],
  [require("@/app/api/admin/suppliers/[id]/route"), "PUT"],
  [require("@/app/api/admin/supplier-docs/[id]/route"), "PUT"],
];
beforeEach(() => {
  jest.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "actor", role: "ADMIN" } });
});
test.each([null, "BUYER", "SUPPLIER"])(
  "fresh role %s cannot read operational records despite admin session",
  async (role) => {
    prisma.user.findUnique.mockResolvedValue(role ? { role } : null);
    for (const read of [getAdminOverview, getAdminOrders, getAdminDisputes])
      await expect(read({})).rejects.toThrow("Unauthorized");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  },
);
test("anonymous operational reads are denied before database work", async () => {
  auth.mockResolvedValue(null);
  await expect(getAdminOverview()).rejects.toThrow("Unauthorized");
  expect(prisma.user.findUnique).not.toHaveBeenCalled();
});
test.each(mutations)(
  "revoked admin cannot invoke catalog/verification mutation %#",
  async (route, method) => {
    prisma.user.findUnique.mockResolvedValue({ role: "BUYER" });
    const req = new Request("http://localhost/api/admin/test", {
      method,
      body: "{}",
    });
    expect(
      (await route[method](req, { params: Promise.resolve({ id: "test" }) }))
        .status,
    ).toBe(403);
  },
);
test("confirmed admin retains brand creation workflow", async () => {
  prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  prisma.brand.create.mockResolvedValue({ id: "brand", name: "Demo" });
  const response = await createBrand(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Demo" }),
    }),
  );
  expect(response.status).toBe(200);
  expect(prisma.brand.create).toHaveBeenCalledWith({ data: { name: "Demo" } });
});
test("pagination input is bounded and repeated/invalid values are neutral", () => {
  expect(adminFilters({ page: "NaN", q: ["a", "b"] })).toEqual({
    page: 1,
    q: "",
    status: "",
  });
  expect(adminFilters({ page: "999999999999", q: " x " }).page).toBe(1);
  expect(adminFilters({ page: "0", q: " x " }).q).toBe("x");
});
test("filtered orders clamp stale pages and select no buyer contact/payment payload", async () => {
  prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  const tx = {
    order: {
      count: jest.fn().mockResolvedValue(21),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  const result = await getAdminOrders({
    page: "88",
    status: "unpaid",
    q: "Product",
  });
  expect(result.page).toBe(2);
  expect(tx.order.findMany.mock.calls[0][0]).toMatchObject({
    skip: 20,
    take: 20,
    where: { isPaid: false },
  });
  expect(tx.order.findMany.mock.calls[0][0].select).not.toHaveProperty("user");
  expect(tx.order.findMany.mock.calls[0][0].select).not.toHaveProperty(
    "paymentResult",
  );
});
