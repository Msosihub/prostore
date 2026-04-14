import { NextResponse } from "next/server";

const VERIFY_TOKEN = "bm_verify_token_123"; // you choose this

// 🔹 META VERIFICATION (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verification failed", { status: 403 });
}

// 🔹 RECEIVE MESSAGES (POST)
export async function POST(req: Request) {
  const body = await req.json();

  console.log("Incoming webhook:", JSON.stringify(body, null, 2));

  return NextResponse.json({ status: "received" });
}
