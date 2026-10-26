"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";

export default function Search() {
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery === "all" ? "" : urlQuery);

  useEffect(() => {
    setQuery(urlQuery === "all" ? "" : urlQuery);
  }, [urlQuery]);

  return (
    <form role="search" aria-label="Tafuta bidhaa" action="/search" method="get" className="w-full max-w-3xl mx-auto">
      <div className="relative flex items-center w-full bg-slate-50 border border-slate-300 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all duration-200">
        <Input
          name="q"
          value={query}
          aria-label="Tafuta bidhaa"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tafuta bidhaa au aina ya bidhaa…"
          className="w-full h-12 pl-4 pr-14 text-sm font-medium bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 text-slate-800"
        />

        {/* Absolute floating actionable button trigger matches Alibaba aesthetic bounds */}
        <Button
          type="submit"
          aria-label="Tafuta"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg bg-orange-600 hover:bg-orange-700 text-white p-0 flex items-center justify-center transition-colors shrink-0"
        >
          <SearchIcon className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
