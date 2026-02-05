// components/shared/banner/CategoryGroupCard.client.tsx
"use client";

import { Banner, BannerItems } from "@/types";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function CategoryGroupCard({ banner }: { banner: Banner }) {
  const items: BannerItems[] = banner.items ?? [];
  // console.log("BAnnerItem: ", items);
  return (
    <div className="container mx-auto  ">
      {/* <!-- Main Card Container --> */}
      <div
        id="CardInstanceMvcYhZ_DqfhQ"
        className="bg-white shadow-md overflow-hidden transition-all duration-300 card-hover  h-[450px] flex flex-col"
      >
        {/* <!-- Card Header --> */}
        <div className="mx-4 pt-3 border-gray-200">
          <Link href={`/search?category=${banner.category}`}>
            <h2 className="text- text-start font-bold text-gray-800 leading-snug line-clamp-2">
              {banner.title}
            </h2>
          </Link>
        </div>

        {/* <!-- Grid Container --> */}
        <div className="p-4 flex-grow overflow-hidden h-[250px]">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 h-full">
            {items.map((it) => {
              // console.log("IT:", it);

              return (
                <Link
                  key={it.id}
                  href={
                    it.productId
                      ? `/product/${it.productId}`
                      : banner?.category
                        ? `/search?category=${encodeURIComponent(banner.category)}`
                        : "#"
                  }
                >
                  <div className="group">
                    {/* Item */}
                    <div className="aspect-square overflow-hidden bg-gray-100 image-hover transition-all duration-300 cursor-pointer">
                      <Image
                        src={it.image}
                        alt={it.title || ""}
                        width={280}
                        height={280}
                        className="w-full h-full object-cover"
                        sizes="(max-width: 768px) 100vw, 240px"
                      />
                    </div>

                    <div className="pb-2 text-center">
                      <p className="mt-1 text-xs text-start font-medium text-gray-900 truncate cursor-pointer">
                        {it.title}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* <!-- Card Footer --> */}
        <div className="text-start px-4 pb-3  ">
          <Link
            href={`/search?category=${banner.category}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {banner.subtitle || "Ona zaidi"}{" "}
            <i data-feather="chevron-right" className="inline w-4 h-4"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}
//   return (
//     <div className=" my-10 relative grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 w-full ">
//       <div className=" p-2 flex flex-col bg-gray-100 shadow-md">
//         <h2 className="font-semibold pt-2 pb-2">{banner.title}</h2>
//         <div className=" gap-2 grid grid-cols-2 sm:grid-cols-2  lg:grid-cols-2 md:gap-4 ">
//           {items.map((it) => (
//             <div key={it.id} className="flex flex-col items-center">
//               <Link key={it.id} href={it.link || ""}>
//                 <div className="w-full aspect-square">
//                   <Image
//                     src={it.image || ""}
//                     alt={it.title || ""}
//                     className="w-full h-full object-cover"
//                     width={300}
//                     height={300}
//                   />
//                 </div>
//                 <div className="pt-1 w-full text-start">
//                   <p className=" text-[11px]text-gray-800 truncate">
//                     {it.title || ""}
//                   </p>
//                 </div>
//               </Link>
//             </div>
//           ))}
//         </div>

//         <Link href={"#"} className="text-blue-600 pt-4 pb-2">
//           {banner.subtitle || "Ona zaidi"}
//         </Link>
//       </div>
//     </div>
//   );
// }
