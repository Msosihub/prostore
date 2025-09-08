// app/api/chat/[conversationId]/route.ts
import { NextResponse } from "next/server";
import { getConversation } from "@/lib/actions/chat.actions";
// import type { NextRequest } from "next/server";
// import type { RouteContext } from "next";

// type RouteParams = {
//   params: { conversationId: string };
// };

export async function GET(req: Request) {
  // const { conversationId } = await context.params;
  const url = new URL(req.url);
  let conversationId = url.pathname.split("/").pop() || ""; // crude but effective
  if (conversationId === "") {
    conversationId = url.searchParams.get("conversationId") || "";
  }

  try {
    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("API chat fetch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
