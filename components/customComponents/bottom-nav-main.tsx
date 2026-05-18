// You can pass real-time count metrics (unreadMessagesCount and cartItemsCount)
// into this component as props from your root layout:

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Grid, MessageCircle, ShoppingCart, User } from "lucide-react";

interface BottomNavProps {
  unreadMessagesCount?: number;
  cartItemsCount?: number;
}

export default function BottomNav({
  unreadMessagesCount = 20,
  cartItemsCount = 10,
}: BottomNavProps) {
  const pathname = usePathname();

  // 🟢 CRITICAL UI FIX: Hide bottom navigation on product pages, chat sessions, AND order processing sheets
  if (
    pathname.startsWith("/product/") ||
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/order/") ||
    pathname.startsWith("/place-order")
  ) {
    return null;
  }

  const navItems = [
    { name: "Mwanzo", href: "/", icon: Home },
    { name: "Makundi", href: "/categories", icon: Grid },
    {
      name: "Messenger",
      href: "/buyer/chat",
      icon: MessageCircle,
      badge: unreadMessagesCount,
    },
    {
      name: "Mizigo",
      href: "/cart",
      icon: ShoppingCart,
      badge: cartItemsCount,
    },
    { name: "Mimi", href: "/user/profile", icon: User },
  ];

  return (
    <>
      {/* Dynamic structural spacer tray to prevent component overlap constraints */}
      <div className="h-16 md:hidden" />

      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-safe">
        <div className="mx-auto flex max-w-md items-center justify-around px-3 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className="relative flex flex-col items-center justify-center min-w-[60px] py-0.5 group"
              >
                <div className="relative p-1 rounded-xl transition-all duration-200">
                  <Icon
                    className={`h-5.5 w-5.5 transition-transform duration-200 group-active:scale-90 ${
                      isActive
                        ? "text-orange-600 stroke-[2.25]"
                        : "text-slate-400 stroke-[1.75]"
                    }`}
                  />

                  {/* 🟢 REUSABLE NOTIFICATION BADGE UI LAYER */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-0.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white animate-in zoom-in-50 duration-200">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-medium tracking-wide mt-0.5 transition-colors duration-200 ${
                    isActive
                      ? "text-orange-600 font-semibold"
                      : "text-slate-500"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
