// Explicit stored method spellings supported by the legacy checkout.
export const COD_METHODS = ["CashOnDelivery", "COD", "Cash On Delivery"];
export const PESAPAL_METHODS = ["PESAPAL", "Pesapal"];

export function pesapalTrackingId(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return;
  const value = result as Record<string, unknown>;
  const ids = [value.trackingId, value.id].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  if (!ids.length || new Set(ids).size !== 1) return;
  return ids[0];
}
