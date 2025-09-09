import { Product } from "@/types";
import ProductCard from "./product-card";

const ProductCategory = ({
  data,
  title,
  limit,
}: {
  data: Product[];
  title?: string;
  limit?: number;
}) => {
  const limitedData = limit ? data.slice(0, limit) : data;
  return (
    <div className="my-10">
      <h2 className="h2-bold mb-4">{title}</h2>
      {data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {limitedData.map((product: Product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              brand={product?.brand?.name || ""}
              category={product.category?.name_en ?? ""}
              subcategory={product?.subcategory?.name_en || ""}
              supplier={product?.supplier?.companyName ?? "<no supplier>"}
              images={product.images}
              price={Number(product.price)}
              stock={product.stock}
              pricingTiers={product.pricingTiers}
            />
          ))}
        </div>
      ) : (
        <div>
          <p>No record found</p>
        </div>
      )}
    </div>
  );
};

export default ProductCategory;
