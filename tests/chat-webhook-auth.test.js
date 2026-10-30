import { POST } from "@/app/api/chat/webhook-receiver/route";
import { GET } from "@/app/api/chat/stream/route";
afterEach(() => {
  delete global.chatEventEmitter;
  delete process.env.INTERNAL_SHARED_SECRET;
});
test.each([undefined, "", "wrong", "synthetic-only"])(
  "retired webhook never accepts or relays key %p",
  async (key) => {
    process.env.INTERNAL_SHARED_SECRET = "synthetic-only";
    global.chatEventEmitter = { emit: jest.fn(), on: jest.fn() };
    const r = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: key ? { "x-nimboya-internal-key": key } : {},
        body: "not JSON",
      }),
    );
    expect(r.status).toBe(410);
    expect(await r.json()).toEqual({
      error: "Legacy chat relay retired",
      code: "LEGACY_CHAT_RETIRED",
    });
    expect(global.chatEventEmitter.emit).not.toHaveBeenCalled();
  },
);
test("retired stream does not establish a listener", async () => {
  global.chatEventEmitter = { on: jest.fn() };
  expect((await GET()).status).toBe(410);
  expect(global.chatEventEmitter.on).not.toHaveBeenCalled();
});
