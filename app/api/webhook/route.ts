import { SYSTEM_PROMPT } from "@/lib/constants";
import { NextResponse } from "next/server";

// 👉 YOU WILL ADD THIS
// const SYSTEM_PROMPT = SYSTEM_PROMPT;

type Steps = {
  step: string;
  type?: string;
  location?: string;
  quantity?: string;
};

type LeadData = {
  phone?: string;
  service?: string;
  type?: string;
  quantity?: string;
  location?: string;
};

// 🧠 TEMP MEMORY
const userState: Record<string, Steps> = {};

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

  await handleMessage(from, text);

  return NextResponse.json({ status: "ok" });
}

// 🧠 BOT LOGIC
async function handleMessage(from: string, text: string) {
  if (!userState[from]) {
    userState[from] = { step: "collecting" };
  }

  const state = userState[from];

  // 🧠 SINGLE AI CALL (parse + reply)
  const ai = await processMessage(text);

  if (!ai) {
    return sendMessage(from, "Samahani, nieleze tena tafadhali 🙏");
  }

  // 🔧 Normalize service
  const service = normalizeService(ai.service);

  // 🧠 STORE DATA
  if (service && service !== "Unknown") {
    state.step = service;
  }

  if (ai.type && ai.type !== "Unknown") {
    state.type = ai.type;
  }

  if (ai.quantity) {
    state.quantity = ai.quantity.toString();
  }

  // 📍 SIMPLE LOCATION DETECTION
  if (!state.location && text.length > 2 && !ai.quantity) {
    if (text.length < 30) {
      state.location = text;
    }
  }

  // 📤 SEND AI REPLY (ONLY ONCE)
  await sendMessage(from, ai.reply);

  // 🎯 CREATE LEAD IF COMPLETE
  if (
    state.step &&
    state.type &&
    state.quantity &&
    state.location &&
    state.step !== "collecting" &&
    state.step !== "done"
  ) {
    const leadData = {
      phone: from,
      service: state.step,
      type: state.type,
      quantity: state.quantity,
      location: state.location,
    };

    await createFrappeLead(leadData);

    state.step = "done";

    setTimeout(() => {
      sendMessage(
        from,
        "Bado unahitaji msaada wowote? Nipo hapa kukusaidia 👍"
      );
    }, 20000);
  }
}

// 🔧 NORMALIZE SERVICE
function normalizeService(service?: string) {
  if (!service) return undefined;

  const s = service.toLowerCase();

  if (s.includes("cctv")) return "CCTV";
  if (s.includes("solar")) return "Solar Camera";
  if (s.includes("fence")) return "Electric Fence";
  if (s.includes("access")) return "Access Control";

  return "Unknown";
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
}

// 🤖 AI (SINGLE CALL: PARSE + REPLY)
async function processMessage(text: string) {
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
        {
          role: "user",
          content: text,
        },
      ],
    }),
  });

  const data = await res.json();
  const output = data.choices[0].message.content;

  try {
    return JSON.parse(output);
  } catch (e) {
    console.error("AI Parse Error:", output);
    console.error("AI Parse Error Full: ", e);
    return null;
  }
}
