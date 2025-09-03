import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SkeletonProduct = () => {
  return (
    <Card className="w-full max-w-sm overflow-hidden border border-muted">
      <CardHeader className="p-0">
        <Skeleton className="h-[300px] w-full" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 grid gap-2 text-xs sm:text-sm">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
      </CardContent>
    </Card>
  );
};

export default SkeletonProduct;
