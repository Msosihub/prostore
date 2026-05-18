import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
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
  pricingTiers?: {
    minQty: number;
    price: Decimal;
  }[];
};

const ProductCardNoText = ({ id, name, images }: ProductCardProps) => {
  return (
    <Card className="w-full bg-white rounded-xl shadow-sm overflow-hidden group transition-all duration-300 hover:shadow-md border border-slate-100 hover:border-slate-200">
      {/* 🟢 Aspect Square container matching standard ProductCard layout dimensions */}
      <div className="relative w-full aspect-square overflow-hidden bg-slate-50">
        <Link href={`/product/${id}`} className="block w-full h-full">
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
    </Card>
  );
};

export default ProductCardNoText;
