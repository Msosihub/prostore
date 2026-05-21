"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import UserButton from "./user-button";

interface MenuProps {
  // 🟢 NEW: Directly pass dynamic cart counts down to display live tracking values
  cartItemsCount?: number;
}

export default function Menu({ cartItemsCount = 0 }: MenuProps) {
  return (
    <div className="flex items-center gap-3 md:gap-4 select-none shrink-0">
      {/* 🟢 UNIFIED CART ACCUMULATION INDICATOR BADGE (Visible on ALL mobile and large screens) */}
      <Link
        href="/cart"
        className="relative p-1.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center text-slate-700 hover:text-slate-900 group"
        aria-label="Angalia Kikapu chako cha mizigo"
      >
        <ShoppingCart className="w-5.5 h-5.5 text-slate-700 group-hover:text-slate-900 transition-colors stroke-[1.8]" />

        {cartItemsCount > 0 && (
          <span className="absolute -top-0.5 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {cartItemsCount > 9 ? "9+" : cartItemsCount}
          </span>
        )}
      </Link>

      {/* Account Authentication User Dropdown Portal Section */}
      <div className="flex items-center">
        <UserButton />
      </div>
    </div>
  );
}
