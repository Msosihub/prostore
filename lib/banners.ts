// lib/banners.ts
import { prisma } from "@/db/prisma";
import {
  Banner,
  BannerItems,
  // Product
} from "@/types";

/**
 * Shape returned to UI for each banner item
 */
// export type ResolvedBannerItem = {
//   id: string;
//   image: string;
//   title?: string | null;
//   link: string;
// };

export type ResolvedBanner = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  text?: string | null;
  image?: string | null;
  type?: string | null;
  mode?: string | null;
  data?: JSON;
  isActive: boolean;
  items: BannerItems[];
};

// function productImageFallback(product: Product) {
//   // adapt depending on your product.images shape
//   if (!product) return "/images/placeholder-600x400.png";
//   if (Array.isArray(product.images) && product.images.length)
//     return product.images[0];
//   if (product.images) return product.images;
//   return "/images/placeholder-600x400.png";
// }

/**
 * Main function: fetch banners and resolve items (manual or auto).
 */
export async function getResolvedBanners(): Promise<Banner[]> {
  const banners = await prisma.banner.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  // console.log("bANNER CONTENT: ", banners);

  const resolved = await Promise.all(
    banners.map(async (b) => {
      const base: Banner = {
        id: b.id,
        title: b.title ?? undefined,
        subtitle: b.subtitle ?? undefined,
        text: b.text ?? undefined,
        image: b.image ?? null,
        category: b.category ?? null,
        type: b.type ?? undefined,
        mode: b.mode ?? null,
        isActive: b.isActive,
        // data: b.data ?? JSON,
        items: [],
      };

      // console.log("MODE: ", b.mode);

      // If manual or no items in DB -> prefer stored items
      if (b.mode === "MANUAL" || !b.items || b.items.length === 0) {
        base.items = (b.items ?? []).map((it) => ({
          id: it.id,
          image: it.image,
          title: it.title || undefined,
          link: it.link,
          productId: it.productId || "",
        }));
        // console.log("BASE: ", base);
        return base;
      }

      // AUTO mode: build items depending on type & data
      const data = (b.data as { category: string; categoryId: string }) ?? {};

      try {
        if (b.type === "CATEGORY_GROUP") {
          // Expect data.categoryId (or categorySlug). We'll find subcategories and pick top ones by product count.
          const categoryId = data.categoryId || data.category;
          if (!categoryId) {
            // fallback to manual items if any
            base.items = (b.items ?? []).map((it) => ({
              id: it.id,
              image: it.image,
              title: it.title ?? undefined,
              link: it.link,
            }));
            // console.log("Base II: ", base);
            return base;
          }

          // get subcategories for category
          // console.log("CategoryId: ", categoryId);
          const subcats = await prisma.subcategory.findMany({
            where: { categoryId: categoryId },
            select: { id: true, name_en: true, image: true },
          });
          // console.log("SubCategories: ", subcats);

          // Count products per subcategory (simple approach)
          const subcatsWithCounts = await Promise.all(
            subcats.map(async (s) => {
              const count = await prisma.product.count({
                where: { subcategoryId: s.id },
              });
              // get one product to use as fallback image if subcat.image missing
              const product = await prisma.product.findFirst({
                where: { subcategoryId: s.id },
                select: { id: true, slug: true, images: true },
                orderBy: { createdAt: "desc" },
              });
              return {
                ...s,
                _product: product,
                count,
              };
            })
          );

          // console.log("SubCategoriesCount: ", subcatsWithCounts);

          // sort by count desc and pick limit
          const limit = Number(4);
          const chosen = subcatsWithCounts
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

          base.items = chosen.map((c) => ({
            id: c.id,
            image: c.image || "",
            title: c.name_en ?? c.id,
            link: `/category/${c.id}?subcategory=${c.id}`,
          }));
          return base;
        }

        // if (b.type === "PROMO") {
        //   // For promo AUTO: find a product based on data (categoryId or global)
        //   const categoryId = data.categoryId || null;
        //   // const pick = data.pick || "latest"; // 'latest' or 'top' (if you have sales)

        //   let product: Product | null = null;

        //   // If you have real sales metrics, replace this query to sort by that metric.
        //   product = await prisma.product.findFirst({
        //     where: categoryId ? { categoryId } : undefined,

        //     orderBy: [{ createdAt: "desc" }],
        //   });

        //   if (product) {
        //     base.items = [
        //       {
        //         id: product.id,
        //         image: productImageFallback(product),
        //         title: product.name ?? null,
        //         link: `/product/${product.slug ?? product.id}`,
        //       },
        //     ];
        //     return base;
        //   }

        //   console.log("PROMO Products: ", product);

        //   // fallback to manual items
        //   base.items = (b.items ?? []).map((it) => ({
        //     id: it.id,
        //     image: it.image,
        //     title: it.title || undefined,
        //     link: it.link,
        //   }));
        //   return base;
        // }

        // default fallback: manual items
        base.items = (b.items ?? []).map((it) => ({
          id: it.id,
          image: it.image,
          title: it.title || undefined,
          link: it.link,
        }));
        // console.log("Promo Base: ", base);
        return base;
      } catch (err) {
        console.error("Error resolving banner items", err);
        base.items = (b.items ?? []).map((it) => ({
          id: it.id || "",
          image: it.image || "",
          title: it.title ?? undefined,
          link: it.link,
        }));
        return base;
      }
    })
  );
  // console.log("Resolved: ", resolved);
  return resolved;
}
