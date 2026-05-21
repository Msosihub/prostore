"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import Menu from "@/components/shared/header/menu";
import SupplierSearch from "@/components/supplier/supplier-search";
import {
  Menu as MenuIcon,
  X,
  LayoutDashboard,
  Package,
  History,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Users,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const supplierNavigationRoutes = [
  {
    title: "Overview (Muhtasari)",
    href: "/supplier/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Bidhaa Zangu (Products)",
    href: "/supplier/products",
    icon: Package,
  },
  { title: "Maagizo (Orders)", href: "/supplier/orders", icon: History },
  { title: "Ujumbe (SMS)", href: "/supplier/messages", icon: MessageSquare },
  {
    title: "Maombi ya Bei (Inquiries)",
    href: "/supplier/inquires",
    icon: HelpCircle,
  },
  {
    title: "Vyeti & Leseni (Documents)",
    href: "/supplier/documents",
    icon: ShieldCheck,
  },
  {
    title: "Profaili ya Duka (Profile)",
    href: "/supplier/profile",
    icon: UserCheck,
  },
  { title: "Wafanyakazi (Users)", href: "/supplier/users", icon: Users },
];

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 w-full overflow-x-hidden antialiased">
      {/* 🟢 STAGE 1: FULL-BLEED STICKY MAIN HEADER CONTROL STRIP */}
      <header className="w-full bg-white border-b border-slate-100 sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Action Trigger Navigation Pin */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 hover:bg-slate-50 text-slate-600 active:scale-95 rounded-xl transition-all"
              aria-label="Open navigation side drawer menu panel"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            {/* Desktop Branding Logo Anchor Block */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image
                src="/images/logo.svg"
                height={32}
                width={32}
                alt={APP_NAME}
                priority
              />
              <span className="font-extrabold text-sm text-slate-900 tracking-tight hidden sm:block">
                {APP_NAME}{" "}
                <span className="text-[10px] bg-slate-100 font-bold text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md ml-0.5 uppercase tracking-wide">
                  Vendor
                </span>
              </span>
            </Link>
          </div>

          {/* Unified dynamic inner wide workspace item search bar */}
          <div className="flex-1 max-w-md mx-auto hidden sm:block">
            <SupplierSearch />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Menu />
          </div>
        </div>
      </header>

      {/* 🟢 STAGE 2: CONTENT GRID BODY CONTAINER LAYOUT FRAMES */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-5 pb-12">
        {children}
      </main>

      {/* 🟢 STAGE 3: MODERN SLIDE-OUT RESPONSIVE NAVIGATION DRAWER PANEL SIDEBAR (Houses all 8 paths) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Translucent overlay backdrop element trigger grid */}
          <div
            className="bg-slate-900/40 backdrop-blur-sm w-full h-full cursor-pointer"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Slide out tray block panel area */}
          <div className="bg-white w-72 h-full shadow-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-left duration-300 relative border-r border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <Image
                  src="/images/logo.svg"
                  height={28}
                  width={28}
                  alt="Logo"
                />
                <span className="font-black text-xs text-slate-800 uppercase tracking-wider">
                  Usimamizi wa Duka
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic loops mapping all 8 unique operational path parameters onto an un-nested panel registry link strip */}
            <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar pt-1 select-none">
              {supplierNavigationRoutes.map((route) => {
                const IconComponent = route.icon;
                const isPathActive = pathname.startsWith(route.href);

                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 h-11 text-xs font-semibold rounded-xl transition-all",
                      isPathActive
                        ? "bg-slate-900 text-white font-bold shadow-sm shadow-slate-900/10"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <IconComponent
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isPathActive ? "text-orange-500" : "text-slate-400"
                      )}
                    />
                    <span>{route.title}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footnote vendor license credentials wrapper tray info context block */}
            <div className="pt-3 border-t border-slate-50 text-[10px] text-slate-400 text-center font-medium font-mono">
              Nimboya Admin Vendor Dashboard Panel v2.1
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
