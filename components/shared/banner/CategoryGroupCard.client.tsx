"use client";

import Link from "next/link";
import Image from "next/image";
import { Banner, BannerItems } from "@/types";
import { ChevronRight } from "lucide-react";

export default function CategoryGroupCard({ banner }: { banner: Banner }) {
  const items: BannerItems[] = banner.items ?? [];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
      {/* Card Header Context Link */}
      <div className="p-3.5 pb-2 border-b border-slate-50">
        <Link
          href={`/search?category=${encodeURIComponent(banner.category || "")}`}
          className="group flex items-center justify-between"
        >
          <h2 className="text-xs md:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-orange-600 transition-colors">
            {banner.title}
          </h2>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0 ml-1" />
        </Link>
      </div>

      {/* Grid Container Block (Explicit Aspect Ratios for safe image scaling grids) */}
      <div className="p-3 flex-grow">
        <div className="grid grid-cols-2 gap-2.5">
          {items.slice(0, 4).map((it) => {
            const targetHref = it.productId
              ? `/product/${it.productId}`
              : banner?.category
                ? `/search?category=${encodeURIComponent(banner.category)}`
                : "#";

            return (
              <Link
                key={it.id}
                href={targetHref}
                className="group flex flex-col space-y-1"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative">
                  <Image
                    src={it.image}
                    alt={it.title || ""}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-700 truncate px-0.5 group-hover:text-slate-900">
                  {it.title}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Card Footer Link */}
      <div className="px-3.5 pb-3.5 pt-1 text-left border-t border-slate-50/50">
        <Link
          href={`/search?category=${encodeURIComponent(banner.category || "")}`}
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
        >
          Angalia Bidhaa Zote
        </Link>
      </div>
    </div>
  );
}
