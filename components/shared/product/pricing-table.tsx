"use client";

import { Decimal } from "@prisma/client/runtime/library";
// import { ProductTier } from "@/types";
import ProductPrice from "./product-price2";

interface ProductTier {
  id: string | number;
  minQty: number;
  price: Decimal;
}

interface TieredPricingTableProps {
  tiers: ProductTier[];
  fallbackPrice?: string;
}

const PricingTable = ({ tiers, fallbackPrice }: TieredPricingTableProps) => {
  const sortedTiers = tiers?.sort((a, b) => a.minQty - b.minQty) || [];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <table className="w-full text-sm text-gray-700">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="text-xs md:text-base px-4 py-2 text-left">
              Kiwango cha chini
            </th>
            <th className="px-4 py-2 text-right">Bei</th>
          </tr>
        </thead>
        <tbody>
          {sortedTiers.length > 0 ? (
            sortedTiers.map((tier, index) => {
              const isBestValue = index === sortedTiers.length - 1;
              const rowClass =
                index === 1 ? "bg-gray-50" : index === 2 ? "" : "";

              return (
                <tr
                  key={tier.id}
                  className={`${rowClass} ${isBestValue ? "" : ""}`}
                >
                  <td className="px-4 py-2">{tier.minQty}+ pcs</td>
                  <td className="px-4 py-2 text-right">
                    <ProductPrice value={Number(tier.price)} />
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="px-4 py-2">1+ pcs</td>
              <td className="px-4 py-2 text-right">
                <ProductPrice value={Number(fallbackPrice)} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PricingTable;
