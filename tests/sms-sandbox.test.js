import { sendSms } from "@/lib/africasTalking";
const names = [
  "AT_SMS_MODE",
  "AT_API_KEY",
  "AT_SANDBOX_API_KEY",
  "AT_SANDBOX_SENDER_ID",
];
let saved, fetchMock;
beforeEach(() => {
  saved = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  names.forEach((k) => delete process.env[k]);
  process.env.AT_API_KEY = "synthetic-live-key";
  fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}"));
});
afterEach(() => {
  fetchMock.mockRestore();
  names.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
});
test("absent mode retains exact live account and sender", async () => {
  await sendSms("+255700000001", "synthetic");
  const [url, req] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.africastalking.com/version1/messaging");
  expect(req.body.get("username")).toBe("BmContractors");
  expect(req.body.get("from")).toBe("BM SECURITY");
  expect(req.headers.apiKey).toBe("synthetic-live-key");
  expect(req.redirect).toBe("error");
});
test("sandbox uses isolated key and fixed official host/username without live sender", async () => {
  process.env.AT_SMS_MODE = "sandbox";
  process.env.AT_SANDBOX_API_KEY = "synthetic-sandbox-key";
  await sendSms("+255700000001", "synthetic");
  const [url, req] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.sandbox.africastalking.com/version1/messaging");
  expect(req.body.get("username")).toBe("sandbox");
  expect(req.body.has("from")).toBe(false);
  expect(req.headers.apiKey).toBe("synthetic-sandbox-key");
  expect(req.redirect).toBe("error");
});
test("sandbox never falls back to live key", async () => {
  process.env.AT_SMS_MODE = "sandbox";
  await expect(sendSms("+255700000001", "synthetic")).rejects.toThrow(
    "not configured",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
test.each(["", "SANDBOX", "https://example.invalid", "false"])(
  "unknown mode %j fails closed",
  async (mode) => {
    process.env.AT_SMS_MODE = mode;
    await expect(sendSms("+255700000001", "synthetic")).rejects.toThrow(
      "Invalid SMS configuration",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
test("optional sandbox sender is explicit and validated", async () => {
  process.env.AT_SMS_MODE = "sandbox";
  process.env.AT_SANDBOX_API_KEY = "synthetic-sandbox-key";
  process.env.AT_SANDBOX_SENDER_ID = "TEST";
  await sendSms("+255700000001", "synthetic");
  expect(fetchMock.mock.calls[0][1].body.get("from")).toBe("TEST");
  fetchMock.mockClear();
  process.env.AT_SANDBOX_SENDER_ID = "bad\nsender";
  await expect(sendSms("+255700000001", "synthetic")).rejects.toThrow(
    "Invalid SMS configuration",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
