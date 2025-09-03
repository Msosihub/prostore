"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import SectionSkeleton from "@/components/skeletons/skeleton-section";
import { Button } from "@/components/ui/button";
import SupplierSection from "./supplie-section";
import { useToast } from "@/hooks/use-toast";

type Product = any;
type SupplierBlock = { supplier: any; products: Product[] };

const BATCH_SIZE = 3; // how many suppliers per request

async function fetchSupplierBatch(excludeIds: string[], take = BATCH_SIZE) {
  const params = new URLSearchParams();
  if (excludeIds.length) params.set("exclude", excludeIds.join(","));
  params.set("take", String(take));
  const res = await fetch(`/api/suppliers/scroll?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch supplier batch");
  return res.json() as Promise<{ suppliers: SupplierBlock[] }>;
}

export default function InfiniteSuppliers() {
  const [blocks, setBlocks] = useState<SupplierBlock[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  // const { toast } = useToast();

  const loadMore = useCallback(
    async (manualRetry = false) => {
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

        // toast({
        //   variant: "destructive",
        //   title: "Failed to load suppliers",
        //   description: "Check your connection and try again.",
        //   action: (
        //     <Button variant="outline" size="sm" onClick={() => loadMore(true)}>
        //       Retry
        //     </Button>
        //   ),
        // });
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [blocks]
  );

  // initial load
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // intersection observer
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
      { root: null, rootMargin: "300px", threshold: 0.1 }
    );

    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore, hasMore]);

  return (
    <div className="space-y-6">
      {blocks.map((b) => (
        <SupplierSection
          key={b.supplier.id}
          supplier={b.supplier}
          products={b.products}
        />
      ))}

      {isLoading && (
        <div className="space-y-4">
          <SectionSkeleton />
        </div>
      )}

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-8" />

      {!hasMore && blocks.length > 0 && (
        <div className="text-sm text-center text-muted-foreground py-4">
          🎉 You’ve seen all suppliers for now.
        </div>
      )}
    </div>
  );
}
