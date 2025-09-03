import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import ProductPrice from "./product-price";
import StockBadge from "./stock-badge";
import Rating from "./rating";
import { Decimal } from "@prisma/client/runtime/library";
// import { Product } from "@/types";

type ProductCardProps = {
  product: {
    slug: string;
    name: string;
    brand: string;
    category: string;
    subcategory: string;
    supplier: string;
    images: string[];
    price: number;
    stock: number;
    pricingTiers?:
      | {
          minQty: number;
          price: Decimal;
        }[]
      | undefined;
  };
};

const ProductCard = ({ product }: ProductCardProps) => {
  const {
    slug,
    name,
    brand,
    category,
    subcategory,
    supplier,
    images,
    price,
    stock,
    pricingTiers,
  } = product;

  const middleTier =
    pricingTiers && pricingTiers.length >= 2
      ? pricingTiers[Math.floor(pricingTiers.length / 2)]
      : null;

  //console.log("Product Card:", product);

  return (
    <Card className="w-full max-w-sm overflow-hidden group transition-shadow hover:shadow-lg border border-transparent hover:border-gray-200">
      <CardHeader className="p-0 items-center">
        <Link href={`/product/${slug}`}>
          <Image
            src={images?.[0] || "null"}
            alt={name}
            height={300}
            width={300}
            priority
            className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
      </CardHeader>

      <CardContent className="p-0 sm:p-4 grid gap-1 sm:gap-2 text-xs sm:text-sm">
        <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">
          {brand} • {category} • {subcategory}
        </div>

        <Link href={`/product/${slug}`}>
          <h2 className="font-medium text-sm sm:text-base md:text-lg line-clamp-2">
            {name}
          </h2>
        </Link>

        <div className="text-[11px] sm:text-xs text-muted-foreground">
          Supplied by: <span className="font-medium">{supplier}</span>
        </div>

        <div className="flex flex-col gap-1 sm:gap-2 mt-1">
          <div className="flex items-center space-x-2 text-[11px] sm:text-xs md:text-sm">
            <div className="scale-90 sm:scale-100">
              <Rating value={4.5} />
              {/** Replace with actual rating */}
            </div>
          </div>

          <div className="text-sm sm:text-base md:text-lg font-semibold">
            {stock > 0 ? (
              <ProductPrice
                value={middleTier ? Number(middleTier.price) : price}
                original={middleTier ? price : undefined}
                label={middleTier ? `${middleTier.minQty}+ pcs` : undefined}
              />
            ) : (
              <p className="text-destructive">Out of Stock</p>
            )}
          </div>

          {stock > 0 && <StockBadge stock={stock} />}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
