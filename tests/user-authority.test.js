jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/actions/cart.actions", () => ({ getMyCart: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import {
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateProfile,
  updateUserAddress,
  updateUserPaymentMethod,
} from "@/lib/actions/user.actions";
import { POST as onboard } from "@/app/api/onboarding/route";
const request = (body) =>
  new Request("https://example.test", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "buyer", role: "ADMIN" } });
  prisma.user.findUnique.mockResolvedValue({ role: "BUYER" });
});
test("onboarding cannot grant ADMIN in the database", async () => {
  expect(
    (await onboard(request({ name: "Buyer", role: "ADMIN" }))).status,
  ).toBe(400);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
test("buyer onboarding preserves DB authority and marks onboarding complete", async () => {
  const tx = {
    $queryRaw: jest.fn(),
    user: {
      findUnique: jest.fn(async () => ({ role: "BUYER" })),
      update: jest.fn(),
    },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  expect(
    (await onboard(request({ name: "Buyer", role: "BUYER" }))).status,
  ).toBe(200);
  expect(tx.user.update).toHaveBeenCalledWith({
    where: { id: "buyer" },
    data: {
      name: "Buyer",
      onboarded: true,
      country: undefined,
      location: undefined,
    },
  });
  tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  expect(
    (await onboard(request({ name: "Buyer", role: "BUYER" }))).status,
  ).toBe(403);
});
test("legacy supplier choice directs to verified application rather than creating an unreviewed profile", async () => {
  const response = await onboard(request({ name: "Seller", role: "SUPPLIER" }));
  expect(response.status).toBe(409);
  expect((await response.json()).redirectTo).toBe("/sell");
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
test("anonymous onboarding never reaches the database", async () => {
  auth.mockResolvedValue(null);
  expect(
    (await onboard(request({ name: "Buyer", role: "BUYER" }))).status,
  ).toBe(401);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
test("direct user update cannot elevate a buyer despite forged session role", async () => {
  expect(
    (await updateUser({ id: "buyer", name: "Buyer", role: "ADMIN" })).success,
  ).toBe(false);
  expect(prisma.user.update).not.toHaveBeenCalled();
});
test("legitimate database admin can change roles", async () => {
  prisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  expect(
    (
      await updateUser({
        id: "target",
        name: "New Name",
        role: "SUPPLIER",
        email: "buyer@example.test",
      })
    ).success,
  ).toBe(true);
  expect(prisma.user.update).toHaveBeenCalledWith({
    where: { id: "target" },
    data: { name: "New Name", role: "SUPPLIER" },
  });
});
test("user deletion and global listing require database admin", async () => {
  expect((await deleteUser("target")).success).toBe(false);
  await expect(getAllUsers({ page: 1, query: "" })).rejects.toThrow();
  expect(prisma.user.delete).not.toHaveBeenCalled();
  expect(prisma.user.findMany).not.toHaveBeenCalled();
});
test("another user's profile is not exposed to a buyer", async () => {
  await expect(getUserById("target")).rejects.toThrow();
  expect(prisma.user.findFirst).not.toHaveBeenCalled();
});
test("own profile read omits password hash", async () => {
  prisma.user.findFirst.mockResolvedValue({ id: "buyer" });
  await getUserById("buyer");
  expect(prisma.user.findFirst).toHaveBeenCalledWith({
    where: { id: "buyer" },
    omit: { password: true },
  });
});
test.each([updateProfile, updateUserAddress, updateUserPaymentMethod])(
  "self-service write %p cannot use an undefined identity",
  async (action) => {
    auth.mockResolvedValue(null);
    expect((await action({ name: "Forged" })).success).toBe(false);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  },
);
