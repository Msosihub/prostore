// app/home.tsx
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { prisma } from "@/db/prisma"; // adjust to your prisma client import

// Fetch banners (only active, type/category ones)
async function getCategoryBanner() {
  return prisma.banner.findFirst({
    where: { isActive: true },
    include: { items: true },
  });
}

export default async function Homex() {
  const banner = await getCategoryBanner();

  if (!banner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">No categories available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {banner.title ?? "Shop Categories"}
          </h2>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {banner.items.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={item.link || "#"}
                className="group relative block"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 transition-all duration-300 group-hover:opacity-90">
                  <Image
                    src={item.image}
                    alt={item.title || "Category"}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>

        <CardFooter className="bg-gray-50 text-center">
          <Link
            href={banner.link || "#"}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
          >
            See all categories
            <span className="inline-block">›</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
