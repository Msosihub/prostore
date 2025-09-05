import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProductBySlug } from "@/lib/actions/product.actions";
import { notFound } from "next/navigation";
// import ProductPrice from "@/components/shared/product/product-price";
import ProductImages from "@/components/shared/product/product-images";
import AddToCart from "@/components/shared/product/add-to-cart";
import { getMyCart } from "@/lib/actions/cart.actions";
import ReviewList from "./review-list";
import { auth } from "@/auth";
import Rating from "@/components/shared/product/rating";
import RelatedProducts from "@/components/shared/product/related-products";
import ProductDescription from "@/components/shared/product/product-description";
import PricingTable from "@/components/shared/product/pricing-table";
import SupplierProfileCard from "@/components/shared/supplier/supplier-profile-card";
import ProductClientActions from "@/components/product-action";
import NoInternet from "@/components/shared/general/no-internet";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import SkeletonProduct from "@/components/shared/product/skeleton-product";
import ProductDescriptionSkeleton from "@/components/skeletons/skeleton-product-description";

// Re-generate product pages every 60 seconds (fro ISR)
export const revalidate = 60;

const ProductDetailsPagez = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;
  const product = await getProductBySlug(id);

  const safeCartData = await getMyCart();

  if (!product) return notFound(); //product Not Found
  if (product === null) return <NoInternet />; // DB/server/network issue

  const session = await auth();
  const userId = session?.user?.id;

  return (
    <>
      {/* Product Section */}
      <section className="px-4 py-6 sm:px-6 lg:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-8 lg:gap-4">
          {/* Images Column */}
          <div className="lg:col-span-3">
            <ProductImages images={product.images} />
          </div>

          {/* Details Column */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 truncate">
                {product.brand?.name ?? ""} · {product.category?.name_en ?? ""}
              </p>
              <h1
                className="text-2xl sm:text-3xl font-bold text-gray-800"
                title={product.name}
              >
                {product.name}
              </h1>
              <div className="flex flex-row gap-2 items-center">
                <Rating value={Number(product.rating)} />
                <p className="text-sm text-zinc-600">
                  {Number(product?.rating)}/5
                </p>
                <p className="text-sm text-gray-600">
                  (maoni {product?.numReviews})
                </p>
              </div>
            </div>

            <PricingTable
              tiers={product.pricingTiers}
              fallbackPrice={product.price}
            />

            <ProductDescription description={product.description} />

            {/* //Share & Save
      <div className="flex gap-3 pt-4">
        <Button variant="outline" size="sm" onClick={() => {}}>
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={() => {}}>
          Save
        </Button>
      </div>*/}
          </div>

          {/* Action Column */}
          <div className="w-full lg:col-span-2">
            <Card className="shadow-md min-w-[180px]">
              <CardContent className="p-2 space-y-4">
                <PricingTable
                  tiers={product.pricingTiers}
                  fallbackPrice={product.price}
                />

                <div className="flex justify-between items-center text-sm text-gray-700">
                  <span className="truncate">Status</span>
                  {product.stock > 0 ? (
                    <Badge variant="outline">In Stock</Badge>
                  ) : (
                    <Badge variant="destructive">Out Of Stock</Badge>
                  )}
                </div>
                {product.stock > 0 && (
                  <div className="pt-2 space-y-2">
                    <AddToCart
                      cart={safeCartData}
                      item={{
                        productId: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        qty: 1,
                        image: product.images![0],
                      }}
                    />
                    {/* <Button
                variant="default"
                className="w-full"
                // onClick={() => {
                //   // TODO: configure direct checkout logic
                //   console.log("Buy Now clicked");
                // }}
              >
                Buy Now
              </Button> */}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="px-4 py-6 sm:px-6 lg:px-12">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
          Customer Reviews
        </h2>
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <ReviewList
            userId={userId || ""}
            productId={product.id}
            productSlug={product.slug}
          />
        </Suspense>
      </section>

      <SupplierProfileCard
        supplier={{
          ...product.supplier,
          logo: product.supplier.logo ?? undefined,
          rating: Number(product.supplier.rating),
        }}
      />

      {/* Related Products */}
      <section className="px-4 py-6 sm:px-6 lg:px-12">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
          Zaidi katika {product.category?.name_en ?? ""}
        </h2>
        <Suspense fallback={<SkeletonProduct />}>
          <RelatedProducts
            categoryId={product.categoryId}
            excludeSlug={product.slug}
          />
        </Suspense>
      </section>
      {console.log("ProductId Passed to Buttons", product.id)}
      <ProductClientActions
        buyerId={session?.user?.id || ""}
        supplierId={product?.supplierId || ""}
        supplierUserId={product?.supplier?.userId || ""}
        productId={product.id}
      />
    </>
  );
};

export default function ProductDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ProductDescriptionSkeleton />}>
      <ProductDetailsPagez {...props} />
    </Suspense>
  );
}
