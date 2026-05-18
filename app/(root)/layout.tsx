import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BottomNav from "@/components/customComponents/bottom-nav-main";
import Header from "@/components/shared/header";
import { prisma } from "@/db/prisma";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let cartItemsCount = 0;
  let unreadMessagesCount = 0;

  if (session?.user?.id) {
    // 🧠 Logged in but not onboarded
    if (session.user?.name === "NO_NAME") {
      redirect("/onboarding");
    }

    // 1. Fetch Cart items count dynamically from Json[] schema field array
    const cart = await prisma.cart.findFirst({
      where: { userId: session.user.id },
      select: { items: true },
    });
    if (cart?.items) {
      cartItemsCount = cart.items.length;
    }

    // 2. Fetch Unread Messages count matching your exact model variable: "seen"
    unreadMessagesCount = await prisma.message.count({
      where: {
        seen: false, // matching seen column structure
        conversation: {
          OR: [{ buyerId: session.user.id }, { supplierId: session.user.id }],
        },
        NOT: { senderId: session.user.id }, // Exclude messages sent by yourself
      },
    });
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50/50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto p-0 px-2 sm:px-4 lg:px-6">
        {children}
      </main>

      {/* Inject live values cleanly to feed interactive badge bubbles */}
      <BottomNav
        cartItemsCount={cartItemsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
    </div>
  );
}
