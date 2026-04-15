import { prisma } from "@/db/prisma";
import { sendSms } from "@/lib/africasTalking";
import { SYSTEM_PROMPT } from "@/lib/constants";
import { NextResponse } from "next/server";

// 👉 YOU WILL ADD THIS
// const SYSTEM_PROMPT = SYSTEM_PROMPT;

type LeadData = {
  phone?: string;
  service?: string;
  type?: string;
  quantity?: string;
  location?: string;
};

// 🔹 VERIFY WEBHOOK
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verification failed", { status: 403 });
}

// 🔹 HANDLE INCOMING MESSAGES
export async function POST(req: Request) {
  const body = await req.json();

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages;

  if (!messages) {
    return NextResponse.json({ status: "no message" });
  }

  const msg = messages[0];
  const from = msg.from;
  const text = msg.text?.body;

  console.log("User:", from, "Message:", text);

  if (!text) {
    //incase user sends imaes and such that is not text
    return sendMessage(from, "Tafadhali tuma ujumbe wa maandishi 🙏");
  }

  await handleMessage(from, text);

  return NextResponse.json({ status: "ok" });
}

// 🧠 BOT LOGIC
async function handleMessage(from: string, text: string) {
  // 🧠 SINGLE AI CALL (parse + reply)
  const reply = await processMessage(from, text);

  if (!reply) {
    return sendMessage(from, "Samahani, nieleze tena tafadhali 🙏");
  }

  await sendMessage(from, reply);

  // 🔍 Detect intent (hidden)
  const intentData = await detectIntent(from);

  if (!intentData) return;

  console.log("Intent:", intentData);

  // 🚫 Only act if CONFIRMED
  if (!intentData.confirmed) return;

  const service = intentData.service;
  if (!service || service === "Unknown") return;

  // 🔎 Check if lead exists
  const existing = await getLeadLink(from, service);

  // 🆕 CREATE NEW LEAD
  if (intentData.intent === "new_lead" && !existing) {
    const leadData = {
      phone: from,
      service,
      quantity: intentData.changes?.quantity?.toString(),
      location: intentData.changes?.location,
    };

    const res = await createFrappeLead(leadData);

    if (res?.data?.name) {
      await saveLeadLink(from, service, res.data.name);
    }

    await notifyTeam({
      phone: from,
      service,
      quantity: intentData.changes?.quantity,
      location: intentData.changes?.location,
    });
  }

  // 🔁 UPDATE LEAD
  if (intentData.intent === "update_lead" && existing) {
    await updateFrappeLead(existing.leadName, intentData.changes);
  }

  // ❌ CANCEL LEAD
  if (intentData.intent === "cancel" && existing) {
    await cancelFrappeLead(existing.leadName);
  }

  const qty = intentData.changes?.quantity || 0;

  const isHot =
    intentData.intent === "new_lead" && intentData.confirmed && qty >= 4;

  if (isHot) {
    await sendMessage(
      from,
      "Sawa Boss 👍 nakupangia fundi wetu akupigie muda si mrefu"
    );
  }
}

// 📤 SEND MESSAGE
async function sendMessage(to: string, message: string) {
  await fetch("https://graph.facebook.com/v19.0/1024384557431480/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.METTA_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });
}

// 📥 CREATE FRAPPE LEAD
async function createFrappeLead(data: LeadData) {
  const response = await fetch(
    "https://kojean.bmsounds.online/api/resource/Lead",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
      },
      body: JSON.stringify({
        lead_name: "WhatsApp Lead",
        mobile_no: data.phone,

        custom_service: data.service,
        custom_service_type: data.type,
        custom_quantity: parseInt(data.quantity || "0"),
        custom_location: data.location,
        source: "WhatsApp",

        description: `
Service: ${data.service}
Type: ${data.type}
Quantity: ${data.quantity}
Location: ${data.location}
        `,
      }),
    }
  );

  const result = await response.json();
  console.log("Frappe Lead:", result);
  return result;
}

async function processMessage(phone: string, text: string) {
  // 1. Save user message
  await saveMessage(phone, "user", text);

  // 2. Load history
  const history = await getConversation(phone);

  // 3. Send to AI
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...history,
      ],
    }),
  });

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content;

  if (!reply) return null;

  // 4. Save assistant reply
  await saveMessage(phone, "assistant", reply);

  return reply;
}

async function saveMessage(
  phone: string,
  role: "user" | "assistant",
  content: string
) {
  await prisma.botMessage.create({
    data: {
      phone,
      role,
      content,
    },
  });
}

async function getConversation(phone: string) {
  const messages = await prisma.botMessage.findMany({
    where: { phone },
    orderBy: { createdAt: "asc" },
    take: 20, // last 20 messages
  });

  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

//👉 This is a SECOND AI call (hidden) — not for replying, only for decision making.
async function detectIntent(phone: string) {
  const history = await getConversation(phone);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
                  You analyze WhatsApp conversations for a security company.

                  Return JSON ONLY no words before it or after it ina any way, no "ok" no nothing, STRICTLY:

                  {
                    "intent": "new_lead | update_lead | cancel | none",
                    "service": "CCTV | Solar Camera | Electric Fence | Access Control | Unknown",
                    "confirmed": true | false,
                    "changes": {
                      "quantity": number | null,
                      "location": string | null
                    }
                  }

                  Rules:
                  - confirmed = true ONLY if user clearly decided
                  - If unsure → confirmed = false
                  - If no action → intent = none
                  Return JSON ONLY no words before it or after it ina any way, no "ok" no nothing, STRICTLY
          `,
        },
        ...history,
      ],
    }),
  });

  const data = await res.json();
  const output = data.choices?.[0]?.message?.content;

  try {
    return JSON.parse(output);
  } catch {
    console.log("Intent parse failed:", output);
    return null;
  }
}

async function saveLeadLink(phone: string, service: string, leadName: string) {
  await prisma.leadLink.create({
    data: {
      phone,
      service,
      leadName,
    },
  });
}

async function getLeadLink(phone: string, service: string) {
  return prisma.leadLink.findFirst({
    where: { phone, service },
  });
}

async function updateFrappeLead(
  leadName: string,
  changes: { quantity?: number; location?: string }
) {
  await fetch(`https://kojean.bmsounds.online/api/resource/Lead/${leadName}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
    },
    body: JSON.stringify({
      custom_quantity: changes.quantity ?? undefined,
      custom_location: changes.location,
    }),
  });
}

async function cancelFrappeLead(leadName: string) {
  await fetch(`https://kojean.bmsounds.online/api/resource/Lead/${leadName}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
    },
    body: JSON.stringify({
      status: "Lost",
    }),
  });
}

async function notifyTeam(data: {
  phone: string;
  service: string;
  quantity?: number;
  location?: string;
}) {
  const message = `NEW LEAD
  Service: ${data.service}
  Qty: ${data.quantity || "-"}
  Location: ${data.location || "-"}
  Phone: ${data.phone}`;

  await sendSms("+255760111880", message);
}
