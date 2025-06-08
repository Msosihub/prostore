import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Menu } from "lucide-react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

const heroBanners = [
  {
    id: 1,
    title: "Top Electronics Deals",
    imageUrl: "/banners/electronics.jpg",
    linkTo: "/category/electronics",
  },
  {
    id: 2,
    title: "Fashion Essentials",
    imageUrl: "/banners/fashion.jpg",
    linkTo: "/category/fashion",
  },
  {
    id: 3,
    title: "Groceries at Discount",
    imageUrl: "/banners/groceries.jpg",
    linkTo: "/category/groceries",
  },
];

const categories = [
  {
    id: 1,
    name: "Home Appliances",
    imageUrl: "/categories/home.jpg",
    subcategories: [
      { id: 1, name: "Fridges", imageUrl: "/subcategories/fridge.jpg" },
      { id: 2, name: "Microwaves", imageUrl: "/subcategories/microwave.jpg" },
      { id: 3, name: "Blenders", imageUrl: "/subcategories/blender.jpg" },
      { id: 4, name: "Cookers", imageUrl: "/subcategories/cooker.jpg" },
    ],
  },
  {
    id: 2,
    name: "Mobile Phones",
    imageUrl: "/categories/phones.jpg",
    subcategories: [
      { id: 5, name: "Smartphones", imageUrl: "/subcategories/smartphone.jpg" },
      { id: 6, name: "Feature Phones", imageUrl: "/subcategories/feature.jpg" },
      {
        id: 7,
        name: "Accessories",
        imageUrl: "/subcategories/accessories.jpg",
      },
      { id: 8, name: "Chargers", imageUrl: "/subcategories/charger.jpg" },
    ],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-white shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Menu className="md:hidden" />
          <h1 className="text-xl font-bold text-blue-600">TanzaShop</h1>
        </div>
        <Input
          type="text"
          placeholder="Search for products..."
          className="max-w-md hidden md:block"
        />
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon">
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Hero Banner Carousel */}
      <section className="w-full overflow-x-auto whitespace-nowrap py-4 px-4 space-x-4 flex">
        {heroBanners.map((banner) => (
          <Card
            key={banner.id}
            className="min-w-[80%] md:min-w-[40%] rounded-xl overflow-hidden relative"
          >
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              width={800}
              height={400}
              className="w-full h-48 object-cover"
            />
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
              <h2 className="text-lg font-semibold">{banner.title}</h2>
            </div>
          </Card>
        ))}
      </section>

      {/* Categories with Subcategories */}
      <section className="py-6 px-4">
        <ScrollArea className="flex gap-4 overflow-x-auto">
          {categories.map((category) => (
            <Card key={category.id} className="min-w-[300px] rounded-xl">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-2">{category.name}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {category.subcategories.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-gray-100 rounded-md overflow-hidden shadow-sm"
                    >
                      <Image
                        src={sub.imageUrl}
                        alt={sub.name}
                        width={150}
                        height={100}
                        className="w-full h-20 object-cover"
                      />
                      <p className="text-center text-sm py-1">{sub.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
      </section>

      {/* Footer */}
      <footer className="bg-white py-6 mt-8 border-t text-center text-sm text-gray-600">
        © 2025 TanzaShop. All rights reserved.
      </footer>
    </div>
  );
}
