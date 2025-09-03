import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher/server";
import { auth } from "@/auth";

export async function POST(
  req: Request,
  context: { params: { conversationId: string } }
) {
  const { params } = context;
  // now this line is safe
  const { conversationId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { isTyping } = await req.json();

  await pusherServer.trigger(`private-conv-${conversationId}`, "typing", {
    userId: session.user.id,
    isTyping: Boolean(isTyping),
  });

  return NextResponse.json({ ok: true });
}
