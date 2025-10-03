// components/shared/banner/PromoCard.client.tsx
"use client";

import {
  Banner,
  // BannerItems
} from "@/types";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export type BannerItemsx = {
  id: string;
  image: string | null | undefined;
  title?: string;
  link?: string | "";
  bannerId?: string;
};

export default function PromoCard({ banner }: { banner: Banner }) {
  const items = banner.items ?? [];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it: BannerItemsx) => (
        <Link
          key={it.id}
          href={it.link || ""}
          className="group flex items-stretch"
        >
          <div className="w-full rounded-xl overflow-hidden shadow-sm flex">
            <div className="relative w-1/3 h-[120px] sm:h-[140px]">
              <Image
                src={it.image || ""}
                alt={it.title ?? "promo"}
                fill
                className="object-cover"
              />
            </div>

            <div className="p-3 flex flex-col justify-center">
              <h4 className="text-sm sm:text-base font-semibold">{it.title}</h4>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
