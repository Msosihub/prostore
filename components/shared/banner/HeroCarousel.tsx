"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Banner } from "@/types";

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
  const activeBanners = banners.filter((b) => b.isActive === true);

  if (activeBanners.length === 0) return null;

  return (
    <Carousel
      opts={{ loop: true }}
      plugins={[
        Autoplay({
          delay: 4000,
          stopOnInteraction: true,
          stopOnMouseEnter: true,
        }),
      ]}
      className="w-full relative group/carousel"
    >
      <CarouselContent>
        {activeBanners.map((b) => (
          <CarouselItem key={b.id}>
            <Link
              href={b.link ?? "#"}
              aria-label={b.title ?? "Banner"}
              className="block w-full"
            >
              {/* 🟢 Balanced multi-device height boundaries with explicit text fallback shading layout */}
              <div className="relative w-full h-[220px] sm:h-[320px] lg:h-[400px] overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src={b.image || ""}
                  alt={b.title ?? "Banner"}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                  className="object-cover transition-transform duration-700 ease-out group-hover/carousel:scale-[1.02]"
                />

                {/* 🟢 Soft dark gradient overlay layer ensures text string readability on any arbitrary bright background assets */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col items-start justify-end p-5 sm:p-8 md:p-12 text-left">
                  <div className="max-w-xl space-y-1 sm:space-y-2">
                    {b.title && (
                      <h2 className="text-white text-lg sm:text-2xl lg:text-4xl font-bold tracking-tight drop-shadow-sm leading-tight">
                        {b.title}
                      </h2>
                    )}
                    {b.subtitle && (
                      <p className="text-slate-100 text-xs sm:text-sm lg:text-base font-medium opacity-90 drop-shadow-sm max-w-md line-clamp-2">
                        {b.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* 🟢 Desktop-only layout navigation control pins (Hidden on touch screens) */}
      <CarouselPrevious className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border-slate-100 backdrop-blur shadow-sm h-9 w-9 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex" />
      <CarouselNext className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white border-slate-100 backdrop-blur shadow-sm h-9 w-9 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex" />
    </Carousel>
  );
}
