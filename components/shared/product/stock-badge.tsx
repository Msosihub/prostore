"use client";

import { useEffect, useState } from "react";

type StockBadgeProps = {
  stock: number;
  className?: string;
};

const StockBadge = ({ stock, className }: StockBadgeProps) => {
  const [showLowStock, setShowLowStock] = useState(false);
  const [showSoldBadge, setShowSoldBadge] = useState(false);
  const [lowStockTrigger, setLowStockTrigger] = useState(10);
  const [soldCount, setSoldCount] = useState(100);
  const lowStockThreshold = 5;

  useEffect(() => {
    setShowLowStock(Math.random() < 0.3);
    setShowSoldBadge(Math.random() < 0.4);
    setLowStockTrigger(Math.floor(Math.random() * 7) + lowStockThreshold); // 5–11
    setSoldCount(Math.floor(Math.random() * 150) + 50); // 50–199
  }, []);

  // const showLowStock = Math.random() < 0.3; // ~30% chance
  // const showSoldBadge = Math.random() < 0.4; // ~40% chance

  // const lowStockThreshold = 5;
  // const lowStockTrigger = Math.floor(Math.random() * 7) + lowStockThreshold; // 5–11

  // const soldCount = Math.floor(Math.random() * 150) + 50; // 50–199 sold

  if (!showLowStock && !showSoldBadge) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLowStock &&
        stock >= lowStockThreshold &&
        stock <= lowStockTrigger && (
          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium">
            Zipo {stock} tu!
          </span>
        )}
      {showSoldBadge && (
        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
          {soldCount}+ zimeuzika
        </span>
      )}
    </div>
  );
};

export default StockBadge;
