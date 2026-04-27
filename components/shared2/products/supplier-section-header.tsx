"use client";
import { useState } from "react";
import { Supplier } from "@/types";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  Calendar,
  MapPin,
  Star,
  UserPlus,
  UserCheck,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SupplierHeader = ({ supplier }: { supplier: Supplier }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const rating = supplier.rating ? Number(supplier.rating) : 0;

  return (
    <div className="px-3 py-3 md:px-5 md:py-5 border-b border-gray-50 md:border-none">
      <div className="flex items-center justify-between gap-4">
        {/* LEFT: Info Section */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Link
            href={`/company/${supplier.id}/home`}
            className="flex-none group"
          >
            <div className="relative">
              <Image
                width={80}
                height={80}
                src={supplier.logo || "/images/logo.svg"}
                alt={supplier.companyName || ""}
                className="w-12 h-12 md:w-16 md:h-16 rounded-xl border border-gray-100 bg-white object-cover shadow-sm group-hover:shadow-md transition-shadow"
              />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 md:hidden">
                <BadgeCheck className="w-4 h-4 text-green-500 fill-white" />
              </div>
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/company/${supplier.id}/home`}>
                <h1 className="text-[15px] md:text-xl font-bold text-gray-900 leading-tight hover:text-blue-600 transition-colors truncate">
                  {supplier.companyName}
                </h1>
              </Link>
              <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold uppercase tracking-wide">
                <BadgeCheck className="w-3 h-3" />
                Verified
              </div>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs md:text-sm font-medium text-gray-500">
                @{supplier.username}
              </span>
              <div className="flex md:hidden items-center text-green-600">
                <BadgeCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-center mt-1.5 gap-x-3 gap-y-1 flex-wrap">
              <div className="flex items-center text-[11px] md:text-[13px] text-gray-500">
                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                <span className="truncate max-w-[80px] md:max-w-none">
                  {supplier.nation}
                </span>
              </div>
              <div className="flex items-center text-[11px] md:text-[13px] text-gray-500">
                <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-gray-700">
                  {rating.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center text-[11px] md:text-[13px] text-gray-500">
                <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                <span>{supplier.yearsActive}+ yrs</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Action Section */}
        <div className="flex-none">
          {/* Desktop Button: Text-based */}
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={() => setIsFollowing(!isFollowing)}
            className={`hidden md:flex items-center gap-2 rounded-full px-5 h-10 transition-all ${
              isFollowing
                ? "border-blue-200 text-blue-600 bg-blue-50"
                : "bg-blue-600 hover:bg-blue-700 shadow-sm"
            }`}
          >
            {isFollowing ? (
              <>
                <UserCheck className="w-4 h-4" /> Following
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Follow
              </>
            )}
          </Button>

          {/* Mobile Button: Icon-based (Like Heart or Save) */}
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`md:hidden p-2.5 rounded-full transition-colors ${
              isFollowing
                ? "bg-red-50 text-red-500"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            <Heart className={`w-5 h-5 ${isFollowing ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierHeader;

// import { Supplier } from "@/types";
// import Link from "next/link";
// import Image from "next/image";
// import { BadgeCheck, Calendar, MapPin, Star } from "lucide-react";
// // import Image from "next/image";

// const SupplierHeader = ({ supplier }: { supplier: Supplier }) => {
//   supplier = {
//     ...supplier,
//     rating: supplier.rating ? Number(supplier.rating) : 0,
//   };
//   return (
//     <div className="px-0 rounded-t-sm">
//       <div className="flex flex-row md:flex-row items-center">
//         <div className="relative ">
//           <Link href={`/company/${supplier.id}/home`}>
//             <Image
//               width={100}
//               height={100}
//               id="supplier-logo"
//               src={supplier.logo || "/images/logo.svg"}
//               alt="Supplier Logo"
//               className="w-10 h-10 md:w-16 md:h-16  rounded-sm border-1 border-white bg-white object-cover overflow-hidden shadow-md items-center"
//             />
//           </Link>
//         </div>
//         {/* <!-- Supplier Details --> */}
//         <div className="text-left flex-1 ml-2">
//           <div className="">
//             <Link href={`/company/${supplier.id}/home`}>
//               <h1
//                 id="supplier-name"
//                 className="text-base font-bold text-gray-900 underline line-clamp-2"
//               >
//                 {supplier.companyName}
//               </h1>
//             </Link>
//           </div>
//           <div className="flex flex-row items-center gap-2">
//             <p
//               id="supplier-tagline"
//               className="text-xs md:text-sm  text-gray-600 "
//             >
//               {supplier.username}
//             </p>
//             <div className="flex flex-row gap-1">
//               <BadgeCheck className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
//               <span
//                 id="supplier-label"
//                 className="justify-start text-green-500 text-xs md:text-sm font-medium rounded-full"
//               >
//                 Verified Supplier
//               </span>
//             </div>
//           </div>

//           <div className="flex flex-wrap  items-center justify-start mt-1 gap-1 md:gap-2">
//             <div className="flex items-center text-xs md:text-sm text-gray-500">
//               <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1" />
//               <span id="supplier-location">
//                 {supplier.nation}, {supplier?.location || ""}
//               </span>
//             </div>
//             <div className="flex items-center text-xs md:text-sm text-gray-500 ml-2 md:ml-4">
//               <Star className="w-3 h-3 md:w-4 md:h-4 mr-1 text-yellow-500 fill-yellow-500" />
//               <span id="supplier-rating">{supplier?.rating.toFixed(1)}</span>
//               <span className="hidden md:block text-gray-400 ml-1">
//                 (maoni 128)
//               </span>
//             </div>
//             <div className="flex items-center text-xs md:text-sm text-gray-500 ml-2 md:ml-4">
//               <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1 " />
//               <span id="supplier-years">{supplier.yearsActive}+ yrs</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SupplierHeader;
