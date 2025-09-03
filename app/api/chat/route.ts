// // app/api/chat/route.ts
// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY!,
// });

// /**
//  * --- Middleware helpers ---
//  */

// // Soft moderation + polite rewrite
// async function moderateAndRewrite(text: string): Promise<{
//   cleanText: string;
//   warning?: string;
// }> {
//   // ✅ Step 1: quick regex-based check (phone, email)
//   const piiPattern = /(\d{9,}|@)/;
//   if (piiPattern.test(text)) {
//     return {
//       cleanText:
//         "⚠️ Contact details were removed. Please use platform messaging only.",
//       warning: "Message contained restricted info and was rewritten.",
//     };
//   }

//   // ✅ Step 2: AI check (abusive → polite)
//   const moderation = await openai.moderations.create({
//     model: "omni-moderation-latest",
//     input: text,
//   });

//   if (moderation.results[0].flagged) {
//     const polite = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content:
//             "Rewrite this buyer-supplier chat message in a polite, professional business tone. Keep it short and clear.",
//         },
//         { role: "user", content: text },
//       ],
//     });

//     return {
//       cleanText:
//         polite.choices[0].message.content ??
//         "Message adjusted for professionalism.",
//       warning: "Message was rewritten for professionalism.",
//     };
//   }

//   // ✅ Step 3: Safe → return original
//   return { cleanText: text };
// }

// /**
//  * --- POST: Send Message (with optional Inquiry) ---
//  */
// export async function POST(req: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { conversationId, body, inquiry } = await req.json();

//     // Ensure conversation exists
//     const conversation = await prisma.conversation.findUnique({
//       where: { id: conversationId },
//       include: { buyer: true, supplier: true },
//     });

//     if (!conversation) {
//       return NextResponse.json(
//         { error: "Conversation not found" },
//         { status: 404 }
//       );
//     }

//     // Check participant
//     if (
//       ![conversation.buyerId, conversation.supplierId].includes(session.user.id)
//     ) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     // 🔎 Run moderation + rewrite
//     const { cleanText, warning } = await moderateAndRewrite(body);

//     // If inquiry payload provided → attach/update Inquiry
//     let inquiryRecord = null;
//     if (inquiry) {
//       inquiryRecord = await prisma.inquiry.upsert({
//         where: { conversationId },
//         update: { ...inquiry },
//         create: {
//           conversationId,
//           ...inquiry,
//         },
//       });
//     }

//     // Save message
//     const message = await prisma.message.create({
//       data: {
//         conversationId,
//         senderId: session.user.id,
//         body: cleanText,
//       },
//     });

//     return NextResponse.json({
//       message,
//       inquiry: inquiryRecord,
//       warning,
//     });
//   } catch (err) {
//     console.error("❌ Chat POST error:", err);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// /**
//  * --- GET: Fetch Conversation Messages ---
//  */
// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const conversationId = searchParams.get("conversationId");
//     if (!conversationId) {
//       return NextResponse.json(
//         { error: "conversationId required" },
//         { status: 400 }
//       );
//     }

//     const session = await getServerSession(authOptions);
//     if (!session?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const conversation = await prisma.conversation.findUnique({
//       where: { id: conversationId },
//       include: {
//         buyer: true,
//         supplier: true,
//         inquiry: true,
//         messages: {
//           orderBy: { sentAt: "asc" },
//           include: { sender: true },
//         },
//       },
//     });

//     if (!conversation) {
//       return NextResponse.json(
//         { error: "Conversation not found" },
//         { status: 404 }
//       );
//     }

//     // Only participants allowed
//     if (
//       ![conversation.buyerId, conversation.supplierId].includes(session.user.id)
//     ) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     return NextResponse.json(conversation);
//   } catch (err) {
//     console.error("❌ Chat GET error:", err);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }
