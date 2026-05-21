import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import ProductPrice from "./product-price";
import StockBadge from "./stock-badge";
import Rating from "./rating";
import { Decimal } from "@prisma/client/runtime/library";

type ProductCardProps = {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  supplier: string;
  images: string[];
  price: number;
  stock: number;
  slug: string;
  pricingTiers?: {
    minQty: number;
    price: Decimal;
  }[];
};

const ProductCard = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id,
  name,
  brand,
  category,
  subcategory,
  supplier,
  images,
  slug,
  price,
  stock,
  pricingTiers,
}: ProductCardProps) => {
  // Extract intermediate bulk wholesale calculations
  const middleTier =
    pricingTiers && pricingTiers.length >= 2
      ? pricingTiers[Math.floor(pricingTiers.length / 2)]
      : null;

  return (
    <Card className="w-full bg-white rounded-xl shadow-sm overflow-hidden group transition-all duration-300 hover:shadow-md border border-slate-100 hover:border-slate-200 flex flex-col h-full">
      {/* Product Image Wrapper - Fixed Aspect Ratio ensures consistent grids */}
      <div className="relative w-full aspect-square overflow-hidden bg-slate-50 border-b border-slate-50 shrink-0">
        <Link href={`/product/${slug}`} className="block w-full h-full">
          <Image
            src={images?.[0] || "/images/sample-products/p3-1.jpg"}
            alt={name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 250px"
            priority={false}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </Link>
      </div>

      {/* Item Body Metrics Container */}
      <CardContent className="p-2.5 flex flex-col justify-between flex-grow gap-1">
        <div className="space-y-1">
          {/* Metadata Path Tags */}
          <div className="text-[10px] md:text-xs text-slate-400 font-medium tracking-tight truncate">
            {brand && `${brand} • `}
            {category} • {subcategory}
          </div>

          {/* Item Core Name */}
          <Link
            href={`/product/${slug}`}
            className="block group-hover:text-orange-600 transition-colors"
          >
            <h3 className="font-semibold text-xs sm:text-sm text-slate-800 tracking-tight leading-tight line-clamp-2 h-8 sm:h-9">
              {name}
            </h3>
          </Link>

          {/* Wholesaler Label */}
          <div className="text-[10px] sm:text-xs text-slate-500 truncate">
            Muuzaji:{" "}
            <span className="font-semibold text-slate-700">{supplier}</span>
          </div>
        </div>

        {/* Dynamic Pricing Matrix Blocks */}
        <div className="space-y-1.5 pt-1 mt-auto">
          {/* Rating Block (Scaled down appropriately for dense styling) */}
          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
            <Rating value={4.5} />
            <span className="text-slate-400 font-normal text-[9px] pt-0.5">
              (12)
            </span>
          </div>

          {/* Price Layout Element Layer */}
          <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-baseline">
            {stock > 0 ? (
              <ProductPrice
                value={middleTier ? Number(middleTier.price) : price}
                original={middleTier ? price : undefined}
                label={middleTier ? `${middleTier.minQty}+ pcs` : undefined}
              />
            ) : (
              <span className="text-rose-600 font-bold text-xs sm:text-sm bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                Zimeisha
              </span>
            )}
          </div>

          {/* Availability Badge */}
          {stock > 0 && (
            <div className="pt-0.5 transform scale-95 origin-left">
              <StockBadge stock={stock} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
