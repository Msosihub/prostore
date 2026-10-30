type StockBadgeProps = {
  stock: number;
  className?: string;
};

// Inventory can support an availability notice, never a sales/popularity claim.
export default function StockBadge({ stock, className }: StockBadgeProps) {
  if (!Number.isSafeInteger(stock) || stock <= 0 || stock > 5) return null;
  return (
    <span
      className={`text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-medium ${className || ""}`}
    >
      Zipo {stock} dukani
    </span>
  );
}
