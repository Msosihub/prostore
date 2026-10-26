jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: { order: { updateMany: jest.fn() } },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { updateOrderShippingAddress } from "@/lib/actions/order-update.actions";
const address = {
  fullName: "Test Buyer",
  streetAddress: "Test Street",
  city: "Dar",
  country: "Tanzania",
  phone: "+255700000000",
  paymentPhone: "+255700000000",
};
beforeEach(() => auth.mockResolvedValue({ user: { id: "buyer" } }));
test("address update atomically restricts owner and delivery state", async () => {
  prisma.order.updateMany.mockResolvedValue({ count: 1 });
  expect((await updateOrderShippingAddress("order", address)).success).toBe(
    true,
  );
  expect(prisma.order.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        id: "order",
        userId: "buyer",
        isPaid: false,
        isDelivered: false,
      },
    }),
  );
});
test("foreign, paid or delivered order is not reported as updated", async () => {
  prisma.order.updateMany.mockResolvedValue({ count: 0 });
  expect(
    (await updateOrderShippingAddress("other-order", address)).success,
  ).toBe(false);
});
test("session without identity cannot mutate an order", async () => {
  auth.mockResolvedValue({ user: {} });
  expect((await updateOrderShippingAddress("order", address)).success).toBe(
    false,
  );
  expect(prisma.order.updateMany).not.toHaveBeenCalled();
});
