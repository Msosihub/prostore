"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
};

const Pagination = ({ currentPage, totalPages }: PaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/search?${params.toString()}`);
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
    <div className="flex justify-center items-center gap-2 mt-6">
      <Button
        variant="outline"
        disabled={currentPage <= 1}
        onClick={() => updatePage(currentPage - 1)}
      >
        Previous
      </Button>

      {visiblePages.map((page, idx) =>
        page === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted text-sm">
            ...
          </span>
        ) : (
          <Button
            key={`page-${page}`}
            variant={page === currentPage ? "default" : "outline"}
            onClick={() => updatePage(page)}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline"
        disabled={currentPage >= totalPages}
        onClick={() => updatePage(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
};

export default Pagination;
