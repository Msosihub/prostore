// //5.2 Chat Window

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { pusherClient } from "@/lib/pusher/client";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { UploadButton } from "@/lib/uploadthing";
// import { cn } from "@/lib/utils";

// type Message = {
//   id: string;
//   senderId: string;
//   body: string;
//   attachments?: any | null;
//   createdAt: string;
// };

// export default function ChatWindow({
//   conversationId,
//   meId,
//   initialMessages,
// }: {
//   conversationId: string;
//   meId: string;
//   initialMessages: Message[];
// }) {
//   const [messages, setMessages] = useState<Message[]>(initialMessages);
//   const [body, setBody] = useState("");
//   const [pendingUploads, setPendingUploads] = useState<any[]>([]);
//   const listRef = useRef<HTMLDivElement>(null);

//   // subscribe
//   useEffect(() => {
//     if (!pusherClient) return;
//     const channel = pusherClient.subscribe(`private-conv-${conversationId}`);
//     channel.bind("message:new", ({ message }: any) => {
//       setMessages((prev) => [...prev, message]);
//     });
//     return () => {
//       channel.unbind_all();
//       channel.unsubscribe();
//     };
//   }, [conversationId]);

//   useEffect(() => {
//     listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
//   }, [messages]);

//   const send = async () => {
//     if (!body.trim() && pendingUploads.length === 0) return;

//     const res = await fetch(`/api/messages/${conversationId}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         body: body.trim() || "(attachment)",
//         attachments: pendingUploads.length ? pendingUploads : undefined,
//       }),
//     });
//     if (res.ok) {
//       setBody("");
//       setPendingUploads([]);
//     }
//   };

//   return (
//     <div className="flex h-full flex-col border rounded-lg">
//       <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
//         {messages.map((m) => {
//           const mine = m.senderId === meId;
//           return (
//             <div
//               key={m.id}
//               className={cn(
//                 "max-w-[80%] rounded-lg px-3 py-2 text-sm",
//                 mine ? "ml-auto bg-green-600 text-white" : "mr-auto bg-muted"
//               )}
//             >
//               {m.body}
//               {Array.isArray(m.attachments) && m.attachments.length > 0 && (
//                 <div className="mt-2 space-y-1">
//                   {m.attachments.map((a: any, i: number) => (
//                     <a
//                       key={i}
//                       href={a.url}
//                       target="_blank"
//                       className="underline"
//                     >
//                       {a.name ?? "attachment"}
//                     </a>
//                   ))}
//                 </div>
//               )}
//               <div className="mt-1 text-[10px] opacity-70">
//                 {new Date(m.createdAt).toLocaleString()}
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       <div className="border-t p-2 space-y-2">
//         {/* uploadthing inline button for attachments */}
//         <UploadButton
//           endpoint="quoteAttachment"
//           appearance={{
//             button:
//               "bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded-md",
//             label: "text-green-600",
//           }}
//           content={{ button: "Upload attachment" }}
//           onClientUploadComplete={(res) => {
//             const next = (res ?? []).map((r: any) => ({
//               url: r.url,
//               name: r.name ?? r.key ?? "file",
//               type: r.type,
//               size: r.size,
//             }));
//             setPendingUploads((prev) => [...prev, ...next]);
//           }}
//           onUploadError={(e) => {
//             console.error(e);
//           }}
//         />

//         {pendingUploads.length > 0 && (
//           <div className="text-xs text-muted-foreground">
//             {pendingUploads.length} attachment(s) ready
//           </div>
//         )}

//         <div className="flex gap-2">
//           <Input
//             placeholder="Type a message…"
//             value={body}
//             onChange={(e) => setBody(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 send();
//               }
//             }}
//           />
//           <Button onClick={send}>Send</Button>
//         </div>
//       </div>
//     </div>
//   );
// }
