// components/shared/product/product-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDescriptionSkeleton() {
  return (
    <section className="px-4 py-6 sm:px-6 lg:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-8 lg:gap-4">
        {/* Image skeleton */}
        <div className="lg:col-span-3">
          <Skeleton className="w-full h-80 rounded-xl" />
        </div>

        {/* Details skeleton */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-20 w-full" />
        </div>

        {/* Action skeleton */}
        <div className="lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </section>
  );
}
