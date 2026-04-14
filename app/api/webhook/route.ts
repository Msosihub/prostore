import { NextResponse } from "next/server";

const VERIFY_TOKEN = "bm_verify_token_123";

type Steps = {
  step: string;
  type?: string;
  location?: string;
  quantity?: string;
};

// 🧠 TEMP MEMORY (we upgrade later)
const userState: Record<string, Steps> = {};

// 🔹 VERIFY WEBHOOK
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
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
    userState[from] = { step: "menu" };

    return sendMessage(
      from,
      `Karibu BM Contractors 👷‍♂️

Chagua huduma:
1️⃣ CCTV Installation
2️⃣ Solar Cameras
3️⃣ Electric Fence
4️⃣ Access Control
5️⃣ Get Quotation
6️⃣ Ongea na Muhudumu wetu`
    );
  }

  const state = userState[from];

  // MAIN MENU
  if (state.step === "menu") {
    if (text === "1") {
      state.step = "cctv_type";

      return sendMessage(
        from,
        `Umechagua CCTV 📹

1️⃣ Nyumbani
2️⃣ Biashara`
      );
    }

    if (text === "6") {
      return sendMessage(
        from,
        "Tafadhali subiri, tunakuunganisha na muhudumu wetu 🙏"
      );
    }
  }

  // CCTV TYPE
  if (state.step === "cctv_type") {
    state.type = text === "1" ? "Home" : "Business";
    state.step = "cctv_quantity";

    return sendMessage(from, "Ni cameras ngapi unahitaji?");
  }

  // QUANTITY
  if (state.step === "cctv_quantity") {
    state.quantity = text;
    state.step = "location";

    return sendMessage(from, "Location yako ni wapi?");
  }

  // LOCATION
  if (state.step === "location") {
    state.location = text;
    state.step = "done";

    console.log("🔥 LEAD CAPTURED:", state);

    return sendMessage(from, "Asante! Tutakutumia quotation hivi karibuni 🙏");
  }
}

// 📤 SEND MESSAGE
async function sendMessage(to: string, message: string) {
  await fetch("https://graph.facebook.com/v19.0/1024384557431480/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer EAANT0qchFYgBRO7tLotddagfyTKdnCD0pVhmUJ34HHPKQGUXDV6h6froytQbzhMYr8QT0NHna7ojZAfLZB5HOrw25gHu49N66LjQUzHQfjNhOiJkctEaCU9tYZCPRHdhksgCONjusk2xrzz7ILSvAvEFDWFWD9tLVClOmh7kBCeRpgqNFAOo2LV3odZCRc83ZADaz5R0faw87znVp9lkdWZAWSvJAyjBZB4fNHHITC6`,
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
