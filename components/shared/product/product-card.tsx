import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import ProductPrice from "./product-price";
import StockBadge from "./stock-badge";
import { Decimal } from "@prisma/client/runtime/library";
import { productPath, unitPrice } from "@/lib/storefront-seo";
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
  pricingTiers?: { minQty: number; price: Decimal }[];
};
export default function ProductCard({
  name,
  brand,
  category,
  supplier,
  images,
  slug,
  price,
  stock,
  pricingTiers,
}: ProductCardProps) {
  const bulk = pricingTiers
    ?.filter((t) => t.minQty > 1 && t.minQty <= stock && Number(t.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price))[0];
  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-emerald-700 hover:shadow-md">
      <Link
        href={productPath(slug)}
        className="relative block aspect-square bg-[#f6f6f2]"
        tabIndex={-1}
        aria-hidden="true"
      >
        {images?.[0] ? (
          <Image
            src={images[0]}
            alt=""
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Package size={40} />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div>
          <p className="truncate text-[11px] text-slate-500">
            {[brand, category].filter(Boolean).join(" · ")}
          </p>
          <Link
            href={productPath(slug)}
            className="mt-2 block text-sm font-semibold leading-snug text-slate-900 hover:text-emerald-800 sm:text-base"
          >
            <h3 className="line-clamp-2 min-h-10">{name}</h3>
          </Link>
          <p className="mt-2 truncate text-xs text-slate-500">
            Muuzaji: {supplier}
          </p>
        </div>
        <div className="mt-auto space-y-2">
          <ProductPrice value={unitPrice({ price, pricingTiers })} />
          {bulk && (
            <p className="text-xs text-slate-600">
              TSh{" "}
              {Number(bulk.price).toLocaleString("en-TZ", {
                maximumFractionDigits: 2,
              })}{" "}
              / bidhaa ukiagiza {bulk.minQty} pcs
            </p>
          )}
          {stock > 0 ? (
            <StockBadge stock={stock} />
          ) : (
            <p className="text-xs font-medium text-slate-500">
              Zimeisha kwa sasa
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
