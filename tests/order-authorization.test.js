jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    order: { findFirst: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/actions/cart.actions", () => ({ getMyCart: jest.fn() }));
jest.mock("@/lib/actions/user.actions", () => ({ getUserById: jest.fn() }));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import {
  updateOrderToPaid,
  updateOrderToPaidCOD,
  deleteOrder,
  deliverOrder,
  markOrderAsDelivered,
  markOrderItemAsDelivered,
  getOrderById,
  getAllOrders,
} from "@/lib/actions/order.actions";
beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "buyer", role: "ADMIN" } });
  prisma.user.findUnique.mockResolvedValue({ role: "BUYER" });
});
test.each([
  updateOrderToPaidCOD,
  deleteOrder,
  deliverOrder,
  markOrderAsDelivered,
])("%p rejects forged admin role before mutations", async (action) => {
  expect(await action("order")).toMatchObject({ success: false });
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(prisma.order.delete).not.toHaveBeenCalled();
});
test("direct paid action requires database admin role", async () => {
  await expect(updateOrderToPaid({ orderId: "order" })).rejects.toThrow(
    "Unauthorized",
  );
  expect(prisma.order.findFirst).not.toHaveBeenCalled();
});
test("all-orders listing requires admin", async () => {
  await expect(getAllOrders({ page: 1, query: "" })).rejects.toThrow();
  expect(prisma.order.findMany).not.toHaveBeenCalled();
});
test("order detail lookup scopes to the signed-in buyer", async () => {
  prisma.order.findFirst.mockResolvedValue(null);
  await getOrderById("other-order");
  expect(prisma.order.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "other-order", userId: "buyer" } }),
  );
});
test("standalone item confirmation requires a paid owned order", async () => {
  prisma.order.findFirst.mockResolvedValue(null);
  expect(
    await markOrderItemAsDelivered("other-order", "product"),
  ).toMatchObject({ success: false });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test("anonymous order detail access never queries an order", async () => {
  auth.mockResolvedValue(null);
  await expect(getOrderById("order")).rejects.toThrow("Unauthorized");
  expect(prisma.order.findFirst).not.toHaveBeenCalled();
});
