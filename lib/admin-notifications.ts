import "server-only";
import { prisma } from "@/db/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { adminFilters } from "@/lib/admin-operations";
import { z } from "zod";
export async function notificationQueue(
  params: Record<string, string | string[] | undefined>,
) {
  await requireAdmin();
  const filters = adminFilters(params);
  const where = {
    ...([
      "QUEUED",
      "SENDING",
      "RETRY",
      "ACCEPTED",
      "FAILED",
      "UNKNOWN",
      "SUPPRESSED",
    ].includes(filters.status)
      ? { state: filters.status }
      : {}),
    ...(z.string().uuid().safeParse(filters.q).success
      ? { orderId: filters.q }
      : {}),
  };
  const total = await prisma.orderNotification.count({ where });
  filters.page = Math.min(filters.page, Math.max(1, Math.ceil(total / 20)));
  const items = await prisma.orderNotification.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (filters.page - 1) * 20,
    take: 20,
    select: {
      id: true,
      orderId: true,
      kind: true,
      state: true,
      attempts: true,
      reason: true,
      acceptedAt: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { state: true, reason: true, createdAt: true },
      },
    },
  });
  return { items, total, filters };
}
