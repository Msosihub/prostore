import Pagination from "@/components/shared/pagination4";
import CategoryFilter from "@/components/shared/product/category-filter";
import ProductCard from "@/components/shared/product/product-card";
import SkeletonProduct from "@/components/shared/product/skeleton-product";
import { Button } from "@/components/ui/button";
import { getAllProducts } from "@/lib/actions/product.actions";
import Link from "next/link";

const sortOrders = ["newest", "lowest", "highest", "rating"];

export async function generateMetadata(props: {
  searchParams: Promise<{
    q: string;
    category: string;
    price: string;
    rating: string;
  }>;
}) {
  const {
    q = "all",
    category = "all",
    price = "all",
    rating = "all",
  } = await props.searchParams;

  const isQuerySet = q && q !== "all" && q.trim() !== "";
  const isCategorySet =
    category && category !== "all" && category.trim() !== "";
  const isPriceSet = price && price !== "all" && price.trim() !== "";
  const isRatingSet = rating && rating !== "all" && rating.trim() !== "";

  if (isQuerySet || isCategorySet || isPriceSet || isRatingSet) {
    return {
      title: `Search ${isQuerySet ? q : ""} 
        ${isCategorySet ? `: Category ${category}` : ""}
        ${isPriceSet ? `: Price ${price}` : ""}
        ${isRatingSet ? `: Rating ${rating}` : ""}`,
    };
  } else {
    return {
      title: "Search Products",
    };
  }
}

const SearchPage = async (props: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    price?: string;
    rating?: string;
    sort?: string;
    page?: string;
  }>;
}) => {
  const {
    q = "all",
    category = "all",
    price = "all",
    rating = "all",
    sort = "newest",
    page = "1",
  } = await props.searchParams;

  if (page && isNaN(Number(page))) {
    //page = "1";
  }

  // const locale: "en" | "sw" = "en"; // TODO: make dynamic later

  const getFilterUrl = ({
    c,
    p,
    s,
    r,
    pg,
  }: {
    c?: string;
    p?: string;
    s?: string;
    r?: string;
    pg?: string;
  }) => {
    const params = { q, category, price, rating, sort, page: "1" };

    if (c) params.category = c;
    if (p) params.price = p;
    if (s) params.sort = s;
    if (r) params.rating = r;
    if (pg) params.page = pg;

    return `/search?${new URLSearchParams(params).toString()}`;
  };

  const products = await getAllProducts({
    query: q,
    category,
    price,
    rating,
    sort,
    page: Number(page),
  });

  return (
    <div className="grid md:grid-cols-4 md:gap-5">
      <div className="md:col-span-4 space-y-4">
        <CategoryFilter />
        <div className="flex-between flex-col md:flex-row my-4">
          <div className="flex items-center flex-wrap gap-2 text-sm">
            {q !== "all" && q !== "" && <span>Query: {q}</span>}
            {category !== "all" && category !== "" && (
              <span>Category: {category}</span>
            )}
            {price !== "all" && <span>Price: {price}</span>}
            {rating !== "all" && <span>Rating: {rating} stars & up</span>}
            {(q !== "all" && q !== "") ||
            (category !== "all" && category !== "") ||
            rating !== "all" ||
            price !== "all" ? (
              <Button variant="link" asChild>
                <Link href="/search">Clear</Link>
              </Button>
            ) : null}
          </div>

          <div className="text-sm">
            Sort by{" "}
            {sortOrders.map((s) => (
              <Link
                key={s}
                className={`mx-2 ${sort === s ? "font-bold underline" : ""}`}
                href={getFilterUrl({ s })}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {products.data.length === 0 ? (
            <>
              {[...Array(6)].map((_, i) => (
                <SkeletonProduct key={i} />
              ))}
            </>
          ) : (
            products.data.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                brand={product.brand?.name ?? ""}
                category={product.category?.name_en ?? ""}
                subcategory={product.subcategory?.name_en ?? ""}
                supplier={product.supplier?.companyName ?? ""}
                images={product.images}
                price={Number(product.price)}
                stock={product.stock}
                pricingTiers={product.pricingTiers}
              />
            ))
          )}
        </div>
        {/* <Pagination
          currentPage={!page || isNaN(Number(page)) ? 1 : Number(page)}
          totalPages={products.totalPages}
        /> */}
        <Pagination
          currentPage={Number(page)}
          totalPages={products.totalPages}
        />
      </div>
    </div>
  );
};

export default SearchPage;
