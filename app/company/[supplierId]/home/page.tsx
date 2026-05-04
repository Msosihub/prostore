// app/(root)/company/[supplierId]/home/page.tsx

import { prisma } from "@/db/prisma"; // <- your prisma client
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Building2,
  Clock,
  Globe,
  ImageIcon,
  Info,
  Leaf,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { SupplierSchema } from "@/components/seo/supplier-schema";

export default async function SupplierHomePage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const paramsx = await params;
  const supplierId = paramsx.supplierId;
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      products: {
        // where: { isFeatured: true }, //TODO: Enable this later
        take: 6,
      },
    },
  });

  if (!supplier) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-gray-600">Supplier not found</p>
      </div>
    );
  }

  const supplierx = JSON.parse(JSON.stringify(supplier));

  return (
    <div className="bg-gray-50">
      {/* 👇 Add this */}
      <SupplierSchema supplier={supplierx} />
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-6 py-0 sm:py-6">
        {/* <!-- Supplier Header --> */}
        <div className="bg-white sm:rounded-xl sm:shadow-sm border-b sm:border border-gray-100 overflow-hidden mb-4 sm:mb-6">
          <div className="relative">
            {/* Banner */}
            <div className="relative h-32 sm:h-56 md:h-72 bg-gradient-to-r from-blue-500 to-purple-600">
              <Image
                width={1200}
                height={630}
                src={
                  supplier.bannerUrl ||
                  "http://static.photos/industry/1200x630/1"
                }
                alt="Banner"
                className="w-full h-full object-cover"
              />

              {/* Profile Image */}
              <div className="absolute left-4 -bottom-10 sm:left-8 sm:bottom-0 sm:transform sm:translate-y-1/2">
                <div className="relative">
                  <Image
                    width={128}
                    height={128}
                    src={
                      supplier.logo || "http://static.photos/industry/200x200/1"
                    }
                    alt="Logo"
                    className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl sm:rounded-full border-4 border-white bg-white object-cover shadow-sm"
                  />
                  <div className="absolute bottom-1 right-1 bg-green-500 text-white p-0.5 rounded-full border-2 border-white">
                    <BadgeCheck className="w-3 h-3 sm:w-5 sm:h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="px-4 sm:px-6 pb-6 pt-12 sm:pt-20">
              <div className="flex flex-col md:flex-row md:items-end">
                <div className="text-left md:ml-6 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                      {supplier.companyName || supplier.name}
                    </h1>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase tracking-wider rounded">
                      Gold
                    </span>
                  </div>

                  <p className="text-sm sm:text-lg text-gray-500 mt-0.5 line-clamp-1">
                    {supplier.tagLine}
                  </p>

                  {/* ACTION BUTTONS: Vertical Icon + Label style for Mobile */}
                  <div className="flex mt-6 border-t border-gray-50 pt-4 sm:border-0 sm:pt-0 sm:gap-3">
                    <Link
                      href={`/company/${supplier.id}/products`}
                      className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:px-4 sm:bg-blue-600 sm:text-white sm:rounded-lg text-blue-600 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-[11px] sm:text-sm font-semibold uppercase sm:normal-case tracking-tight">
                        Contact
                      </span>
                    </Link>

                    <Link
                      href={`/company/${supplier.id}/products`}
                      className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:px-4 sm:border sm:border-gray-300 sm:rounded-lg text-gray-700 transition-colors"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      <span className="text-[11px] sm:text-sm font-semibold uppercase sm:normal-case tracking-tight">
                        Products
                      </span>
                    </Link>

                    <div className="flex-1 flex flex-col items-center justify-center gap-1 sm:flex-none">
                      <ShareButton
                        title={supplier.companyName || ""}
                        url={`https://nimboya.com/${supplier.username}`}
                        // Assuming ShareButton allows custom classes, otherwise wrap it
                        // className="p-0 m-0 bg-transparent shadow-none border-none text-gray-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* <!-- Main Content --> */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-0">
          <div className="lg:col-span-2">
            {/* <!-- About Section --> */}
            <div className="mb-6">
              <h2 className="text-lg font-bold sm:text-xl text-gray-900 mb-3 flex items-center">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />{" "}
                About Us
              </h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">
                {supplier.about}
              </p>

              {/* Stats Grid: Tighter and cleaner for mobile */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Clock, label: "Response", value: "Within 24h" },
                  { icon: Truck, label: "Delivery", value: "98% On-time" },
                  { icon: Building2, label: "Type", value: "Manufacturer" },
                  {
                    icon: Globe,
                    label: "Website",
                    value: "Visit Site",
                    isLink: true,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-lg p-3 flex flex-col justify-center"
                  >
                    <div className="flex items-center mb-1">
                      <item.icon className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                        {item.label}
                      </h3>
                    </div>
                    {item.isLink ? (
                      <Link
                        href={`https://nimboya.com/${supplier.username}`}
                        className="text-xs font-semibold text-blue-600 truncate"
                      >
                        nimboya.com/{supplier.username}
                      </Link>
                    ) : (
                      <p className="text-xs font-semibold text-gray-800">
                        {item.value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* <!-- Gallery Section --> */}
            <div className="   mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2 text-blue-600" /> Gallery
                </h2>
                <a
                  href="#"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View All
                </a>
              </div>

              <div
                id="gallery-grid"
                className="grid grid-cols-3 md:grid-cols-3 gap-2"
              >
                {/* <!-- Gallery items will be populated here --> */}
                <div className="gallery-image aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    width={640}
                    height={360}
                    src="http://static.photos/industry/640x360/1"
                    alt="Gallery Image 1"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="gallery-image aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    width={640}
                    height={360}
                    src="http://static.photos/industry/640x360/2"
                    alt="Gallery Image 2"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="gallery-image aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    width={640}
                    height={360}
                    src="http://static.photos/industry/640x360/3"
                    alt="Gallery Image 3"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="gallery-image aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    width={640}
                    height={360}
                    src="http://static.photos/industry/640x360/4"
                    alt="Gallery Image 4"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="gallery-image aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    width={640}
                    height={360}
                    src="http://static.photos/industry/640x360/5"
                    alt="Gallery Image 5"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="gallery-image aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    width={640}
                    height={360}
                    src="http://static.photos/industry/640x360/6"
                    alt="Gallery Image 6"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* <!-- Right Column: Updated to match your new "No-Box" style --> */}
          <div className="lg:col-span-1 space-y-8">
            {/* <!-- Certifications Section --> */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-blue-600" /> Certifications
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    icon: ShieldCheck,
                    title: "TAX Clearance",
                    desc: "Quality Management",
                    color: "blue",
                  },
                  {
                    icon: Leaf,
                    title: "Leseni Biashara",
                    desc: "Sustainable",
                    color: "green",
                  },
                ].map((cert, i) => (
                  <div
                    key={i}
                    className="flex items-center p-3 border border-gray-100 rounded-xl bg-white sm:bg-transparent"
                  >
                    <div
                      className={`flex-shrink-0 bg-${cert.color}-50 p-2 rounded-lg`}
                    >
                      <cert.icon className={`w-5 h-5 text-${cert.color}-600`} />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-bold text-gray-900">
                        {cert.title}
                      </h3>
                      <p className="text-[11px] text-gray-500 uppercase tracking-tight">
                        {cert.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* <!-- Business Hours Section (Minimalist) --> */}
            <div className="pt-4 border-t border-gray-100 lg:border-none">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" /> Business Hours
              </h2>
              <div id="business-hours" className="space-y-2 space-x-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monday - Friday</span>
                  <span className="font-medium text-gray-900">
                    8:00 AM - 6:30 PM
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Saturday</span>
                  <span className="font-medium text-gray-900">
                    9:00 AM - 3:00 PM
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sunday</span>
                  <span className="font-medium text-gray-900">
                    Business Chat
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
