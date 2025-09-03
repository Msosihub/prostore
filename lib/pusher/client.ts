import Pusher from "pusher-js";

console.log("Pusher Client Initialized", process.env.NEXT_PUBLIC_PUSHER_KEY);
console.log("Pusher Client Cluster", process.env.PUSHER_APP_CLUSTER);

export const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  forceTLS: true,
  authEndpoint: "/api/pusher/auth", // if you secure private channels later
});
