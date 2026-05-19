// We add an activeQty prop. If the current quantity matches a specific wholesale range,
// that row lights up in a clean green tint,
// signaling the tier drop to the buyer.
"use client";

import { Decimal } from "@prisma/client/runtime/library";
import ProductPrice from "./product-price2";

interface TieredPricingTableProps {
  tiers?: { id: string; minQty: number; price: Decimal }[];
  fallbackPrice: number | string;
  activeQty?: number; // 🟢 Tracks client component state shifts live
}

const PricingTable = ({
  tiers,
  fallbackPrice,
  activeQty = 1,
}: TieredPricingTableProps) => {
  const sortedTiers = [...(tiers || [])].sort((a, b) => a.minQty - b.minQty);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
      <table className="w-full text-xs sm:text-sm text-slate-700">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Kiasi (Quantity)
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Bei ya Kila Moja
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedTiers.length > 0 ? (
            sortedTiers.map((tier, index) => {
              const nextTier = sortedTiers[index + 1];
              // Determine if active quantity falls within this specific tier's boundary parameters
              const isCurrentTierActive = nextTier
                ? activeQty >= tier.minQty && activeQty < nextTier.minQty
                : activeQty >= tier.minQty;

              return (
                <tr
                  key={tier.id}
                  className={`transition-colors ${
                    isCurrentTierActive
                      ? "bg-emerald-50/70 font-semibold text-emerald-900"
                      : "hover:bg-slate-50/50 text-slate-600"
                  }`}
                >
                  <td className="px-3 py-2.5 flex items-center gap-2">
                    {tier.minQty}+ pcs
                    {isCurrentTierActive && (
                      <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tight scale-90">
                        Inatumika
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <ProductPrice value={Number(tier.price)} />
                  </td>
                </tr>
              );
            })
          ) : (
            <tr className="bg-emerald-50/40 text-emerald-900 font-medium">
              <td className="px-3 py-2.5">1+ pcs</td>
              <td className="px-3 py-2.5 text-right">
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
