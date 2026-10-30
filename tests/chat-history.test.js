jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: { conversation: { findFirst: jest.fn(), findMany: jest.fn() } },
}));
const { auth } = require("@/auth");
const { prisma } = require("@/db/prisma");
const { readChatHistory } = require("@/lib/actions/chat-history.actions");
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  jest.clearAllMocks();
  prisma.conversation.findMany.mockResolvedValue([]);
  prisma.conversation.findFirst.mockResolvedValue(null);
});
test.each([null, {}, { user: {} }])(
  "anonymous cannot read archive %p",
  async (session) => {
    auth.mockResolvedValue(session);
    await expect(readChatHistory()).rejects.toThrow("Unauthorized");
    expect(prisma.conversation.findMany).not.toHaveBeenCalled();
  },
);
test.each(["buyer-a", "seller-a", "unrelated-admin"])(
  "all identities scoped to participation: %s",
  async (user) => {
    auth.mockResolvedValue({ user: { id: user } });
    await readChatHistory(id);
    expect(prisma.conversation.findFirst.mock.calls[0][0].where).toEqual({
      id,
      OR: [{ buyerId: user }, { supplierId: user }],
    });
  },
);
test("cross-participant detail returns no data", async () => {
  auth.mockResolvedValue({ user: { id: "outsider" } });
  expect((await readChatHistory(id)).conversation).toBeNull();
});
test("bounded minimum fields with deterministic pagination", async () => {
  auth.mockResolvedValue({ user: { id: "buyer" } });
  await readChatHistory(undefined, 2);
  expect(prisma.conversation.findMany.mock.calls[0][0]).toMatchObject({
    skip: 20,
    take: 21,
    select: { id: true, updatedAt: true },
  });
  await readChatHistory(id, 2);
  expect(
    prisma.conversation.findFirst.mock.calls[0][0].select.messages,
  ).toMatchObject({
    skip: 50,
    take: 51,
    select: { id: true, content: true, createdAt: true },
  });
});
test.each([0, -1, 1.5, 1001, NaN])("rejects invalid page %p", async (page) => {
  auth.mockResolvedValue({ user: { id: "buyer" } });
  await expect(readChatHistory(undefined, page)).rejects.toThrow();
  expect(prisma.conversation.findMany).not.toHaveBeenCalled();
});
test("preserves authorized legacy text without converting it to checkout", async () => {
  auth.mockResolvedValue({ user: { id: "buyer" } });
  const row = {
    id,
    messages: [{ id: "message", content: "Old quote", createdAt: new Date() }],
  };
  prisma.conversation.findFirst.mockResolvedValue(row);
  expect((await readChatHistory(id)).conversation).toBe(row);
});
