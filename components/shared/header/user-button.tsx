"use client";

import { useSession, signOut } from "next-auth/react"; // 🟢 FIXED: Imported standard signOut client hook
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  MessageSquare,
  History,
  LayoutDashboard,
} from "lucide-react";

export default function UserButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
    );
  }

  if (!session) {
    return (
      <Button
        asChild
        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-9 px-4 flex items-center gap-1.5 shadow-sm"
      >
        <Link href="/sign-in">
          <User className="w-3.5 h-3.5" />
          <span>Ingia</span>
        </Link>
      </Button>
    );
  }

  const firstInitial = session.user?.name?.charAt(0).toUpperCase() || "U";

  const handleLogoutClick = async () => {
    // 🟢 FIXED CLIENT LOGOUT: Wipes local caches and reloads the root page instantly
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 select-none outline-none hover:scale-105 active:scale-95 transition-transform shrink-0"
          >
            {firstInitial}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-56 bg-white border border-slate-100 rounded-xl shadow-xl mt-1.5 p-1 z-50"
          align="end"
        >
          <DropdownMenuLabel className="font-normal p-2.5">
            <div className="flex flex-col space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-none">
                {session.user?.name}
              </p>
              <p className="text-[11px] text-slate-400 truncate leading-none pt-0.5">
                {session.user?.email}
              </p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-slate-50" />

          <DropdownMenuItem
            asChild
            className="text-xs font-medium text-slate-600 p-2 rounded-lg cursor-pointer focus:bg-slate-50 focus:text-slate-900"
          >
            <Link
              href="/user/profile"
              className="flex items-center gap-2 w-full"
            >
              <User className="w-3.5 h-3.5 text-slate-400" /> Profaili Yangu
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            asChild
            className="text-xs font-medium text-slate-600 p-2 rounded-lg cursor-pointer focus:bg-slate-50 focus:text-slate-900"
          >
            <Link href="/buyer/chat" className="flex items-center gap-2 w-full">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Ujumbe
              (Messages)
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            asChild
            className="text-xs font-medium text-slate-600 p-2 rounded-lg cursor-pointer focus:bg-slate-50 focus:text-slate-900"
          >
            <Link
              href="/user/orders"
              className="flex items-center gap-2 w-full"
            >
              <History className="w-3.5 h-3.5 text-slate-400" /> Historia ya
              Agizo
            </Link>
          </DropdownMenuItem>

          {session.user?.role === "SUPPLIER" && (
            <>
              <DropdownMenuSeparator className="bg-slate-50" />
              <DropdownMenuItem
                asChild
                className="text-xs font-bold text-orange-600 p-2 rounded-lg cursor-pointer bg-orange-50/40 focus:bg-orange-50 focus:text-orange-700"
              >
                <Link
                  href="/supplier/overview"
                  className="flex items-center gap-2 w-full"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-orange-500" />{" "}
                  Supplier Dashboard
                </Link>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator className="bg-slate-50" />

          {/* 🟢 FIXED LOGOUT ELEMENT INTERACTION BUTTON */}
          <DropdownMenuItem
            onClick={handleLogoutClick}
            className="text-xs font-semibold text-rose-600 p-2 rounded-lg cursor-pointer focus:bg-rose-50 focus:text-rose-700 flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" /> Toka (Logout)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
