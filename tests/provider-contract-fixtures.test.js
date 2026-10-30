import { getZenopayStatus, zenopayRequest } from "@/lib/zenopay";
import { getPesapalStatus } from "@/lib/pesapal";
const zeno = require("./fixtures/providers/zenopay-completed.json");
const pesapal = require("./fixtures/providers/pesapal-completed.json");
beforeEach(() => {
  process.env.ZENOPAY_API_KEY = "fixture-only";
  process.env.PESAPAL_BASE_URL = "https://cybqa.pesapal.com/pesapalv3/api";
  process.env.PESAPAL_CONSUMER_KEY = "fixture-only";
  process.env.PESAPAL_CONSUMER_SECRET = "fixture-only";
  global.fetch = jest.fn();
});
afterEach(() => {
  for (const key of [
    "ZENOPAY_API_KEY",
    "PESAPAL_BASE_URL",
    "PESAPAL_CONSUMER_KEY",
    "PESAPAL_CONSUMER_SECRET",
  ])
    delete process.env[key];
});
const response = (value) => ({ ok: true, json: async () => value });
test("Zeno v1 contract fixture binds composite reference and TZS amount without currency field", async () => {
  fetch.mockResolvedValue(response(zeno));
  const row = zeno.data[0];
  expect(await getZenopayStatus(row.order_id)).toMatchObject({
    amount: 1000,
    reference: row.reference,
  });
  expect(fetch.mock.calls[0][0]).toBe(
    "https://zenoapi.com/api/payments/order-status?order_id=" +
      encodeURIComponent(row.order_id),
  );
});
test("collection amount is sent in TZS units, without cents multiplication", async () => {
  fetch.mockResolvedValue(response({ status: "success", resultcode: "000" }));
  const request = {
    order_id: zeno.data[0].order_id,
    amount: 1000,
    buyer_email: "buyer@example.test",
    buyer_name: "Synthetic Buyer",
    buyer_phone: "0700000000",
    webhook_url: "https://callback.example.test/api/zenopay/webhook",
  };
  await zenopayRequest("/api/payments/mobile_money_tanzania", request);
  expect(JSON.parse(fetch.mock.calls[0][1].body).amount).toBe(1000);
});
test.each([
  "https://cybqa.pesapal.com/pesapalv3/api",
  "https://pay.pesapal.com/v3/api",
])(
  "Pesapal API3 fixture preserves endpoint paths for configured base %s",
  async (base) => {
    process.env.PESAPAL_BASE_URL = base + "/";
    fetch
      .mockResolvedValueOnce(response({ token: "fixture-token" }))
      .mockResolvedValueOnce(response(pesapal));
    expect(await getPesapalStatus("tracking-fixture")).toMatchObject({
      payment_status_description: "COMPLETED",
      currency: "TZS",
      merchant_reference: pesapal.merchant_reference,
    });
    expect(fetch.mock.calls[0][0]).toBe(base + "/Auth/RequestToken");
    expect(fetch.mock.calls[1][0]).toBe(
      base +
        "/Transactions/GetTransactionStatus?orderTrackingId=tracking-fixture",
    );
  },
);
