// "use client";

// import { useEffect, useState, useRef } from "react";
// import { UploadButton } from "@/lib/uploadthing";
// import type { ProductLite, MessageLite } from "./types";
// import { Paperclip, Send, X } from "lucide-react";

// type Props = {
//   conversationId: string;
//   product: ProductLite | null;
//   replyTo?: MessageLite | null;
//   onClearReply?: () => void;
// };

// type Att = { url: string; name?: string };

// export default function Composer({
//   conversationId,
//   product,
//   replyTo,
//   onClearReply,
// }: Props) {
//   const [value, setValue] = useState("");
//   const [isTyping, setIsTyping] = useState(false);
//   const [uploadingCount, setUploadingCount] = useState(0);
//   const [attachments, setAttachments] = useState<Att[]>([]);
//   const textareaRef = useRef<HTMLTextAreaElement>(null);

//   // Auto-grow textarea like WhatsApp
//   useEffect(() => {
//     const el = textareaRef.current;
//     if (!el) return;
//     el.style.height = "auto";
//     el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
//   }, [value]);

//   // Typing indicator
//   useEffect(() => {
//     const sendTyping = (state: boolean) =>
//       fetch(`/api/chat/${conversationId}/typing`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ isTyping: state }),
//       }).catch(() => {});

//     if (!value) {
//       if (isTyping) {
//         setIsTyping(false);
//         sendTyping(false);
//       }
//       return;
//     }

//     if (!isTyping) {
//       setIsTyping(true);
//       sendTyping(true);
//     }

//     const t = setTimeout(() => {
//       setIsTyping(false);
//       sendTyping(false);
//     }, 1200);
//     return () => clearTimeout(t);
//   }, [value, conversationId, isTyping]);

//   const canSend = value.trim().length > 0 || attachments.length > 0;

//   const send = async () => {
//     const text = value.trim();
//     if (!text && attachments.length === 0) return;

//     const payload: any = { content: text };
//     if (attachments.length) payload.attachments = attachments;
//     if (replyTo?.id) payload.replyToId = replyTo.id;
//     if (replyTo?.inquiry?.id) payload.replyToInquiryId = replyTo.inquiry.id;
//     if (product) payload.productId = product.id;

//     setValue("");
//     setAttachments([]);
//     onClearReply?.();

//     await fetch(`/api/chat/${conversationId}/route`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//   };

//   return (
//     <div className="sticky bottom-0 bg-white border-t p-1 space-y-1">
//       {/* Reply bar */}
//       {replyTo && (
//         <div className="relative bg-muted/30 border-l-4 border-orange-500 rounded px-2 py-1 text-xs flex justify-between items-start">
//           <div className="flex-1">
//             <div className="font-medium">Replying to</div>
//             {replyTo.inquiry && (
//               <div className="text-[10px] text-muted-foreground line-clamp-1">
//                 {replyTo.inquiry.variant
//                   ? `Variant: ${replyTo.inquiry.variant}`
//                   : ""}
//                 {replyTo.inquiry.targetPrice
//                   ? ` • Target: $${replyTo.inquiry.targetPrice}`
//                   : ""}
//               </div>
//             )}
//             {!replyTo.inquiry && (
//               <div className="line-clamp-1">{replyTo.content}</div>
//             )}
//           </div>
//           <button
//             onClick={onClearReply}
//             className="text-red-500 p-1"
//             aria-label="Cancel reply"
//           >
//             <X size={16} />
//           </button>
//         </div>
//       )}

//       {/* Input row */}
//       <div className="flex items-end gap-1">
//         {/* Textarea + attach */}
//         <div className="relative flex-1">
//           <textarea
//             ref={textareaRef}
//             value={value}
//             onChange={(e) => setValue(e.target.value)}
//             placeholder="Message…"
//             className="w-full resize-none overflow-hidden min-h-[36px] max-h-[120px] text-sm pl-9 pr-3 py-2 rounded-full border border-muted focus:outline-none focus:ring focus:ring-orange-200"
//             style={{ lineHeight: "1.2rem" }}
//             onKeyDown={(e) => {
//               if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 send();
//               }
//             }}
//           />

//           {/* Attach button inside input */}
//           <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
//             <UploadButton
//               endpoint="quoteAttachment"
//               appearance={{
//                 button: "p-1 rounded-full hover:bg-muted/30",
//                 label: "hidden",
//               }}
//               onUploadBegin={() => setUploadingCount((c) => c + 1)}
//               onUploadError={() => setUploadingCount((c) => Math.max(0, c - 1))}
//               onClientUploadComplete={(res) => {
//                 const files: Att[] = res.map((r: any) => ({
//                   url: r.url as string,
//                   name: r.name as string | undefined,
//                 }));
//                 setAttachments((prev) => [...prev, ...files]);
//                 setUploadingCount((c) => Math.max(0, c - 1));
//               }}
//               content={{ button: <Paperclip size={18} /> }}
//             />
//           </div>
//         </div>

//         {/* Send button */}
//         <button
//           onClick={send}
//           disabled={!canSend}
//           className={`p-2 rounded-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 shadow-sm ${
//             !canSend ? "opacity-40 cursor-not-allowed" : ""
//           }`}
//         >
//           <Send className="text-white rotate-45 w-5 h-5" />
//         </button>
//       </div>

//       {/* Attachments preview */}
//       {attachments.length > 0 && (
//         <div className="flex flex-wrap gap-1 text-[10px] mt-1">
//           {attachments.map((f, i) => (
//             <span key={i} className="px-2 py-1 bg-muted rounded-full">
//               📎 {f.name || "File"}
//             </span>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
