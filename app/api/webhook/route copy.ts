// import { NextResponse } from "next/server";

// const VERIFY_TOKEN = "bm_verify_token_123";

// type Steps = {
//   step: string;
//   type?: string;
//   location?: string;
//   quantity?: string;
// };

// type LeadData = {
//   phone?: string;
//   service?: string;
//   type?: string;
//   quantity?: string;
//   location?: string;
// };

// // 🧠 TEMP MEMORY (we upgrade later)
// const userState: Record<string, Steps> = {};

// // 🔹 VERIFY WEBHOOK
// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);

//   const mode = searchParams.get("hub.mode");
//   const token = searchParams.get("hub.verify_token");
//   const challenge = searchParams.get("hub.challenge");

//   if (mode === "subscribe" && token === VERIFY_TOKEN) {
//     return new Response(challenge, { status: 200 });
//   }

//   return new Response("Verification failed", { status: 403 });
// }

// // 🔹 HANDLE INCOMING MESSAGES
// export async function POST(req: Request) {
//   const body = await req.json();

//   const entry = body.entry?.[0];
//   const changes = entry?.changes?.[0];
//   const value = changes?.value;
//   const messages = value?.messages;

//   if (!messages) {
//     return NextResponse.json({ status: "no message" });
//   }

//   const msg = messages[0];
//   const from = msg.from;
//   const text = msg.text?.body;

//   console.log("User:", from, "Message:", text);

//   await handleMessage(from, text);

//   return NextResponse.json({ status: "ok" });
// }

// // 🧠 BOT LOGIC
// async function handleMessage(from: string, text: string) {
//   if (!userState[from]) {
//     userState[from] = { step: "collecting" };
//   }

//   const state = userState[from];

//   // 🧠 1. AI PARSE (extract structured data)
//   const ai = await processMessage(text);

//   if (!ai) {
//     return sendMessage(from, "Samahani, nieleze tena tafadhali 🙏");
//   }

//   // store data
//   if (ai.service !== "Unknown") state.step = ai.service;
//   if (ai.type !== "Unknown") state.type = ai.type;
//   if (ai.quantity) state.quantity = ai.quantity.toString();

//   // send reply
//   await sendMessage(from, ai.reply);

//   // 🧠 Detect location (simple fallback)
//   if (!state.location && text.length > 2 && !ai?.quantity) {
//     if (text.toLowerCase().includes("dar") || text.length < 30) {
//       state.location = text;
//     }
//   }

//   // 🤖 3. GENERATE HUMAN REPLY
//   const reply = await generateReply({
//     message: text,
//     service: state.step,
//     type: state.type,
//     quantity: state.quantity,
//     location: state.location,
//   });

//   if (!reply) {
//     return sendMessage(from, "Samahani kidogo, nieleze tena tafadhali 🙏");
//   }

//   await sendMessage(from, reply);

//   // 🎯 4. CHECK IF WE HAVE ENOUGH DATA → CREATE LEAD
//   if (
//     state.step &&
//     state.type &&
//     state.quantity &&
//     state.location &&
//     state.step !== "collecting"
//   ) {
//     const leadData = {
//       phone: from,
//       service: state.step,
//       type: state.type,
//       quantity: state.quantity,
//       location: state.location,
//     };

//     await createFrappeLead(leadData);

//     // prevent duplicate leads
//     state.step = "done";

//     setTimeout(() => {
//       sendMessage(
//         from,
//         "Bado unahitaji msaada wowote? Nipo hapa kukusaidia 👍"
//       );
//     }, 20000);
//   }

//   function normalizeService(service?: string) {
//     if (!service) return undefined;

//     const s = service.toLowerCase();

//     if (s.includes("cctv")) return "CCTV";
//     if (s.includes("solar")) return "Solar Camera";
//     if (s.includes("fence")) return "Electric Fence";
//     if (s.includes("access")) return "Access Control";

//     return service;
//   }
// }

// // 📤 SEND MESSAGE
// async function sendMessage(to: string, message: string) {
//   await fetch("https://graph.facebook.com/v19.0/1024384557431480/messages", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${process.env.METTA_ACCESS_TOKEN}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       messaging_product: "whatsapp",
//       to,
//       type: "text",
//       text: { body: message },
//     }),
//   });
// }

// //this sends lead data to Frappe
// async function createFrappeLead(data: LeadData) {
//   const response = await fetch(
//     "https://kojean.bmsounds.online/api/resource/Lead",
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
//       },
//       body: JSON.stringify({
//         lead_name: "WhatsApp Lead",
//         mobile_no: data.phone,

//         custom_service: data.service,
//         custom_service_type: data.type,
//         custom_quantity: parseInt(data.quantity || "0"),
//         custom_location: data.location,
//         source: "WhatsApp",

//         description: `
// CCTV Request
// Type: ${data.type}
// Cameras: ${data.quantity}
// Location: ${data.location}
//         `,
//       }),
//     }
//   );

//   const result = await response.json();
//   console.log("Frappe Lead:", result);
// }

// async function processMessage(text: string) {
//   const res = await fetch("https://api.openai.com/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//     },
//     body: JSON.stringify({
//       model: "gpt-4.1-mini",
//       messages: [
//         {
//           role: "system",
//           content: `
// You are a sales assistant for a security company in Tanzania.

// Return JSON ONLY:

// {
//   "service": "CCTV | Solar | Fence | Access Control | Unknown",
//   "type": "Home | Business | Unknown",
//   "quantity": number | null,
//   "reply": "Natural Swahili response to user"
// }
//           `,
//         },
//         {
//           role: "user",
//           content: text,
//         },
//       ],
//     }),
//   });

//   const data = await res.json();
//   const output = data.choices[0].message.content;

//   try {
//     return JSON.parse(output);
//   } catch {
//     return null;
//   }
// }

// // async function parseUserMessage(text: string) {
// //   const res = await fetch("https://api.openai.com/v1/chat/completions", {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
// //     },
// //     body: JSON.stringify({
// //       model: "gpt-4.1-mini",
// //       messages: [
// //         {
// //           role: "system",
// //           content: `
// // You are a sales assistant for a security company in Tanzania.

// // Extract structured data from user messages.

// // Return JSON ONLY like:
// // {
// //   "service": "CCTV | Solar | Fence | Access Control | Unknown",
// //   "type": "Home | Business | Unknown",
// //   "quantity": number | null,
// //   "intent": "quote | inquiry | greeting"
// // }
// //           `,
// //         },
// //         {
// //           role: "user",
// //           content: text,
// //         },
// //       ],
// //     }),
// //   });

// //   const data = await res.json();
// //   const output = data.choices[0].message.content;

// //   try {
// //     return JSON.parse(output);
// //   } catch {
// //     return null;
// //   }
// // }
// // async function generateReply(context: any) {
// //   const res = await fetch("https://api.openai.com/v1/chat/completions", {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
// //     },
// //     body: JSON.stringify({
// //       model: "gpt-4.1-mini",
// //       messages: [
// //         {
// //           role: "system",
// //           content: SYSTEM_PROMPT,
// //         },
// //         {
// //           role: "user",
// //           content: context.message,
// //         },
// //       ],
// //     }),
// //   });

// //   const data = await res.json();
// //   return data.choices[0].message.content;
// // }
