// app/supplier/messages/page.tsx
import Link from "next/link";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";

export default async function SupplierMessagesPage() {
  const session = await auth();
  const supplierId = session?.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { supplierId },
    include: {
      buyer: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Buyer Messages</h1>
      <div className="space-y-4">
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/api/chat/${c.id}`}
            className="block p-4 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{c.buyer.name}</p>
              </div>
              <span className="text-xs text-gray-400">
                {c.messages[0]?.createdAt.toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-700 truncate">
              {c.messages[0]?.content ?? "No messages yet"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
