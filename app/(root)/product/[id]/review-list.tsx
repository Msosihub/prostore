"use client";

import { useState } from "react";
import useSWR from "swr";
import { Review } from "@/types";
import Link from "next/link";
import ReviewForm from "./review-form";
import {
  Calendar,
  Loader2,
  User,
  // CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import Rating from "@/components/shared/product/rating";
import {
  INITIAL_COUNT_COMMENT,
  MAX_DESCRIPTION_LENGTH_COMMENT,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ReviewListProps {
  userId: string;
  productId: string;
  productSlug: string;
}

const ReviewList = ({ userId, productId }: ReviewListProps) => {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  const {
    data: reviews,
    mutate,
    error,
    isLoading,
  } = useSWR<Review[]>(`/api/reviews/${productId}`, fetcher, {
    refreshInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400 font-medium">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        <span>Tunasoma maoni...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-center text-rose-500 py-4">
        Imeshindikana kusoma maoni.
      </div>
    );
  }

  const handleReviewSubmitted = async () => {
    await mutate();
  };

  const hasNoReviews = !reviews || reviews.length === 0;
  const visibleReviews = reviews
    ? showAll
      ? reviews
      : reviews.slice(0, INITIAL_COUNT_COMMENT)
    : [];

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full space-y-6">
      {/* 🟢 STEP 1: AUTHENTICATION CONDITIONAL FLOW (Direct Input Authorization) */}
      <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 sm:p-4">
        {userId ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Andika Maoni Yako
            </h3>
            <ReviewForm
              userId={userId}
              productId={productId}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed text-center py-1 font-medium">
            Tafadhali
            <Link
              className="text-orange-600 font-bold hover:underline mx-1"
              href={`/sign-in?callbackUrl=/product/${productId}`}
            >
              Ingia / Jisajili hapa
            </Link>
            ili uweze kuandika maoni yako kuhusu bidhaa hii.
          </p>
        )}
      </div>

      {/* 🟢 STEP 2: TIMELINE LIST FEEDBACK BLOCK */}
      {hasNoReviews ? (
        <div className="text-center py-6 border border-dashed rounded-xl bg-slate-50/40">
          <p className="text-xs text-slate-400 italic">
            Hakuna maoni yaliyowekwa kwenye bidhaa hii bado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {visibleReviews.map((review) => {
            const isLong =
              review.description.length > MAX_DESCRIPTION_LENGTH_COMMENT;
            const isExpanded = expanded[review.id];

            return (
              <div
                key={review.id}
                className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  {/* Meta User Row Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate max-w-[120px] sm:max-w-xs">
                        {review.user ? review.user.name : "Mteja wetu"}
                      </span>

                      {/* 🟢 VERIFIED PURCHASE TRUST EMBLEM LINK
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 uppercase tracking-tight scale-90 origin-left shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 fill-emerald-50" />
                          Mnunuzi Halisi
                        </span>
                      )} */}
                    </div>

                    {/* Accurate Localized East Africa Time Stamp Display */}
                    <div className="flex items-center text-[10px] text-slate-400 font-medium shrink-0">
                      <Calendar className="mr-1 h-3 w-3 text-slate-300" />
                      {formatDateTime(review.createdAt).dateOnly}
                    </div>
                  </div>

                  {/* Rating Block */}
                  <div className="transform scale-90 origin-left">
                    <Rating value={review.rating} />
                  </div>

                  {/* Text Comment Narrative Summary Paragraph */}
                  <p className="text-xs text-slate-600 leading-relaxed font-normal break-words">
                    {isLong && !isExpanded
                      ? review.description.slice(
                          0,
                          MAX_DESCRIPTION_LENGTH_COMMENT
                        ) + "..."
                      : review.description}
                  </p>
                </div>

                {/* Swahili read-more action link button context */}
                {isLong && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 active:opacity-70 flex items-center gap-0.5 mt-1 w-fit"
                    onClick={() => toggleExpand(review.id)}
                  >
                    {isExpanded ? (
                      <>
                        Ona kidogo <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        Ona zaidi{" "}
                        <ChevronDown className="w-3 h-3 animate-pulse" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🟢 STEP 3: COLLAPSIBLE LIST CONTROL ACTION STRIP */}
      {!hasNoReviews && reviews.length > INITIAL_COUNT_COMMENT && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold rounded-lg px-4 border-slate-200 text-slate-700 flex items-center gap-1 shadow-sm"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? (
              <>
                Ona kidogo <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              </>
            ) : (
              <>
                Ona zaidi yote ({reviews.length}){" "}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
