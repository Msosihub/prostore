import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher/server";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // const { socket_id, channel_name } = await req.json();
  // ✅ Parse x-www-form-urlencoded body
  const bodyText = await req.text();
  const params = new URLSearchParams(bodyText);

  const socket_id = params.get("socket_id");
  const channel_name = params.get("channel_name");

  if (!socket_id || !channel_name) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // NOTE: Pusher server SDK exposes `authorizeChannel` for private/presence channels

  // You can enhance your security by passing user info in the customData field when authorizing (for presence channels):
  const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, {
    user_id: session.user.id,
    // user_info: { name: session.user.name, email: session.user.email }, // optional
  });
  return NextResponse.json(authResponse);
}
