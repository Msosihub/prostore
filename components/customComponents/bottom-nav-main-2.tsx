"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Grid, MessageCircle, ShoppingCart, User } from "lucide-react";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Categories", href: "/categories", icon: Grid },
  { name: "Messenger", href: "/chat", icon: MessageCircle },
  { name: "Cart", href: "/cart", icon: ShoppingCart },
  { name: "Me", href: "/account", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* spacer so content never hides behind bar */}
      <div className="h-18 md:h-16" />

      {/* bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-md hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center transition-colors ${
                  isActive ? "text-orange-600" : "text-gray-500"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    isActive ? "stroke-orange-600" : "stroke-gray-500"
                  }`}
                />
                <span className="text-[10px] sm:text-xs md:text-sm mt-0.5">
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
