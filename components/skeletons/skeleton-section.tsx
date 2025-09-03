import { Skeleton } from "@/components/ui/skeleton";

export default function SectionSkeleton() {
  return (
    <div className="my-10 space-y-4">
      <Skeleton className="h-8 w-1/3 mx-auto" />
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
