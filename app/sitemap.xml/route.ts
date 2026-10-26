import {
  sitemapCounts,
  sitemapKinds,
  SITEMAP_SIZE,
  sitemapHeaders,
} from "@/lib/catalog-sitemaps";
import { publicUrl, xmlEscape } from "@/lib/storefront-seo";
export const dynamic = "force-dynamic";
export async function GET() {
  const counts = await sitemapCounts();
  const paths = [
    "/sitemaps/pages/1.xml",
    ...sitemapKinds.flatMap((kind) =>
      Array.from(
        { length: Math.ceil(counts[kind] / SITEMAP_SIZE) },
        (_, i) => `/sitemaps/${kind}/${i + 1}.xml`,
      ),
    ),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<sitemap><loc>${xmlEscape(publicUrl(p))}</loc></sitemap>`).join("")}</sitemapindex>`,
    { headers: sitemapHeaders },
  );
}
