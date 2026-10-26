import { getPesapalStatus } from "@/lib/pesapal";
const id = "11111111-1111-4111-8111-111111111111";
const completed = {
  status: "200",
  status_code: 1,
  merchant_reference: id,
  payment_status_description: "Completed",
  amount: 1000,
  currency: "TZS",
  confirmation_code: "verified",
  error: { code: null },
};
beforeEach(() => {
  process.env.PESAPAL_BASE_URL = "https://example.test/api";
  process.env.PESAPAL_CONSUMER_KEY = "test-only";
  process.env.PESAPAL_CONSUMER_SECRET = "test-only";
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "test-token" }),
    });
});
afterEach(() => {
  delete process.env.PESAPAL_BASE_URL;
  delete process.env.PESAPAL_CONSUMER_KEY;
  delete process.env.PESAPAL_CONSUMER_SECRET;
});
test("uses documented tracking query and verified status envelope", async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => completed });
  expect((await getPesapalStatus(id)).payment_status_description).toBe(
    "COMPLETED",
  );
  expect(fetch.mock.calls[1][0]).toBe(
    `https://example.test/api/Transactions/GetTransactionStatus?orderTrackingId=${id}`,
  );
  expect(fetch.mock.calls[1][1]).toMatchObject({
    cache: "no-store",
    headers: { Authorization: "Bearer test-token" },
  });
});
test.each([
  { ...completed, status: "500" },
  { ...completed, status_code: 2 },
  { ...completed, confirmation_code: "  " },
  { ...completed, error: { code: "ERROR" } },
  { ...completed, merchant_reference: "invalid" },
  { ...completed, amount: true },
])("rejects inconsistent provider response %j", async (response) => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => response });
  await expect(getPesapalStatus(id)).rejects.toThrow();
});
test("HTTP failure is not settlement", async () => {
  fetch.mockResolvedValueOnce({ ok: false });
  await expect(getPesapalStatus(id)).rejects.toThrow();
});
test("missing configuration cannot call provider", async () => {
  delete process.env.PESAPAL_CONSUMER_KEY;
  await expect(getPesapalStatus(id)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
