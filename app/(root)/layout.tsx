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
    if (session.user?.name === "NO_NAME") {
      redirect("/onboarding");
    }

    const cart = await prisma.cart.findFirst({
      where: { userId: session.user.id },
      select: { items: true },
    });
    if (cart?.items) {
      cartItemsCount = cart.items.length;
    }

    unreadMessagesCount = await prisma.message.count({
      where: {
        seen: false,
        conversation: {
          OR: [{ buyerId: session.user.id }, { supplierId: session.user.id }],
        },
        NOT: { senderId: session.user.id },
      },
    });
  }

  return (
    // 🟢 FIXED: Changed from 'h-screen' to 'min-h-screen flex flex-col' to eliminate mobile scroll trap breakages
    <div className="flex min-h-screen flex-col bg-slate-50/40 w-full overflow-x-hidden">
      <Header cartItemsCount={cartItemsCount} />

      {/* 🟢 UNIFIED BOUNDARY CONTROLLER: Cleans up duplicate wrapper padding loops */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {children}
      </main>

      <BottomNav
        cartItemsCount={cartItemsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
    </div>
  );
}
