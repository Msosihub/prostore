// // /api/conversations/inquiries/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "@/db/prisma";
// import { pusherServer } from "@/lib/pusher/server";

// export async function POST(req: Request) {
//   try {
//     const { buyerId, supplierId, supplierUserId, productId, quantity, notes } =
//       await req.json();

//     // 1️⃣ Ensure conversation exists
//     let conversation = await prisma.conversation.findUnique({
//       where: {
//         buyerId_supplierId: { buyerId, supplierId: supplierUserId },
//       },
//     });

//     if (!conversation) {
//       conversation = await prisma.conversation.create({
//         data: { buyerId, supplierId: supplierUserId },
//       });

//       await pusherServer.trigger(`private-user-${supplierId}`, "conv:new", {
//         conversation,
//       });
//     }

//     // 2️⃣ Create inquiry (linked to conv + product)
//     const inquiry = await prisma.inquiry.create({
//       data: {
//         conversationId: conversation.id,
//         productId,
//         buyerId,
//         quantity,
//         notes,
//       },
//       include: {
//         conversation: true,
//       },
//     });

//     // 3️⃣ Insert inquiry as a "message" bubble
//     const message = await prisma.message.create({
//       data: {
//         conversationId: conversation.id,
//         senderId: buyerId,
//         content: "", // empty text (structured message)
//         inquiryId: inquiry.id, // 🔥 store relation
//         productId,
//       },
//       include: {
//         inquiry: true,
//         product: true,
//       },
//     });

//     // 4️⃣ Notify both participants
//     await pusherServer.trigger(
//       `private-conv-${conversation.id}`,
//       "message:new",
//       { message, conversationId: conversation.id }
//     );

//     await pusherServer.trigger(`supplier-${supplierId}`, "inquiry:new", {
//       inquiry,
//       conversationId: conversation.id,
//     });

//     return NextResponse.json({ inquiry, conversation, message });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: err }, { status: 500 });
//   }
// }
