jest.mock("@/db/prisma", () => ({ prisma: {} }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
import { moneyRequestSchema } from "@/lib/money-review";
import {
  requestMoneyReview,
  reviewMoneyCase,
} from "@/lib/actions/money-review.actions";
import { auth } from "@/auth";
const base = {
  kind: "WITHDRAWAL",
  requestKey: "123e4567-e89b-42d3-a456-426614174000",
  reason: "Test request",
};
test.each(["-1", "1e3", "NaN", "0.001", "99999999999", "", " 100", 100])(
  "rejects non-canonical amount %p",
  (amount) => {
    expect(moneyRequestSchema.safeParse({ ...base, amount }).success).toBe(
      false,
    );
  },
);
test.each([0, -1, 1.5, NaN, Infinity, "2"])(
  "rejects quantity %p",
  (quantity) => {
    expect(
      moneyRequestSchema.safeParse({
        kind: "REFUND",
        requestKey: base.requestKey,
        orderId: base.requestKey,
        productId: base.requestKey,
        reason: base.reason,
        quantity,
      }).success,
    ).toBe(false);
  },
);
test("allows exact decimal amount and strips forged actor/supplier binding", () => {
  const parsed = moneyRequestSchema.parse({
    ...base,
    amount: "12.34",
    supplierId: "other",
    actorId: "other",
  });
  expect(parsed.amount).toBe("12.34");
  expect(parsed.supplierId).toBeUndefined();
  expect(parsed.actorId).toBeUndefined();
});
test("anonymous direct actions fail before database or provider access", async () => {
  auth.mockResolvedValue(null);
  expect((await requestMoneyReview({})).success).toBe(false);
  expect((await reviewMoneyCase({})).success).toBe(false);
});
