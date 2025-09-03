// import ChatWindow from "@/components/chat/chat-window";
// import ChatComposer from "@/components/chat/chat-composer";
// import { auth } from "@/auth";
// import { prisma } from "@/db/prisma";
// import InquirySheet from "@/components/chat/inquiry-sheet";

// export default async function ChatPage(props: {
//   params: Promise<{ conversationId: string }>;
// }) {
//   const { conversationId } = await props.params;

//   const session = await auth();
//   const meId = session?.user?.id;
//   if (!meId) return null;

//   const messages = await prisma.message.findMany({
//     where: { conversationId },
//     orderBy: { createdAt: "asc" },
//     take: 100,
//   });

//   return (
//     <div className="flex flex-col h-screen px-4 py-3 gap-3">
//       <ChatWindow
//         conversationId={conversationId}
//         meId={meId}
//         initialMessages={messages.map((m) => ({
//           ...m,
//           createdAt: m.createdAt.toISOString(),
//         }))}
//       />
//       <ChatComposer conversationId={conversationId} />
//       <InquirySheet conversationId={conversationId} />
//     </div>
//   );
// }
