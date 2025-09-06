import { NextResponse } from "next/server";
// import { authOptions } from "@/auth"; // adjust path
import { prisma } from "@/db/prisma";
import { pusherServer } from "@/lib/pusher/server";
import OpenAI from "openai";
import { auth } from "@/auth";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", // replace with your real site domain
    "X-Title": "prostore",
  },
});

// --- Utility: Run moderation (PII + abusive words + Swahili polite rewrite) ---
async function moderateMessage(content: string): Promise<string> {
  try {
    // Step 1: Check for PII (basic regexes)
    const piiRegex =
      /\b\d{7,}|\b\w+@\w+\.\w+|\b(?:\+?\d{2,3})?[\s-]?\d{6,}\b/gi;
    if (piiRegex.test(content)) {
      return "⚠️ Kwa usalama wako, tafadhali tumia chat ya mfumo pekee bila kushiriki mawasiliano binafsi.";
    }

    // Step 2: AI moderation + polite rewrite
    // const completion = await openai.chat.completions.create({
    //   model: "",
    //   messages: [
    //     {
    //       role: "system",
    //       content:
    //         "You are a passive content moderator and rewriter only when necessary 100% for a business chat app in Kiswahili. \
    //         - Do not allow any abusive, offensive, or hateful words, especially at high intensity. \
    //          use human professional in Kiswahili. \
    //         - If the language score is above 3.8/5, moderate the message. Otherwise, leave it as is. dont concern yourself\
    //         with typos, jokes or nothing than abusive language.(on scale of 1-5, you act at 4) and when you see such content,\
    //         dont argue back, just modify it to sound in a polite, professional manner, shot, simple human swahili language and let it be.\
    //         dont start arguing and modeling, dont engage in debates, dont interveen, let the chat flow. remember the messages are not for you\
    //         so i expect 90% or more of times you to just return the exatly same message without changes.",
    //     },
    //     { role: "user", content },
    //   ],
    // });
    // console.log(
    //   "Raw moderation output:",
    //   completion.choices[0]?.message?.content
    // );

    // return completion.choices[0]?.message?.content ?? content;
    return content; // temporary bypass
  } catch (err) {
    console.error("Moderation error", err);
    return content; // fallback to raw content
  }
}

// --- GET: Fetch conversation + messages ---
export async function GET(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await auth();
  const { conversationId } = await params;
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        supplier: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { sentAt: "asc" },
          include: {
            attachments: true,
            replyTo: {
              select: {
                id: true,
                content: true,
                senderId: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                thumbnail: true,
              },
            },
          },
        },
        product: true,
        inquiry: true,
        quotes: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- POST: Send message ---
export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await auth();

  const { conversationId } = await params;
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    content,
    replyToId,
    inquiryData,
    productId,
    attachments, // expect [{ url, name? }]
  } = await req.json();

  console.log("Data Received API: ", {
    content,
    replyToId,
    inquiryData,
    productId,
    attachments,
  });

  // Ensure the sender is part of this conversation
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { buyerId: true, supplierId: true },
  });
  if (
    !conv ||
    (session.user.id !== conv.buyerId && session.user.id !== conv.supplierId)
  ) {
    console.log("eturning Forbiden: ");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 🟠 Get last message in conversation
  const lastMessage = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { sentAt: "desc" },
    select: { productId: true },
  });

  let attachProductId: string | null = null;
  if (productId) {
    // If conversation is empty OR last productId is different → attach new product
    if (!lastMessage || lastMessage.productId !== productId) {
      attachProductId = productId;
    }
  }

  // Run moderation
  // const safeContent = await moderateMessage(content || "");
  // Detect moderation
  // const wasModerated = safeContent.trim() !== (content || "").trim();

  // Sanitize attachments (JSON column) == neeed change
  const cleanAttachments = Array.isArray(attachments)
    ? attachments
        .filter((a: any) => a && typeof a.url === "string" && a.url.length)
        .map((a: any) => ({
          url: a.url,
          name: typeof a.name === "string" ? a.name : undefined,
        }))
    : [];

  // Handle Inquiry: connect existing by conversation or create one
  let inquiryId: string | null = null;
  if (inquiryData) {
    const existing = await prisma.inquiry.findUnique({
      where: { conversationId },
      select: { id: true },
    });

    if (existing) {
      // Only update fields provided (partial update)
      const updatableKeys = [
        "quantity",
        "unit",
        "variant",
        "targetPrice",
        "customization",
        "shippingTerm",
        "needSamples",
        "notes",
        "status",
      ] as const;

      const dataToUpdate: Record<string, any> = {};
      for (const k of updatableKeys) {
        if (k in inquiryData && inquiryData[k] !== undefined) {
          dataToUpdate[k] = inquiryData[k];
        }
      }
      if (Object.keys(dataToUpdate).length) {
        await prisma.inquiry.update({
          where: { id: existing.id },
          data: dataToUpdate,
        });
      }
      inquiryId = existing.id;
    } else {
      const created = await prisma.inquiry.create({
        data: { ...inquiryData, conversationId },
        select: { id: true },
      });
      inquiryId = created.id;
    }
  }

  // Create message
  const message = await prisma.message.create({
    data: {
      content: content,
      senderId: session.user.id,
      conversationId,
      replyToId: replyToId ?? null,
      // moderated: wasModerated,
      moderationNote: (content || "").trim(),
      productId: attachProductId, // ✅ attach only when needed
      attachments:
        cleanAttachments && cleanAttachments.length
          ? { createMany: { data: cleanAttachments } }
          : undefined,
      inquiryId, // link to the inquiry (existing or new) if any
      sentAt: new Date(),
    },
    include: {
      sender: true,
      replyTo: {
        select: { id: true, content: true, senderId: true, productId: true },
      },
      product: {
        select: { id: true, name: true, slug: true, images: true, price: true },
      },
      inquiry: true,
      attachments: true,
    },
  });

  // Bump conversation timestamp so lists sort by last activity
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Realtime fanout - Push event
  await pusherServer.trigger(`private-conv-${conversationId}`, "message:new", {
    message,
    conversationId: conversationId,
  });

  // Push unread notification to the supplier
  // await pusherServer.trigger(`user-${receiverId}`, "new-message", {
  //   conversationId,
  // });

  return NextResponse.json(message);
}

// --- PATCH: Mark messages as read ---
export async function PATCH(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await auth();
  const { conversationId } = await params;
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageIds } = await req.json();

  await prisma.message.updateMany({
    where: {
      id: { in: messageIds },
      conversationId: conversationId,
      seen: false,
      senderId: { not: session.user.id },
    },
    data: { seen: true },
  });

  for (const id of messageIds) {
    await pusherServer.trigger(
      `private-conv-${conversationId}`,
      "message:read",
      {
        messageId: id,
        conversationId: conversationId,
        readerId: session.user.id,
      }
    );
  }

  return NextResponse.json({ success: true });
}
