import "server-only";
import { z } from "zod";
import { prisma } from "@/db/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { adminFilters } from "@/lib/admin-operations";
export async function paymentQueue(
  params: Record<string, string | string[] | undefined>,
) {
  await requireAdmin();
  const filters = adminFilters(params);
  const state = [
    "AMBIGUOUS",
    "PENDING",
    "FAILED",
    "VERIFIED",
    "REVIEW",
    "SETTLED",
  ].includes(filters.status)
    ? filters.status
    : undefined;
  const where = {
    state: state ?? { not: "SETTLED" },
    ...(z.string().uuid().safeParse(filters.q).success
      ? { orderId: filters.q }
      : {}),
  };
  const [total, legacy] = await Promise.all([
    prisma.paymentAttempt.count({ where }),
    prisma.order.count({
      where: { paymentMethod: "ZENOPAY", paymentAttempts: { none: {} } },
    }),
  ]);
  filters.page = Math.min(filters.page, Math.max(1, Math.ceil(total / 20)));
  const items = await prisma.paymentAttempt.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 20,
    skip: (filters.page - 1) * 20,
  });

  const legacyItems = await prisma.order.findMany({
    where: { paymentMethod: "ZENOPAY", paymentAttempts: { none: {} } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 20,
    select: { id: true, isPaid: true, paymentStatus: true },
  });
  return { items, total, legacy, legacyItems, filters };
}
export async function paymentDetail(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return null;
  return prisma.paymentAttempt.findUnique({
    where: { id },
    include: {
      events: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50 },
      order: { select: { isPaid: true, paymentStatus: true } },
    },
  });
}
