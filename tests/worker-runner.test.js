const { invokeWorker } = require("../scripts/invoke-worker.cjs");
const secret = "synthetic-worker-secret-for-test-only";
test.each(["payments", "orders", "sellers"])(
  "default %s planning makes no request",
  async (queue) => {
    const fetchImpl = jest.fn();
    expect(await invokeWorker({ queue, fetchImpl })).toEqual({
      networkRequest: false,
      queue,
      target: `https://nimboya.com/api/internal/workers/${queue}`,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  },
);
test.each(["unknown", "__proto__", "orders?x=1"])(
  "rejects invalid queue %s",
  async (queue) => {
    const fetchImpl = jest.fn();
    await expect(
      invokeWorker({ queue, invoke: true, secret, fetchImpl }),
    ).rejects.toThrow("Invalid worker options");
    expect(fetchImpl).not.toHaveBeenCalled();
  },
);
test("invocation requires separate configured authentication", async () => {
  const fetchImpl = jest.fn();
  await expect(
    invokeWorker({ queue: "orders", invoke: true, fetchImpl }),
  ).rejects.toThrow("not configured");
  expect(fetchImpl).not.toHaveBeenCalled();
});
test("explicit invocation uses fixed origin POST and strips private result fields", async () => {
  const fetchImpl = jest
    .fn()
    .mockResolvedValue(
      Response.json({
        queue: "orders",
        mode: "execute",
        examined: 1,
        private: "never-output",
      }),
    );
  expect(
    await invokeWorker({ queue: "orders", invoke: true, secret, fetchImpl }),
  ).toEqual({
    networkRequest: true,
    queue: "orders",
    mode: "execute",
    examined: 1,
  });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledWith(
    "https://nimboya.com/api/internal/workers/orders",
    expect.objectContaining({
      method: "POST",
      redirect: "error",
      headers: { Authorization: `Bearer ${secret}` },
    }),
  );
});
test.each(["network", "http", "oversize", "shape"])(
  "%s outcome is redacted and never auto-retried",
  async (kind) => {
    const fetchImpl = jest.fn();
    if (kind === "network") fetchImpl.mockRejectedValue(new Error(secret));
    else if (kind === "http")
      fetchImpl.mockResolvedValue(new Response(secret, { status: 503 }));
    else if (kind === "oversize")
      fetchImpl.mockResolvedValue(new Response("x".repeat(4097)));
    else
      fetchImpl.mockResolvedValue(
        Response.json({
          queue: "payments",
          mode: "execute",
          examined: 2,
          secret,
        }),
      );
    await expect(
      invokeWorker({ queue: "orders", invoke: true, secret, fetchImpl }),
    ).rejects.toThrow(
      /^Worker outcome unconfirmed; inspect durable queue state before retry$/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  },
);
