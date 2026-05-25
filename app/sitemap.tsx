import { MetadataRoute } from "next";
import { SERVER_URL } from "@/lib/constants";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 🟢 FIXED: Selects 'createdAt' to match your explicit database model schema properties exactly
  const products = await prisma.product.findMany({
    select: {
      slug: true,
      id: true, // Pull ID as well so we can toggle paths freely during routing modifications
      createdAt: true,
    },
  });

  const productEntries = products.map((p) => {
    // 🟢 SEO RECOMMENDATION: Use p.slug. If your directory is still physically named [id], change this string literal path to: /product/${p.id}
    const productUrlPath = p.slug
      ? `${SERVER_URL}/product/${p.slug}`
      : `${SERVER_URL}/product/${p.id}`;

    return {
      url: productUrlPath,
      lastModified: p.createdAt, // Maps cleanly to your model's database timestamp
      changeFrequency: "daily" as const,
      priority: 0.8,
    };
  });

  return [
    {
      url: SERVER_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${SERVER_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...productEntries,
  ];
}
