// app/components/banner/BannerSection.server.tsx
import React from "react";
import { getResolvedBanners } from "@/lib/banners";
import CategoryGroupCard from "@/components/shared/banner/CategoryGroupCard.client";

/**
 * Server component: fetches banners and renders them.
 */
export default async function BannerSection() {
  const banners = await getResolvedBanners();
  console.log("New Banner", banners);
  // We render hero first, promos next, then category groups.
  // const heroBanners = banners.filter(
  //   (b) =>
  //     b.type === "promo" &&
  //     b.mode &&
  //     b.mode === "MANUAL" &&
  //     b.items.length &&
  //     /* heuristic to pick hero */ true
  // );

  console.log("");
  // But better: show banners by order from DB; for flexible layouts just render in DB order:

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {banners.map((b) => {
        console.log("b.type: ", b.type);
        console.log("b.type items: ", b.items);
        // heuristics: if banner has multiple items (category-group) => render group card
        if ((b.type ?? "").toUpperCase() === "CATEGORY_GROUP") {
          return (
            <div className="h-full" key={b.id}>
              <CategoryGroupCard key={b.id} banner={b} />
            </div>
          );
        }

        return;
      })}
    </div>
  );
}
