import { saveChatDraft } from "@/lib/chat-draft-storage";
afterEach(() => {
  delete global.window;
});
test("unavailable storage does not throw before or after a server write", () => {
  global.window = {};
  Object.defineProperty(global.window, "sessionStorage", {
    get() {
      throw Error("blocked");
    },
  });
  expect(saveChatDraft("pending", { id: "request" })).toBe(false);
  expect(saveChatDraft("pending", null)).toBe(false);
});
test("quota and removal failures preserve caller control", () => {
  global.window = {
    sessionStorage: {
      setItem() {
        throw Error("quota");
      },
      removeItem() {
        throw Error("denied");
      },
    },
  };
  expect(saveChatDraft("pending", { id: "request" })).toBe(false);
  expect(saveChatDraft("pending", null)).toBe(false);
});
test("available storage retains and clears pending request identity", () => {
  const setItem = jest.fn(),
    removeItem = jest.fn();
  global.window = { sessionStorage: { setItem, removeItem } };
  expect(saveChatDraft("pending", { id: "request" })).toBe(true);
  expect(setItem).toHaveBeenCalledWith("pending", '{"id":"request"}');
  expect(saveChatDraft("pending", null)).toBe(true);
  expect(removeItem).toHaveBeenCalledWith("pending");
});
