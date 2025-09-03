import { cn } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/library";

type ProductPriceProps = {
  value: Decimal | number;
  original?: Decimal | number; // Optional: strike-through anchor price
  label?: string; // Optional: e.g. "5+ pcs"
  className?: string; // Optional: for layout control
};

const ProductPrice = ({
  value,
  original,
  label,
  className,
}: ProductPriceProps) => {
  const format = (val: Decimal | number) =>
    `TSh ${val.toLocaleString("en-TZ", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {original && (
        <span className="text-xs sm:text-sm md:text-base line-through text-gray-400">
          {format(original)}
        </span>
      )}
      <span className="ml-auto text-xs sm:text-sm md:text-base font-semibold text-gray-800">
        {format(value)}
      </span>
      {label && (
        <span className="text-xs text-muted-foreground">({label})</span>
      )}
    </div>
  );
};

export default ProductPrice;
