"use client";

import { useEffect, useRef, useState, useCallback } from "react";
// import SectionSkeleton from "@/components/skeletons/skeleton-section";
import SupplierSection from "./supplie-section";
import { Product, Supplier } from "@/types";
import { Loader } from "lucide-react";

type SupplierBlock = { supplier: Supplier; products: Product[] };

const BATCH_SIZE = 3; // how many suppliers per request

async function fetchSupplierBatch(excludeIds: string[], take = BATCH_SIZE) {
  const params = new URLSearchParams();
  if (excludeIds.length) params.set("exclude", excludeIds.join(","));
  params.set("take", String(take));
  const res = await fetch(`/api/suppliers/scroll?${params.toString()}`);
  // const text = await res.text();
  // console.log("Response URL:", res.url);
  // console.log("Status:", res.status);
  if (!res.ok) {
    // console.error("Fetch failed:", res.status, text);
    // console.log("Response URL:", res.url);
    // console.log("Status:", res.status);
    throw new Error("Failed to fetch supplier batch");
  }
  // try {
  //   return JSON.parse(text);
  // } catch (err) {
  //   console.error("Failed to parse JSON:", text);
  //   throw err;
  // }

  return res.json() as Promise<{ suppliers: SupplierBlock[] }>;
}

export default function InfiniteSuppliers() {
  const [blocks, setBlocks] = useState<SupplierBlock[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  // const { toast } = useToast();

  // console.log("Here in suppliers");

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

      // console.log("Filtered Length: ", filtered.length);
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
  }, [blocks]);

  // initial load
  useEffect(() => {
    // console.log("Load more called");
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // intersection observer
  useEffect(() => {
    // console.log("Checking SentinelRef: ", sentinelRef.current);
    if (!sentinelRef.current) return;
    // console.log("It passed v");
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
        rootMargin: "600px", // <-- extend preload zone for mobile from 300 to 600
        threshold: 0.1,
      }
    );

    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore, hasMore]);

  //additional if scroll fail to pull data
  // useEffect(() => {
  //   console.log("Scroll backup.");
  //   const handleScroll = () => {
  //     const sentinel = sentinelRef.current;
  //     if (!sentinel || !hasMore || fetchingRef.current) return;
  //     const rect = sentinel.getBoundingClientRect();
  //     if (rect.top < window.innerHeight + 300) {
  //       loadMore();
  //     }
  //   };

  //   window.addEventListener("scroll", handleScroll);
  //   return () => window.removeEventListener("scroll", handleScroll);
  // }, [hasMore, loadMore]);

  return (
    <div className="space-y-6 justify-center ">
      {blocks.map((b) => (
        <SupplierSection
          key={b.supplier.id}
          supplier={b.supplier}
          products={b.products}
        />
      ))}

      {isLoading && (
        // <div className="space-y-4">
        //   {/* <SectionSkeleton /> */}
        // </div>
        <Loader className="w-4 h-4 animate-spin justify-center items-center" />
      )}

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-8" />

      {!hasMore && blocks.length > 0 && (
        <div className="text-sm text-center text-muted-foreground py-4">
          🎉 Umaona wauzaji wote.
        </div>
      )}
    </div>
  );
}
