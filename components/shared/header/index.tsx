"use client";

import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import Menu from "./menu";
import CategoryDrawer from "./category-drawer";
import Search from "./search";
import CategoryPreviewBar from "./category-preview-bar";
import { useState } from "react";

interface HeaderProps {
  cartItemsCount?: number;
}

export default function Header({ cartItemsCount = 0 }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <a
        href="#storefront-content"
        className="sr-only focus:not-sr-only focus:block focus:p-3"
      >
        Ruka hadi bidhaa
      </a>
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 lg:px-6">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[auto_1fr_auto] md:gap-8">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2"
            aria-label="Nimboya — Mwanzo"
          >
            <Image src="/images/logo.svg" alt="" width={36} height={36} />
            <span className="text-xl font-extrabold tracking-tight text-emerald-950">
              {APP_NAME}
            </span>
          </Link>
          <div className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1">
            <Search />
          </div>
          <div className="col-start-2 row-start-1 md:col-start-3">
            <Menu cartItemsCount={cartItemsCount} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3">
          <Link
            href="/categories"
            className="shrink-0 text-sm font-semibold text-emerald-900"
          >
            Makundi yote
          </Link>
          <div className="min-w-0 flex-1">
            <CategoryPreviewBar onOpenDrawer={() => setDrawerOpen(true)} />
          </div>
        </div>
        <CategoryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    </header>
  );
}
