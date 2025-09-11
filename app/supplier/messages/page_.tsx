// "use client";

// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { pusherClient } from "@/lib/pusher/client";
// import { MessageLite } from "@/types";

// type ConversationItem = {
//   id: string;
//   buyerName: string;
//   lastMessage?: string;
//   unreadCount: number;
// };

// export default function SupplierMessages({
//   meId,
//   initial,
// }: {
//   meId: string;
//   initial: ConversationItem[];
// }) {
//   const [items, setItems] = useState(initial);

//   useEffect(() => {
//     const channel = pusherClient.subscribe(`private-user-${meId}`);

//     channel.bind(
//       "msg:new",
//       ({
//         conversationId,
//         message,
//       }: {
//         conversationId: string;
//         message: MessageLite;
//       }) => {
//         setItems((prev) =>
//           prev.map((c) =>
//             c.id === conversationId
//               ? {
//                   ...c,
//                   unreadCount: c.unreadCount + 1,
//                   lastMessage: message.content,
//                 }
//               : c
//           )
//         );
//       }
//     );

//     return () => {
//       channel.unbind_all();
//       channel.unsubscribe();
//     };
//   }, [meId]);

//   return (
//     <div className="max-w-3xl mx-auto p-6">
//       <h1 className="text-xl font-semibold mb-4">Buyer Messages</h1>
//       <div className="space-y-4">
//         {items.map((c) => (
//           <Link
//             key={c.id}
//             href={`/chat/${c.id}`}
//             className="block p-4 border rounded-lg hover:bg-gray-50"
//           >
//             <div className="flex justify-between items-center">
//               <div>
//                 <p className="font-medium">{c.buyerName}</p>
//               </div>
//             </div>
//             <p className="text-sm text-gray-700 truncate">
//               {c.lastMessage ?? "No messages yet"}
//             </p>
//             {c.unreadCount > 0 && (
//               <span className="text-xs text-red-500">{c.unreadCount} new</span>
//             )}
//           </Link>
//         ))}
//       </div>
//     </div>
//   );
// }
