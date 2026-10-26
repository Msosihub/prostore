// Browser-only retry metadata: no reason, amount, contact or account details stored.
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type PendingMoneyIdentity = {
  owner: string;
  fingerprint: string;
  requestKey: string;
  persistent: boolean;
};
const keyFor = (owner: string) => `prostore:money-review:pending:v1:${owner}`;
export function clearMoneyRequestIdentity(
  storage: StorageLike | null,
  owner: string,
) {
  if (!storage) return true;
  try {
    storage.removeItem(keyFor(owner));
    if (storage.getItem(keyFor(owner)) === null) return true;
  } catch {
    /* Fall through: never claim a reset that did not persist. */
  }
  try {
    storage.setItem(keyFor(owner), JSON.stringify({ resetRequired: true }));
  } catch {
    /* UI also blocks new submissions in this page. */
  }
  return false;
}
export async function moneyRequestIdentity(
  storage: StorageLike | null,
  owner: string,
  payload: object,
  memory?: PendingMoneyIdentity,
): Promise<PendingMoneyIdentity> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  let previous = memory?.owner === owner ? memory : undefined;
  let raw: string | null | undefined;
  try {
    raw = storage?.getItem(keyFor(owner));
  } catch {
    storage = null;
  }
  if (raw) {
    try {
      const value = JSON.parse(raw);
      if (
        value.owner !== owner ||
        !/^[a-f0-9]{64}$/.test(value.fingerprint) ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
          value.requestKey,
        )
      )
        throw new Error("Invalid metadata");
      previous = value;
    } catch {
      if (!previous)
        throw new Error(
          "Check existing review cases and choose Start another request before continuing.",
        );
    }
  }
  if (previous && previous.fingerprint !== fingerprint)
    throw new Error(
      "An earlier request may have been saved. Retry unchanged details, or check existing cases before choosing Start another request.",
    );
  const result = previous ?? {
    owner,
    fingerprint,
    requestKey: crypto.randomUUID(),
    persistent: false,
  };
  try {
    storage?.setItem(keyFor(owner), JSON.stringify(result));
    result.persistent = !!storage;
  } catch {
    result.persistent = false;
  }
  return result;
}
