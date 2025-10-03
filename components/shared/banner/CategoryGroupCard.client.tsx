// components/shared/banner/CategoryGroupCard.client.tsx
"use client";

import { Banner, BannerItems } from "@/types";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function CategoryGroupCard({ banner }: { banner: Banner }) {
  const items: BannerItems[] = banner.items ?? [];

  return (
    <div className=" my-10 relative grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 w-full ">
      <div className=" p-2 flex flex-col bg-gray-100 shadow-md">
        <h2 className="font-semibold pt-2 pb-2">{banner.title}</h2>
        <div className=" gap-2 grid grid-cols-2 sm:grid-cols-2  lg:grid-cols-2 md:gap-4 ">
          {items.map((it) => (
            <div key={it.id} className="flex flex-col items-center">
              <Link key={it.id} href={it.link || ""}>
                <div className="w-full aspect-square">
                  <Image
                    src={it.image || ""}
                    alt={it.title || ""}
                    className="w-full h-full object-cover"
                    width={300}
                    height={300}
                  />
                </div>
                <div className="pt-1 w-full text-start">
                  <p className=" text-[11px]text-gray-800 truncate">
                    {it.title || ""}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <Link href={"#"} className="text-blue-600 pt-4 pb-2">
          {banner.subtitle || "Ona zaidi"}
        </Link>
      </div>
    </div>
  );
}
