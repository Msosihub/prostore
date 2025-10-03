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

type Banner = {
  id: string | null;
  image: string | null;
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
};

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
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
      className="w-full"
    >
      <CarouselContent>
        {banners.map((b) => (
          <CarouselItem key={b.id}>
            <Link href={b.link ?? "#"} aria-label={b.title ?? "Banner"}>
              <div className="relative w-full h-[50vh] mt-2  sm:h-[350px] lg:h-[50vh] md:mt-4 overflow-hidden rounded-xl shadow-md">
                <Image
                  src={b.image || ""}
                  alt={b.title ?? "Banner"}
                  fill
                  priority
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0  flex flex-col items-center justify-center text-start px-4">
                  {b.title && (
                    <h2 className="text-white text-xl sm:text-3xl lg:text-5xl font-bold drop-shadow-md">
                      {b.title}
                    </h2>
                  )}
                  {b.subtitle && (
                    <p className="text-white text-sm sm:text-lg lg:text-xl mt-2 drop-shadow-md">
                      {b.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="bg-white/70 hover:bg-white" />
      <CarouselNext className="bg-white/70 hover:bg-white" />
    </Carousel>
  );
}
