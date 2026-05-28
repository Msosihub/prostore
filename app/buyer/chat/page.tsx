import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import ChatWindow from "@/components/chatwoot/ChatWindow";

export default async function BuyerChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      buyerId: session.user.id,
    },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },

      Product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
        },
      },

      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },

      Inquiry: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              stock: true,
            },
          },
        },
      },
    },

    orderBy: {
      updatedAt: "desc",
    },
  });

  const safeConversation = JSON.parse(JSON.stringify(conversations));
  return (
    <div className="container mx-auto max-w-6xl h-[calc(100vh-140px)] my-4 px-2 md:px-4">
      <ChatWindow
        initialConversations={safeConversation}
        currentUserId={session.user.id || ""}
      />
    </div>
  );
}
