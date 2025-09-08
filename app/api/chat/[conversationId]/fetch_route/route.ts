// app/api/chat/[conversationId]/route.ts
import { NextResponse } from "next/server";
import { getConversation } from "@/lib/actions/chat.actions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const paramsx = await params;
  try {
    const conversation = await getConversation(paramsx.conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("API chat fetch error:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
