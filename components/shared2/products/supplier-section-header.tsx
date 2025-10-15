import { Supplier } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Calendar, MapPin, Star } from "lucide-react";
// import Image from "next/image";

const SupplierHeader = ({ supplier }: { supplier: Supplier }) => {
  supplier = {
    ...supplier,
    rating: supplier.rating ? Number(supplier.rating) : 0,
  };
  return (
    <div className="px-0 ">
      <div className="flex flex-row md:flex-row items-center">
        <div className="relative ">
          <Link href={`/company/${supplier.id}/home`}>
            <Image
              width={100}
              height={100}
              id="supplier-logo"
              src={supplier.logo || "/images/logo.svg"}
              alt="Supplier Logo"
              className="w-16 h-16  rounded-sm border-1 border-white bg-white object-cover overflow-hidden shadow-md items-center"
            />
          </Link>
        </div>
        {/* <!-- Supplier Details --> */}
        <div className="text-left flex-1 ml-2">
          <div className="">
            <Link href={`/company/${supplier.id}/home`}>
              <h1
                id="supplier-name"
                className="text-base font-bold text-gray-900 underline line-clamp-2"
              >
                {supplier.companyName}
              </h1>
            </Link>
          </div>
          <div className="flex flex-row items-center gap-2">
            <p
              id="supplier-tagline"
              className="text-xs md:text-sm  text-gray-600 "
            >
              {supplier.username}
            </p>
            <div className="flex flex-row gap-1">
              <BadgeCheck className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
              <span
                id="supplier-label"
                className="justify-start text-green-500 text-xs md:text-sm font-medium rounded-full"
              >
                Verified Supplier
              </span>
            </div>
          </div>

          <div className="flex flex-wrap  items-center justify-start mt-1 gap-1 md:gap-2">
            <div className="flex items-center text-xs md:text-sm text-gray-500">
              <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              <span id="supplier-location">
                {supplier.nation}, {supplier?.location || ""}
              </span>
            </div>
            <div className="flex items-center text-xs md:text-sm text-gray-500 ml-2 md:ml-4">
              <Star className="w-3 h-3 md:w-4 md:h-4 mr-1 text-yellow-500 fill-yellow-500" />
              <span id="supplier-rating">{supplier?.rating.toFixed(1)}</span>
              <span className="hidden md:block text-gray-400 ml-1">
                (maoni 128)
              </span>
            </div>
            <div className="flex items-center text-xs md:text-sm text-gray-500 ml-2 md:ml-4">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1 " />
              <span id="supplier-years">{supplier.yearsActive}+ yrs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierHeader;
