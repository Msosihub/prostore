// components/shared/banner/HeroCarousel.client.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"; // keep same API as your ProductCarousel
import Autoplay from "embla-carousel-autoplay";

type Item = {
  id: string;
  image: string;
  title?: string | null;
  subtitle?: string | null;
  link: string;
};

export default function HeroCarousel({ banners }: { banners: Item[] }) {
  if (!banners || banners.length === 0) return null;
  return (
    <Carousel
      className="w-full mb-6"
      opts={{ loop: true, duration: 600 }}
      plugins={[
        Autoplay({
          delay: 6000,
          stopOnInteraction: true,
          stopOnMouseEnter: true,
        }),
      ]}
    >
      <CarouselContent>
        {banners.map((b) => (
          <CarouselItem key={b.id} className="group relative">
            <Link href={b.link ?? "#"} aria-label={b.title ?? "Banner"}>
              <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
                <div className="relative w-full h-[220px] sm:h-[330px] md:h-[420px] lg:h-[480px]">
                  <Image
                    src={b.image}
                    alt={b.title ?? "Banner"}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                </div>

                <div className="absolute inset-0 bg-black/30 flex items-center justify-center px-4">
                  <div className="text-center">
                    {b.title && (
                      <h2 className="text-white text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold drop-shadow-md">
                        {b.title}
                      </h2>
                    )}
                    {b.subtitle && (
                      <p className="text-white text-xs sm:text-sm md:text-lg mt-2">
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

      <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md" />
      <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md" />
    </Carousel>
  );
}
