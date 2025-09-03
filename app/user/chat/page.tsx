import { Metadata } from "next";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import BuyerChat from "./BuyerChat";

export const metadata: Metadata = {
  title: "Messages",
};

const Messages = async () => {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="h2-bold">Messages</h2>
        <BuyerChat />
      </div>
    </SessionProvider>
  );
};

export default Messages;
