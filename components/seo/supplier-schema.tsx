"use client";

import { Supplier } from "@/types";
import Script from "next/script";

export function SupplierSchema({ supplier }: { supplier: Supplier }) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: supplier.companyName,
    url: `${siteUrl}/${supplier.username}`,
    description: supplier.about,
    logo: supplier.bannerUrl
      ? `${siteUrl}${supplier.bannerUrl}` || ""
      : `${siteUrl}/default-banner.jpg` || "",
  };

  return (
    <Script
      id="supplier-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
