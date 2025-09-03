"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Product } from "@/types";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import Image from "next/image";

const ProductCarousel = ({ data }: { data: Product[] }) => {
  return (
    <Carousel
      className="hidden sm:block w-full mb-12 "
      opts={{
        loop: true,
        duration: 500,
      }}
      plugins={[
        Autoplay({
          delay: 7000,
          stopOnInteraction: true,
          stopOnMouseEnter: true,
        }),
      ]}
    >
      <CarouselContent className="touch-pan-x">
        {data.map((product: Product) => (
          <CarouselItem key={product.id} className="group relative">
            <Link
              href={`/product/${product.slug}`}
              aria-label={`View ${product.name}`}
            >
              <div className="relative w-full overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <Image
                  src={`/images/${product.banner!}`}
                  alt={product.name}
                  height={0}
                  width={0}
                  sizes="100vw"
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
                  <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-4 px-4 text-center">
                    {product.name}
                  </h2>
                </div>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Navigation Arrows */}
      <CarouselPrevious className="hover:bg-gray-200 bg-white rounded-full p-2 shadow-md transition duration-200" />
      <CarouselNext className="hover:bg-gray-200 bg-white rounded-full p-2 shadow-md transition duration-200" />

      {/* Pagination Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {data.map((_, index) => (
          <button
            key={index}
            className="w-3 h-3 rounded-full bg-gray-300 hover:bg-gray-500 transition-colors duration-200"
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </Carousel>
  );
};

export default ProductCarousel;
