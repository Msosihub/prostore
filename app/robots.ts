import type { MetadataRoute } from "next";
import { demoOrigin, siteOrigin, publicUrl } from "@/lib/storefront-seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      ...(demoOrigin(new URL(siteOrigin()).hostname)
        ? { disallow: "/" }
        : {
            allow: "/",
            disallow: [
              "/api/",
              "/admin/",
              "/user/",
              "/buyer/",
              "/supplier/",
              "/order/",
            ],
          }),
    },
    sitemap: publicUrl("/sitemap.xml"),
  };
}
