import Image from "next/image";
import Link from "next/link";

type Banner = {
  id: string | null;
  image: string | null;
  title?: string | null;
  link?: string | null;
};

export function PromoBlocks({ banners }: { banners: Banner[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 my-8">
      {banners.map((b) => (
        <Link key={b.id} href={b.link ?? "#"}>
          <div className="relative h-[180px] sm:h-[220px] lg:h-[260px] rounded-xl overflow-hidden shadow-md group">
            <Image
              src={b.image}
              alt={b.title ?? "Promo"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0  flex items-start justify-start text-center px-2 mx-2 mt-4">
              <h3 className="text-white text-lg sm:text-xl lg:text-2xl font-semibold drop-shadow-md">
                {b.title}
              </h3>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
