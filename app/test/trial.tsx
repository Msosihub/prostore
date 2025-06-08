import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Menu } from "lucide-react";

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

      {/* Hero Banner */}
      <section className="w-full bg-blue-100 py-6 px-4 text-center">
        <h2 className="text-2xl font-semibold text-blue-900">
          Free Delivery in Dar es Salaam for Orders Above TZS 50,000!
        </h2>
      </section>

      {/* Categories Scroll */}
      <section className="py-4 px-4 overflow-x-auto">
        <div className="flex gap-4">
          {[
            "Electronics",
            "Fashion",
            "Groceries",
            "Home & Kitchen",
            "Phones",
            "Beauty",
          ].map((cat) => (
            <Button key={cat} variant="secondary" className="whitespace-nowrap">
              {cat}
            </Button>
          ))}
        </div>
      </section>

      {/* Flash Deals */}
      <section className="px-4 py-4">
        <h3 className="text-xl font-semibold mb-4">Flash Deals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="hover:shadow-lg transition">
              <CardContent className="p-4">
                <div className="bg-gray-200 h-32 mb-2" />
                <p className="text-sm font-medium">Product Name</p>
                <p className="text-red-500 text-sm">TZS 30,000</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-6 mt-8 border-t text-center text-sm text-gray-600">
        © 2025 TanzaShop. All rights reserved.
      </footer>
    </div>
  );
}
