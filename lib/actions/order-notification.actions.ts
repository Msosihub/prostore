"use server";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
export async function setOrderSmsPreference(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id || typeof enabled !== "boolean")
    return { success: false, message: "Unauthorized" };
  await prisma.user.update({
    where: { id: session.user.id },
    data: { orderSmsEnabled: enabled },
  });
  revalidatePath("/user/notifications");
  return {
    success: true,
    message: enabled
      ? "Order SMS enabled. Previously suppressed messages will not be replayed."
      : "Order SMS disabled. Messages already in flight may still arrive. Orders remain available in your account.",
  };
}
export async function retryOrderNotification(input: {
  id: string;
  acknowledgeUnknown: boolean;
}) {
  try {
    const session = await requireAdmin();
    const args = z
      .object({ id: z.string().uuid(), acknowledgeUnknown: z.boolean() })
      .parse(input);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "OrderNotification" WHERE "id" = ${args.id}::uuid FOR UPDATE`;
      const actor = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      if (actor?.role !== "ADMIN") throw new Error("Unauthorized");
      const row = await tx.orderNotification.findUniqueOrThrow({
        where: { id: args.id },
      });
      if (
        !["FAILED", "UNKNOWN"].includes(row.state) ||
        row.attempts >= 5 ||
        (row.state === "UNKNOWN" && !args.acknowledgeUnknown)
      )
        throw new Error("Retry unavailable");
      await tx.orderNotification.update({
        where: { id: row.id },
        data: {
          state: "QUEUED",
          reason: "ADMIN_RETRY_REQUESTED",
          completedAt: null,
          nextAttemptAt: new Date(),
          events: {
            create: {
              state: "QUEUED",
              reason: "ADMIN_RETRY_REQUESTED",
              actorId: session.user.id,
            },
          },
        },
      });
    });
    revalidatePath("/admin/notifications");
    return {
      success: true,
      message:
        "Queued for an enabled worker. No message was sent by this action.",
    };
  } catch {
    return {
      success: false,
      message:
        "Retry unavailable. Check current role, state, attempt cap and duplicate-risk acknowledgement.",
    };
  }
}
