"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import SupplierSection from "./supplie-section";
import { Product, Supplier } from "@/types";
import { Loader2 } from "lucide-react";

type SupplierBlock = { supplier: Supplier; products: Product[] };

const BATCH_SIZE = 3;

async function fetchSupplierBatch(excludeIds: string[], take = BATCH_SIZE) {
  const params = new URLSearchParams();
  if (excludeIds.length) params.set("exclude", excludeIds.join(","));
  params.set("take", String(take));
  const res = await fetch(`/api/suppliers/scroll?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch supplier batch");
  }
  return res.json() as Promise<{ suppliers: SupplierBlock[] }>;
}

export default function InfiniteSuppliers() {
  const [blocks, setBlocks] = useState<SupplierBlock[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      const excludeIds = blocks.map((b) => b.supplier.id);
      const payload = await fetchSupplierBatch(excludeIds, BATCH_SIZE);
      const incoming: SupplierBlock[] = payload.suppliers ?? [];

      const existing = new Set(blocks.map((b) => b.supplier.id));
      const filtered = incoming.filter((b) => !existing.has(b.supplier.id));

      if (filtered.length === 0) {
        setHasMore(false);
      } else {
        setBlocks((prev) => [...prev, ...filtered]);
      }
    } catch (err) {
      console.error("Error loading suppliers", err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [blocks]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !fetchingRef.current) {
            loadMore();
          }
        });
      },
      {
        root: null,
        rootMargin: "600px",
        threshold: 0.1,
      }
    );

    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore, hasMore]);

  return (
    <div className="w-full space-y-8">
      {blocks.map((b) => (
        <SupplierSection
          key={b.supplier.id}
          supplier={b.supplier}
          products={b.products}
        />
      ))}

      {/* 🟢 Clean, centered loader container block formatting context */}
      {isLoading && (
        <div className="w-full flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Sentinel link tracker block */}
      <div ref={sentinelRef} className="h-4" />

      {!hasMore && blocks.length > 0 && (
        <div className="text-xs text-center text-muted-foreground pt-4 pb-2 tracking-wide">
          🎉 Umaona wauzaji wote wa kuaminika.
        </div>
      )}
    </div>
  );
}
