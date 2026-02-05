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
      title: `Mtoa huduma hakupatikana | ${APP_NAME}`,
      description: "Ukurasa huu wa mtoa huduma haukuweza kupatikana.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nimboya.com";

  const ogImage = supplier.bannerUrl?.startsWith("http")
    ? supplier.bannerUrl
    : `${siteUrl}${supplier.bannerUrl}`;

  return {
    title: `${supplier.name} - Muuzaji Aliyethibitishwa kwenye Nimboya`,
    description:
      supplier.description ||
      "Pitia bidhaa na ofa kutoka kwa muuzaji huyu ndani ya nimboya.com.",
    openGraph: {
      title: `${supplier.name} | ${supplier.username}`,
      description:
        supplier.description ||
        "Tembelea wasifu wa muuzaji na ununue bidhaa bora ndani ya nimboya.com",
      url: `${siteUrl}/${supplier.username}`,
      siteName: "Nimboya",
      images: [
        {
          url: ogImage,
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
      images: [ogImage],
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
