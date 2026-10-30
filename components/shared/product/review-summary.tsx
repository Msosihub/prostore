import Rating from "./rating";

export default function ReviewSummary({ rating, numReviews }: {
  rating?: number;
  numReviews?: number;
}) {
  if (numReviews === 0) {
    return <p className="text-xs text-slate-500">Bado hakuna maoni</p>;
  }
  if (!Number.isSafeInteger(numReviews) || !numReviews || numReviews < 0 ||
      typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return <p className="text-xs text-slate-500">Maoni hayajapatikana</p>;
  }
  const average = rating.toFixed(1);
  return (
    <div role="img" aria-label={`Maoni ${numReviews}: ${average} kati ya 5`} className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true"><Rating value={rating} /></span>
      <span aria-hidden="true" className="text-xs font-semibold text-slate-700">{average}/5</span>
      <span aria-hidden="true" className="text-xs text-slate-500">(Maoni {numReviews})</span>
    </div>
  );
}
