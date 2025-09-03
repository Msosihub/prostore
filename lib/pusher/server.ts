import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Channel naming:
// - One channel per conversation: `private-conv-{conversationId}`
// Events:
// - "message:new"  -> payload: { message, conversationId }
// - "message:read" -> payload: { messageId, conversationId, readerId }
// - "conv:new"     -> payload: { conversation }
