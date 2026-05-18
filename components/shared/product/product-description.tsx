"use client";

import DOMPurify from "dompurify";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ProductDescriptionProps {
  description: string;
}

const ProductDescription = ({ description }: ProductDescriptionProps) => {
  const [descExpanded, setDescExpanded] = useState(false);

  const cleanDescription = description || "";
  const isLongDescription = cleanDescription.length > MAX_DESCRIPTION_LENGTH;

  // Split string safely if threshold constraints apply
  const shownDescription = descExpanded
    ? cleanDescription
    : cleanDescription.slice(0, MAX_DESCRIPTION_LENGTH) +
      (isLongDescription ? "..." : "");

  const sanitizedDescription =
    typeof window !== "undefined"
      ? DOMPurify.sanitize(shownDescription)
      : shownDescription;

  return (
    <div className="w-full space-y-2">
      {/* Sanitize and inject HTML strings safely */}
      <div
        className="text-xs sm:text-sm text-slate-600 leading-relaxed tracking-wide font-normal [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_p]:mb-1.5 break-words"
        dangerouslySetInnerHTML={{
          __html:
            sanitizedDescription ||
            "<p class='text-slate-400 italic text-xs'>Hakuna maelezo ya ziada yaliyowekwa.</p>",
        }}
      />

      {/* 🟢 Premium Swahili text expansion actionable control button grid element */}
      {isLongDescription && (
        <button
          type="button"
          onClick={() => setDescExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 active:opacity-80 pt-0.5 border-b border-transparent hover:border-blue-600 transition-all"
        >
          {descExpanded ? (
            <>
              Ona Chache <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Ona Zaidi <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ProductDescription;
