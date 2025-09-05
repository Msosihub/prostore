// app/chat/[conversationId]/page.tsx
// import ChatWindow from "./ChatWindow";
import { auth } from "@/auth"; // your server auth helper
import ChatPageClient from "./ChatPageClient";

export default async function Page({
  params,
}: {
  params: { conversationId: string };
}) {
  const session = await auth();
  const meId = session!.user.id;
  const { conversationId } = await params;
  // instead of re-fetching from DB, we check if preloaded data is available in sessionStorage (fast). If not, fall back to server fetch (safe).
  return <ChatPageClient meId={meId || ""} conversationId={conversationId} />;
}

//   const conversation = await getConversation(conversationId);
//   console.log("CONVERSAATION: ", conversation);
//   if (!conversation) return;
//   const lastProductMessage = conversation.messages
//     .filter((m) => m.product)
//     .slice(-1)[0]; // last one
//   console.log("CONVERSATION: LAST: ", lastProductMessage);

//   const headerProduct = lastProductMessage?.product || null;

//   if (!conversation) return null;

//   return (
//     <div className="container py-6">
//       <ChatWindow
//         meId={meId}
//         conversation={conversation as any}
//         headerProduct
//       />
//     </div>
//   );
// }
