// "use client";
// import { useEffect, useRef, useState } from "react";
// import MessageBubble from "./message-bubble";
// import { useConversationChannel } from "@/hooks/use-conversation-channel";

// export default function ChatWindow({
//   conversationId,
//   meId,
//   initialMessages,
// }: {
//   conversationId: string;
//   meId: string;
//   initialMessages: Array<{
//     id: string;
//     senderId: string;
//     body: string | null;
//     createdAt: string;
//   }>;
// }) {
//   const [messages, setMessages] = useState(initialMessages);
//   const bottomRef = useRef<HTMLDivElement | null>(null);

//   useConversationChannel(conversationId, (m) =>
//     setMessages((prev) => [...prev, m])
//   );

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages.length]);

//   return (
//     <div className="flex h-[60vh] w-full flex-col gap-2 overflow-y-auto rounded-lg border p-3 bg-background">
//       {messages.map((m) => (
//         <MessageBubble
//           key={m.id}
//           me={m.senderId === meId}
//           body={m.body ?? undefined}
//           createdAt={m.createdAt}
//         />
//       ))}
//       <div ref={bottomRef} />
//     </div>
//   );
// }
