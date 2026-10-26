"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
};

const Pagination = ({ currentPage, totalPages }: PaginationProps) => {
  const searchParams = useSearchParams();

  const pageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `/search?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  const getVisiblePages = (): (number | "...")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];

    if (currentPage <= 3) {
      pages.push(1, 2, 3, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav aria-label="Kurasa za bidhaa" className="flex flex-wrap justify-center items-center gap-2 mt-6">
      <Button
        variant="outline"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? <a href={pageUrl(currentPage - 1)}>Nyuma</a> : "Nyuma"}
      </Button>

      {visiblePages.map((page, idx) =>
        page === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-slate-500 text-sm">
            ...
          </span>
        ) : (
          <Button
            key={`page-${page}`}
            aria-label={`Ukurasa ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            variant={page === currentPage ? "default" : "outline"}
            asChild
          >
            <a href={pageUrl(page)}>{page}</a>
          </Button>
        )
      )}

      <Button
        variant="outline"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? <a href={pageUrl(currentPage + 1)}>Mbele</a> : "Mbele"}
      </Button>
    </nav>
  );
};

export default Pagination;
