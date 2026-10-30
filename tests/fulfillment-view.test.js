jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    supplier: { findUnique: jest.fn() },
    order: { findFirst: jest.fn() },
    returnRequest: { findMany: jest.fn() },
  },
}));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import {
  getFulfillmentOrder,
  deliveryContact,
  deliverySmsRecipient,
} from "@/lib/fulfillment-view";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  prisma.order.findFirst.mockResolvedValue(null);
});
test("anonymous cannot read fulfillment", async () => {
  auth.mockResolvedValue(null);
  await expect(getFulfillmentOrder(id)).rejects.toThrow("Unauthorized");
  expect(prisma.order.findFirst).not.toHaveBeenCalled();
});
test.each(["BUYER", "SUPPLIER", "ADMIN"])(
  "scope is derived from persisted %s role",
  async (role) => {
    auth.mockResolvedValue({ user: { id: "actor", role: "ADMIN" } });
    prisma.user.findUnique.mockResolvedValue({ role });
    prisma.supplier.findUnique.mockResolvedValue({ id: "vendor" });
    await getFulfillmentOrder(id);
    const args = prisma.order.findFirst.mock.calls[0][0];
    if (role === "BUYER") expect(args.where.userId).toBe("actor");
    if (role === "SUPPLIER") {
      expect(args.where.orderitems.some.supplierId).toBe("vendor");
      expect(args.where.isPaid).toBe(true);
      expect(args.select.orderitems.where).toEqual({ supplierId: "vendor" });
    }
    if (role === "ADMIN") expect(args.where).toEqual({ id });
    expect(args.select.paymentResult).toBeUndefined();
    expect(args.select.user).toBeUndefined();
    expect(args.select.totalPrice).toBeUndefined();
  },
);
test("delivery snapshot strips payment phone and arbitrary private fields", () => {
  expect(
    deliveryContact({
      fullName: "Recipient",
      phone: "delivery",
      paymentPhone: "secret",
      email: "private",
    }),
  ).toEqual({
    fullName: "Recipient",
    phone: "delivery",
    streetAddress: "",
    city: "",
    country: "",
    postalCode: "",
  });
});

test("delivery recipient supports normalized single phone only", () => {
  expect(deliverySmsRecipient("0700 000 009")).toBe("+255700000009");
  expect(deliverySmsRecipient("+255700000001,+255700000002")).toBeNull();
});
