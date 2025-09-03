// POST /api/quote
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const {
    inquiryId,
    pricePerUnit,
    moq,
    leadTime,
    validity,
    notes,
    attachments,
  } = body;

  const supplierId = session.user.id;

  const quote = await prisma.quote.create({
    data: {
      inquiryId,
      supplierId,
      pricePerUnit,
      moq,
      leadTime,
      validity,
      notes,
      attachments,
    },
    include: {
      inquiry: {
        include: { conversation: true },
      },
    },
  });

  // Notify buyer in real-time
  const conversationId = quote.inquiry.conversationId;
  await pusherServer.trigger(`private-conv-${conversationId}`, "quote:new", {
    quote,
  });

  return Response.json(quote);
}
