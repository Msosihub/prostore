// app/[username]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/db/prisma"; // adjust path to your prisma instance
// import SupplierHome from "@/app/company/[id]/Home/page"; // reuse the existing component if possible
import SupplierHomePage from "../company/[supplierId]/home/page"; // reuse the existing component if possible
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { username: username },
    select: {
      name: true,
      description: true,
      bannerUrl: true, // make sure your model has this
      username: true,
    },
  });

  if (!supplier) {
    return {
      title: `Supplier not found | ${APP_NAME}`,
      description: "This supplier page could not be found.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nimboya.com";

  return {
    title: `${supplier.name} | ${supplier.username} | YourBrand`,
    description:
      supplier.description || "Explore products and offers from this supplier.",
    openGraph: {
      title: `${supplier.name} | ${supplier.username}`,
      description:
        supplier.description || "Visit supplier profile and shop top products.",
      url: `${siteUrl}/${supplier.username}`,
      siteName: "YourBrand",
      images: [
        {
          url: supplier.bannerUrl
            ? `${siteUrl}${supplier.bannerUrl}`
            : `${siteUrl}/default-banner.jpg`,
          width: 1200,
          height: 630,
          alt: supplier.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: supplier.name,
      description:
        supplier.description || "View supplier products and details.",
      images: [
        supplier.bannerUrl
          ? `${siteUrl}${supplier.bannerUrl}`
          : `${siteUrl}/default-banner.jpg`,
      ],
    },
    alternates: {
      canonical: `${siteUrl}/${supplier.username}`,
    },
  };
}

export default async function SupplierUsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const RESERVED_ROUTES = ["login", "register", "about", "company"];

  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    notFound();
  }

  const supplier = await prisma.supplier.findUnique({
    where: { username: username },
  });

  if (!supplier) {
    notFound();
  }

  // adapt the async param signature your HomePage expects:
  const supplierParams = Promise.resolve({ supplierId: supplier.id });

  // ✅ Option 1: reuse the existing SupplierHome component
  return <SupplierHomePage params={supplierParams} />;

  // ✅ Option 2: if SupplierHome is complex or uses fetches by ID,
  // you can render your own component here passing supplier data
}
