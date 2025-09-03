"use client";

import { useState } from "react";
import useSWR from "swr";
import { Review } from "@/types";
import Link from "next/link";
import ReviewForm from "./review-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Loader, User } from "lucide-react";
import { formatDate2 } from "@/lib/utils";
import Rating from "@/components/shared/product/rating";
import {
  INITIAL_COUNT_COMMENT,
  MAX_DESCRIPTION_LENGTH_COMMENT,
} from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((res) => res.json()); //for swr cache

const ReviewList = ({
  userId,
  productId,
  productSlug,
}: {
  userId: string;
  productId: string;
  productSlug: string;
}) => {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  //using SWR tto call reviews with cache -I say this is a way to do every backend call
  const { data, mutate, error, isLoading } = useSWR<Review[]>(
    `/api/reviews/${productId}`,
    fetcher,
    { refreshInterval: 15000 } // auto-refresh every 15s
  );
  const reviews = data;

  if (isLoading)
    return (
      <div className="flex flec-row justify-center items-center gap-1">
        <Loader className="w-4 h-4 animate-spin" /> Loading . . .
      </div>
    );
  if (!reviews) return <Loader className="w-4 h-4 animate-spin" />;
  if (reviews.length === 0) return <>No reviews yet.</>;
  if (error) return <div>Failed to load reviews</div>;

  // useEffect(() => {
  //   const loadReviews = async () => {
  //     const res = await getReviews({ productId });
  //     setReviews(res.data);
  //   };
  //   loadReviews();
  // }, [productId]);

  // Called after a review is submitted
  const handleReviewSubmitted = async () => {
    // mutate((prev = []) => [newReview, ...prev], false); // update immediately
    await mutate(); // re-fetch reviews immediately
  };

  // Reload reviews after created or updated
  // const reload = async () => {
  //   const res = await getReviews({ productId });
  //   setReviews([...res.data]);
  // };

  // Only show the first 4 unless showAll is true
  const visibleReviews = showAll
    ? reviews
    : reviews.slice(0, INITIAL_COUNT_COMMENT);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  return (
    <div className="space-y-4">
      {reviews.length === 0 && <div>No reviews yet</div>}
      {userId ? (
        <ReviewForm
          userId={userId}
          productId={productId}
          onReviewSubmitted={handleReviewSubmitted}
        />
      ) : (
        <div>
          Tafadhali
          <Link
            className="text-blue-700 px-2"
            href={`/sign-in?callbackUrl=/product/${productSlug}`}
          >
            Jisajili
          </Link>
          kuandika maoni
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {visibleReviews.map((review) => {
          const isLong =
            review.description.length > MAX_DESCRIPTION_LENGTH_COMMENT;
          const isExpanded = expanded[review.id];
          return (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex-between">
                  <CardTitle
                    className="truncate max-w-full"
                    title={review.title}
                  >
                    {review.title}
                  </CardTitle>
                </div>
                <CardDescription>
                  {isLong && !isExpanded
                    ? review.description.slice(
                        0,
                        MAX_DESCRIPTION_LENGTH_COMMENT
                      ) + "..."
                    : review.description}
                  {isLong && (
                    <button
                      className="ml-2 text-blue-600 underline text-xs"
                      onClick={() => toggleExpand(review.id)}
                    >
                      {isExpanded ? "Ona kidogo" : "Ona zaidi"}
                    </button>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Rating value={review.rating} />
                <div className="flex space-x-4 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <User className="mr-1 h-3 w-3" />
                    {review.user ? review.user.name : "User"}
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-1 h-3 w-3" />
                    {formatDate2(review.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {reviews.length > INITIAL_COUNT_COMMENT && (
        <div className="flex justify-center">
          <button
            className="text-blue-600 underline text-sm"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Ona kidogo" : "Ona zaidi"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
