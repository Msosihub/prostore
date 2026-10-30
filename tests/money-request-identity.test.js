import {
  moneyRequestIdentity,
  clearMoneyRequestIdentity,
} from "@/lib/money-request-identity";
beforeAll(() =>
  Object.defineProperty(globalThis, "crypto", {
    value: require("node:crypto").webcrypto,
    configurable: true,
  }),
);
function storage() {
  const data = new Map();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}
const payload = {
  kind: "WITHDRAWAL",
  amount: "123.45",
  reason: "Private synthetic reason",
};
test("same owner and payload recover same key after memory/reload loss without storing case text", async () => {
  const s = storage();
  const first = await moneyRequestIdentity(s, "buyerA:WITHDRAWAL", payload);
  const retry = await moneyRequestIdentity(s, "buyerA:WITHDRAWAL", payload);
  expect(retry.requestKey).toBe(first.requestKey);
  expect(retry.persistent).toBe(true);
  const saved = [...s.data.values()].join();
  expect(saved).not.toContain(payload.reason);
  expect(saved).not.toContain(payload.amount);
});
test("changed payload cannot silently create another reservation", async () => {
  const s = storage();
  await moneyRequestIdentity(s, "sellerA", payload);
  await expect(
    moneyRequestIdentity(s, "sellerA", { ...payload, amount: "10" }),
  ).rejects.toThrow("An earlier request");
});
test("account scopes cannot reuse each other's pending intent", async () => {
  const s = storage();
  const a = await moneyRequestIdentity(s, "sellerA", payload);
  const b = await moneyRequestIdentity(s, "sellerB", payload, a);
  expect(a.requestKey).not.toBe(b.requestKey);
});
test("unavailable storage preserves same-page retries and reports nonpersistent identity", async () => {
  const s = {
    getItem: () => {
      throw Error("disabled");
    },
    setItem: () => {
      throw Error("disabled");
    },
    removeItem: () => {
      throw Error("disabled");
    },
  };
  const first = await moneyRequestIdentity(s, "seller", payload);
  const retry = await moneyRequestIdentity(s, "seller", payload, first);
  expect(first.persistent).toBe(false);
  expect(first.requestKey).toBe(retry.requestKey);
});
test("corrupt stored metadata fails closed until explicit new-intent reset", async () => {
  const s = storage();
  const first = await moneyRequestIdentity(s, "seller", payload);
  for (const k of s.data.keys()) s.data.set(k, "invalid");
  await expect(moneyRequestIdentity(s, "seller", payload)).rejects.toThrow(
    "Check existing",
  );
  clearMoneyRequestIdentity(s, "seller");
  const next = await moneyRequestIdentity(s, "seller", payload);
  expect(first.requestKey).not.toBe(next.requestKey);
});
test("successful completion can clear only its owner key", async () => {
  const s = storage();
  const a = await moneyRequestIdentity(s, "A", payload);
  const b = await moneyRequestIdentity(s, "B", payload);
  clearMoneyRequestIdentity(s, "A");
  expect((await moneyRequestIdentity(s, "A", payload)).requestKey).not.toBe(
    a.requestKey,
  );
  expect((await moneyRequestIdentity(s, "B", payload)).requestKey).toBe(
    b.requestKey,
  );
});
test("readable storage with failed removal does not falsely clear a completed intent", async () => {
  const s = storage();
  await moneyRequestIdentity(s, "seller", payload);
  s.removeItem = () => {
    throw Error("remove blocked");
  };
  expect(clearMoneyRequestIdentity(s, "seller")).toBe(false);
  await expect(moneyRequestIdentity(s, "seller", payload)).rejects.toThrow(
    "Check existing",
  );
  expect([...s.data.values()][0]).not.toContain(payload.reason);
  s.removeItem = (k) => s.data.delete(k);
  expect(clearMoneyRequestIdentity(s, "seller")).toBe(true);
  expect((await moneyRequestIdentity(s, "seller", payload)).persistent).toBe(
    true,
  );
});
test("silent removal failure is reported and marked rather than pretending to reset", async () => {
  const s = storage();
  await moneyRequestIdentity(s, "seller", payload);
  s.removeItem = () => {};
  expect(clearMoneyRequestIdentity(s, "seller")).toBe(false);
  await expect(moneyRequestIdentity(s, "seller", payload)).rejects.toThrow(
    "Check existing",
  );
});
