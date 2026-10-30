import type { ZenoBody } from "@/types";
import { z } from "zod";

const BASE_URL = "https://zenoapi.com";

async function request(endpoint: string, body?: ZenoBody): Promise<unknown> {
  const key = process.env.ZENOPAY_API_KEY;
  if (!key) throw new Error("Payment provider is not configured");
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Payment provider request failed");
  return response.json();
}

export async function zenopayRequest(endpoint: string, body: ZenoBody) {
  const result = z
    .object({
      status: z.literal("success"),
      resultcode: z.literal("000").optional(),
      order_id: z.string().optional(),
    })
    .parse(await request(endpoint, body));
  if (result.order_id && result.order_id !== body.order_id) {
    throw new Error("Payment provider reference mismatch");
  }
  return result;
}

// A webhook is a hint, never proof of payment. Only this authenticated lookup
// may supply the status/amount used for settlement.
export async function getZenopayStatus(orderId: string) {
  const result = z
    .object({
      resultcode: z.literal("000"),
      data: z.array(
        z.object({
          order_id: z.string(),
          payment_status: z.enum(["PENDING", "COMPLETED", "FAILED"]),
          amount: z
            .union([z.number(), z.string().min(1)])
            .pipe(z.coerce.number().finite().positive()),
          reference: z.string().trim().min(1).optional(),
        }),
      ),
    })
    .parse(
      await request(
        `/api/payments/order-status?order_id=${encodeURIComponent(orderId)}`,
      ),
    );
  const matches = result.data.filter((item) => item.order_id === orderId);
  const payment = matches[0];
  if (matches.length !== 1)
    throw new Error("Payment provider reference mismatch");
  if (payment.payment_status === "COMPLETED" && !payment.reference) {
    throw new Error("Missing payment reference");
  }
  return payment;
}
