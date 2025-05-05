import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import ProductPrice from "./product-price";
import { Product } from "@/types";
import Rating from "./rating";

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <>
      <Card className="w-full max-w-sm overflow-hidden">
        <CardHeader className="p-0 items-center">
          <Link href={`/product/${product.slug}`}>
            <Image
              src={product.images[0]}
              alt={product.name}
              height={300}
              width={300}
              priority
              className="w-full object-cover"
            />
          </Link>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 grid gap-1 sm:gap-2 text-xs sm:text-sm">
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            {product.brand}
          </div>

          <Link href={`/product/${product.slug}`}>
            <h2 className="font-medium text-sm sm:text-base line-clamp-2">
              {product.name}
            </h2>
          </Link>

          <div className="flex flex-col gap-1 sm:gap-2">
            <div className="flex items-center space-x-2 text-[10px] sm:text-xs">
              <div className="scale-90 sm:scale-100">
                <Rating value={Number(product.rating)} />
              </div>
              {/* You may need to pass size if Rating supports it */}
            </div>

            <div className="text-sm sm:text-base font-semibold">
              {product.stock > 0 ? (
                <ProductPrice value={Number(product.price)} />
              ) : (
                <p className="text-destructive">Out of Stock</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default ProductCard;
