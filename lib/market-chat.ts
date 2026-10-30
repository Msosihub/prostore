import "server-only";
import { lockPurchasableSellers } from "@/lib/seller-purchase-guard";
import { visibleCatalogProduct } from "@/lib/catalog-visibility";
import {
  containsContact,
  contactPolicyMessage,
} from "@/lib/chat-content-policy";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { calcPriceWithTiers } from "@/lib/cart-pricing";
import { insertOrderSchema } from "@/lib/validators";
import type { CartItem } from "@/types";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
const uuid = z.string().uuid();
class ChatError extends Error {}
const fail = (message: string): never => {
  throw new ChatError(message);
};
export async function safeChat<T>(work: () => Promise<T>) {
  try {
    return { ok: true as const, data: await work() };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof ChatError
          ? error.message
          : error instanceof z.ZodError
            ? "Hakiki taarifa ulizoingiza."
            : "Haijakamilika. Jaribu tena; ombi lilelile halitarudiwa.",
    };
  }
}
async function actor() {
  const session = await auth();
  if (!session?.user?.id) return fail("Ingia kwanza.");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user) return fail("Ingia kwanza.");
  return user;
}
type Actor = Awaited<ReturnType<typeof actor>>;
const scope = (user: Actor): Prisma.MarketThreadWhereInput => ({
  OR: [
    { buyerId: user.id },
    ...(user.role === "SUPPLIER" ? [{ supplier: { userId: user.id } }] : []),
  ],
});
const contextSelect = {
  id: true,
  buyerId: true,
  supplierId: true,
  productId: true,
  buyer: { select: { name: true } },
  supplier: { select: { userId: true, name: true, companyName: true } },
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      stock: true,
      supplierId: true,
    },
  },
} as const;
async function thread(db: Tx, id: string, user: Actor) {
  const data = await db.marketThread.findFirst({
    where: { id: uuid.parse(id), ...scope(user) },
    select: contextSelect,
  });
  if (!data) return fail("Mazungumzo hayapatikani.");
  return data;
}
function visibleContext<T extends Awaited<ReturnType<typeof thread>>>(data: T) {
  const label = (value: string | null, fallback: string) =>
    value && !containsContact(value) ? value : fallback;
  return {
    ...data,
    buyer: { name: label(data.buyer.name, "Mnunuzi") },
    supplier: {
      ...data.supplier,
      name: label(data.supplier.name, "Duka"),
      companyName: label(
        data.supplier.companyName,
        label(data.supplier.name, "Duka"),
      ),
    },
    product: {
      ...data.product,
      name: label(data.product.name, "Bidhaa"),
      slug: containsContact(data.product.slug) ? "" : data.product.slug,
      price: data.product.price.toString(),
    },
  };
}
async function transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (i < 5 && error instanceof Prisma.PrismaClientKnownRequestError) {
        const adapter = error.meta?.driverAdapterError as
          | { cause?: { originalCode?: string } }
          | undefined;
        const sqlState = String(
          error.meta?.code ?? adapter?.cause?.originalCode ?? "",
        );
        if (
          ["P2034", "P2002"].includes(error.code) ||
          (error.code === "P2010" && ["40001", "40P01"].includes(sqlState))
        )
          continue;
      }
      throw error;
    }
  }
}
export async function startThread(productId: string) {
  const user = await actor();
  uuid.parse(productId);
  return transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId, ...visibleCatalogProduct },
      select: {
        supplierId: true,
        supplier: {
          select: { userId: true, user: { select: { role: true } } },
        },
      },
    });
    if (
      !product ||
      product.supplier.user.role !== "SUPPLIER" ||
      product.supplier.userId === user.id
    )
      return fail("Chagua bidhaa ya muuzaji mwingine anayepatikana.");
    const existing = await tx.marketThread.findUnique({
      where: {
        buyerId_supplierId_productId: {
          buyerId: user.id,
          supplierId: product.supplierId,
          productId,
        },
      },
      select: { id: true },
    });
    if (existing) return existing;
    if (
      (await tx.marketThread.count({
        where: {
          buyerId: user.id,
          createdAt: { gte: new Date(Date.now() - 60000) },
        },
      })) >= 20
    )
      return fail("Mazungumzo mapya mengi. Subiri dakika moja.");
    const result = await tx.marketThread.upsert({
      where: {
        buyerId_supplierId_productId: {
          buyerId: user.id,
          supplierId: product.supplierId,
          productId,
        },
      },
      create: { buyerId: user.id, supplierId: product.supplierId, productId },
      update: {},
      select: { id: true },
    });
    return result;
  });
}
export async function listThreads(
  side: "buyer" | "seller",
  before?: string,
  filters: { query?: string; unread?: boolean } = {},
) {
  const user = await actor();
  z.enum(["buyer", "seller"]).parse(side);
  if (side === "seller" && user.role !== "SUPPLIER")
    return fail("Huna ruhusa ya muuzaji.");
  const where: Prisma.MarketThreadWhereInput =
    side === "buyer" ? { buyerId: user.id } : { supplier: { userId: user.id } };
  const filter = z
    .object({
      query: z.string().trim().max(80).optional(),
      unread: z.boolean().optional(),
    })
    .strict()
    .parse(filters);
  if (filter.query)
    where.product = { name: { contains: filter.query, mode: "insensitive" } };
  if (filter.unread)
    where.messages = { some: { seen: false, senderId: { not: user.id } } };
  if (before) {
    const cursor = await prisma.marketThread.findFirst({
      where: { id: uuid.parse(before), ...where },
      select: { updatedAt: true, id: true },
    });
    if (!cursor) return fail("Mazungumzo hayapatikani.");
    where.OR = [
      { updatedAt: { lt: cursor.updatedAt } },
      { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
    ];
  }
  const rows = await prisma.marketThread.findMany({
    where,
    select: {
      ...contextSelect,
      updatedAt: true,
      _count: {
        select: {
          messages: { where: { seen: false, senderId: { not: user.id } } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 31,
  });
  return {
    items: rows.slice(0, 30).map((r) => visibleContext(r)),
    hasMore: rows.length > 30,
  };
}
export async function loadThread(
  id: string,
  before?: string,
  proposalId?: string,
) {
  const user = await actor();
  const data = await transaction((tx) => thread(tx, id, user));
  const where: Prisma.MarketMessageWhereInput = { threadId: data.id };
  if (before) {
    const cursor = await prisma.marketMessage.findFirst({
      where: { id: uuid.parse(before), threadId: data.id },
      select: { createdAt: true, id: true },
    });
    if (!cursor) return fail("Ujumbe haupatikani.");
    where.OR = [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ];
  }
  const messages = await prisma.marketMessage.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    select: {
      id: true,
      senderId: true,
      content: true,
      seen: true,
      createdAt: true,
    },
  });
  const proposals = await prisma.marketProposal.findMany({
    where: { threadId: data.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
    select: {
      id: true,
      quantity: true,
      snapshot: true,
      status: true,
      orderId: true,
    },
  });
  if (proposalId && !proposals.some((p) => p.id === proposalId)) {
    const selected = await prisma.marketProposal.findFirst({
      where: { id: uuid.parse(proposalId), threadId: data.id },
      select: {
        id: true,
        quantity: true,
        snapshot: true,
        status: true,
        orderId: true,
      },
    });
    if (!selected) return fail("Pendekezo halipatikani.");
    proposals.push(selected);
  }
  const blocks = await prisma.marketBlock.findMany({
    where: { threadId: data.id, blocked: true },
    select: { userId: true },
  });
  return {
    blocked: blocks.length > 0,
    blockedByMe: blocks.some((b) => b.userId === user.id),
    thread: visibleContext(data),
    messages: messages.slice(0, 50).reverse(),
    hasOlder: messages.length > 50,
    proposals,
    viewerId: user.id,
    isSeller: data.supplier.userId === user.id && user.role === "SUPPLIER",
  };
}
export async function sendMessage(input: {
  id: string;
  threadId: string;
  content: string;
}) {
  const user = await actor();
  const value = z
    .object({
      id: uuid,
      threadId: uuid,
      content: z.string().trim().min(1).max(2000),
    })
    .strict()
    .parse(input);
  if (containsContact(value.content)) return fail(contactPolicyMessage);
  return transaction(async (tx) => {
    await thread(tx, value.threadId, user);
    const existing = await tx.marketMessage.findUnique({
      where: { id: value.id },
      select: { id: true, threadId: true, senderId: true, content: true },
    });
    if (existing) {
      if (
        existing.threadId !== value.threadId ||
        existing.senderId !== user.id ||
        existing.content !== value.content
      )
        return fail("Ombi hili tayari limetumika. Tuma ujumbe mpya.");
      return { id: existing.id };
    }
    await assertChatOpen(tx, value.threadId);
    // Serializable predicate reads prevent concurrent unique sends exceeding the budget.
    const now = Date.now();
    const [recentCount, hourlyCount, recent] = await Promise.all([
      tx.marketMessage.count({
        where: {
          threadId: value.threadId,
          senderId: user.id,
          createdAt: { gte: new Date(now - 60000) },
        },
      }),
      tx.marketMessage.count({
        where: {
          senderId: user.id,
          createdAt: { gte: new Date(now - 3600000) },
        },
      }),
      tx.marketMessage.findMany({
        where: {
          threadId: value.threadId,
          senderId: user.id,
          createdAt: { gte: new Date(now - 300000) },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
        select: { content: true },
      }),
    ]);
    if (recentCount >= 60 || hourlyCount >= 240)
      return fail("Umetuma ujumbe mwingi. Subiri kidogo kisha ujaribu tena.");
    const context = [...recent.reverse().map((m) => m.content), value.content];
    if (containsContact(context.join(" ")) || containsContact(context.join("")))
      return fail(contactPolicyMessage);
    const result = await tx.marketMessage.create({
      data: { ...value, senderId: user.id },
      select: { id: true },
    });
    await tx.marketThread.update({
      where: { id: value.threadId },
      data: { updatedAt: new Date() },
    });
    return result;
  });
}
export async function markSeen(input: { threadId: string; ids: string[] }) {
  const user = await actor();
  const value = z
    .object({ threadId: uuid, ids: z.array(uuid).max(50) })
    .strict()
    .parse(input);
  await transaction((tx) => thread(tx, value.threadId, user));
  await prisma.marketMessage.updateMany({
    where: {
      threadId: value.threadId,
      id: { in: value.ids },
      senderId: { not: user.id },
      thread: scope(user),
    },
    data: { seen: true },
  });
  return { success: true };
}
async function canonicalQuote(
  tx: Tx,
  data: Awaited<ReturnType<typeof thread>>,
  qty: number,
) {
  if (data.product.supplierId !== data.supplierId)
    return fail(
      "Muuzaji wa bidhaa amebadilika. Anza mazungumzo mapya kwenye bidhaa.",
    );
  const seller = await tx.user.findUnique({
    where: { id: data.supplier.userId },
    select: { role: true },
  });
  if (seller?.role !== "SUPPLIER") return fail("Muuzaji hapatikani kwa sasa.");
  const items = [{ productId: data.productId, qty } as CartItem];
  const totals = await calcPriceWithTiers(items, {}, tx);
  if (items[0].supplierId !== data.supplierId)
    return fail("Muuzaji wa bidhaa amebadilika.");
  return {
    ...totals,
    item: {
      ...items[0],
      supplierName: data.supplier.companyName || data.supplier.name,
    },
  };
}
export type ProposalSnapshot = Awaited<ReturnType<typeof canonicalQuote>>;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function propose(input: {
  id: string;
  threadId: string;
  quantity: number;
}) {
  const user = await actor();
  const value = z
    .object({
      id: uuid,
      threadId: uuid,
      quantity: z.number().int().min(1).max(2147483647),
    })
    .strict()
    .parse(input);
  return transaction(async (tx) => {
    const data = await thread(tx, value.threadId, user);
    if (user.role !== "SUPPLIER" || data.supplier.userId !== user.id)
      return fail("Pendekezo huandaliwa na muuzaji wa bidhaa pekee.");
    const existing = await tx.marketProposal.findUnique({
      where: { id: value.id },
    });
    if (existing) {
      if (
        existing.threadId !== value.threadId ||
        existing.quantity !== value.quantity
      )
        return fail("Ombi hili tayari limetumika.");
      return { id: existing.id };
    }
    await assertChatOpen(tx, value.threadId);
    const proposalsThisMinute = await tx.marketProposal.count({
      where: {
        threadId: value.threadId,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });
    const proposalsThisHour = await tx.marketProposal.count({
      where: {
        thread: { supplier: { userId: user.id } },
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
    });
    if (proposalsThisMinute >= 30 || proposalsThisHour >= 120)
      return fail("Mapendekezo mengi. Subiri dakika moja kisha ujaribu tena.");
    const snapshot = await canonicalQuote(tx, data, value.quantity);
    if (
      containsContact(snapshot.item.name) ||
      containsContact(snapshot.item.supplierName) ||
      containsContact(snapshot.item.slug || "")
    )
      return fail(
        "Jina la bidhaa/duka lina taarifa za mawasiliano; lisahihishe kabla ya pendekezo.",
      );
    await tx.marketProposal.create({
      data: { ...value, snapshot: snapshot as Prisma.InputJsonValue },
    });
    await tx.marketThread.update({
      where: { id: data.id },
      data: { updatedAt: new Date() },
    });
    return { id: value.id };
  });
}
async function review(tx: Tx, id: string, user: Actor) {
  const proposal = await tx.marketProposal.findUnique({
    where: { id: uuid.parse(id) },
  });
  if (!proposal) return fail("Pendekezo halipatikani.");
  const data = await thread(tx, proposal.threadId, user);
  if (data.buyerId !== user.id)
    return fail("Mnunuzi wa mazungumzo pekee anaweza kukubali.");
  if (proposal.status === "ACCEPTED")
    return { accepted: true as const, orderId: proposal.orderId! };
  if (proposal.status !== "OPEN") return fail("Pendekezo limeondolewa.");
  const current = await canonicalQuote(tx, data, proposal.quantity);
  // JSONB key order is not stable; compare the explicitly ordered canonical fields.
  const saved = proposal.snapshot as unknown as ProposalSnapshot;
  for (const key of [
    "itemsPrice",
    "shippingPrice",
    "taxPrice",
    "totalPrice",
  ] as const)
    if (saved[key] !== current[key])
      return fail("Bei imebadilika. Mwombe muuzaji atume pendekezo jipya.");
  for (const key of [
    "productId",
    "supplierId",
    "price",
    "qty",
    "name",
    "supplierName",
    "slug",
    "image",
  ] as const)
    if (saved.item[key] !== current.item[key])
      return fail("Bidhaa imebadilika. Mwombe muuzaji atume pendekezo jipya.");
  const buyer = await tx.user.findUnique({
    where: { id: user.id },
    select: { address: true, paymentMethod: true },
  });
  if (!buyer?.address)
    return fail("Weka anwani kwenye Profile yako, kisha uhakiki tena.");
  const order = insertOrderSchema.parse({
    userId: user.id,
    shippingAddress: buyer.address,
    paymentMethod: buyer.paymentMethod || "Mobile",
    itemsPrice: current.itemsPrice,
    shippingPrice: current.shippingPrice,
    taxPrice: current.taxPrice,
    totalPrice: current.totalPrice,
  });
  return {
    accepted: false as const,
    proposal,
    quote: current,
    order,
    fingerprint: digest({ id, quote: current, order }),
  };
}
export async function reviewProposal(id: string) {
  const user = await actor();
  return transaction(async (tx) => {
    const result = await review(tx, id, user);
    if (result.accepted) return result;
    return {
      accepted: false as const,
      quote: result.quote,
      address: result.order.shippingAddress,
      fingerprint: result.fingerprint,
    };
  });
}
export async function acceptProposal(input: {
  id: string;
  fingerprint: string;
}) {
  const user = await actor();
  const value = z
    .object({ id: uuid, fingerprint: z.string().regex(/^[a-f0-9]{64}$/) })
    .strict()
    .parse(input);
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "MarketProposal" WHERE "id" = ${value.id}::uuid FOR UPDATE`;
    const checked = await review(tx, value.id, user);
    if (checked.accepted) return { orderId: checked.orderId };
    if (checked.fingerprint !== value.fingerprint)
      return fail(
        "Anwani au taarifa zimebadilika. Hakiki tena kabla ya kukubali.",
      );
    await lockPurchasableSellers(tx, [checked.quote.item.supplierId]);
    const order = await tx.order.create({
      data: checked.order,
      select: { id: true },
    });
    const item = checked.quote.item;
    await tx.orderItem.create({
      data: {
        productId: item.productId,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        name: item.name,
        slug: item.slug || "",
        price: item.price,
        qty: item.qty,
        image: item.image,
        orderId: order.id,
        status: "PREPARING",
      },
    });
    await tx.marketProposal.update({
      where: { id: value.id },
      data: { status: "ACCEPTED", orderId: order.id },
    });
    return { orderId: order.id };
  });
}
export async function cancelProposal(id: string) {
  const user = await actor();
  uuid.parse(id);
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "MarketProposal" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const proposal = await tx.marketProposal.findUnique({ where: { id } });
    if (!proposal) return fail("Pendekezo halipatikani.");
    const data = await thread(tx, proposal.threadId, user);
    if (user.role !== "SUPPLIER" || data.supplier.userId !== user.id)
      return fail("Huna ruhusa.");
    if (proposal.status === "ACCEPTED")
      return fail("Agizo limeundwa tayari; tumia utaratibu wa maagizo.");
    await tx.marketProposal.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return { success: true };
  });
}

// Historical proposal browsing never creates orders or changes prices.
export async function proposalHistory(id: string, before?: string) {
  const user = await actor();
  const data = await transaction((tx) => thread(tx, id, user));
  const where: Prisma.MarketProposalWhereInput = { threadId: data.id };
  if (before) {
    const cursor = await prisma.marketProposal.findFirst({
      where: { id: uuid.parse(before), threadId: data.id },
      select: { id: true, createdAt: true },
    });
    if (!cursor) return fail("Pendekezo halipatikani.");
    where.OR = [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ];
  }
  const rows = await prisma.marketProposal.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    select: {
      id: true,
      createdAt: true,
      quantity: true,
      status: true,
      orderId: true,
    },
  });
  return {
    items: rows.slice(0, 20),
    hasMore: rows.length > 20,
    isSeller: data.supplier.userId === user.id,
  };
}

async function assertChatOpen(tx: Tx, threadId: string) {
  if (await tx.marketBlock.count({ where: { threadId, blocked: true } }))
    return fail("Mazungumzo yamezuiwa. Historia na maagizo bado vinapatikana.");
}
export async function setThreadBlock(id: string, blocked: boolean) {
  const user = await actor();
  z.boolean().parse(blocked);
  return transaction(async (tx) => {
    await thread(tx, id, user);
    await tx.marketBlock.upsert({
      where: { threadId_userId: { threadId: id, userId: user.id } },
      create: { threadId: id, userId: user.id, blocked },
      update: { blocked },
    });
    // Serialize with sends/proposals so a stale transaction cannot bypass a block.
    await tx.marketThread.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    return { blocked };
  });
}
export async function reportThread(input: {
  id: string;
  threadId: string;
  reason: string;
}) {
  const user = await actor();
  const v = z
    .object({
      id: uuid,
      threadId: uuid,
      reason: z.enum(["CONTACT", "HARASSMENT", "PAYMENT", "OTHER"]),
    })
    .strict()
    .parse(input);
  return transaction(async (tx) => {
    await thread(tx, v.threadId, user);
    const sameId = await tx.marketReport.findUnique({ where: { id: v.id } });
    if (sameId) {
      if (
        sameId.reporterId !== user.id ||
        sameId.threadId !== v.threadId ||
        sameId.reason !== v.reason
      )
        return fail("Ombi hili tayari limetumika.");
      return { id: sameId.id };
    }
    const existing = await tx.marketReport.findFirst({
      where: { threadId: v.threadId, reporterId: user.id, status: "OPEN" },
      select: { id: true },
    });
    if (existing) return existing;
    if (
      (await tx.marketReport.count({
        where: {
          reporterId: user.id,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      })) >= 10
    )
      return fail("Umefikia kikomo cha taarifa kwa leo.");
    const evidence = await tx.marketMessage.findMany({
      where: { threadId: v.threadId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      select: { id: true, senderId: true, content: true, createdAt: true },
    });
    await tx.marketReport.create({
      data: {
        ...v,
        reporterId: user.id,
        evidence: JSON.parse(JSON.stringify(evidence)),
      },
    });
    return { id: v.id };
  });
}
export async function listChatReports(before?: string) {
  const user = await actor();
  if (user.role !== "ADMIN") return fail("Huna ruhusa.");
  const where: Prisma.MarketReportWhereInput = {};
  if (before) {
    const c = await prisma.marketReport.findUnique({
      where: { id: uuid.parse(before) },
      select: { id: true, createdAt: true },
    });
    if (!c) return fail("Haipatikani.");
    where.OR = [
      { createdAt: { lt: c.createdAt } },
      { createdAt: c.createdAt, id: { lt: c.id } },
    ];
  }
  const rows = await prisma.marketReport.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
    select: { id: true, reason: true, status: true, createdAt: true },
  });
  return { items: rows.slice(0, 30), hasMore: rows.length > 30 };
}
export async function readChatReport(id: string) {
  const user = await actor();
  if (user.role !== "ADMIN") return fail("Huna ruhusa.");
  return prisma.marketReport.findUnique({
    where: { id: uuid.parse(id) },
    select: {
      id: true,
      threadId: true,
      reporterId: true,
      reason: true,
      status: true,
      createdAt: true,
      evidence: true,
      events: {
        orderBy: { createdAt: "asc" },
        select: { decision: true, createdAt: true },
      },
    },
  });
}
export async function reviewChatReport(id: string, decision: string) {
  const user = await actor();
  uuid.parse(id);
  z.enum(["FOLLOW_UP", "NO_ACTION"]).parse(decision);
  return transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (current?.role !== "ADMIN") return fail("Huna ruhusa.");
    const report = await tx.marketReport.findUnique({ where: { id } });
    if (!report) return fail("Haipatikani.");
    if (report.status === "REVIEWED") {
      const saved = await tx.marketReportEvent.findFirst({
        where: { reportId: id },
        orderBy: { createdAt: "desc" },
        select: { decision: true },
      });
      if (saved?.decision !== decision)
        return fail(
          "Taarifa hii imepitiwa kwa uamuzi mwingine. Pakia upya kabla ya kuendelea.",
        );
      return { reviewed: true, decision: saved.decision };
    }
    await tx.marketReport.update({
      where: { id },
      data: { status: "REVIEWED" },
    });
    await tx.marketReportEvent.create({
      data: { reportId: id, actorId: user.id, decision },
    });
    return { reviewed: true };
  });
}
