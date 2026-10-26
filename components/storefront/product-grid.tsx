import ProductCard from "@/components/shared/product/product-card";
import type { StorefrontProduct } from "@/lib/storefront";
export default function ProductGrid({
  products,
}: {
  products: StorefrontProduct[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          id={p.id}
          name={p.name}
          slug={p.slug}
          price={Number(p.price)}
          stock={p.stock}
          images={p.images}
          brand={p.brand.name}
          category={p.category.name_sw || p.category.name_en}
          subcategory={p.subcategory.name_sw || p.subcategory.name_en}
          supplier={p.supplier.companyName || p.supplier.name}
          pricingTiers={p.pricingTiers}
        />
      ))}
    </div>
  );
}
