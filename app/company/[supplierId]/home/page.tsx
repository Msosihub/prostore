// app/(root)/company/[supplierId]/home/page.tsx

import { prisma } from "@/db/prisma"; // <- your prisma client
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Clock,
  Factory,
  Globe,
  ImageIcon,
  Info,
  Leaf,
  MapPin,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Star,
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        {/* <!-- Supplier Header --> */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="relative">
            {/* <!-- Banner Image --> */}
            <div className="relative h-48 sm:h-56 md:h-72 bg-gradient-to-r from-blue-500 to-purple-600">
              <Image
                width={1200}
                height={630}
                id="supplier-banner"
                src={
                  supplier.bannerUrl ||
                  "http://static.photos/industry/1200x630/1"
                }
                alt="Supplier Banner"
                className="w-full h-full object-cover"
              />

              {/* <!-- Logo/Avatar --> */}
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 md:left-8 md:translate-x-0">
                <div className="relative ">
                  <Image
                    width={200}
                    height={200}
                    id="supplier-logo"
                    src={
                      supplier.logo || "http://static.photos/industry/200x200/1"
                    }
                    alt="Supplier Logo"
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white bg-white object-cover shadow-md"
                  />
                  <div
                    id="verification-badge"
                    className="absolute bottom-0 right-0 translate-x-[-25%] translate-y-[-25%] bg-green-500 text-white p-1 rounded-full shadow-md"
                  >
                    <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* <!-- Supplier Info Section --> */}
            <div className="px-4 sm:px-6 pb-8 ">
              <div className="flex flex-col md:flex-row items-center  md:items-end mt-16 md:mt-20">
                {/* here was image */}
                {/* <!-- Supplier Details --> */}
                <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left flex-1">
                  <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start gap-2">
                    <h1
                      id="supplier-name"
                      className="text-2xl md:text-3xl font-bold text-gray-900"
                    >
                      {supplier.companyName || supplier.name}
                    </h1>
                    <span
                      id="supplier-label"
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full"
                    >
                      Gold Supplier
                    </span>
                  </div>
                  <p
                    id="supplier-tagline"
                    className="text-base sm:text-lg text-gray-600 mt-1"
                  >
                    {supplier.tagLine}
                  </p>

                  <div className="flex flex-wrap justify-center md:justify-start items-center mt-3 gap-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span id="supplier-location">
                        {supplier.nation}, {supplier.location}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 ml-4">
                      <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
                      <span id="supplier-rating">
                        {supplier?.rating.toFixed(1)}
                      </span>
                      <span className="text-gray-400 ml-1">(128 reviews)</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 ml-4">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span id="supplier-years">
                        {supplier.yearsActive} years
                      </span>
                    </div>
                  </div>

                  <div className="flex mt-4 space-x-3">
                    <Link
                      href={`/company/${supplier.id}/products`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" /> Contact
                    </Link>
                    <Link
                      href={`/company/${supplier.id}/products`}
                      className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md shadow-sm border border-gray-300"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" /> View Products
                    </Link>
                    {/* <button className="inline-flex items-center px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md shadow-sm border border-gray-300">
                      <Share2 className="w-4 h-4 mr-1" />
                    </button> */}
                    <ShareButton
                      title={supplier.companyName || ""}
                      url={`https://nimboya.com/${supplier.username}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* <!-- Main Content --> */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* <!-- Left Column --> */}
          <div className="lg:col-span-2">
            {/* <!-- About Section --> */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Info className="w-5 h-5 mr-2 text-blue-600" /> About Us
              </h2>
              <p id="supplier-description" className="text-gray-600 mb-4">
                {supplier.about}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-900">
                      Response Time
                    </h3>
                  </div>
                  <p id="response-time" className="mt-1 text-sm text-gray-600">
                    Within 24 hours
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Truck className="w-5 h-5 mr-2 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-900">
                      Delivery Rate
                    </h3>
                  </div>
                  <p id="delivery-rate" className="mt-1 text-sm text-gray-600">
                    98% on time
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-900">
                      Business Type
                    </h3>
                  </div>
                  <p id="business-type" className="mt-1 text-sm text-gray-600">
                    Manufacturer & Wholesaler
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 mr-2 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-900">
                      Website
                    </h3>
                  </div>
                  <Link
                    id="supplier-website"
                    href={`https://nimboya.com/${supplier.username}`}
                    className="mt-1 text-sm text-blue-600 hover:underline"
                  >
                    www.nimboya.com/{supplier.username}
                  </Link>
                </div>
              </div>
            </div>

            {/* <!-- Gallery Section --> */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
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
                className="grid grid-cols-2 md:grid-cols-3 gap-4"
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

          {/* <!-- Right Column --> */}
          <div className="lg:col-span-1">
            {/* <!-- Certifications Section --> */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-blue-600" /> Certifications
              </h2>
              <div id="certifications" className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      TAX Clearance
                    </h3>
                    <p className="text-xs text-gray-500">Quality Management</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 bg-green-100 p-2 rounded-lg">
                    <Leaf className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Leseni Biashara
                    </h3>
                    <p className="text-xs text-gray-500">
                      Sustainable Practices
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 bg-purple-100 p-2 rounded-lg">
                    <Factory className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Manufacturer Certified
                    </h3>
                    <p className="text-xs text-gray-500">Direct from Factory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* <!-- Business Hours Section --> */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" /> Business Hours
              </h2>
              <div id="business-hours" className="space-y-2">
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
