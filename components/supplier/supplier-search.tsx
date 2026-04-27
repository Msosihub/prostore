"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Input } from "../ui/input";
import {
  Search,
  // SlidersHorizontal
} from "lucide-react";

const SupplierSearch = () => {
  const pathname = usePathname();
  const formActionUrl = pathname.includes("/supplier/orders")
    ? "/supplier/orders"
    : pathname.includes("/supplier/users")
      ? "/supplier/users"
      : "/supplier/products";

  const searchParams = useSearchParams();
  const [queryValue, setQueryValue] = useState(searchParams.get("query") || "");

  useEffect(() => {
    setQueryValue(searchParams.get("query") || "");
  }, [searchParams]);

  return (
    <form action={formActionUrl} method="GET" className="w-full">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Tafuta..."
            name="query"
            value={queryValue}
            onChange={(e) => setQueryValue(e.target.value)}
            className="w-full pl-9 bg-gray-100 border-none h-10 rounded-xl focus-visible:ring-1"
          />
        </div>
        {/* The Filter Icon button */}
        <button
          type="button"
          className="p-2 bg-gray-100 rounded-xl text-gray-600 active:bg-gray-200"
        >
          {/* <SlidersHorizontal className="w-5 h-5" /> */}
        </button>
        <button className="sr-only" type="submit">
          Tafuta
        </button>
      </div>
    </form>
  );
};

export default SupplierSearch;
