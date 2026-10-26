import { sendSms } from "@/lib/africasTalking";
const secret = "synthetic-private-marker";
let originalKey, fetchMock;
beforeEach(() => {
  originalKey = process.env.AT_API_KEY;
  process.env.AT_API_KEY = secret;
  fetchMock = jest.spyOn(global, "fetch");
});
afterEach(() => {
  fetchMock.mockRestore();
  if (originalKey === undefined) delete process.env.AT_API_KEY;
  else process.env.AT_API_KEY = originalKey;
});
test.each(["network", "response"])("%s provider failure is redacted", async (kind) => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    if (kind === "network") fetchMock.mockRejectedValue(new Error(secret));
    else fetchMock.mockResolvedValue({ ok: false, statusText: secret });
    await expect(sendSms("+255700000001", secret)).rejects.toThrow(/^SMS delivery failed$/);
    expect(log).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});
test("configured server workflow retains request and successful response", async () => {
  const response = new Response("ok");
  fetchMock.mockResolvedValue(response);
  expect(await sendSms("+255700000001", "workflow message")).toBe(response);
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.africastalking.com/version1/messaging");
  expect(request.body.get("to")).toBe("+255700000001");
  expect(request.body.get("message")).toBe("workflow message");
});
test("missing configuration never calls provider", async () => {
  delete process.env.AT_API_KEY;
  await expect(sendSms("+255700000001", secret)).rejects.toThrow("SMS provider is not configured");
  expect(fetchMock).not.toHaveBeenCalled();
});
