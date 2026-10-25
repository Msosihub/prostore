import { zenopayRequest, getZenopayStatus } from "@/lib/zenopay";

const body = {
  order_id: "order=attempt",
  buyer_email: "buyer@example.test",
  buyer_name: "Test Buyer",
  buyer_phone: "0700000000",
  amount: 1000,
  webhook_url: "https://example.test/hook",
};
beforeEach(() => {
  process.env.ZENOPAY_API_KEY = "test-only";
  global.fetch = jest.fn();
});
afterEach(() => {
  delete process.env.ZENOPAY_API_KEY;
});
const reply = (value, ok = true) =>
  fetch.mockResolvedValue({ ok, json: async () => value });

test.each([400, 401, 500])("HTTP %i is never fabricated success", async () => {
  reply({ status: "success" }, false);
  await expect(zenopayRequest("/test", body)).rejects.toThrow();
});
test.each([
  { status: "error" },
  {},
  null,
  { status: "success", order_id: "wrong" },
])("rejects invalid initiation response %j", async (value) => {
  reply(value);
  await expect(zenopayRequest("/test", body)).rejects.toThrow();
});
test("accepts actual provider success with timeout and no-store", async () => {
  reply({ status: "success", order_id: body.order_id });
  await expect(zenopayRequest("/test", body)).resolves.toMatchObject({
    status: "success",
  });
  expect(fetch.mock.calls[0][1]).toMatchObject({
    cache: "no-store",
    headers: { "x-api-key": "test-only" },
  });
  expect(fetch.mock.calls[0][1].signal).toBeDefined();
});
test("missing credentials never calls provider", async () => {
  delete process.env.ZENOPAY_API_KEY;
  await expect(getZenopayStatus("id")).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
test("network timeout does not become success", async () => {
  fetch.mockRejectedValue(new Error("timeout"));
  await expect(zenopayRequest("/test", body)).rejects.toThrow();
});
test("invalid JSON does not become success", async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => {
      throw new SyntaxError("invalid JSON");
    },
  });
  await expect(zenopayRequest("/test", body)).rejects.toThrow();
});
test("verifies the exact reference and parses provider amount", async () => {
  reply({
    resultcode: "000",
    data: [
      {
        order_id: body.order_id,
        payment_status: "COMPLETED",
        amount: "1000",
        reference: "test-ref",
      },
    ],
  });
  await expect(getZenopayStatus(body.order_id)).resolves.toMatchObject({
    amount: 1000,
    payment_status: "COMPLETED",
  });
  expect(fetch.mock.calls[0][0]).toContain("order%3Dattempt");
});
test.each([
  {
    order_id: "wrong",
    payment_status: "COMPLETED",
    amount: 1000,
    reference: "ref",
  },
  { order_id: body.order_id, payment_status: "UNKNOWN", amount: 1000 },
  { order_id: body.order_id, payment_status: "COMPLETED", amount: 1000 },
  {
    order_id: body.order_id,
    payment_status: "COMPLETED",
    amount: "oops",
    reference: "ref",
  },
])("rejects untrusted status record %j", async (record) => {
  reply({ resultcode: "000", data: [record] });
  await expect(getZenopayStatus(body.order_id)).rejects.toThrow();
});
