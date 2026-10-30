import { createHash, timingSafeEqual } from "node:crypto";
import { reconciliationBatch } from "@/lib/payment-recovery";
import { notificationBatch } from "@/lib/order-notification-outbox";
import { sellerNoticeBatch } from "@/lib/seller-notification-outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const workers = {
  payments: { run: reconciliationBatch, mode: "NIMBOYA_PAYMENT_WORKER_MODE" },
  orders: { run: notificationBatch, mode: "NIMBOYA_ORDER_WORKER_MODE" },
  sellers: { run: sellerNoticeBatch, mode: "NIMBOYA_SELLER_WORKER_MODE" },
};
function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
function authorized(request: Request) {
  const secret = process.env.NIMBOYA_WORKER_SECRET;
  const value = request.headers.get("authorization");
  if (
    !secret ||
    secret.length < 32 ||
    secret.length > 256 ||
    !value ||
    value.length > 300
  )
    return false;
  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(value), digest(`Bearer ${secret}`));
}

// POST-only trusted operator entrypoint. No scheduler or credentials are installed.
// One candidate per invocation bounds provider work; durable leases handle overlap.
export async function POST(
  request: Request,
  context: { params: Promise<{ queue: string }> },
) {
  if (!authorized(request)) return reply(401, { error: "Unauthorized" });
  const { queue } = await context.params;
  if (!Object.prototype.hasOwnProperty.call(workers, queue))
    return reply(404, { error: "Unavailable" });
  const worker = workers[queue as keyof typeof workers];
  const mode = process.env[worker.mode];
  if (mode !== "dry-run" && mode !== "execute")
    return reply(404, { error: "Unavailable" });
  // Configuration is server-owned: callers cannot override mode, limit or recipients.
  if (new URL(request.url).search || request.body !== null)
    return reply(400, { error: "No parameters accepted" });
  try {
    const results = await worker.run({ dryRun: mode === "dry-run", limit: 1 });
    // Deliberately omit IDs, recipients, provider payloads and financial data.
    return reply(200, { queue, mode, examined: results.length });
  } catch {
    // May follow partial execution. Do not report a job as delivered or retry a charge.
    return reply(503, {
      error: "Worker unavailable; inspect durable queue state",
    });
  }
}
