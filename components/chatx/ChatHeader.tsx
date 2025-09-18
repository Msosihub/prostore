"use client";

//2) Header (Alibaba style, 2 tiers)
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ProductLite, UserLite } from "./types";
import { Settings, Store, X } from "lucide-react";

type Props = {
  meId: string;
  buyer: UserLite;
  supplier: UserLite;
  product: ProductLite | null;
  onRemoveProduct: () => void;
  peerTyping?: boolean;
  peerTimezone?: string; // optional: if you ever know supplier tz (e.g. "Asia/Shanghai")
};

function useClock(tz?: string) {
  const [value, setValue] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: tz,
      }).format(new Date());
    } catch {
      return new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  });

  useEffect(() => {
    const id = setInterval(() => {
      try {
        setValue(
          new Intl.DateTimeFormat([], {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: tz,
          }).format(new Date())
        );
      } catch {
        setValue(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        );
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [tz]);

  return value;
}

export default function ChatHeader({
  meId,
  buyer,
  supplier,
  product,
  onRemoveProduct,
  peerTyping,
  peerTimezone,
}: Props) {
  const peer = useMemo(
    () => (buyer.id === meId ? supplier : buyer),
    [buyer, supplier, meId]
  );
  const time = useClock(peerTimezone);

  return (
    <div className="sticky top-0 z-20 border-b bg-white">
      {/* Top bar: avatar, name + local time, action icons */}
      <div className="flex items-center justify-between px-4 py-2 shadow-sm  md:text-base">
        <div className="flex items-center gap-3 ">
          <Avatar className="h-9 w-9">
            <AvatarImage src={peer.image || ""} />
            <AvatarFallback>{peer.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <div className="font-semibold">{peer.name || "User"}</div>
            <div className="text-xs text-muted-foreground ">
              Local Time: {time}{" "}
              {peerTyping && (
                <span className="ml-2 text-green-600 text-[11px]">typing…</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center ">
          {/* link to supplier mini page even if I'm the supplier (keeps consistent target) */}
          <Link
            href={`/company/${supplier?.Supplier?.id}/home`}
            className=" sm:block"
          >
            <Button variant="ghost" size="sm" className="rounded-full">
              <Store className="h-4 w-4" />
              {/* <span className="ml-2 hidden md:inline ">Supplier</span> */}
            </Button>
          </Link>
          {/* <Button variant="ghost" size="icon" className="rounded-full">
            <Phone className="h-4 w-4" />
          </Button> */}
          <Button variant="ghost" size="icon" className="rounded-full">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bottom bar: pinned product card (can remove with X) */}
      {product && (
        <div className="flex items-center justify-between border-t px-3 py-2 bg-white">
          <Link
            href={`/product/${product.id}`}
            className="flex items-center gap-3"
          >
            <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-sm">
              <div className="font-medium line-clamp-1  md:text-base">
                {product.name}
              </div>
              <div className="text-muted-foreground">
                <p>{product.price}Tsh </p>
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemoveProduct}
            aria-label="Unpin product"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
