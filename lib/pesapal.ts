import "server-only";
import { z } from "zod";

function baseUrl() {
  const base = process.env.PESAPAL_BASE_URL;
  if (
    !base ||
    !process.env.PESAPAL_CONSUMER_KEY ||
    !process.env.PESAPAL_CONSUMER_SECRET
  )
    throw new Error("Pesapal is not configured");
  return base.replace(/\/$/, "");
}

export async function getPesapalToken() {
  const response = await fetch(`${baseUrl()}/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Pesapal authentication failed");
  return z.object({ token: z.string().min(1) }).parse(await response.json());
}

export async function getPesapalStatus(trackingId: string) {
  const { token } = await getPesapalToken();
  const response = await fetch(
    `${baseUrl()}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error("Pesapal verification failed");
  const result = z
    .object({
      status: z.union([z.literal(200), z.literal("200")]),
      status_code: z.number().int().min(0).max(3),
      merchant_reference: z.string().uuid(),
      payment_status_description: z
        .string()
        .transform((value) => value.toUpperCase())
        .pipe(z.enum(["INVALID", "COMPLETED", "FAILED", "REVERSED"])),
      amount: z
        .union([z.number(), z.string().min(1)])
        .pipe(z.coerce.number().finite().nonnegative()),
      currency: z.string(),
      confirmation_code: z.string().optional().nullable(),
      error: z.object({ code: z.unknown().optional() }).optional().nullable(),
    })
    .parse(await response.json());
  if (
    result.error?.code != null ||
    ["INVALID", "COMPLETED", "FAILED", "REVERSED"][result.status_code] !==
      result.payment_status_description
  )
    throw new Error("Inconsistent Pesapal response");
  if (
    result.payment_status_description === "COMPLETED" &&
    !result.confirmation_code?.trim()
  )
    throw new Error("Missing Pesapal confirmation");
  return result;
}
