jest.mock("@/db/prisma", () => ({
  prisma: {
    orderNotification: { findMany: jest.fn(async () => []) },
    sellerNotice: { findMany: jest.fn(async () => []) },
    paymentAttempt: { findMany: jest.fn(async () => []) },
    orderNotificationEvent: {
      findMany: jest.fn(async () => []),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/africasTalking", () => ({ sendSms: jest.fn() }));
jest.mock("@/lib/zenopay", () => ({ getZenopayStatus: jest.fn() }));
import { prisma } from "@/db/prisma";
import {
  notificationBatch,
  notificationRetention,
} from "@/lib/order-notification-outbox";
import { sellerNoticeBatch } from "@/lib/seller-notification-outbox";
import { reconciliationBatch } from "@/lib/payment-recovery";
import { sendSms } from "@/lib/africasTalking";
import { getZenopayStatus } from "@/lib/zenopay";
const workers = [
  notificationBatch,
  sellerNoticeBatch,
  reconciliationBatch,
  (o) => notificationRetention({ ...o, olderThan: new Date("2000-01-01") }),
];
test.each([null, 0, 1, "", "false", "true", [], {}])(
  "malformed dry-run value fails before database/provider IO: %j",
  async (value) => {
    for (const worker of workers)
      await expect(worker({ dryRun: value })).rejects.toThrow(
        "Invalid dry-run option",
      );
    for (const model of [
      prisma.orderNotification,
      prisma.sellerNotice,
      prisma.paymentAttempt,
      prisma.orderNotificationEvent,
    ])
      expect(model.findMany).not.toHaveBeenCalled();
    expect(prisma.orderNotificationEvent.deleteMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
    expect(getZenopayStatus).not.toHaveBeenCalled();
  },
);
test("omitted and explicit true options preserve read-only defaults", async () => {
  for (const worker of workers) {
    await worker({});
    await worker({ dryRun: true });
  }
  expect(prisma.orderNotificationEvent.deleteMany).not.toHaveBeenCalled();
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(sendSms).not.toHaveBeenCalled();
  expect(getZenopayStatus).not.toHaveBeenCalled();
});
