// "use client";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { UploadButton } from "@/lib/uploadthing";
// import { useSession } from "next-auth/react";

// type Message = {
//   id: string;
//   text: string;
//   senderId: string;
//   status: "sent" | "delivered" | "read";
//   replyTo?: string;
// };

// export default function ChatPage() {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState("");
//   const [isTyping, setIsTyping] = useState(false);
//   const [replyTo, setReplyTo] = useState<Message | null>(null);
//   const [session, setSession] = useState<{
//     user: { id: string; role?: "BUYER" | "SUPPLIER" };
//   } | null>(null);

//   // ✅ Load session
//   useEffect(() => {
//     (async () => {
//       const { data: sessionx, statusx } = useSession();
//       if (statusx === "loading") {
//         return <p>Inafunguka...</p>;
//       }

//       setSession(sessionx as any);
//     })();
//   }, []);

//   function sendMessage() {
//     if (!input.trim()) return;
//     const newMsg: Message = {
//       id: Date.now().toString(),
//       text: input,
//       senderId: session?.user.id || "me",
//       status: "sent",
//       replyTo: replyTo?.id,
//     };
//     setMessages((prev) => [...prev, newMsg]);
//     setInput("");
//     setReplyTo(null);
//     // TODO: send to server/websocket
//   }

//   return (
//     <div className="flex flex-col h-screen">
//       {/* Chat Header */}
//       <div className="p-2 border-b flex items-center justify-between">
//         <h2 className="font-semibold">Chat</h2>
//         {isTyping && (
//           <span className="text-sm text-gray-500 italic">typing...</span>
//         )}
//       </div>

//       {/* Chat Body */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
//         {messages.map((m) => (
//           <div
//             key={m.id}
//             className={`p-2 rounded-xl max-w-xs ${
//               m.senderId === session?.user.id
//                 ? "bg-green-100 ml-auto"
//                 : "bg-white"
//             }`}
//           >
//             {m.replyTo && (
//               <div className="text-xs text-gray-500 border-l-2 pl-2 mb-1">
//                 Replying to: {messages.find((x) => x.id === m.replyTo)?.text}
//               </div>
//             )}
//             <p>{m.text}</p>
//             {/* ✅ Read Receipts */}
//             {m.senderId === session?.user.id && (
//               <span className="text-[10px] block text-right">
//                 {m.status === "sent" && "✓"}
//                 {m.status === "delivered" && "✓✓"}
//                 {m.status === "read" && (
//                   <span className="text-blue-500">✓✓</span>
//                 )}
//               </span>
//             )}
//             {/* ✅ Quote Reply Button */}
//             {m.senderId !== session?.user.id && (
//               <Button
//                 size="xs"
//                 variant="ghost"
//                 className="mt-1 text-xs text-gray-500"
//                 onClick={() => setReplyTo(m)}
//               >
//                 Reply
//               </Button>
//             )}
//           </div>
//         ))}
//       </div>

//       {/* Chat Footer */}
//       <div className="p-2 border-t space-y-2">
//         {/* ✅ Quoted message preview */}
//         {replyTo && (
//           <div className="p-2 text-xs border-l-2 border-green-400 bg-gray-100 flex justify-between">
//             <span>Replying to: {replyTo.text}</span>
//             <button onClick={() => setReplyTo(null)}>✕</button>
//           </div>
//         )}

//         <div className="flex gap-2">
//           {/* RBAC: upload controls */}
//           {session?.user.role === "SUPPLIER" ? (
//             <UploadButton endpoint="quoteAttachment" />
//           ) : (
//             <UploadButton endpoint="imageUploader" />
//           )}

//           <Input
//             value={input}
//             onChange={(e) => {
//               setInput(e.target.value);
//               setIsTyping(true);
//               setTimeout(() => setIsTyping(false), 1500);
//             }}
//             placeholder="Type message..."
//           />
//           <Button onClick={sendMessage}>Send</Button>
//         </div>
//       </div>
//     </div>
//   );
// }
