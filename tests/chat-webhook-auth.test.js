import { POST } from "@/app/api/chat/webhook-receiver/route";
const request = (token) =>
  new Request("http://localhost", {
    method: "POST",
    headers: token === undefined ? {} : { "x-nimboya-internal-key": token },
    body: JSON.stringify({
      receiverId: "synthetic-user",
      message: { content: "fixture" },
    }),
  });
afterEach(() => {
  delete process.env.INTERNAL_SHARED_SECRET;
  delete global.chatEventEmitter;
});
test.each([undefined, ""])(
  "missing or empty internal secret %p fails closed even with empty header",
  async (secret) => {
    if (secret === undefined) delete process.env.INTERNAL_SHARED_SECRET;
    else process.env.INTERNAL_SHARED_SECRET = secret;
    global.chatEventEmitter = { emit: jest.fn() };
    expect((await POST(request(""))).status).toBe(403);
    expect(global.chatEventEmitter.emit).not.toHaveBeenCalled();
  },
);
test("valid configured internal key preserves existing event relay", async () => {
  process.env.INTERNAL_SHARED_SECRET = "synthetic-only";
  global.chatEventEmitter = { emit: jest.fn() };
  expect((await POST(request("wrong"))).status).toBe(403);
  expect((await POST(request("synthetic-only"))).status).toBe(200);
  expect(global.chatEventEmitter.emit).toHaveBeenCalledTimes(1);
});
