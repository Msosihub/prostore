import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getProductBySlug } from "@/lib/actions/product.actions";
import { notFound } from "next/navigation";
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
import ProductDescriptionSkeleton from "@/components/skeletons/skeleton-product-description";
import SkeletonProduct from "@/components/shared/product/skeleton-product";
import BuyNow from "@/components/shared/product/buy-now";
import { Metadata, ResolvingMetadata } from "next";
import { APP_NAME } from "@/lib/constants";
import ShareButton from "@/components/ShareButton";
// import { formatCurrency, formatDateTime } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductBySlug(id);

  console.log("abc: ", parent);

  const title = product?.name || "Bidhaa";
  const description =
    product?.description.slice(0, 100) ||
    `Angalia hii bidhaa kutoka ${APP_NAME}.`;
  const imageUrl = product?.images[0] || `https://ufs.sh`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

const ProductDetailsPagez = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;
  const product = await getProductBySlug(id);
  const safeCartData = await getMyCart();

  if (!product) return notFound();
  if (product === null) return <NoInternet />;

  const session = await auth();
  const userId = session?.user?.id;

  const cartItem = {
    productId: product.id,
    supplierId: product.supplierId,
    name: product.name,
    slug: product.slug,
    price: product.price,
    qty: 1,
    image: product.images![0],
  };

  const buyNowItem = {
    productId: product.id,
    name: product.name,
    price: product.price,
    qty: 1,
    image: product.images![0],
  };

  return (
    <div className="w-full pb-24 md:pb-12 space-y-6">
      {/* 🟢 SECTION 1: CORE PRODUCT GRID SUMMARY */}
      <section className="w-full px-2 py-4 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-8 lg:gap-8">
          {/* Media Images Display Block */}
          <div className="lg:col-span-3 w-full">
            <ProductImages images={product.images} />
          </div>

          {/* Descriptive Information Context Details Area */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate">
                  {product.brand?.name ?? ""} ·{" "}
                  {product.category?.name_en || product.category?.name_en || ""}
                </p>
                <ShareButton
                  title={product.name}
                  url={`https://nimboya.com{product.id}`}
                />
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-slate-900 leading-tight">
                {product.name}
              </h1>
              <div className="flex items-center gap-2">
                <Rating value={Number(product.rating)} />
                <p className="text-xs font-semibold text-slate-700 pt-0.5">
                  {Number(product?.rating).toFixed(1)}/5
                </p>
                <span className="text-slate-300 text-xs">|</span>
                <p className="text-xs text-slate-500 pt-0.5">
                  (Maoni {product?.numReviews})
                </p>
              </div>
            </div>

            {/* 🟢 PRICING TABLE POSITION */}
            <div className="border-y border-slate-100 py-3">
              <PricingTable
                tiers={product.pricingTiers}
                fallbackPrice={product.price}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Maelezo ya Bidhaa
              </h3>
              <ProductDescription description={product.description} />
            </div>
          </div>

          {/* Action Column Side Panel Summary (Visible on Web Desktop layout screens only) */}
          <div className="hidden lg:block lg:col-span-2">
            <Card className="shadow-sm border-slate-100 rounded-xl bg-white sticky top-24">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center text-xs font-medium border-b pb-2.5 border-slate-50">
                  <span className="text-slate-500">Hali ya Mzigo</span>
                  {product.stock > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium rounded-full px-2.5 py-0"
                    >
                      Mzigo Upo ({product.stock})
                    </Badge>
                  ) : (
                    <Badge
                      variant="destructive"
                      className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-medium rounded-full px-2.5 py-0"
                    >
                      Zimeisha
                    </Badge>
                  )}
                </div>

                {product.stock > 0 && (
                  <div className="space-y-2.5 pt-1">
                    <AddToCart cart={safeCartData} item={cartItem} />
                    <BuyNow item={buyNowItem} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 🟢 SECTION 2: VERIFIED SUPPLIER PROFILE */}
      {product.supplier && (
        <section className="px-2 sm:px-4 lg:px-6">
          <div className="border-t border-slate-100 pt-6">
            <SupplierProfileCard
              supplier={{
                ...product.supplier,
                logo: product.supplier.logo ?? null,
                rating: Number(product.supplier.rating),
                location: product.supplier.location || "",
                username: product.supplier.username || "",
                certifications: product.supplier.certifications.map((c) => ({
                  id: c.id,
                  label: c.label,
                  image: c.image ?? undefined,
                  certNumber: c.certNumber ?? undefined,
                  validUntil: c.validUntil ? new Date(c.validUntil) : undefined,
                })),
              }}
            />
          </div>
        </section>
      )}

      {/* 🟢 SECTION 3: RELATED PRODUCTS GRID */}
      <section className="px-2 sm:px-4 lg:px-6 space-y-3">
        <h2 className="text-sm font-bold md:text-lg text-slate-900 tracking-tight">
          Zaidi katika{" "}
          {product.category?.name_en || product.category?.name_en || ""}
        </h2>
        <Suspense fallback={<SkeletonProduct />}>
          <RelatedProducts
            categoryId={product.categoryId}
            excludeSlug={product.slug}
          />
        </Suspense>
      </section>

      {/* 🟢 SECTION 4: CLIENT FEEDBACK REVIEWS */}
      <section className="px-2 sm:px-4 lg:px-6 space-y-4">
        <h2 className="text-sm font-bold md:text-lg text-slate-900 tracking-tight">
          Maoni ya Wateja ({product?.numReviews})
        </h2>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <Suspense
            fallback={
              <Skeleton className="h-24 w-full rounded-xl bg-slate-50" />
            }
          >
            <ReviewList
              userId={userId || ""}
              productId={product.id}
              productSlug={product.slug}
            />
          </Suspense>
        </div>
      </section>

      {/* 🟢 SECTION 5: FLOATING BACKGROUND MESSENGER ACTIONS */}
      <ProductClientActions
        item={{
          productId: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
          image: product.images![0],
        }}
        buyerId={userId || ""}
        supplierId={product?.supplierId || ""}
        supplierUserId={product?.supplier?.userId || ""}
        productId={product.id}
        cartCount={safeCartData?.items ? safeCartData.items.length : 0}
      />

      {/* 🟢 SCHEMA.ORG JSON-LD FOR MASTER SEARCH ENGINES */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: product.name,
            image: product.images,
            description: product.description,
            sku: product.id,
            brand: {
              "@type": "Brand",
              name: product.brand?.name || "Nimboya",
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "TZS",
              price: Number(product.price),
              availability:
                product.stock > 0 ? "https://schema.org" : "https://schema.org",
            },
          }),
        }}
      />
    </div>
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
