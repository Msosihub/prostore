"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { formUrlQuery } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number | string;
  totalPages: number;
  urlParamName?: string;
};

export default function Pagination({
  page,
  totalPages,
  urlParamName,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = (btnType: string) => {
    const pageValue = btnType === "next" ? Number(page) + 1 : Number(page) - 1;
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: urlParamName || "page",
      value: pageValue.toString(),
    });

    router.push(newUrl);
  };

  return (
    <div className="flex items-center gap-2 select-none">
      <Button
        size="sm"
        variant="outline"
        disabled={Number(page) <= 1}
        onClick={() => handleClick("prev")}
        className="h-9 rounded-xl text-xs font-semibold px-3 border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 min-w-[100px]"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Iliyotangulia
      </Button>

      <span className="text-xs font-bold text-slate-500 px-2 min-w-[40px] text-center">
        {page} / {totalPages}
      </span>

      <Button
        size="sm"
        variant="outline"
        disabled={Number(page) >= totalPages}
        onClick={() => handleClick("next")}
        className="h-9 rounded-xl text-xs font-semibold px-3 border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 min-w-[100px] justify-center"
      >
        Inayofuata
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
