// "use client";
// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";

// export default function ChatComposer({
//   conversationId,
// }: {
//   conversationId: string;
// }) {
//   const [body, setBody] = useState("");
//   const [loading, setLoading] = useState(false);

//   async function sendMessage() {
//     if (!body.trim()) return;
//     setLoading(true);
//     try {
//       await fetch("/api/messages", {
//         method: "POST",
//         body: JSON.stringify({ conversationId, body }),
//         headers: { "Content-Type": "application/json" },
//       });
//       setBody("");
//     } catch (e) {
//       console.error("Message send failed", e);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <form
//       onSubmit={(e) => {
//         e.preventDefault();
//         sendMessage();
//       }}
//       className="flex w-full gap-2 pt-3"
//     >
//       <Input
//         value={body}
//         onChange={(e) => setBody(e.target.value)}
//         placeholder="Type your message..."
//         disabled={loading}
//       />
//       <Button type="submit" disabled={loading}>
//         Send
//       </Button>
//     </form>
//   );
// }
