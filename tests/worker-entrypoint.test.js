jest.mock("@/lib/payment-recovery", () => ({ reconciliationBatch: jest.fn() }));
jest.mock("@/lib/order-notification-outbox", () => ({
  notificationBatch: jest.fn(),
}));
jest.mock("@/lib/seller-notification-outbox", () => ({
  sellerNoticeBatch: jest.fn(),
}));
import { POST } from "@/app/api/internal/workers/[queue]/route";
import { reconciliationBatch } from "@/lib/payment-recovery";
import { notificationBatch } from "@/lib/order-notification-outbox";
import { sellerNoticeBatch } from "@/lib/seller-notification-outbox";
const names = [
  "NIMBOYA_WORKER_SECRET",
  "NIMBOYA_PAYMENT_WORKER_MODE",
  "NIMBOYA_ORDER_WORKER_MODE",
  "NIMBOYA_SELLER_WORKER_MODE",
];
const token = "synthetic-worker-token-with-enough-length";
let saved;
beforeEach(() => {
  saved = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  names.forEach((k) => delete process.env[k]);
  [reconciliationBatch, notificationBatch, sellerNoticeBatch].forEach((fn) =>
    fn
      .mockReset()
      .mockResolvedValue([{ id: "private-id", state: "private-state" }]),
  );
});
afterEach(() =>
  names.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }),
);
const invoke = (
  queue = "orders",
  header = `Bearer ${token}`,
  suffix = "",
  body,
) =>
  POST(
    new Request(
      `https://example.invalid/api/internal/workers/${queue}${suffix}`,
      {
        method: "POST",
        headers: header ? { authorization: header } : {},
        ...(body ? { body } : {}),
      },
    ),
    { params: Promise.resolve({ queue }) },
  );
const noWork = () =>
  [reconciliationBatch, notificationBatch, sellerNoticeBatch].forEach((fn) =>
    expect(fn).not.toHaveBeenCalled(),
  );
test.each([undefined, "short"])(
  "missing/weak server secret refuses before work",
  async (secret) => {
    if (secret) process.env.NIMBOYA_WORKER_SECRET = secret;
    expect((await invoke()).status).toBe(401);
    noWork();
  },
);
test.each([
  null,
  "Bearer wrong",
  "Basic something",
  "Bearer " + "x".repeat(400),
])("invalid authentication refuses work", async (header) => {
  process.env.NIMBOYA_WORKER_SECRET = token;
  process.env.NIMBOYA_ORDER_WORKER_MODE = "execute";
  expect((await invoke("orders", header)).status).toBe(401);
  noWork();
});
test.each([undefined, "disabled", "true", "EXECUTE", ""])(
  "disabled or malformed mode fails closed",
  async (mode) => {
    process.env.NIMBOYA_WORKER_SECRET = token;
    if (mode !== undefined) process.env.NIMBOYA_ORDER_WORKER_MODE = mode;
    expect((await invoke()).status).toBe(404);
    noWork();
  },
);
test.each(["__proto__", "constructor", "retention", "unknown"])(
  "unknown queue cannot invoke workers: %s",
  async (queue) => {
    process.env.NIMBOYA_WORKER_SECRET = token;
    expect((await invoke(queue)).status).toBe(404);
    noWork();
  },
);
test.each([
  ["payments", "NIMBOYA_PAYMENT_WORKER_MODE", reconciliationBatch],
  ["orders", "NIMBOYA_ORDER_WORKER_MODE", notificationBatch],
  ["sellers", "NIMBOYA_SELLER_WORKER_MODE", sellerNoticeBatch],
])(
  "server-controlled modes bound %s to one candidate",
  async (queue, key, fn) => {
    process.env.NIMBOYA_WORKER_SECRET = token;
    for (const mode of ["dry-run", "execute"]) {
      process.env[key] = mode;
      const res = await invoke(queue);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ queue, mode, examined: 1 });
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(fn).toHaveBeenLastCalledWith({
        dryRun: mode === "dry-run",
        limit: 1,
      });
    }
    expect(
      [reconciliationBatch, notificationBatch, sellerNoticeBatch]
        .filter((f) => f !== fn)
        .every((f) => f.mock.calls.length === 0),
    ).toBe(true);
  },
);
test("caller cannot override mode/limit or choose recipients", async () => {
  process.env.NIMBOYA_WORKER_SECRET = token;
  process.env.NIMBOYA_ORDER_WORKER_MODE = "dry-run";
  expect(
    (await invoke("orders", `Bearer ${token}`, "?dryRun=false&limit=50"))
      .status,
  ).toBe(400);
  expect(
    (await invoke("orders", `Bearer ${token}`, "", '{"to":"private"}')).status,
  ).toBe(400);
  noWork();
});
test("failure is redacted without logging sensitive error or claiming completion", async () => {
  process.env.NIMBOYA_WORKER_SECRET = token;
  process.env.NIMBOYA_ORDER_WORKER_MODE = "execute";
  notificationBatch.mockRejectedValue(
    new Error("private contact and credential"),
  );
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const res = await invoke();
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("private");
    expect(log).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
