jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/db/prisma", () => ({
  prisma: {
    conversation: { findFirst: jest.fn(), findMany: jest.fn() },
    message: { updateMany: jest.fn() },
    product: { findFirst: jest.fn() },
    inquiry: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { getConversation } from "@/lib/actions/chat.actions";
import { GET as list } from "@/app/api/chat/conversations/route";
import { POST as seen } from "@/app/api/chat/mark-seen/route";
import { POST as inquiry } from "@/app/api/inquiries/route";
const id = "11111111-1111-4111-8111-111111111111",
  productId = "22222222-2222-4222-8222-222222222222";
const request = (data) =>
  new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(data),
  });
beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "buyer", role: "BUYER" } });
  prisma.conversation.findFirst.mockResolvedValue({ id, supplierId: "vendor" });
  prisma.conversation.findMany.mockResolvedValue([]);
  prisma.product.findFirst.mockResolvedValue({ id: productId });
  prisma.inquiry.create.mockResolvedValue({ id: "inquiry", status: "PENDING" });
  prisma.message.updateMany.mockResolvedValue({ count: 1 });
  prisma.$transaction.mockImplementation((fn) => fn(prisma));
});
test.each([null, {}, { user: {} }])(
  "anonymous/malformed session cannot query or mutate chat: %p",
  async (session) => {
    auth.mockResolvedValue(session);
    await expect(getConversation(id)).rejects.toThrow("Unauthorized");
    expect((await list()).status).toBe(401);
    expect((await seen(request({ conversationId: id }))).status).toBe(401);
    expect(
      (await inquiry(request({ conversationId: id, productId }))).status,
    ).toBe(401);
    expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
    expect(prisma.conversation.findMany).not.toHaveBeenCalled();
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  },
);
test.each(["BUYER", "SUPPLIER", "ADMIN"])(
  "unrelated %s has no implicit conversation access",
  async (role) => {
    auth.mockResolvedValue({ user: { id: "unrelated", role } });
    prisma.conversation.findFirst.mockResolvedValue(null);
    expect(await getConversation(id)).toBe(null);
    expect((await seen(request({ conversationId: id }))).status).toBe(404);
    expect(
      (await inquiry(request({ conversationId: id, productId }))).status,
    ).toBe(404);
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
    expect(prisma.conversation.findFirst.mock.calls[0][0].where).toEqual({
      id,
      OR: [{ buyerId: "unrelated" }, { supplierId: "unrelated" }],
    });
  },
);
test.each(["buyer", "vendor"])(
  "participant %s gets scoped queries and marks only incoming messages",
  async (userId) => {
    auth.mockResolvedValue({ user: { id: userId } });
    await getConversation(id);
    await list();
    expect((await seen(request({ conversationId: id }))).status).toBe(200);
    expect(prisma.conversation.findMany.mock.calls[0][0].where).toEqual({
      OR: [{ buyerId: userId }, { supplierId: userId }],
    });
    expect(prisma.message.updateMany.mock.calls[0][0].where).toMatchObject({
      conversationId: id,
      senderId: { not: userId },
      conversation: { OR: [{ buyerId: userId }, { supplierId: userId }] },
    });
    const select = prisma.conversation.findFirst.mock.calls[0][0].select;
    expect(select.buyer.select).toEqual({
      id: true,
      name: true,
      image: true,
      email: true,
    });
    expect(select.supplier.select).toEqual({
      id: true,
      name: true,
      image: true,
    });
    expect(select.messages.select.replyTo.where).toEqual({
      conversationId: id,
    });
    expect(select.messages.select.inquiry.where).toEqual({
      conversationId: id,
    });
  },
);
test.each([
  {},
  { conversationId: null },
  { conversationId: { not: id } },
  { conversationId: "bad" },
])("invalid mark-seen body never broadens mutation %p", async (data) => {
  expect((await seen(request(data))).status).toBe(400);
  expect(prisma.message.updateMany).not.toHaveBeenCalled();
  expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
});
test("buyer inquiry binds its author and vendor product, without caller-controlled status or nested writes", async () => {
  expect(
    (
      await inquiry(
        request({
          conversationId: id,
          productId,
          quantity: 4,
          notes: "Synthetic request",
        }),
      )
    ).status,
  ).toBe(200);
  expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
    where: { id, buyerId: "buyer" },
    select: { id: true, supplierId: true },
  });
  expect(prisma.product.findFirst).toHaveBeenCalledWith({
    where: { id: productId, supplier: { userId: "vendor" } },
    select: { id: true },
  });
  expect(prisma.inquiry.create.mock.calls[0][0].data).toMatchObject({
    conversationId: id,
    productId,
    buyerId: "buyer",
    quantity: 4,
  });
});
test.each([
  { buyerId: "other" },
  { status: "ACCEPTED" },
  { conversation: { connect: { id } } },
])("inquiry rejects authority override %p", async (extra) => {
  expect(
    (await inquiry(request({ conversationId: id, productId, ...extra })))
      .status,
  ).toBe(400);
  expect(prisma.inquiry.create).not.toHaveBeenCalled();
});
test("inquiry cannot attach another vendor product", async () => {
  prisma.product.findFirst.mockResolvedValue(null);
  expect(
    (await inquiry(request({ conversationId: id, productId }))).status,
  ).toBe(404);
  expect(prisma.inquiry.create).not.toHaveBeenCalled();
});

test.each([
  { quantity: 0.001 },
  { quantity: 10000000000 },
  { targetPrice: 0.001 },
  { targetPrice: 10000000000 },
])(
  "inquiry rejects values that round to zero or overflow Decimal(12,2): %p",
  async (fields) => {
    expect(
      (await inquiry(request({ conversationId: id, productId, ...fields })))
        .status,
    ).toBe(400);
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  },
);
