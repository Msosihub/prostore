// app/components/banner/BannerSection.server.tsx
import React from "react";
import { getResolvedBanners } from "@/lib/banners";
import HeroCarousel from "@/components/shared/banner/HeroCarousel.client";
import CategoryGroupCard from "@/components/shared/banner/CategoryGroupCard.client";
import PromoCard from "@/components/shared/banner/PromoCard.client";
import Image from "next/Image";
import Link from "next/link";

/**
 * Server component: fetches banners and renders them.
 */
export default async function BannerSection() {
  const banners = await getResolvedBanners();
  console.log("New Banner", banners);
  // We render hero first, promos next, then category groups.
  const heroBanners = banners.filter(
    (b) =>
      b.type === "promo" &&
      b.mode &&
      b.mode === "MANUAL" &&
      b.items.length &&
      /* heuristic to pick hero */ true
  );

  console.log("");
  // But better: show banners by order from DB; for flexible layouts just render in DB order:

  return (
    <div className="">
      {banners.map((b) => {
        console.log("b.type: ", b.type);
        console.log("b.type items: ", b.items);
        // heuristics: if banner has multiple items (category-group) => render group card
        if ((b.type ?? "").toUpperCase() === "CATEGORY_GROUP") {
          return (
            <div className="grid grid-col-4" key={b.id}>
              <CategoryGroupCard key={b.id} banner={b} />
            </div>
          );
        }
        // PROMO
        // if ((b.type ?? "").toUpperCase() === "PROMO") {
        //   // if single item => hero style
        //   if (b.items.length === 1) {
        //     return (
        //       <HeroCarousel
        //         key={b.id}
        //         banners={b.items.map((it) => ({
        //           id: it.id,
        //           image: it.image,
        //           title: b.title ?? it.title,
        //           subtitle: b.subtitle,
        //           link: it.link || "",
        //         }))}
        //       />
        //     );
        //   }
        //   // otherwise map to small promo cards
        //   return <PromoCard key={b.id} banner={b} />;
        // }
        // default: try to render promo card
        // return <PromoCard key={b.id} banner={b} />;
        return;
      })}
    </div>
  );
}
