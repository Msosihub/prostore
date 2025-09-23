"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Input } from "../ui/input";

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
    <form action={formActionUrl} method="GET">
      <div className="flex w-full  items-center space-x-2">
        <div className="flex-grow">
          <Input
            type="search"
            placeholder="Tafuta..."
            name="query"
            value={queryValue}
            onChange={(e) => setQueryValue(e.target.value)}
            className="w-full  transition-all duration-300"
          />
        </div>
        <button className="sr-only" type="submit">
          Tafuta
        </button>
      </div>
    </form>
  );
};

export default SupplierSearch;
