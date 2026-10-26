jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));
jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("next-auth/providers/google", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/utils", () => ({ normalizeIdentifier: jest.fn() }));
import { config } from "@/auth";
import { prisma } from "@/db/prisma";
test("client session update cannot elevate role or change signed identity", async () => {
  prisma.user.findUnique.mockResolvedValue({
    role: "BUYER",
    name: "Saved name",
    phone: "saved",
    onboarded: false,
  });
  const token = await config.callbacks.jwt({
    token: { sub: "buyer", role: "BUYER" },
    trigger: "update",
    session: { role: "ADMIN", name: "forged", id: "admin", onboarded: true },
  });
  expect(prisma.user.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "buyer" } }),
  );
  expect(token).toMatchObject({
    sub: "buyer",
    role: "BUYER",
    name: "Saved name",
    onboarded: false,
  });
  const session = await config.callbacks.session({
    session: { user: {} },
    token,
    trigger: "update",
  });
  expect(session.user.role).toBe("BUYER");
});
test("legitimate server-side role changes refresh on update", async () => {
  prisma.user.findUnique.mockResolvedValue({ role: "SUPPLIER" });
  expect(
    (
      await config.callbacks.jwt({
        token: { sub: "buyer", role: "BUYER" },
        trigger: "update",
        session: { role: "ADMIN" },
      })
    ).role,
  ).toBe("SUPPLIER");
});
test("deleted identity cannot refresh claims", async () => {
  prisma.user.findUnique.mockResolvedValue(null);
  await expect(
    config.callbacks.jwt({
      token: { sub: "deleted" },
      trigger: "update",
      session: {},
    }),
  ).rejects.toThrow();
});
