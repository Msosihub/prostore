// // app/chat/[conversationId]/page.tsx
// import { prisma } from "@/db/prisma";
// import { auth } from "@/auth"; // your server auth helper
// import ChatWindow from "./chat-window";

// export default async function Page({
//   params,
// }: {
//   params: { conversationId: string };
// }) {
//   const session = await auth();
//   const meId = session!.user.id;

//   const conversation = await prisma.conversation.findUnique({
//     where: { id: params.conversationId },
//     include: {
//       buyer: true,
//       supplier: true,
//       product: {
//         select: { id: true, name: true, slug: true, images: true, price: true },
//       },
//       inquiry: true,
//       messages: {
//         orderBy: { createdAt: "asc" },
//         select: {
//           id: true,
//           senderId: true,
//           content: true,
//           sentAt: true,
//           seen: true,
//           attachments: true,
//         },
//       },
//     },
//   });

//   if (!conversation) return null;

//   return (
//     <div className="container py-6">
//       <ChatWindow meId={meId} conversation={conversation as any} />
//     </div>
//   );
// }
