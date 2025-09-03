// "use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import getSupplier from "@/lib/actions/company.actions";
import { prisma } from "@/db/prisma";

export const metadata: Metadata = {
  title: "Company Dashboard",
};

export default async function SupplierHomePage({
  params,
}: {
  params: { supplierId: string };
}) {
  const supplierId = params.supplierId;

  //get Supplier Information with featured products
  if (!supplierId) return <p>No supplier ID</p>;

  // const supplier = getSupplier(supplierId);
  let supplier;
  try {
    supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        products: {
          where: { isFeatured: true },
          take: 6, // limit to avoid overload
        },
      },
    });
    return supplier;
  } catch (error) {
    // throw NextResponse.json(error);
  }
  if (!supplier) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-gray-600">Supplier not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative w-full h-56 md:h-72">
        <Image
          src={supplier.banner || "/images/banner-1.jpg"}
          alt="Supplier Banner"
          fill
          className="object-cover rounded-b-2xl"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center text-white">
          <motion.img
            src={supplier.logo || "/images/logo.svg"}
            alt="Supplier Logo"
            className="w-20 h-20 rounded-full border-4 border-white mb-3"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          />
          <h1 className="text-2xl md:text-3xl font-bold">{supplier.name}</h1>
          <p className="text-sm md:text-base">{supplier.tagline}</p>
        </div>
      </div>

      {/* About */}
      <section className="px-4 md:px-8 py-6 text-center max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">About Us</h2>
        <p className="text-gray-600">{supplier.description}</p>
      </section>

      {/* Why Choose Us */}
      <section className="px-4 md:px-8 py-6">
        <h2 className="text-xl font-semibold text-center mb-4">
          Why Choose Us
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {supplier.strengths.map((s, idx) => (
            <Card key={idx} className="shadow-md">
              <CardContent className="flex flex-col items-center py-6">
                <span className="text-3xl">{s.icon}</span>
                <p className="mt-2 text-sm font-medium">{s.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="px-4 md:px-8 py-6">
        <h2 className="text-xl font-semibold text-center mb-4">
          Featured Products
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {supplier.products.map((p) => (
            <Card
              key={p.id}
              className="min-w-[180px] flex-shrink-0 shadow-md hover:shadow-lg transition"
            >
              <CardContent className="p-3">
                <Link href={`/product/${p.slug}`}>
                  <Image
                    src={p.images[0]}
                    alt={p.name}
                    width={200}
                    height={150}
                    className="rounded-md object-cover"
                  />
                  <p className="mt-2 text-sm font-medium text-center">
                    {p.name}
                  </p>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-center mt-4">
          <Link href={`/company/${supplierId}/products`}>
            <Button>View All Products</Button>
          </Link>
        </div>
      </section>

      {/* Footer Quick Links */}
      <footer className="mt-auto bg-white py-4 border-t">
        <div className="flex justify-center gap-6">
          <Link href={`/company/${supplierId}/products`}>
            <Button variant="outline">Products</Button>
          </Link>
          <Link href={`/company/${supplierId}/profile`}>
            <Button variant="outline">Company Profile</Button>
          </Link>
          <Link href={`/company/${supplierId}/categories`}>
            <Button variant="outline">Categories</Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}
